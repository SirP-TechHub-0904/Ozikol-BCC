import { Injectable, NgZone } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Payload received when website content, templates, pages, forms, or brand settings
 * are updated on the server or in another admin tab.
 */
export interface WebsiteContentUpdatedEvent {
  tenantKey?: string;
  source?: string;
  action?: string;
  method?: string;
  updatedAtUtc?: string;
  version: number;
}

const SYNC_CHANNEL_NAME = 'ozikol_site_content_sync';

/**
 * Real-time website content synchronization service for public storefront pages.
 * Connects anonymously to the SignalR NotificationHub (/hubs/notifications) and
 * listens to same-browser BroadcastChannel updates so any CMS, form, or branding
 * change clears local cached metadata and triggers an automatic silent re-fetch.
 */
@Injectable({
  providedIn: 'root'
})
export class WebsiteSyncService {
  private hubConnection: signalR.HubConnection | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private activeSubscribers = 0;

  private readonly contentUpdatedSubject = new Subject<WebsiteContentUpdatedEvent>();

  /**
   * Emits whenever server SignalR or a local Admin tab invalidates website content.
   */
  public readonly contentUpdated$: Observable<WebsiteContentUpdatedEvent> =
    this.contentUpdatedSubject.asObservable();

  constructor(private readonly ngZone: NgZone) {}

  /**
   * Starts the anonymous SignalR WebSocket and BroadcastChannel listeners
   * using reference counting across active storefront views.
   */
  public connect(): void {
    this.activeSubscribers += 1;
    this.ensureBroadcastChannel();
    this.ensureHubConnection();
  }

  /**
   * Releases a storefront subscriber and closes sockets when no listeners remain.
   */
  public disconnect(): void {
    this.activeSubscribers = Math.max(0, this.activeSubscribers - 1);
    if (this.activeSubscribers > 0) {
      return;
    }

    if (this.hubConnection) {
      const connection = this.hubConnection;
      this.hubConnection = null;
      connection.stop().catch(() => {});
    }

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
      } catch {
        // Ignore close errors on unsupported contexts
      }
      this.broadcastChannel = null;
    }
  }

  /**
   * Notifies open storefront tabs within the same browser immediately after an Admin save,
   * complementing the server-pushed SignalR WebSocket broadcast across all devices.
   */
  public notifyLocalMutation(source: string): void {
    if (typeof BroadcastChannel === 'undefined') {
      return;
    }

    try {
      const channel = this.broadcastChannel ?? new BroadcastChannel(SYNC_CHANNEL_NAME);
      const event: WebsiteContentUpdatedEvent = {
        source,
        version: Date.now(),
        updatedAtUtc: new Date().toISOString()
      };
      channel.postMessage(event);
      if (!this.broadcastChannel) {
        channel.close();
      }
    } catch {
      // BroadcastChannel is an optional same-origin enhancement
    }
  }

  private ensureBroadcastChannel(): void {
    if (this.broadcastChannel || typeof BroadcastChannel === 'undefined') {
      return;
    }

    try {
      this.broadcastChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
      this.broadcastChannel.onmessage = (message: MessageEvent<WebsiteContentUpdatedEvent>) => {
        this.ngZone.run(() => {
          this.handleInvalidation(message.data);
        });
      };
    } catch {
      this.broadcastChannel = null;
    }
  }

  private ensureHubConnection(): void {
    if (this.hubConnection || typeof window === 'undefined') {
      return;
    }

    const apiOrigin = this.resolveApiOrigin();
    const tenantKey = this.resolveTenantKey();
    const hubUrl = `${apiOrigin}/hubs/notifications?tenantKey=${encodeURIComponent(tenantKey)}`;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.on('WebsiteContentUpdated', (incoming?: Partial<WebsiteContentUpdatedEvent>) => {
      this.ngZone.run(() => {
        this.handleInvalidation(incoming);
      });
    });

    // Also refresh public site when brand settings are updated via SettingsApi
    connection.on('TenantBrandUpdated', () => {
      this.ngZone.run(() => {
        this.handleInvalidation({ source: 'SettingsApi', version: Date.now() });
      });
    });

    this.hubConnection = connection;
    connection.start().catch(err => {
      console.warn('[WebsiteSync] Real-time storefront connection failed:', err?.message || err);
    });
  }

  private handleInvalidation(incoming?: Partial<WebsiteContentUpdatedEvent>): void {
    this.clearCachedStorefrontMetadata();

    const event: WebsiteContentUpdatedEvent = {
      tenantKey: incoming?.tenantKey,
      source: incoming?.source ?? 'WebsiteContent',
      action: incoming?.action,
      method: incoming?.method,
      updatedAtUtc: incoming?.updatedAtUtc ?? new Date().toISOString(),
      version: incoming?.version || Date.now()
    };

    this.contentUpdatedSubject.next(event);
  }

  /**
   * Clears cached storefront branding entries from localStorage so updated
   * tenant names and favicons are re-applied cleanly on refresh.
   */
  private clearCachedStorefrontMetadata(): void {
    try {
      localStorage.removeItem('tenant_name');
      localStorage.removeItem('tenant_favicon');
    } catch {
      // Ignore storage errors in restricted browsing modes
    }
  }

  private resolveApiOrigin(): string {
    if (environment.apiUrl.startsWith('http')) {
      return environment.apiUrl.replace(/\/api\/?$/, '');
    }

    const relativePrefix = environment.apiUrl.replace(/\/api\/?$/, '');
    return `${window.location.origin}${relativePrefix}`;
  }

  private resolveTenantKey(): string {
    const storedKey = localStorage.getItem('tenant_key') || localStorage.getItem('tenant_domain');
    if (storedKey && storedKey.trim().length > 0) {
      return storedKey.trim();
    }

    const hostname = window.location.hostname;
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      const parts = hostname.split('.');
      if (parts.length > 1 && !['localhost', '127', 'www', 'api', 'central', 'admin'].includes(parts[0])) {
        return parts[0];
      }
      return hostname;
    }

    return 'workspace';
  }
}

