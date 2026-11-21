import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { SettingsService, ClientAppConfig } from './settings.service';

declare global {
  interface Window {
    OneSignalDeferred?: any[];
    OneSignal?: any;
  }
}

/**
 * Service for initializing and managing OneSignal & Browser Web Push notifications.
 * Automatically synchronizes with dynamic Central Master DB settings, maps authenticated User IDs
 * to OneSignal external_id, and allows existing users to re-trigger and enable push permissions from User Settings.
 */
@Injectable({
  providedIn: 'root'
})
export class OneSignalService {
  private isInitialized = false;

  constructor(
    private settingsService: SettingsService,
    private router: Router
  ) {}

  /**
   * Returns the current browser push notification permission state.
   */
  public getPermissionStatus(): 'granted' | 'denied' | 'default' | 'unsupported' {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission as 'granted' | 'denied' | 'default';
  }

  /**
   * Resolves the currently logged-in user ID from localStorage.
   */
  private resolveCurrentUserId(): string | undefined {
    try {
      const directId = localStorage.getItem('user_id');
      if (directId) return directId;

      for (const key of ['user', 'auth_user', 'currentUser']) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          const uid = parsed?.id || parsed?.userId;
          if (uid) return uid;
        }
      }
    } catch {}
    return undefined;
  }

  /**
   * Initializes the OneSignal Web Push SDK dynamically using the OneSignal App ID resolved from Central DB.
   */
  public init(): void {
    if (this.isInitialized) return;

    this.settingsService.clientConfig$.subscribe((config: ClientAppConfig) => {
      const appId = config?.oneSignalAppId;
      if (!appId || this.isInitialized) {
        return;
      }

      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          await OneSignal.init({
            appId: appId,
            allowLocalhostAsSecureOrigin: true,
            notifyButton: {
              enable: false
            }
          });
          this.isInitialized = true;

          // Deep-link routing on notification click
          if (OneSignal.Notifications && typeof OneSignal.Notifications.addEventListener === 'function') {
            OneSignal.Notifications.addEventListener('click', (event: any) => {
              const url = event?.notification?.launchURL || event?.notification?.additionalData?.action_url;
              if (url && typeof url === 'string') {
                if (url.startsWith('http://') || url.startsWith('https://')) {
                  window.location.href = url;
                } else {
                  this.router.navigateByUrl(url);
                }
              }
            });
          }

          // Bind external_id immediately if user is logged in
          const userId = this.resolveCurrentUserId();
          const tenantKey = localStorage.getItem('tenant_key') || undefined;
          if (userId) {
            this.login(userId, tenantKey);
          }
        } catch {
          // Graceful fallback if push notifications are blocked by browser policy
        }
      });
    });
  }

  /**
   * Links the authenticated Ozikol user ID to OneSignal external_id and tags with tenant key.
   */
  public login(userId: string, tenantKey?: string): void {
    if (!userId) return;
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        await OneSignal.login(userId);
        if (tenantKey) {
          await OneSignal.User.addTag('tenant_key', tenantKey.trim().toLowerCase());
        }
        if (OneSignal.User?.PushSubscription?.optIn) {
          await OneSignal.User.PushSubscription.optIn();
        }
        if (OneSignal.Notifications && OneSignal.Notifications.permissionNative === 'default') {
          await OneSignal.Notifications.requestPermission();
        }
      } catch {}
    });
  }

  /**
   * Clears user identity from OneSignal upon logout.
   */
  public logout(): void {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        await OneSignal.logout();
      } catch {}
    });
  }

  /**
   * Explicitly triggers browser push permission prompt and OneSignal subscription opt-in for existing users.
   */
  public async enableAndPromptPushNotifications(explicitUserId?: string): Promise<{
    status: 'granted' | 'denied' | 'default' | 'unsupported';
    message: string;
  }> {
    this.init();

    if (typeof window === 'undefined' || !('Notification' in window)) {
      return {
        status: 'unsupported',
        message: 'Push notifications are not supported by this browser.'
      };
    }

    try {
      // 1. Trigger native browser Notification permission dialog
      const permission = await window.Notification.requestPermission();

      // 2. Also opt-in & bind user ID in OneSignal if loaded
      const userId = explicitUserId || this.resolveCurrentUserId();
      const tenantKey = localStorage.getItem('tenant_key') || undefined;

      if (window.OneSignalDeferred) {
        window.OneSignalDeferred.push(async (OneSignal: any) => {
          try {
            if (userId) {
              await OneSignal.login(userId);
            }
            if (tenantKey && OneSignal.User?.addTag) {
              await OneSignal.User.addTag('tenant_key', tenantKey.trim().toLowerCase());
            }
            if (OneSignal.Notifications?.requestPermission) {
              await OneSignal.Notifications.requestPermission();
            }
            if (OneSignal.User?.PushSubscription?.optIn) {
              await OneSignal.User.PushSubscription.optIn();
            }
            if (OneSignal.Slidedown?.promptPush) {
              await OneSignal.Slidedown.promptPush({ force: true });
            }
          } catch {}
        });
      }

      if (permission === 'granted') {
        try {
          new window.Notification('Push Notifications Enabled', {
            body: 'Your device is now subscribed to receive instant shift, rota, and security push alerts.',
            icon: '/favicon.ico'
          });
        } catch {}

        return {
          status: 'granted',
          message: 'Push notifications are now enabled and active for this device.'
        };
      }

      if (permission === 'denied') {
        return {
          status: 'denied',
          message:
            'Push notifications are currently blocked in your browser site settings. Click the tune/lock icon next to the URL address bar, set "Notifications" to "Allow", and click Enable Push Notifications again.'
        };
      }

      return {
        status: 'default',
        message: 'Please click "Allow" on the browser prompt to enable push notifications.'
      };
    } catch {
      return {
        status: this.getPermissionStatus(),
        message: 'Could not trigger the browser push prompt. Please check your browser site notification settings.'
      };
    }
  }

  /**
   * Requests browser permission for push notifications.
   */
  public async requestPermission(): Promise<boolean> {
    const res = await this.enableAndPromptPushNotifications();
    return res.status === 'granted';
  }
}
