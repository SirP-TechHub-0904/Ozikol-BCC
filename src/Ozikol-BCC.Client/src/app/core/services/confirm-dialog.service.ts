import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * Options describing a custom confirmation (or reason-prompt) dialog.
 */
export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  confirmLabel?: string;
  cancelText?: string;
  cancelLabel?: string;
  /** Renders the confirm button in the destructive (red) style. */
  danger?: boolean;
  isDestructive?: boolean;
  /** When set, shows a text input (e.g. reason) and resolves with its value. */
  inputLabel?: string;
  inputPlaceholder?: string;
  inputRequired?: boolean;
}

export interface ConfirmDialogState extends ConfirmDialogOptions {
  inputValue: string;
  resolve: (value: { confirmed: boolean; value: string }) => void;
}

/**
 * Replaces native browser `confirm()` / `prompt()` with the branded custom modal
 * rendered by `ConfirmDialogComponent` (mounted once in the app shell).
 */
@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  readonly state$ = new BehaviorSubject<ConfirmDialogState | null>(null);

  /** Shows a Yes/No confirmation. Resolves true when confirmed. */
  confirm(options: ConfirmDialogOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.state$.next({
        ...options,
        inputValue: '',
        resolve: (r) => resolve(r.confirmed)
      });
    });
  }

  /** Shows a confirmation with a text input. Resolves the entered text, or null if cancelled. */
  prompt(options: ConfirmDialogOptions): Promise<string | null> {
    return new Promise<string | null>((resolve) => {
      this.state$.next({
        inputLabel: 'Reason',
        ...options,
        inputValue: '',
        resolve: (r) => resolve(r.confirmed ? r.value : null)
      });
    });
  }

  close(confirmed: boolean): void {
    const s = this.state$.value;
    if (!s) return;
    if (confirmed && s.inputLabel && s.inputRequired && !s.inputValue.trim()) return;
    this.state$.next(null);
    s.resolve({ confirmed, value: s.inputValue.trim() });
  }
}
