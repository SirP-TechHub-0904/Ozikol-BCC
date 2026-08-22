import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService, ToastMessage, ConfirmDialogOptions } from '../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Floating Toast Notifications Stack -->
    <div class="toast-stack" *ngIf="(toastService.toasts$ | async) as toasts">
      <div
        *ngFor="let toast of toasts"
        class="toast-card toast-{{ toast.type }}"
        [class.toast-fade-in]="true">
        <div class="toast-icon-box">
          <span class="material-symbols-outlined">{{ toast.icon }}</span>
        </div>
        <div class="toast-content">
          <div class="toast-title" *ngIf="toast.title">{{ toast.title }}</div>
          <div class="toast-message">{{ toast.message }}</div>
        </div>
        <button type="button" class="toast-close" (click)="toastService.dismiss(toast.id)">&times;</button>
        <div class="toast-progress" [style.animationDuration.ms]="toast.duration || 4000"></div>
      </div>
    </div>

    <!-- High-Security Universal Confirmation Modal Dialog -->
    <div class="modal-backdrop" *ngIf="(toastService.confirm$ | async) as dialog">
      <div class="confirm-modal-box" [class.danger-modal-box]="dialog.type === 'danger'">
        <div class="confirm-icon-circle confirm-{{ dialog.type || 'danger' }}">
          <span class="material-symbols-outlined">
            {{ dialog.type === 'danger' ? 'warning' : (dialog.type === 'warning' ? 'help' : 'info') }}
          </span>
        </div>

        <div class="confirm-body">
          <h3>{{ dialog.title }}</h3>
          <p class="confirm-main-msg">{{ dialog.message }}</p>

          <!-- Consequences Box for Destructive Actions -->
          <div class="consequences-box" *ngIf="dialog.type === 'danger'">
            <div class="consequences-title">
              <span class="material-symbols-outlined">error</span>
              <span>Irreversible Action Warning:</span>
            </div>
            <ul class="consequences-bullets">
              <li *ngIf="!dialog.consequences?.length">This record will be permanently erased from the database.</li>
              <li *ngIf="!dialog.consequences?.length">This action is permanent and cannot be undone or restored.</li>
              <li *ngFor="let c of dialog.consequences">{{ c }}</li>
            </ul>
          </div>

          <!-- Exact Title Verification Input (If targetTitle is specified) -->
          <div class="target-verification-box" *ngIf="dialog.targetTitle">
            <p class="verify-instruction">
              To confirm deletion, please type <strong class="target-phrase-pill">{{ dialog.targetTitle }}</strong> below:
            </p>
            <input
              type="text"
              [(ngModel)]="typedConfirmation"
              placeholder="Type the exact name to confirm..."
              class="verify-input"
              [class.matched]="isMatched(dialog)"
            />

            <div class="verification-status" *ngIf="typedConfirmation">
              <span *ngIf="isMatched(dialog)" class="status-valid">
                <span class="material-symbols-outlined">check_circle</span> Name matched. Deletion unlocked.
              </span>
              <span *ngIf="!isMatched(dialog)" class="status-invalid">
                <span class="material-symbols-outlined">cancel</span> Name does not match yet.
              </span>
            </div>
          </div>
        </div>

        <div class="confirm-actions">
          <button type="button" class="btn btn-cancel" (click)="handleResolve(dialog, false)">
            {{ dialog.cancelText || 'Cancel' }}
          </button>
          <button
            type="button"
            class="btn btn-confirm"
            [class.btn-danger]="dialog.type === 'danger' || !dialog.type"
            [class.btn-warning]="dialog.type === 'warning'"
            [class.btn-primary]="dialog.type === 'info'"
            [disabled]="!isMatched(dialog)"
            (click)="handleResolve(dialog, true)">
            {{ dialog.confirmText || 'Confirm' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Toast Stack Container */
    .toast-stack {
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 400px;
      width: calc(100vw - 48px);
      pointer-events: none;
    }

    /* Individual Toast Card */
    .toast-card {
      pointer-events: auto;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 16px 18px;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.15), 0 2px 6px rgba(15, 23, 42, 0.05);
      border: 1px solid #e2e8f0;
      animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      transition: all 0.2s ease;
    }

    @keyframes slideInRight {
      from { opacity: 0; transform: translateX(100%) scale(0.95); }
      to { opacity: 1; transform: translateX(0) scale(1); }
    }

    .toast-icon-box {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .toast-icon-box .material-symbols-outlined { font-size: 20px; }

    .toast-content { flex: 1; }
    .toast-title { font-size: 13.5px; font-weight: 800; color: #0f172a; margin-bottom: 2px; }
    .toast-message { font-size: 13px; color: #475569; line-height: 1.4; word-break: break-word; }

    .toast-close {
      background: none;
      border: none;
      font-size: 18px;
      color: #94a3b8;
      cursor: pointer;
      line-height: 1;
      padding: 0;
    }
    .toast-close:hover { color: #0f172a; }

    .toast-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      width: 100%;
      animation: progressLinear linear forwards;
    }
    @keyframes progressLinear { from { width: 100%; } to { width: 0%; } }

    /* Toast Color Schemes */
    .toast-success .toast-icon-box { background: rgba(34, 197, 94, 0.15); color: #16a34a; }
    .toast-success .toast-progress { background: #22c55e; }
    .toast-error .toast-icon-box { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
    .toast-error .toast-progress { background: #ef4444; }
    .toast-warning .toast-icon-box { background: rgba(245, 158, 11, 0.15); color: #d97706; }
    .toast-warning .toast-progress { background: #f59e0b; }
    .toast-info .toast-icon-box { background: rgba(59, 130, 246, 0.15); color: #2563eb; }
    .toast-info .toast-progress { background: #3b82f6; }

    /* Confirmation Modal Backdrop */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(4px);
      z-index: 1000000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: fadeIn 0.2s ease-out forwards;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .confirm-modal-box {
      background: #ffffff;
      border-radius: 20px;
      width: 100%;
      max-width: 480px;
      padding: 28px 24px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 16px;
      animation: scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      border: 1px solid #e2e8f0;
    }
    .danger-modal-box {
      border: 2px solid #ef4444;
    }

    @keyframes scaleUp {
      from { opacity: 0; transform: scale(0.92); }
      to { opacity: 1; transform: scale(1); }
    }

    .confirm-icon-circle {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .confirm-icon-circle .material-symbols-outlined { font-size: 32px; }

    .confirm-danger { background: #fee2e2; color: #dc2626; }
    .confirm-warning { background: #fef3c7; color: #d97706; }
    .confirm-info { background: #e0f2fe; color: #0284c7; }

    .confirm-body { width: 100%; }
    .confirm-body h3 { font-size: 19px; font-weight: 800; color: #0f172a; margin: 0 0 6px; }
    .confirm-main-msg { font-size: 13.5px; color: #475569; margin: 0 0 12px; line-height: 1.5; }

    /* Consequences Warning Box */
    .consequences-box {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 10px;
      padding: 12px 14px;
      margin: 10px 0;
      text-align: left;
    }
    .consequences-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
      font-weight: 800;
      color: #991b1b;
      margin-bottom: 6px;
    }
    .consequences-title span { font-size: 18px; }
    .consequences-bullets {
      margin: 0;
      padding-left: 18px;
      font-size: 12px;
      color: #7f1d1d;
      line-height: 1.4;
    }

    /* Target Verification Box */
    .target-verification-box {
      margin-top: 14px;
      text-align: left;
      width: 100%;
    }
    .verify-instruction {
      font-size: 12.5px;
      color: #0f172a;
      margin: 0 0 6px;
      font-weight: 600;
    }
    .target-phrase-pill {
      background: #fee2e2;
      color: #991b1b;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 13px;
    }
    .verify-input {
      width: 100%;
      padding: 10px 14px;
      border: 2px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13.5px;
      outline: none;
      box-sizing: border-box;
      transition: all 0.2s;
      background: #f8fafc;
    }
    .verify-input:focus {
      border-color: #ef4444;
      background: #ffffff;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
    }
    .verify-input.matched {
      border-color: #22c55e;
      background: #f0fdf4;
    }
    .verification-status { margin-top: 4px; font-size: 11.5px; font-weight: 700; }
    .status-valid { color: #16a34a; display: flex; align-items: center; gap: 4px; }
    .status-invalid { color: #dc2626; display: flex; align-items: center; gap: 4px; }
    .status-valid span, .status-invalid span { font-size: 15px; }

    .confirm-actions {
      display: flex;
      gap: 12px;
      width: 100%;
      margin-top: 8px;
    }
    .confirm-actions .btn {
      flex: 1;
      padding: 12px 18px;
      border-radius: 10px;
      font-size: 13.5px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease;
    }

    .btn-cancel { background: #f1f5f9; color: #475569; }
    .btn-cancel:hover { background: #e2e8f0; color: #1e293b; }

    .btn-danger { background: #dc2626; color: #ffffff; }
    .btn-danger:hover:not(:disabled) { background: #b91c1c; }
    .btn-danger:disabled { background: #fca5a5; cursor: not-allowed; opacity: 0.7; }

    .btn-warning { background: #d97706; color: #ffffff; }
    .btn-warning:hover { background: #b45309; }

    .btn-primary { background: #0050e5; color: #ffffff; }
    .btn-primary:hover { background: #003db3; }
  `]
})
export class ToastContainerComponent {
  typedConfirmation = '';

  constructor(public toastService: ToastService) {}

  isMatched(dialog: ConfirmDialogOptions): boolean {
    if (!dialog?.targetTitle) return true;
    if (!this.typedConfirmation) return false;
    return this.typedConfirmation.trim().toLowerCase() === dialog.targetTitle.trim().toLowerCase();
  }

  handleResolve(dialog: ConfirmDialogOptions, result: boolean): void {
    this.typedConfirmation = '';
    dialog.resolve(result);
  }
}
