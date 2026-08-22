import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  icon?: string;
}

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  targetTitle?: string;
  consequences?: string[];
  resolve: (value: boolean) => void;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastsSubject = new BehaviorSubject<ToastMessage[]>([]);
  public toasts$: Observable<ToastMessage[]> = this.toastsSubject.asObservable();

  private confirmSubject = new BehaviorSubject<ConfirmDialogOptions | null>(null);
  public confirm$: Observable<ConfirmDialogOptions | null> = this.confirmSubject.asObservable();

  /**
   * Show a Success Toast Notification
   */
  success(message: string, title: string = 'Success', duration: number = 4000): void {
    this.show({
      id: this.generateId(),
      type: 'success',
      title,
      message,
      duration,
      icon: 'check_circle'
    });
  }

  /**
   * Show an Error Toast Notification
   */
  error(message: string, title: string = 'Error', duration: number = 5000): void {
    this.show({
      id: this.generateId(),
      type: 'error',
      title,
      message,
      duration,
      icon: 'error'
    });
  }

  /**
   * Show a Warning Toast Notification
   */
  warning(message: string, title: string = 'Attention', duration: number = 4500): void {
    this.show({
      id: this.generateId(),
      type: 'warning',
      title,
      message,
      duration,
      icon: 'warning'
    });
  }

  /**
   * Show an Information Toast Notification
   */
  info(message: string, title: string = 'Information', duration: number = 4000): void {
    this.show({
      id: this.generateId(),
      type: 'info',
      title,
      message,
      duration,
      icon: 'info'
    });
  }

  /**
   * Show a Confirmation Modal Dialog (Returns a Promise<boolean>)
   */
  confirm(
    title: string,
    message: string,
    confirmText: string = 'Confirm',
    cancelText: string = 'Cancel',
    type: 'danger' | 'warning' | 'info' = 'danger',
    targetTitle?: string,
    consequences?: string[]
  ): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.confirmSubject.next({
        title,
        message,
        confirmText,
        cancelText,
        type,
        targetTitle,
        consequences,
        resolve: (result: boolean) => {
          this.confirmSubject.next(null);
          resolve(result);
        }
      });
    });
  }

  /**
   * Add a toast to the active stack and setup auto-dismiss timer
   */
  show(toast: ToastMessage): void {
    const current = this.toastsSubject.value;
    this.toastsSubject.next([...current, toast]);

    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        this.dismiss(toast.id);
      }, toast.duration);
    }
  }

  /**
   * Dismiss/Remove a toast by ID
   */
  dismiss(id: string): void {
    const current = this.toastsSubject.value;
    this.toastsSubject.next(current.filter(t => t.id !== id));
  }

  /**
   * Clear all active toasts
   */
  clear(): void {
    this.toastsSubject.next([]);
  }

  private generateId(): string {
    return 'toast_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
  }
}
