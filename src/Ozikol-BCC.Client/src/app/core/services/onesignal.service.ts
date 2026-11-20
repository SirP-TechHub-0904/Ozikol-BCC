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
 * Service for initializing and managing OneSignal Web Push notifications across the Angular Admin Client.
 * Automatically synchronizes with dynamic Central Master DB settings and maps authenticated User IDs to OneSignal external_id.
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

          // If user was already logged in before init, bind external_id immediately
          const userJson = localStorage.getItem('user');
          const tenantKey = localStorage.getItem('tenant_key');
          if (userJson) {
            try {
              const user = JSON.parse(userJson);
              const userId = user?.id || user?.userId;
              if (userId) {
                this.login(userId, tenantKey || undefined);
              }
            } catch {}
          }
        } catch (err) {
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
        // If browser permission is still in default state, prompt the user to enable
        if (OneSignal.Notifications && OneSignal.Notifications.permissionNative === 'default') {
          await OneSignal.Notifications.requestPermission();
        }
      } catch (err) {}
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
      } catch (err) {}
    });
  }

  /**
   * Requests browser permission for push notifications.
   */
  public async requestPermission(): Promise<boolean> {
    return new Promise((resolve) => {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          const accepted = await OneSignal.Notifications.requestPermission();
          resolve(!!accepted);
        } catch {
          resolve(false);
        }
      });
    });
  }
}
