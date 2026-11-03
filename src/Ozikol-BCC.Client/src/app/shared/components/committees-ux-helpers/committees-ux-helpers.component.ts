import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { CommitteeInfoSpec, CommitteeTourStep } from '../../../core/services/committees.service';

/**
 * Reusable contextual (i) Info Modal and Interactive Step-by-Step Tour Guide overlay
 * ensuring Rule 13 compliance across all Committees & Sub-Groups screens.
 */
@Component({
  selector: 'app-committees-ux-helpers',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <!-- Contextual (i) Info Modal -->
    <div class="ux-backdrop" *ngIf="activeInfo" (click)="closeInfo.emit()">
      <div class="ux-card" (click)="$event.stopPropagation()">
        <div class="ux-card-header">
          <div class="ux-icon-badge">
            <span class="material-symbols-outlined">info</span>
          </div>
          <div class="ux-header-titles">
            <span class="ux-kicker">{{ 'committees.eyebrow' | translate:'PEOPLE & COMMUNITY' }}</span>
            <h3>{{ activeInfo.title }}</h3>
          </div>
          <button type="button" class="ux-close-btn" (click)="closeInfo.emit()">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="ux-card-body">
          <div class="ux-info-block">
            <div class="ux-info-label">
              <span class="material-symbols-outlined">flag</span>
              <span>{{ 'committees.info_purpose' | translate:'Purpose' }}</span>
            </div>
            <p>{{ activeInfo.purpose }}</p>
          </div>

          <div class="ux-info-block">
            <div class="ux-info-label">
              <span class="material-symbols-outlined">tune</span>
              <span>{{ 'committees.info_inputs' | translate:'Expected Inputs & Formats' }}</span>
            </div>
            <p>{{ activeInfo.inputs }}</p>
          </div>

          <div class="ux-info-block">
            <div class="ux-info-label">
              <span class="material-symbols-outlined">bolt</span>
              <span>{{ 'committees.info_impact' | translate:'Operational Impact' }}</span>
            </div>
            <p>{{ activeInfo.impact }}</p>
          </div>

          <div class="ux-info-tip">
            <span class="material-symbols-outlined">verified</span>
            <div>
              <strong>{{ 'committees.info_best_practices' | translate:'Best Practices' }}:</strong>
              <span>{{ activeInfo.bestPractices }}</span>
            </div>
          </div>
        </div>

        <div class="ux-card-footer">
          <button type="button" class="ux-btn-primary" (click)="closeInfo.emit()">
            {{ 'committees.close' | translate:'Close' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Interactive Screen Tour Walkthrough Modal -->
    <div class="ux-backdrop" *ngIf="showTour && tourSteps.length > 0" (click)="finishTour()">
      <div class="ux-card tour-card" (click)="$event.stopPropagation()">
        <div class="ux-card-header">
          <div class="ux-icon-badge">
            <span class="material-symbols-outlined">{{ tourSteps[tourIndex].icon || 'explore' }}</span>
          </div>
          <div class="ux-header-titles">
            <span class="ux-kicker">{{ 'committees.tour_guide' | translate:'Tour Guide' }} ({{ tourIndex + 1 }} / {{ tourSteps.length }})</span>
            <h3>{{ tourSteps[tourIndex].title }}</h3>
          </div>
          <button type="button" class="ux-close-btn" (click)="finishTour()">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="ux-card-body">
          <p class="tour-desc">{{ tourSteps[tourIndex].description }}</p>
          <div class="tour-dots">
            <span *ngFor="let s of tourSteps; let idx = index" class="tour-dot" [class.active]="idx === tourIndex"></span>
          </div>
        </div>

        <div class="ux-card-footer tour-footer">
          <button type="button" class="ux-btn-secondary" *ngIf="tourIndex > 0" (click)="tourIndex = tourIndex - 1">
            Back
          </button>
          <span style="flex:1"></span>
          <button type="button" class="ux-btn-secondary" (click)="finishTour()">
            Skip
          </button>
          <button type="button" class="ux-btn-primary" *ngIf="tourIndex < tourSteps.length - 1" (click)="tourIndex = tourIndex + 1">
            Next
          </button>
          <button type="button" class="ux-btn-primary" *ngIf="tourIndex === tourSteps.length - 1" (click)="finishTour()">
            Done
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ux-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.55);
      backdrop-filter: blur(4px);
      z-index: 10500;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .ux-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      width: 100%;
      max-width: 520px;
      box-shadow: 0 24px 48px rgba(15, 23, 42, 0.2);
      overflow: hidden;
    }
    :host-context(.dark-mode) .ux-card {
      background: #1e293b;
      border-color: rgba(255, 255, 255, 0.1);
      color: #f8fafc;
    }
    .ux-card-header {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 18px 22px;
      border-bottom: 1px solid #e2e8f0;
    }
    :host-context(.dark-mode) .ux-card-header { border-bottom-color: rgba(255,255,255,0.08); }
    .ux-icon-badge {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      background: rgba(0, 80, 229, 0.1);
      color: #0050e5;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .ux-header-titles { flex: 1; min-width: 0; }
    .ux-kicker {
      display: block;
      font-size: 11px;
      font-weight: 700;
      color: #0050e5;
      letter-spacing: 0.7px;
      text-transform: uppercase;
    }
    .ux-header-titles h3 {
      margin: 2px 0 0;
      font-size: 17px;
      font-weight: 700;
      color: #0f172a;
    }
    :host-context(.dark-mode) .ux-header-titles h3 { color: #f8fafc; }
    .ux-close-btn {
      background: transparent;
      border: none;
      color: #64748b;
      cursor: pointer;
      padding: 4px;
      border-radius: 8px;
    }
    .ux-card-body {
      padding: 20px 22px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      max-height: 68vh;
      overflow-y: auto;
    }
    .ux-info-block p {
      margin: 4px 0 0;
      font-size: 13.5px;
      color: #475569;
      line-height: 1.55;
    }
    :host-context(.dark-mode) .ux-info-block p { color: #cbd5e1; }
    .ux-info-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      color: #1e293b;
    }
    :host-context(.dark-mode) .ux-info-label { color: #e2e8f0; }
    .ux-info-label .material-symbols-outlined { font-size: 17px; color: #0050e5; }
    .ux-info-tip {
      display: flex;
      gap: 10px;
      padding: 12px 14px;
      border-radius: 10px;
      background: rgba(0, 80, 229, 0.06);
      border-left: 3px solid #0050e5;
      font-size: 13px;
      color: #1e293b;
      line-height: 1.5;
    }
    :host-context(.dark-mode) .ux-info-tip { background: rgba(0,80,229,0.16); color: #e2e8f0; }
    .ux-info-tip .material-symbols-outlined { color: #0050e5; font-size: 20px; flex-shrink: 0; }
    .tour-desc { font-size: 14px; line-height: 1.6; color: #334155; margin: 0; }
    :host-context(.dark-mode) .tour-desc { color: #cbd5e1; }
    .tour-dots { display: flex; gap: 6px; justify-content: center; margin-top: 8px; }
    .tour-dot { width: 8px; height: 8px; border-radius: 50%; background: #cbd5e1; transition: all 0.2s; }
    .tour-dot.active { width: 22px; border-radius: 6px; background: #0050e5; }
    .ux-card-footer {
      padding: 14px 22px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    :host-context(.dark-mode) .ux-card-footer { border-top-color: rgba(255,255,255,0.08); }
    .ux-btn-primary {
      background: #0050e5;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .ux-btn-primary:hover { background: #003db3; }
    .ux-btn-secondary {
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
  `]
})
export class CommitteesUxHelpersComponent {
  @Input() activeInfo: CommitteeInfoSpec | null = null;
  @Output() closeInfo = new EventEmitter<void>();

  @Input() showTour = false;
  @Input() tourSteps: CommitteeTourStep[] = [];
  @Output() tourClosed = new EventEmitter<void>();

  tourIndex = 0;

  finishTour(): void {
    this.tourIndex = 0;
    this.tourClosed.emit();
  }
}

