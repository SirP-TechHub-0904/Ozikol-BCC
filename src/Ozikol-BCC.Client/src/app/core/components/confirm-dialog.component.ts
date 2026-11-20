import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmDialogService } from '../services/confirm-dialog.service';

/**
 * Global branded confirmation / reason-prompt modal. Mounted once in the app shell and
 * driven by `ConfirmDialogService` so no page needs native `confirm()` or `prompt()`.
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="cd-backdrop" *ngIf="svc.state$ | async as s" (click)="svc.close(false)">
      <div class="cd-card" (click)="$event.stopPropagation()">
        <div class="cd-head">
          <span class="material-symbols-outlined cd-icon" [class.danger]="s.danger || s.isDestructive">{{ (s.danger || s.isDestructive) ? 'warning' : 'help' }}</span>
          <h3>{{ s.title }}</h3>
        </div>
        <div class="cd-body">
          <p>{{ s.message }}</p>
          <ng-container *ngIf="s.inputLabel">
            <label class="cd-label">{{ s.inputLabel }}<span *ngIf="s.inputRequired" class="req"> *</span></label>
            <textarea class="cd-input" rows="3" [(ngModel)]="s.inputValue" [placeholder]="s.inputPlaceholder || ''"></textarea>
          </ng-container>
        </div>
        <div class="cd-foot">
          <button type="button" class="cd-btn outline" (click)="svc.close(false)">{{ s.cancelText || s.cancelLabel || 'Cancel' }}</button>
          <button type="button" class="cd-btn" [class.danger]="s.danger || s.isDestructive" (click)="svc.close(true)">{{ s.confirmText || s.confirmLabel || 'Confirm' }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cd-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.5); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; z-index: 5000; padding: 16px; }
    .cd-card { background: #fff; border-radius: 14px; width: 100%; max-width: 440px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); overflow: hidden; }
    .cd-head { display: flex; align-items: center; gap: 10px; padding: 18px 22px; border-bottom: 1px solid #f1f5f9; }
    .cd-head h3 { margin: 0; font-size: 16px; font-weight: 800; color: #0f172a; }
    .cd-icon { color: #0050e5; font-size: 24px; }
    .cd-icon.danger { color: #dc2626; }
    .cd-body { padding: 18px 22px; font-size: 13.5px; color: #334155; line-height: 1.55; }
    .cd-body p { margin: 0 0 8px; }
    .cd-label { display: block; font-size: 12.5px; font-weight: 700; color: #334155; margin: 10px 0 5px; }
    .req { color: #dc2626; }
    .cd-input { width: 100%; box-sizing: border-box; padding: 9px 12px; font-size: 13px; border: 1px solid #cbd5e1; border-radius: 8px; outline: none; font-family: inherit; resize: vertical; }
    .cd-input:focus { border-color: #0050e5; box-shadow: 0 0 0 3px rgba(0,80,229,0.1); }
    .cd-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 22px; background: #f8fafc; border-top: 1px solid #f1f5f9; }
    .cd-btn { height: 36px; padding: 0 18px; border-radius: 8px; border: 1px solid #0050e5; background: #0050e5; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; }
    .cd-btn:hover { background: #003bb5; }
    .cd-btn.danger { background: #dc2626; border-color: #dc2626; }
    .cd-btn.danger:hover { background: #b91c1c; }
    .cd-btn.outline { background: #fff; color: #334155; border-color: #cbd5e1; }
    .cd-btn.outline:hover { background: #f1f5f9; }
  `]
})
export class ConfirmDialogComponent {
  constructor(public svc: ConfirmDialogService) {}
}
