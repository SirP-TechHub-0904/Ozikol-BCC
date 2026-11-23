import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject, Observable } from 'rxjs';
import { ChatSoundService } from './chat-sound.service';
import { ApiService } from './api.service';

export interface ChatMessagePayload {
  id: string;
  groupId: string;
  groupTitle?: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  messageType: string;
  fileId?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  replyToId?: string;
  replyToUserName?: string;
  replyToContent?: string;
  mentionedUserIds?: string;
  deliveryStatus: string;
  createdAt: string;
  isDirectMessage: boolean;
  recipientUserId?: string;
  reactions?: { [emoji: string]: string[] }; // emoji -> array of userNames
}

@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  private hubConnection!: signalR.HubConnection;
  private notificationHubConnection!: signalR.HubConnection;
  private displayedNotificationKeys = new Set<string>();
  
  // Real-time Event Subjects
  private messageSubject = new Subject<ChatMessagePayload>();
  public message$ = this.messageSubject.asObservable();

  private notificationSubject = new Subject<any>();
  public notification$ = this.notificationSubject.asObservable();

  private notificationCountSubject = new Subject<number>();
  public notificationCount$ = this.notificationCountSubject.asObservable();

  private typingSubject = new Subject<{ groupId: string, userId: string, userName: string, isTyping: boolean, recipientUserId?: string }>();
  public typing$ = this.typingSubject.asObservable();

  private readReceiptSubject = new Subject<{ messageId: string, userId: string, readAt: string }>();
  public readReceipt$ = this.readReceiptSubject.asObservable();

  private reactionSubject = new Subject<{ messageId: string, emoji: string, userId: string, userName: string }>();
  public reaction$ = this.reactionSubject.asObservable();

  private pinSubject = new Subject<{ messageId: string, isPinned: boolean, pinnedBy: string, previewText: string }>();
  public pin$ = this.pinSubject.asObservable();

  private deleteSubject = new Subject<{ messageId: string, deletedContent: string }>();
  public delete$ = this.deleteSubject.asObservable();

  private presenceSubject = new Subject<{ userId: string, status: string, timestamp: string }>();
  public presence$ = this.presenceSubject.asObservable();

  private permissionUpdatedSubject = new Subject<{ userId: string, email?: string, isAdmin: boolean, timestamp: string }>();
  public permissionUpdated$ = this.permissionUpdatedSubject.asObservable();

  private brandUpdatedSubject = new Subject<{ companyName: string, companyLogoUrl: string, companyIconUrl: string, companyWhiteLogoUrl?: string, primaryColor?: string, secondaryColor?: string, updatedAtUtc: string }>();
  public brandUpdated$ = this.brandUpdatedSubject.asObservable();

  private aliasesUpdatedSubject = new Subject<any>();
  public aliasesUpdated$ = this.aliasesUpdatedSubject.asObservable();

  private sessionRevokedSubject = new Subject<{ userId: string, terminatedSessionIds: string[], terminatedJwtIds: string[], timestamp: string }>();
  public sessionRevoked$ = this.sessionRevokedSubject.asObservable();

  /// <summary>
  /// Subject and observable emitted when Central or tenant billing updates feature availability, pricing, or active subscriptions.
  /// </summary>
  private billingUpdatedSubject = new Subject<any>();
  public billingUpdated$ = this.billingUpdatedSubject.asObservable();

  private connectionStatusSubject = new Subject<boolean>();
  public connectionStatus$ = this.connectionStatusSubject.asObservable();

  constructor(private chatSound: ChatSoundService) {}

  public startConnection(): void {
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.warn('No access token found. SignalR connection skipped.');
      return;
    }

    // Resolve API origin dynamically across localhost, platform subdomains, and sovereign custom domains
    const apiOrigin = ApiService.resolveDynamicApiOrigin();
    const tenantKey = localStorage.getItem('tenant_key') || localStorage.getItem('tenant_domain') || '';
    const hubUrl = `${apiOrigin}/hubs/group-chat?tenant=${encodeURIComponent(tenantKey)}`;

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.hubConnection
      .start()
      .then(() => {
        console.log('[SignalR] Connected successfully to GroupChatHub at', hubUrl);
        this.connectionStatusSubject.next(true);
        this.registerOnServerEvents();
      })
      .catch(err => {
        console.error('[SignalR] Connection failed:', err);
        this.connectionStatusSubject.next(false);
      });

    this.hubConnection.onclose(() => this.connectionStatusSubject.next(false));
    this.hubConnection.onreconnected(() => this.connectionStatusSubject.next(true));

    this.startNotificationHubConnection(apiOrigin, tenantKey, token);
  }

  /**
   * Connects to the dedicated real-time NotificationHub (/hubs/notifications) so that in-app alerts,
   * unread badge counts, and native browser Web Notifications trigger across all sovereign custom domains.
   */
  private startNotificationHubConnection(apiOrigin: string, tenantKey: string, token: string): void {
    if (this.notificationHubConnection &&
        (this.notificationHubConnection.state === signalR.HubConnectionState.Connected ||
         this.notificationHubConnection.state === signalR.HubConnectionState.Connecting)) {
      return;
    }

    const notifHubUrl = `${apiOrigin}/hubs/notifications?tenant=${encodeURIComponent(tenantKey)}`;
    this.notificationHubConnection = new signalR.HubConnectionBuilder()
      .withUrl(notifHubUrl, {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.notificationHubConnection.on('ReceiveNotification', (notif: any) => {
      const dedupeKey = notif?.id
        ? String(notif.id)
        : `${notif?.title || notif?.subject || ''}|${notif?.message || notif?.content || ''}`;
      if (this.displayedNotificationKeys.has(dedupeKey)) {
        return;
      }
      this.displayedNotificationKeys.add(dedupeKey);
      setTimeout(() => this.displayedNotificationKeys.delete(dedupeKey), 30000);

      this.notificationSubject.next(notif);
      this.chatSound.playMessageSound();
      this.showSystemPushNotification(notif);
    });

    this.notificationHubConnection.on('NotificationCountUpdated', (count: number) => {
      this.notificationCountSubject.next(count);
    });

    this.notificationHubConnection.on('BillingUpdated', (data: any) => {
      this.billingUpdatedSubject.next(data);
    });

    this.notificationHubConnection
      .start()
      .then(() => {
        if (tenantKey) {
          this.notificationHubConnection.invoke('JoinTenantGroup', tenantKey).catch(() => {});
        }
      })
      .catch(() => {});
  }

  /**
   * Dispatches a native OS/Browser Push Notification via the Service Worker or Notification API
   * whenever a live platform notification arrives over SignalR (works on every custom tenant domain),
   * always branding the push alert with the tenant's organization name and tenant logo/icon.
   * Uses a stable notification tag and omits non-monochrome badge URLs so Chrome on Android
   * deduplicates alerts cleanly and never flags them as "Possible spam".
   */
  private showSystemPushNotification(notif: any): void {
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }
    const tenantName = (localStorage.getItem('tenant_name') || '').trim();
    let title = (notif?.title || notif?.subject || 'Workspace Alert').trim();
    if (tenantName && !title.toLowerCase().includes(tenantName.toLowerCase())) {
      title = `${tenantName}: ${title}`;
    }
    const rawBody = notif?.message || notif?.content || '';
    const cleanBody = String(rawBody).replace(/<[^>]*>?/gm, '').trim();
    const icon = localStorage.getItem('tenant_icon') || localStorage.getItem('tenant_logo') || '/favicon.ico';
    const actionUrl = notif?.actionUrl || '/users/workspace/notifications';
    const tag = notif?.id ? `oz-notif-${notif.id}` : `oz-notif-${title}-${cleanBody.substring(0, 40)}`;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg && typeof reg.showNotification === 'function') {
          reg.showNotification(title, {
            body: cleanBody,
            icon,
            tag,
            data: { url: actionUrl }
          }).catch(() => {
            try { new Notification(title, { body: cleanBody, icon, tag }); } catch {}
          });
        } else {
          try { new Notification(title, { body: cleanBody, icon, tag }); } catch {}
        }
      }).catch(() => {
        try { new Notification(title, { body: cleanBody, icon, tag }); } catch {}
      });
    } else {
      try { new Notification(title, { body: cleanBody, icon, tag }); } catch {}
    }
  }

  private registerOnServerEvents(): void {
    // 1. Message received (Group or DM)
    this.hubConnection.on('ReceiveMessage', (data: ChatMessagePayload) => {
      this.messageSubject.next(data);
      const currentUserId = this.getCurrentUserId();
      if (data.userId !== currentUserId) {
        this.chatSound.playMessageSound();
        this.showDesktopNotification(data);
      } else {
        this.chatSound.playSentSound();
      }
    });

    // 2. Typing indicator
    this.hubConnection.on('UserTyping', (groupId: string, userId: string, userName: string, isTyping: boolean, recipientUserId?: string) => {
      this.typingSubject.next({ groupId, userId, userName, isTyping, recipientUserId });
    });

    // 3. Read receipt
    this.hubConnection.on('MessageRead', (messageId: string, userId: string, readAt: string) => {
      this.readReceiptSubject.next({ messageId, userId, readAt });
    });

    // 4. Emoji reaction
    this.hubConnection.on('MessageReacted', (messageId: string, emoji: string, userId: string, userName: string) => {
      this.reactionSubject.next({ messageId, emoji, userId, userName });
    });

    // 5. Message pinned
    this.hubConnection.on('MessagePinned', (messageId: string, isPinned: boolean, pinnedBy: string, previewText: string) => {
      this.pinSubject.next({ messageId, isPinned, pinnedBy, previewText });
    });

    // 6. Message deleted
    this.hubConnection.on('MessageDeleted', (messageId: string, deletedContent: string) => {
      this.deleteSubject.next({ messageId, deletedContent });
    });

    // 7. Presence update
    this.hubConnection.on('PresenceUpdate', (userId: string, status: string, timestamp: string) => {
      this.presenceSubject.next({ userId, status, timestamp });
    });

    // 8. User Security & Permission Real-time Update
    this.hubConnection.on('UserPermissionsUpdated', (data: { userId: string, email?: string, isAdmin: boolean, timestamp: string }) => {
      console.log('[SignalR] Real-time UserPermissionsUpdated event received:', data);
      this.permissionUpdatedSubject.next(data);
    });

    // 9. Real-time Tenant Brand Identity Update
    this.hubConnection.on('TenantBrandUpdated', (data: any) => {
      console.log('[SignalR] Real-time TenantBrandUpdated event received:', data);
      this.brandUpdatedSubject.next(data);
    });

    // 10. Real-time Terminology Aliases Update
    this.hubConnection.on('TenantAliasesUpdated', (data: any) => {
      console.log('[SignalR] Real-time TenantAliasesUpdated event received:', data);
      this.aliasesUpdatedSubject.next(data);
    });

    // 11. Real-time Session Revocation & Disconnect
    this.hubConnection.on('SessionRevoked', (data: { userId: string, terminatedSessionIds: string[], terminatedJwtIds: string[], timestamp: string }) => {
      console.log('[SignalR] Real-time SessionRevoked event received:', data);
      this.sessionRevokedSubject.next(data);
    });

    // 12. Real-time Billing & Feature Catalog Sync Update
    this.hubConnection.on('BillingUpdated', (data: any) => {
      console.log('[SignalR] Real-time BillingUpdated event received:', data);
      this.billingUpdatedSubject.next(data);
    });
  }

  public sendMessage(groupId: string, content: string, replyToId?: string, mentionedUserIds?: string, recipientUserId?: string): Promise<void> {
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      return this.hubConnection.invoke('SendMessage', groupId, content, replyToId || null, mentionedUserIds || null, recipientUserId || null);
    }
    return Promise.reject('SignalR is not connected');
  }

  public sendTyping(groupId: string, isTyping: boolean, recipientUserId?: string): void {
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      this.hubConnection.invoke('SendTyping', groupId, isTyping, recipientUserId || null).catch(() => {});
    }
  }

  public markAsRead(groupId: string, messageId: string): void {
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      this.hubConnection.invoke('MarkAsRead', groupId, messageId).catch(() => {});
    }
  }

  public reactToMessage(groupId: string, messageId: string, emoji: string): void {
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      this.hubConnection.invoke('ReactToMessage', groupId, messageId, emoji).catch(() => {});
    }
  }

  public joinGroup(groupId: string): void {
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      this.hubConnection.invoke('JoinGroup', groupId).catch(() => {});
    }
  }

  public leaveGroup(groupId: string): void {
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      this.hubConnection.invoke('LeaveGroup', groupId).catch(() => {});
    }
  }

  private getCurrentUserId(): string {
    const userStr = localStorage.getItem('auth_user') || localStorage.getItem('user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        return u.id || u.userId || '';
      } catch {
        return '';
      }
    }
    return '';
  }

  private showDesktopNotification(data: ChatMessagePayload): void {
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
      const title = data.isDirectMessage ? `${data.userName} (Direct Message)` : `${data.userName} in ${data.groupTitle || 'Group'}`;
      new Notification(title, {
        body: data.content || (data.fileName ? `Sent a file: ${data.fileName}` : 'New message'),
        icon: data.userAvatar || '/assets/icons/chat-icon.png'
      });
    }
  }
}
