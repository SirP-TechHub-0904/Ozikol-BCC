import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { SettingsService, ClientAppConfig } from './settings.service';
import { ApiService } from './api.service';

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
  private lastSyncedUserId = '';
  private static readonly ONESIGNAL_VAPID_PUBLIC_KEY =
    'BLDthX4IRSh5sBKkhfGVWo3tw7t4ZrJQK4PDshcFU-Ch5toYk92XLcV4ST1tYD-uyWty1Z0I2TI5rKn-ZxkbPuQ';

  constructor(
    private settingsService: SettingsService,
    private api: ApiService,
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
   * Resolves the currently logged-in user ID from localStorage or the JWT access_token payload.
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

      const token = localStorage.getItem('access_token');
      if (token && token.includes('.')) {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(window.atob(base64));
        const jwtUid =
          payload?.sub ||
          payload?.nameid ||
          payload?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
          payload?.userId ||
          payload?.id;
        if (jwtUid) return String(jwtUid);
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
          // Graceful fallback if push notifications are blocked by browser policy or OneSignal restrict_origin
          const userId = this.resolveCurrentUserId();
          const tenantKey = localStorage.getItem('tenant_key') || undefined;
          if (userId) {
            this.syncPushSubscriptionWithBackend(userId, tenantKey);
          }
        }
      });

      // Always ensure custom-domain users are synced to OneSignal via the backend REST API
      const currentUserId = this.resolveCurrentUserId();
      const currentTenantKey = localStorage.getItem('tenant_key') || undefined;
      if (currentUserId) {
        this.syncPushSubscriptionWithBackend(currentUserId, currentTenantKey);
      }
    });
  }

  /**
   * Links the authenticated Ozikol user ID to OneSignal external_id and tags with tenant key.
   * Also synchronizes the user and any active ServiceWorker PushSubscription directly via the backend
   * so custom tenant domains (which OneSignal's browser SDK blocks due to restrict_origin) still appear in OneSignal Audience.
   */
  public login(userId: string, tenantKey?: string): void {
    if (!userId) return;
    this.syncPushSubscriptionWithBackend(userId, tenantKey);

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
   * Converts a URL-safe base64 VAPID public key string into a Uint8Array for PushManager.subscribe().
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Returns true if the current device is running iOS/iPadOS (iPhone, iPad, iPod).
   */
  public isIosDevice(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return isIOS || isIPadOS;
  }

  /**
   * Returns true if the web app is running in standalone Home Screen mode (PWA).
   */
  public isStandalonePwa(): boolean {
    if (typeof window === 'undefined') return false;
    const nav: any = window.navigator;
    return (
      window.matchMedia?.('(display-mode: standalone)')?.matches === true ||
      nav?.standalone === true
    );
  }

  /**
   * Requests browser Notification permission while preserving the synchronous user gesture
   * across modern Promise-based browsers (Chrome, Firefox, Edge, Safari 16+) and legacy callback-based Safari.
   */
  private requestNativeNotificationPermission(): Promise<NotificationPermission> {
    return new Promise((resolve) => {
      try {
        const reqResult = window.Notification.requestPermission((perm) => {
          resolve(perm);
        });
        if (reqResult && typeof (reqResult as Promise<NotificationPermission>).then === 'function') {
          (reqResult as Promise<NotificationPermission>).then(resolve).catch(() => {
            resolve(window.Notification.permission);
          });
        }
      } catch {
        resolve(window.Notification?.permission || 'default');
      }
    });
  }

  /**
   * Registers the browser ServiceWorker Web Push subscription and syncs the endpoint/keys (or user identity)
   * to OneSignal through the Ozikol backend REST API (/api/NotificationsApi/register-push).
   */
  public async syncPushSubscriptionWithBackend(
    explicitUserId?: string,
    explicitTenantKey?: string,
    force = false,
    sendWelcomePush = false
  ): Promise<void> {
    if (!localStorage.getItem('access_token')) {
      return;
    }
    const userId = explicitUserId || this.resolveCurrentUserId() || 'authenticated';

    const tenantKey = explicitTenantKey || localStorage.getItem('tenant_key') || undefined;
    const tenantName = localStorage.getItem('tenant_name') || undefined;
    const permission = this.getPermissionStatus();
    if (!force && !sendWelcomePush && this.lastSyncedUserId === `${userId}:${permission}`) {
      return;
    }
    this.lastSyncedUserId = `${userId}:${permission}`;

    let endpoint: string | undefined;
    let p256dh: string | undefined;
    let auth: string | undefined;

    if (permission === 'granted' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        let reg = await navigator.serviceWorker.getRegistration('/');
        if (!reg) {
          reg = await navigator.serviceWorker.register('/OneSignalSDKWorker.js', { scope: '/' });
        }
        // Wait for the Service Worker to reach the 'activated' state before subscribing (critical for Safari & Firefox)
        const activeReg = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<ServiceWorkerRegistration | undefined>((resolve) => setTimeout(() => resolve(reg), 4000))
        ]);
        const targetReg = activeReg || reg;
        if (targetReg && targetReg.pushManager) {
          let sub = await targetReg.pushManager.getSubscription();
          if (!sub) {
            const appServerKey = this.urlBase64ToUint8Array(OneSignalService.ONESIGNAL_VAPID_PUBLIC_KEY);
            sub = await targetReg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: appServerKey as unknown as BufferSource
            });
          }
          if (sub) {
            const subJson = sub.toJSON();
            endpoint = subJson.endpoint;
            p256dh = subJson.keys?.['p256dh'];
            auth = subJson.keys?.['auth'];
          }
        }
      } catch {}
    }

    this.api.post<any>('NotificationsApi/register-push', {
      userId,
      tenantKey,
      tenantName,
      endpoint,
      p256dh,
      auth,
      sendWelcomePush
    }).subscribe({
      next: () => {},
      error: () => {}
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
   * Preserves the synchronous user gesture on the very first line so Safari (macOS/iOS) and Firefox never block the prompt.
   */
  public async enableAndPromptPushNotifications(explicitUserId?: string): Promise<{
    status: 'granted' | 'denied' | 'default' | 'unsupported';
    message: string;
  }> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      if (this.isIosDevice() && !this.isStandalonePwa()) {
        return {
          status: 'unsupported',
          message:
            'On iPhone/iPad (Safari), tap the Share button at the bottom of Safari and choose "Add to Home Screen", then open the app from your Home Screen to enable push notifications.'
        };
      }
      return {
        status: 'unsupported',
        message: 'Push notifications are not supported in this browser window. Please use a modern HTTPS browser or add this app to your Home Screen.'
      };
    }

    try {
      // 1. Trigger native browser Notification permission dialog IMMEDIATELY inside the user click gesture
      let permission: NotificationPermission = window.Notification.permission;
      if (permission !== 'granted') {
        permission = await this.requestNativeNotificationPermission();
      }

      // Initialize OneSignal SDK after capturing the synchronous user gesture
      this.init();

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
            if (OneSignal.Notifications?.requestPermission && window.Notification.permission === 'default') {
              await OneSignal.Notifications.requestPermission();
            }
            if (OneSignal.User?.PushSubscription?.optIn) {
              await OneSignal.User.PushSubscription.optIn();
            }
          } catch {}
        });
      }

      const finalPermission = window.Notification.permission || permission;

      if (finalPermission === 'granted') {
        await this.syncPushSubscriptionWithBackend(userId, tenantKey, true, true);
        return {
          status: 'granted',
          message: 'Push notifications are now active on this device!'
        };
      }

      if (finalPermission === 'denied') {
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent || '');
        return {
          status: 'denied',
          message: isSafari
            ? 'Notifications are blocked in Safari for this website. Open Safari Settings -> Websites -> Notifications, set this site to "Allow", and click Enable Notifications again.'
            : 'Push notifications are blocked in your browser site settings. Click the tune/lock icon next to the URL address bar, set "Notifications" to "Allow", and click Enable Notifications again.'
        };
      }

      return {
        status: 'default',
        message: 'Please click "Allow" on the browser prompt at the top of your screen to enable push notifications.'
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
