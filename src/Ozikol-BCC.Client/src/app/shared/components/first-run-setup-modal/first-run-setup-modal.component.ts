import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Setup progress step interface.
 */
interface SetupStep {
  label: string;
  detail: string;
  status: 'pending' | 'running' | 'done' | 'failed';
}

/**
 * First-Run Workspace Setup & Default Website Seeder Modal.
 * Prompts tenant administrators on first login to either seed default turnkey website assets or start with a blank canvas.
 */
@Component({
  selector: 'app-first-run-setup-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fr-modal-backdrop" *ngIf="isOpen">
      <div class="fr-modal-card" role="dialog" aria-modal="true" aria-labelledby="fr-modal-title">
        
        <!-- Header Banner with Brand Accent -->
        <div class="fr-modal-header">
          <div class="fr-badge-welcome">
            <span class="material-symbols-outlined fr-sparkle-icon">auto_awesome</span>
            <span>First-Time Workspace Setup</span>
          </div>
          <h2 id="fr-modal-title" class="fr-modal-title">Welcome to Your {{ brandName || 'Workspace' }} Portal</h2>
          <p class="fr-modal-subtitle">
            Configure how you would like to initialize your digital storefront and website workspace. You can choose our complete turnkey default suite or begin with a clean, blank slate.
          </p>
        </div>

        <!-- Mode Selection View (when not loading) -->
        <div class="fr-modal-body" *ngIf="!isSeeding">
          <div class="fr-cards-grid">

            <!-- Card 1: Default Turnkey Website (Recommended) -->
            <div 
              class="fr-choice-card" 
              [class.selected]="selectedMode === 'default'" 
              (click)="selectedMode = 'default'"
              tabindex="0"
              role="button"
              (keydown.enter)="selectedMode = 'default'"
              (keydown.space)="selectedMode = 'default'"
            >
              <div class="fr-card-ribbon">Recommended</div>
              <div class="fr-card-radio">
                <span class="fr-radio-circle" [class.checked]="selectedMode === 'default'"></span>
              </div>
              <div class="fr-card-icon-wrap bg-blue-subtle">
                <span class="material-symbols-outlined fr-card-icon text-blue">rocket_launch</span>
              </div>
              <div class="fr-card-content">
                <h3 class="fr-card-title">Launch with Default Website & Templates</h3>
                <p class="fr-card-desc">
                  Instantly provisions a fully working, beautifully designed website structure with rich content, so you can start customizing immediately.
                </p>
                <ul class="fr-feature-list">
                  <li>
                    <span class="material-symbols-outlined check-icon">check_circle</span>
                    <span><strong>3 Interactive Forms:</strong> Contact Us, Newsletter & Service Requests</span>
                  </li>
                  <li>
                    <span class="material-symbols-outlined check-icon">check_circle</span>
                    <span><strong>3 Editorial Blogs:</strong> Complete with excerpt summaries & rich-text articles</span>
                  </li>
                  <li>
                    <span class="material-symbols-outlined check-icon">check_circle</span>
                    <span><strong>Complete Site Map:</strong> Home, Services, Company, About, Team, and Legal pages</span>
                  </li>
                  <li>
                    <span class="material-symbols-outlined check-icon">check_circle</span>
                    <span><strong>10 Body Sections:</strong> Hero, Feature showcases, Stats counters, and CTA blocks</span>
                  </li>
                  <li>
                    <span class="material-symbols-outlined check-icon">check_circle</span>
                    <span><strong>SEO & Social Suite:</strong> OpenGraph, Twitter Cards, Favicon & Mobile Meta tags</span>
                  </li>
                </ul>
              </div>
            </div>

            <!-- Card 2: Blank Canvas -->
            <div 
              class="fr-choice-card" 
              [class.selected]="selectedMode === 'blank'" 
              (click)="selectedMode = 'blank'"
              tabindex="0"
              role="button"
              (keydown.enter)="selectedMode = 'blank'"
              (keydown.space)="selectedMode = 'blank'"
            >
              <div class="fr-card-radio">
                <span class="fr-radio-circle" [class.checked]="selectedMode === 'blank'"></span>
              </div>
              <div class="fr-card-icon-wrap bg-purple-subtle">
                <span class="material-symbols-outlined fr-card-icon text-purple">draft</span>
              </div>
              <div class="fr-card-content">
                <h3 class="fr-card-title">Start with a Blank Slate</h3>
                <p class="fr-card-desc">
                  Prefer a clean canvas? Leave all pages, forms, and blog posts empty and design everything by hand from the ground up.
                </p>
                <ul class="fr-feature-list">
                  <li>
                    <span class="material-symbols-outlined check-icon">check_circle</span>
                    <span>No dummy, sample, or default pages created</span>
                  </li>
                  <li>
                    <span class="material-symbols-outlined check-icon">check_circle</span>
                    <span>Create custom forms and fields only when needed</span>
                  </li>
                  <li>
                    <span class="material-symbols-outlined check-icon">check_circle</span>
                    <span>Build bespoke layout sections from scratch</span>
                  </li>
                  <li>
                    <span class="material-symbols-outlined check-icon">check_circle</span>
                    <span>Ideal for experienced developers and designers</span>
                  </li>
                </ul>
              </div>
            </div>

          </div>

          <!-- Bottom Notice -->
          <div class="fr-info-banner">
            <span class="material-symbols-outlined fr-info-icon">info</span>
            <span>
              This setup step runs only once. Your selection will initialize your database and will not appear again on subsequent visits.
            </span>
          </div>
        </div>

        <!-- Seeding Progress View (when running) -->
        <div class="fr-modal-body fr-progress-body" *ngIf="isSeeding">
          <div class="fr-progress-header">
            <div class="fr-spinner-ring"></div>
            <h3 class="fr-progress-title">Provisioning Your Workspace...</h3>
            <p class="fr-progress-subtitle">
              Setting up your foundational templates, pages, forms, and SEO metadata. Please do not close or refresh this tab.
            </p>
          </div>

          <div class="fr-steps-container">
            <div class="fr-step-item" *ngFor="let s of setupSteps; let i = index">
              <div class="fr-step-indicator" [class.done]="s.status === 'done'" [class.running]="s.status === 'running'" [class.failed]="s.status === 'failed'">
                <span class="material-symbols-outlined" *ngIf="s.status === 'done'">check</span>
                <span class="fr-step-dot" *ngIf="s.status === 'running'"></span>
                <span class="material-symbols-outlined" *ngIf="s.status === 'failed'">close</span>
                <span class="fr-step-number" *ngIf="s.status === 'pending'">{{ i + 1 }}</span>
              </div>
              <div class="fr-step-text">
                <span class="fr-step-label">{{ s.label }}</span>
                <span class="fr-step-detail">{{ s.detail }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer Actions -->
        <div class="fr-modal-footer">
          <ng-container *ngIf="!isSeeding">
            <button 
              type="button" 
              class="fr-btn fr-btn-secondary" 
              [disabled]="isSubmitting"
              (click)="onConfirmBlank()"
              *ngIf="selectedMode === 'blank'"
            >
              <span class="material-symbols-outlined">done</span>
              <span>Confirm Blank Canvas</span>
            </button>

            <button 
              type="button" 
              class="fr-btn fr-btn-primary" 
              [disabled]="isSubmitting"
              (click)="onStartSetup()"
              *ngIf="selectedMode === 'default'"
            >
              <span class="material-symbols-outlined">rocket_launch</span>
              <span>Run Default Setup</span>
            </button>
          </ng-container>

          <ng-container *ngIf="isSeeding">
            <span class="fr-seeding-status-text">
              <span class="fr-status-pulse"></span>
              <span>Finalizing configuration...</span>
            </span>
          </ng-container>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .fr-modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 23, 42, 0.78);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: frFadeIn 0.25s ease-out;
    }

    @keyframes frFadeIn {
      from { opacity: 0; transform: scale(0.98); }
      to { opacity: 1; transform: scale(1); }
    }

    .fr-modal-card {
      background: #ffffff;
      border-radius: 20px;
      box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1);
      width: 100%;
      max-width: 860px;
      max-height: 92vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
    }

    :host-context(.dark-mode) .fr-modal-card {
      background: #111827;
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #f3f4f6;
    }

    .fr-modal-header {
      padding: 32px 36px 20px;
      text-align: center;
      background: linear-gradient(180deg, rgba(240, 246, 255, 0.8) 0%, rgba(255, 255, 255, 0) 100%);
      border-bottom: 1px solid rgba(226, 232, 240, 0.6);
    }

    :host-context(.dark-mode) .fr-modal-header {
      background: linear-gradient(180deg, rgba(30, 41, 59, 0.5) 0%, rgba(17, 24, 39, 0) 100%);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .fr-badge-welcome {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 14px;
      border-radius: 999px;
      background: #eff6ff;
      color: #0050e5;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.3px;
      margin-bottom: 12px;
      border: 1px solid rgba(0, 80, 229, 0.15);
    }

    :host-context(.dark-mode) .fr-badge-welcome {
      background: rgba(0, 80, 229, 0.15);
      color: #60a5fa;
      border-color: rgba(96, 165, 250, 0.25);
    }

    .fr-sparkle-icon {
      font-size: 16px;
    }

    .fr-modal-title {
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 10px;
      letter-spacing: -0.5px;
    }

    :host-context(.dark-mode) .fr-modal-title {
      color: #ffffff;
    }

    .fr-modal-subtitle {
      font-size: 14px;
      color: #64748b;
      margin: 0 auto;
      max-width: 680px;
      line-height: 1.6;
    }

    :host-context(.dark-mode) .fr-modal-subtitle {
      color: #94a3b8;
    }

    .fr-modal-body {
      padding: 24px 36px;
      overflow-y: auto;
      flex: 1;
    }

    .fr-cards-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }

    @media (max-width: 768px) {
      .fr-cards-grid {
        grid-template-columns: 1fr;
      }
    }

    .fr-choice-card {
      border: 2px solid #e2e8f0;
      border-radius: 16px;
      padding: 24px;
      cursor: pointer;
      position: relative;
      background: #f8fafc;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      outline: none;
    }

    :host-context(.dark-mode) .fr-choice-card {
      background: #1e293b;
      border-color: #334155;
    }

    .fr-choice-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 24px -6px rgba(0, 0, 0, 0.08);
      border-color: #94a3b8;
    }

    .fr-choice-card.selected {
      border-color: #0050e5;
      background: #ffffff;
      box-shadow: 0 12px 30px -8px rgba(0, 80, 229, 0.2), 0 0 0 1px #0050e5;
    }

    :host-context(.dark-mode) .fr-choice-card.selected {
      background: #1e293b;
      border-color: #3b82f6;
      box-shadow: 0 12px 30px -8px rgba(59, 130, 246, 0.25), 0 0 0 1px #3b82f6;
    }

    .fr-card-ribbon {
      position: absolute;
      top: 14px;
      right: 14px;
      background: #0050e5;
      color: #ffffff;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 3px 10px;
      border-radius: 999px;
    }

    .fr-card-radio {
      position: absolute;
      top: 18px;
      left: 18px;
    }

    .fr-radio-circle {
      display: inline-block;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 2px solid #cbd5e1;
      position: relative;
      transition: all 0.15s ease;
    }

    .fr-radio-circle.checked {
      border-color: #0050e5;
    }

    .fr-radio-circle.checked::after {
      content: '';
      position: absolute;
      top: 3px;
      left: 3px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #0050e5;
    }

    :host-context(.dark-mode) .fr-radio-circle.checked {
      border-color: #3b82f6;
    }

    :host-context(.dark-mode) .fr-radio-circle.checked::after {
      background: #3b82f6;
    }

    .fr-card-icon-wrap {
      width: 46px;
      height: 46px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 16px 0 14px;
    }

    .bg-blue-subtle {
      background: #e0f2fe;
    }

    .bg-purple-subtle {
      background: #f3e8ff;
    }

    :host-context(.dark-mode) .bg-blue-subtle {
      background: rgba(14, 165, 233, 0.15);
    }

    :host-context(.dark-mode) .bg-purple-subtle {
      background: rgba(168, 85, 247, 0.15);
    }

    .text-blue { color: #0284c7; }
    .text-purple { color: #9333ea; }
    :host-context(.dark-mode) .text-blue { color: #38bdf8; }
    :host-context(.dark-mode) .text-purple { color: #c084fc; }

    .fr-card-icon {
      font-size: 24px;
    }

    .fr-card-title {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 6px;
    }

    :host-context(.dark-mode) .fr-card-title {
      color: #f8fafc;
    }

    .fr-card-desc {
      font-size: 13px;
      color: #64748b;
      margin: 0 0 14px;
      line-height: 1.5;
    }

    :host-context(.dark-mode) .fr-card-desc {
      color: #94a3b8;
    }

    .fr-feature-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .fr-feature-list li {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 12px;
      color: #334155;
      line-height: 1.4;
    }

    :host-context(.dark-mode) .fr-feature-list li {
      color: #cbd5e1;
    }

    .check-icon {
      font-size: 16px;
      color: #10b981;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .fr-info-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      border-radius: 12px;
      background: #f1f5f9;
      color: #475569;
      font-size: 12px;
      line-height: 1.5;
    }

    :host-context(.dark-mode) .fr-info-banner {
      background: #1e293b;
      color: #94a3b8;
    }

    .fr-info-icon {
      font-size: 18px;
      color: #0050e5;
      flex-shrink: 0;
    }

    /* Seeding Progress Styles */
    .fr-progress-body {
      padding: 40px 36px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .fr-progress-header {
      margin-bottom: 30px;
    }

    .fr-spinner-ring {
      display: inline-block;
      width: 50px;
      height: 50px;
      border: 4px solid #e2e8f0;
      border-top-color: #0050e5;
      border-radius: 50%;
      animation: frSpin 0.8s linear infinite;
      margin-bottom: 16px;
    }

    @keyframes frSpin {
      to { transform: rotate(360deg); }
    }

    .fr-progress-title {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 6px;
    }

    :host-context(.dark-mode) .fr-progress-title {
      color: #ffffff;
    }

    .fr-progress-subtitle {
      font-size: 13px;
      color: #64748b;
      margin: 0;
      max-width: 480px;
    }

    :host-context(.dark-mode) .fr-progress-subtitle {
      color: #94a3b8;
    }

    .fr-steps-container {
      width: 100%;
      max-width: 520px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      text-align: left;
    }

    .fr-step-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 16px;
      background: #f8fafc;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      transition: all 0.2s ease;
    }

    :host-context(.dark-mode) .fr-step-item {
      background: #1e293b;
      border-color: #334155;
    }

    .fr-step-indicator {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      background: #e2e8f0;
      color: #64748b;
      flex-shrink: 0;
    }

    .fr-step-indicator.done {
      background: #10b981;
      color: #ffffff;
    }

    .fr-step-indicator.running {
      background: #0050e5;
      color: #ffffff;
    }

    .fr-step-indicator.failed {
      background: #ef4444;
      color: #ffffff;
    }

    .fr-step-dot {
      width: 8px;
      height: 8px;
      background: #ffffff;
      border-radius: 50%;
      animation: frPulse 1s infinite alternate;
    }

    @keyframes frPulse {
      from { transform: scale(0.7); opacity: 0.6; }
      to { transform: scale(1.3); opacity: 1; }
    }

    .fr-step-text {
      display: flex;
      flex-direction: column;
    }

    .fr-step-label {
      font-size: 13px;
      font-weight: 600;
      color: #1e293b;
    }

    :host-context(.dark-mode) .fr-step-label {
      color: #f1f5f9;
    }

    .fr-step-detail {
      font-size: 11px;
      color: #64748b;
    }

    :host-context(.dark-mode) .fr-step-detail {
      color: #94a3b8;
    }

    /* Modal Footer */
    .fr-modal-footer {
      padding: 18px 36px 24px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      background: #f8fafc;
    }

    :host-context(.dark-mode) .fr-modal-footer {
      background: #1e293b;
      border-top-color: rgba(255, 255, 255, 0.08);
    }

    .fr-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      border: none;
    }

    .fr-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .fr-btn-secondary {
      background: #e2e8f0;
      color: #334155;
    }

    .fr-btn-secondary:hover:not(:disabled) {
      background: #cbd5e1;
    }

    :host-context(.dark-mode) .fr-btn-secondary {
      background: #334155;
      color: #f1f5f9;
    }

    :host-context(.dark-mode) .fr-btn-secondary:hover:not(:disabled) {
      background: #475569;
    }

    .fr-btn-primary {
      background: linear-gradient(135deg, #0050e5 0%, #1e40af 100%);
      color: #ffffff;
      box-shadow: 0 4px 14px rgba(0, 80, 229, 0.35);
    }

    .fr-btn-primary:hover:not(:disabled) {
      background: linear-gradient(135deg, #0043c2 0%, #172554 100%);
      box-shadow: 0 6px 18px rgba(0, 80, 229, 0.45);
      transform: translateY(-1px);
    }

    .fr-seeding-status-text {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #0050e5;
      font-weight: 600;
    }

    :host-context(.dark-mode) .fr-seeding-status-text {
      color: #60a5fa;
    }

    .fr-status-pulse {
      width: 8px;
      height: 8px;
      background: #0050e5;
      border-radius: 50%;
      animation: frPulse 0.8s infinite alternate;
    }

    :host-context(.dark-mode) .fr-status-pulse {
      background: #60a5fa;
    }
  `]
})
export class FirstRunSetupModalComponent {
  @Input() isOpen = false;
  @Input() brandName = '';
  @Output() completed = new EventEmitter<'default' | 'blank'>();

  public selectedMode: 'default' | 'blank' = 'default';
  public isSubmitting = false;
  public isSeeding = false;

  public setupSteps: SetupStep[] = [
    { label: 'Provision Interactive Forms', detail: 'Creating Contact Us, Newsletter, and Service Requests', status: 'pending' },
    { label: 'Publish Editorial Blogs', detail: 'Creating 3 curated articles with rich-text content', status: 'pending' },
    { label: 'Build Web Pages & Layout Sections', detail: 'Generating 9 pages and 10 modular body sections', status: 'pending' },
    { label: 'Configure SEO & Metadata Suite', detail: 'Setting up canonical OpenGraph and Mobile meta tags', status: 'pending' }
  ];

  constructor(
    private api: ApiService,
    private toast: ToastService
  ) {}

  /**
   * Triggers the full default workspace seeding process.
   */
  public onStartSetup(): void {
    if (this.isSubmitting || this.isSeeding) return;

    this.isSubmitting = true;
    this.isSeeding = true;

    // Simulate animated step transitions for sleek UX
    this.setupSteps[0].status = 'running';

    const timer1 = setTimeout(() => {
      if (this.setupSteps[0]) this.setupSteps[0].status = 'done';
      if (this.setupSteps[1]) this.setupSteps[1].status = 'running';
    }, 900);

    const timer2 = setTimeout(() => {
      if (this.setupSteps[1]) this.setupSteps[1].status = 'done';
      if (this.setupSteps[2]) this.setupSteps[2].status = 'running';
    }, 1800);

    const timer3 = setTimeout(() => {
      if (this.setupSteps[2]) this.setupSteps[2].status = 'done';
      if (this.setupSteps[3]) this.setupSteps[3].status = 'running';
    }, 2700);

    this.api.post<any>('ContentApi/workspace/seed-defaults', {}).subscribe({
      next: (res) => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);

        this.setupSteps.forEach(s => s.status = 'done');

        setTimeout(() => {
          this.isSubmitting = false;
          this.isSeeding = false;
          this.isOpen = false;

          // Store initialization state in local and session storage
          localStorage.setItem('bcp_workspace_initialized', 'true');
          sessionStorage.setItem('bcp_setup_modal_dismissed', 'true');

          this.toast.success(
            'Default website layout, interactive forms, and editorial blogs have been successfully provisioned!',
            'Workspace Ready'
          );

          // Dispatch event to refresh sidebar forms and templates
          window.dispatchEvent(new CustomEvent('forms_updated'));

          this.completed.emit('default');
        }, 800);
      },
      error: (err) => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);

        this.isSubmitting = false;
        this.isSeeding = false;
        this.setupSteps.forEach(s => {
          if (s.status === 'running') s.status = 'failed';
        });

        const errorMsg = err?.error?.message || 'Failed to complete workspace initialization. Please try again.';
        this.toast.error(errorMsg, 'Setup Failed');
      }
    });
  }

  /**
   * Confirms skipping setup and starting with a blank canvas.
   */
  public onConfirmBlank(): void {
    if (this.isSubmitting) return;

    this.isSubmitting = true;

    this.api.post<any>('ContentApi/workspace/skip-setup', {}).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.isOpen = false;

        localStorage.setItem('bcp_workspace_initialized', 'true');
        sessionStorage.setItem('bcp_setup_modal_dismissed', 'true');

        this.toast.info('Workspace initialized with a clean, blank slate.', 'Blank Canvas Mode');
        this.completed.emit('blank');
      },
      error: (err) => {
        this.isSubmitting = false;
        const errorMsg = err?.error?.message || 'Failed to configure blank canvas mode.';
        this.toast.error(errorMsg, 'Error');
      }
    });
  }
}
