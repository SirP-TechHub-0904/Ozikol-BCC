import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject, Observable } from 'rxjs';
import { ChatSoundService } from './chat-sound.service';
import { environment } from '../../../environments/environment';

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
  
  // Real-time Event Subjects
  private messageSubject = new Subject<ChatMessagePayload>();
  public message$ = this.messageSubject.asObservable();

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

  private connectionStatusSubject = new Subject<boolean>();
  public connectionStatus$ = this.connectionStatusSubject.asObservable();

  constructor(private chatSound: ChatSoundService) {}

  public startConnection(): void {
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.warn('No access token found. SignalR connection skipped.');
      return;
    }

    // Resolve API origin correctly from environment configuration
    const apiOrigin = environment.apiUrl.startsWith('http')
      ? environment.apiUrl.replace(/\/api\/?$/, '')
      : (typeof window !== 'undefined' ? `${window.location.origin}${environment.apiUrl.replace(/\/api\/?$/, '')}` : '');
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
