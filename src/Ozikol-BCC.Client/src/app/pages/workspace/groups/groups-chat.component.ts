import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { SignalRService, ChatMessagePayload } from '../../../core/services/signalr.service';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { ChatSoundService } from '../../../core/services/chat-sound.service';
import { Subscription } from 'rxjs';

interface ChatReaction {
  emoji: string;
  count: number;
  users: string[];
}

interface LocalMessage {
  id: string;
  groupId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userRole?: string;
  content: string;
  messageType: string;
  fileId?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  replyToId?: string;
  replyToUserName?: string;
  replyToContent?: string;
  deliveryStatus: 'Sent' | 'Delivered' | 'Read';
  createdAt: string;
  isDirectMessage: boolean;
  recipientUserId?: string;
  reactions: ChatReaction[];
  isPinned?: boolean;
  isStarred?: boolean;
  isAudio?: boolean;
}

@Component({
  selector: 'app-groups-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="whatsapp-container" [class.fullscreen-mode]="isFullScreen">
      <!-- ========================================================= -->
      <!-- 1. LEFT SIDEBAR: Conversations List                       -->
      <!-- ========================================================= -->
      <aside class="chat-sidebar" [class.mobile-hidden]="activeChatId && !isMobileSidebarOpen">
        <!-- User Profile Bar / Sidebar Header -->
        <div class="sidebar-user-header">
          <div class="user-avatar-pill">
            <div class="avatar-circle">
              {{ currentUserName.charAt(0).toUpperCase() }}
            </div>
            <span class="user-name-display">{{ currentUserName }}</span>
          </div>

          <div class="header-tool-icons">
            <button type="button" class="tool-btn" (click)="openNewChatModal()" title="New Direct Message">
              <span class="material-symbols-outlined">rate_review</span>
            </button>
            <button type="button" class="tool-btn" (click)="refreshChats()" title="Refresh">
              <span class="material-symbols-outlined">refresh</span>
            </button>
          </div>
        </div>

        <!-- Search Bar & Filters -->
        <div class="sidebar-search-box">
          <div class="search-input-wrap">
            <span class="material-symbols-outlined">search</span>
            <input type="text" [(ngModel)]="searchQuery" (input)="onSearchFilter()" placeholder="Search chats or messages..." />
            <button *ngIf="searchQuery" type="button" class="clear-search" (click)="searchQuery = ''; onSearchFilter()">✕</button>
          </div>
        </div>

        <!-- Filter Tabs (All / Groups / DMs / Starred) -->
        <div class="sidebar-filter-tabs">
          <button type="button" class="tab-chip" [class.active]="sidebarTab === 'all'" (click)="sidebarTab = 'all'">All</button>
          <button type="button" class="tab-chip" [class.active]="sidebarTab === 'groups'" (click)="sidebarTab = 'groups'">
            Groups ({{ groups.length }})
          </button>
          <button type="button" class="tab-chip" [class.active]="sidebarTab === 'dms'" (click)="sidebarTab = 'dms'">
            Direct Messages ({{ dms.length }})
          </button>
          <button type="button" class="tab-chip" [class.active]="sidebarTab === 'starred'" (click)="sidebarTab = 'starred'">
            ⭐ Starred
          </button>
        </div>

        <!-- Scrollable Chat List -->
        <div class="sidebar-chat-list">
          <!-- GROUP CHATS -->
          <ng-container *ngIf="sidebarTab === 'all' || sidebarTab === 'groups'">
            <div class="chat-category-header" *ngIf="filteredGroups.length > 0">
              <span>GROUPS & COMMITTEES</span>
            </div>
            <div
              class="chat-row"
              *ngFor="let g of filteredGroups"
              [class.active]="activeChatId === g.id && activeChatType === 'group'"
              (click)="selectGroup(g)"
            >
              <div class="avatar-wrap">
                <div class="group-avatar-icon">
                  <span class="material-symbols-outlined">groups</span>
                </div>
              </div>
              <div class="chat-row-main">
                <div class="row-top">
                  <span class="chat-title">{{ g.title }}</span>
                  <span class="chat-time" *ngIf="g.lastMessage">{{ formatShortTime(g.lastMessage.createdAt) }}</span>
                </div>
                <div class="row-bottom">
                  <p class="chat-snippet" *ngIf="g.lastMessage">
                    <span class="snippet-sender">{{ g.lastMessage.senderName }}:</span> {{ g.lastMessage.content }}
                  </p>
                  <p class="chat-snippet italic" *ngIf="!g.lastMessage">Tap to start conversation</p>
                  <span class="unread-badge" *ngIf="g.unreadCount > 0">{{ g.unreadCount }}</span>
                </div>
              </div>
            </div>
          </ng-container>

          <!-- DIRECT MESSAGES -->
          <ng-container *ngIf="sidebarTab === 'all' || sidebarTab === 'dms'">
            <div class="chat-category-header" *ngIf="filteredDms.length > 0">
              <span>DIRECT MESSAGES</span>
            </div>
            <div
              class="chat-row"
              *ngFor="let dm of filteredDms"
              [class.active]="activeChatId === dm.otherUserId && activeChatType === 'dm'"
              (click)="selectDirectMessage(dm)"
            >
              <div class="avatar-wrap">
                <div class="user-avatar-icon">
                  {{ dm.otherUserName ? dm.otherUserName.charAt(0).toUpperCase() : 'U' }}
                </div>
                <span class="online-indicator" [class.online]="dm.presence === 'Online'"></span>
              </div>
              <div class="chat-row-main">
                <div class="row-top">
                  <span class="chat-title">{{ dm.otherUserName }}</span>
                  <span class="chat-time" *ngIf="dm.lastMessage">{{ formatShortTime(dm.lastMessage.createdAt) }}</span>
                </div>
                <div class="row-bottom">
                  <p class="chat-snippet" *ngIf="dm.lastMessage">
                    {{ dm.lastMessage.content }}
                  </p>
                  <p class="chat-snippet italic" *ngIf="!dm.lastMessage">Direct message</p>
                  <span class="unread-badge" *ngIf="dm.unreadCount > 0">{{ dm.unreadCount }}</span>
                </div>
              </div>
            </div>
          </ng-container>

          <!-- STARRED MESSAGES LIST -->
          <ng-container *ngIf="sidebarTab === 'starred'">
            <div class="starred-messages-list" *ngIf="starredMessages.length > 0">
              <div class="starred-item" *ngFor="let sm of starredMessages" (click)="jumpToMessage(sm)">
                <div class="starred-head">
                  <strong>{{ sm.userName }}</strong>
                  <span>{{ formatShortTime(sm.createdAt) }}</span>
                </div>
                <p class="starred-content">{{ sm.content }}</p>
              </div>
            </div>
            <div class="empty-tab" *ngIf="starredMessages.length === 0">
              <span class="material-symbols-outlined">star_border</span>
              <p>No starred messages yet.</p>
            </div>
          </ng-container>
        </div>
      </aside>

      <!-- ========================================================= -->
      <!-- 2. MAIN ACTIVE CONVERSATION CANVAS                        -->
      <!-- ========================================================= -->
      <main class="chat-main" [class.mobile-hidden]="!activeChatId" (dragover)="onDragOver($event)" (drop)="onFileDrop($event)">
        <!-- Drag & Drop Upload Overlay -->
        <div class="dropzone-overlay" *ngIf="isDraggingFile">
          <span class="material-symbols-outlined icon-drop">cloud_upload</span>
          <h3>Drop files here to upload & attach to chat</h3>
        </div>

        <!-- ACTIVE CHAT HEADER -->
        <header class="main-chat-header" *ngIf="activeChatId">
          <div class="header-left">
            <button type="button" class="back-mobile-btn" (click)="closeActiveChat()">
              <span class="material-symbols-outlined">arrow_back</span>
            </button>
            <div class="header-avatar">
              <span *ngIf="activeChatType === 'dm'">{{ activeTitle ? activeTitle.charAt(0).toUpperCase() : 'U' }}</span>
              <span *ngIf="activeChatType === 'group'" class="material-symbols-outlined">groups</span>
            </div>
            <div class="header-meta">
              <div class="title-row">
                <h2 class="active-title">{{ activeTitle }}</h2>
                <span class="role-badge" *ngIf="activeChatType === 'dm'">{{ activeUserRole || 'Member' }}</span>
              </div>
              <p class="active-presence" [class.text-green]="activePresence === 'Online'">
                <span *ngIf="activeTypingUser" class="typing-notice">
                  <em>{{ activeTypingUser }} is typing...</em>
                </span>
                <span *ngIf="!activeTypingUser">
                  {{ activeChatType === 'group' ? (activeMemberCount + ' members') : activePresence }}
                </span>
              </p>
            </div>
          </div>

          <div class="header-right">
            <!-- Search in chat -->
            <button type="button" class="icon-action" (click)="toggleSearchInChat()" title="Search in conversation">
              <span class="material-symbols-outlined">search</span>
            </button>

            <!-- Export Chat -->
            <button type="button" class="icon-action" (click)="exportChatTranscript()" title="Export Chat Transcript as Text/PDF">
              <span class="material-symbols-outlined">download</span>
            </button>

            <!-- Full-Screen Pop-Out Mode -->
            <button type="button" class="icon-action" (click)="toggleFullScreen()" [title]="isFullScreen ? 'Exit Fullscreen' : 'Fullscreen Pop-Out'">
              <span class="material-symbols-outlined">{{ isFullScreen ? 'fullscreen_exit' : 'open_in_full' }}</span>
            </button>

            <!-- Info Drawer Trigger -->
            <button type="button" class="icon-action" (click)="isDrawerOpen = !isDrawerOpen" title="Details & Media">
              <span class="material-symbols-outlined">info</span>
            </button>
          </div>
        </header>

        <!-- SEARCH IN CHAT BAR (WHEN OPEN) -->
        <div class="in-chat-search-bar" *ngIf="isSearchingInChat">
          <span class="material-symbols-outlined">search</span>
          <input type="text" [(ngModel)]="inChatSearchTerm" placeholder="Find in this chat..." />
          <button type="button" class="btn-close-search" (click)="isSearchingInChat = false; inChatSearchTerm = ''">✕</button>
        </div>

        <!-- PINNED MESSAGE ANNOUNCEMENT BANNER -->
        <div class="pinned-banner" *ngIf="pinnedMessage">
          <div class="pinned-icon">
            <span class="material-symbols-outlined">push_pin</span>
          </div>
          <div class="pinned-text">
            <strong>Pinned Announcement:</strong>
            <span>{{ pinnedMessage.content }}</span>
          </div>
          <button type="button" class="unpin-btn" *ngIf="isAdmin" (click)="unpinMessage(pinnedMessage)">✕</button>
        </div>

        <!-- MESSAGES TIMELINE SCROLL CANVAS (WhatsApp Wallpaper) -->
        <div class="chat-timeline" #timelineScroll (scroll)="onScrollTimeline()">
          <div class="empty-state" *ngIf="messages.length === 0 && !loadingMessages">
            <div class="empty-icon-circle">
              <span class="material-symbols-outlined">chat</span>
            </div>
            <h3>No messages yet</h3>
            <p>Send a message, share files, or record a voice note to start the conversation.</p>
          </div>

          <div class="messages-flow" *ngIf="messages.length > 0">
            <ng-container *ngFor="let m of messages; let i = index">
              <!-- Date Separator -->
              <div class="date-separator" *ngIf="isNewDay(messages[i-1], m)">
                <span class="date-pill">{{ formatDateHeader(m.createdAt) }}</span>
              </div>

              <!-- Message Bubble Row -->
              <div
                class="message-row"
                [class.outgoing]="isCurrentUser(m.userId)"
                [class.incoming]="!isCurrentUser(m.userId)"
                [id]="'msg-' + m.id"
              >
                <div class="message-bubble" [class.highlighted]="isHighlighted(m)">
                  <!-- Sender Name in Group Chats -->
                  <div class="bubble-sender" *ngIf="activeChatType === 'group' && !isCurrentUser(m.userId)">
                    <span class="sender-name">{{ m.userName }}</span>
                    <span class="badge-role" *ngIf="m.userRole">{{ m.userRole }}</span>
                  </div>

                  <!-- Quoted Reply Snippet -->
                  <div class="quoted-reply-box" *ngIf="m.replyToContent">
                    <span class="quote-author">{{ m.replyToUserName || 'Reply' }}</span>
                    <p class="quote-text">{{ m.replyToContent }}</p>
                  </div>

                  <!-- Image Attachment Preview -->
                  <div class="bubble-media-wrap" *ngIf="isImageFile(m.fileUrl, m.fileName)">
                    <img [src]="m.fileUrl" class="chat-image-preview" (click)="openLightbox(m.fileUrl)" />
                  </div>

                  <!-- Audio / Voice Note Playback -->
                  <div class="bubble-voice-note" *ngIf="m.isAudio || isAudioFile(m.fileUrl, m.fileName)">
                    <div class="voice-icon-wrap">
                      <span class="material-symbols-outlined">mic</span>
                    </div>
                    <audio [src]="m.fileUrl" controls class="custom-audio-player"></audio>
                  </div>

                  <!-- Document / Generic File Attachment -->
                  <div class="bubble-file-card" *ngIf="m.fileUrl && !isImageFile(m.fileUrl, m.fileName) && !isAudioFile(m.fileUrl, m.fileName)">
                    <div class="file-icon-box">
                      <span class="material-symbols-outlined">description</span>
                    </div>
                    <div class="file-info-box">
                      <span class="file-name">{{ m.fileName || 'Attachment' }}</span>
                      <span class="file-size" *ngIf="m.fileSize">{{ formatFileSize(m.fileSize) }}</span>
                    </div>
                    <a [href]="m.fileUrl" target="_blank" download class="file-download-btn" title="Download File">
                      <span class="material-symbols-outlined">download</span>
                    </a>
                  </div>

                  <!-- Text Content / Caption -->
                  <p class="bubble-text" *ngIf="m.content">{{ m.content }}</p>

                  <!-- Bubble Meta: Time & WhatsApp Checkmarks -->
                  <div class="bubble-meta">
                    <span class="msg-time">{{ formatTime(m.createdAt) }}</span>
                    <!-- WhatsApp Delivery Ticks (Outgoing Only) -->
                    <span class="delivery-ticks" *ngIf="isCurrentUser(m.userId)">
                      <!-- Single Tick: Sent -->
                      <span *ngIf="m.deliveryStatus === 'Sent'" class="tick single">✓</span>
                      <!-- Double Gray Ticks: Delivered -->
                      <span *ngIf="m.deliveryStatus === 'Delivered'" class="tick double">✓✓</span>
                      <!-- Double Blue Ticks: Read -->
                      <span *ngIf="m.deliveryStatus === 'Read'" class="tick double-blue">✓✓</span>
                    </span>
                  </div>

                  <!-- Emoji Reactions Footer -->
                  <div class="bubble-reactions" *ngIf="m.reactions && m.reactions.length > 0">
                    <span class="reaction-pill" *ngFor="let r of m.reactions" (click)="addReaction(m, r.emoji)">
                      {{ r.emoji }} {{ r.count }}
                    </span>
                  </div>

                  <!-- Hover Message Actions Bar -->
                  <div class="message-hover-actions">
                    <button type="button" class="act-btn" (click)="setReply(m)" title="Reply">
                      <span class="material-symbols-outlined">reply</span>
                    </button>
                    <button type="button" class="act-btn" (click)="toggleStar(m)" [title]="m.isStarred ? 'Unstar' : 'Star'">
                      <span class="material-symbols-outlined">{{ m.isStarred ? 'star' : 'star_border' }}</span>
                    </button>
                    <button type="button" class="act-btn" (click)="pinMessage(m)" *ngIf="isAdmin" title="Pin Announcement">
                      <span class="material-symbols-outlined">push_pin</span>
                    </button>
                    <!-- Quick Reaction Button -->
                    <div class="reaction-picker-hover">
                      <button type="button" class="act-btn" (click)="showQuickReactions(m)">
                        <span class="material-symbols-outlined">add_reaction</span>
                      </button>
                      <div class="quick-emojis-bar">
                        <span (click)="addReaction(m, '👍')">👍</span>
                        <span (click)="addReaction(m, '❤️')">❤️</span>
                        <span (click)="addReaction(m, '😂')">😂</span>
                        <span (click)="addReaction(m, '😮')">😮</span>
                        <span (click)="addReaction(m, '😢')">😢</span>
                        <span (click)="addReaction(m, '🙏')">🙏</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ng-container>
          </div>
        </div>

        <!-- REPLY CONTEXT PREVIEW BAR (ABOVE COMPOSER) -->
        <div class="reply-preview-bar" *ngIf="replyingToMessage">
          <div class="reply-bar-left">
            <span class="material-symbols-outlined reply-icon">reply</span>
            <div class="reply-bar-meta">
              <strong>Replying to {{ replyingToMessage.userName }}</strong>
              <p>{{ replyingToMessage.content }}</p>
            </div>
          </div>
          <button type="button" class="cancel-reply-btn" (click)="cancelReply()">✕</button>
        </div>

        <!-- ATTACHMENT UPLOAD STAGING BAR -->
        <div class="attachment-staging-bar" *ngIf="stagedFiles.length > 0">
          <div class="staging-item" *ngFor="let f of stagedFiles; let fi = index">
            <span class="material-symbols-outlined">attachment</span>
            <span class="staging-name">{{ f.name }}</span>
            <button type="button" class="btn-remove-stage" (click)="removeStagedFile(fi)">✕</button>
          </div>
        </div>

        <!-- VOICE RECORDER ACTIVE BAR -->
        <div class="voice-recorder-bar" *ngIf="isRecordingVoice">
          <div class="recording-pulse-circle"></div>
          <span class="recording-timer">{{ recordingDurationText }}</span>
          <div class="recording-waveform">
            <span></span><span></span><span></span><span></span><span></span>
          </div>
          <div class="record-actions">
            <button type="button" class="btn-record-cancel" (click)="cancelVoiceRecording()" title="Cancel">
              <span class="material-symbols-outlined">delete</span>
            </button>
            <button type="button" class="btn-record-send" (click)="finishVoiceRecordingAndSend()" title="Send Voice Note">
              <span class="material-symbols-outlined">send</span>
            </button>
          </div>
        </div>

        <!-- ========================================================= -->
        <!-- COMPOSER BAR (Input, Emoji, Attach, Mic, Send)            -->
        <!-- ========================================================= -->
        <footer class="chat-composer" *ngIf="activeChatId && !isRecordingVoice">
          <!-- Emoji Picker Toggle -->
          <div class="composer-left-actions">
            <button type="button" class="comp-btn" (click)="isEmojiPickerOpen = !isEmojiPickerOpen" title="Emoji">
              <span class="material-symbols-outlined">sentiment_satisfied</span>
            </button>

            <!-- File Attachment Button -->
            <button type="button" class="comp-btn" (click)="fileInput.click()" title="Attach Document / Photo">
              <span class="material-symbols-outlined">attach_file</span>
            </button>
            <input type="file" #fileInput (change)="onFileSelected($event)" multiple style="display:none;" />
          </div>

          <!-- Emoji Picker Palette Popup -->
          <div class="emoji-picker-popup" *ngIf="isEmojiPickerOpen">
            <div class="emoji-grid">
              <span *ngFor="let em of emojiPalette" (click)="appendEmoji(em)">{{ em }}</span>
            </div>
          </div>

          <!-- Message Text Input Box -->
          <div class="input-composer-wrap">
            <textarea
              #msgInput
              [(ngModel)]="messageText"
              (keydown)="onComposerKeyDown($event)"
              (input)="onTypingInput()"
              placeholder="Type a message or attach a file..."
              rows="1"
            ></textarea>
          </div>

          <!-- Voice Note or Send Button -->
          <div class="composer-right-actions">
            <button
              *ngIf="!messageText && stagedFiles.length === 0"
              type="button"
              class="mic-btn"
              (click)="startVoiceRecording()"
              title="Record Voice Note"
            >
              <span class="material-symbols-outlined">mic</span>
            </button>

            <button
              *ngIf="messageText || stagedFiles.length > 0"
              type="button"
              class="send-btn"
              (click)="sendMessage()"
              title="Send Message"
            >
              <span class="material-symbols-outlined">send</span>
            </button>
          </div>
        </footer>

        <!-- ZERO STATE: NO CHAT SELECTED -->
        <div class="zero-chat-state" *ngIf="!activeChatId">
          <div class="zero-content">
            <div class="zero-logo-circle">
              <span class="material-symbols-outlined">chat_bubble</span>
            </div>
            <h2>Team Messenger</h2>
            <p>Select a group channel or direct conversation from the sidebar to begin chatting.</p>
          </div>
        </div>
      </main>

      <!-- ========================================================= -->
      <!-- 3. RIGHT DRAWER: Channel / Contact Information            -->
      <!-- ========================================================= -->
      <aside class="chat-right-drawer" *ngIf="isDrawerOpen && activeChatId">
        <div class="drawer-header">
          <h3>Information</h3>
          <button type="button" class="close-drawer" (click)="isDrawerOpen = false">✕</button>
        </div>

        <div class="drawer-body">
          <div class="drawer-avatar-section">
            <div class="drawer-avatar">
              {{ activeTitle.charAt(0).toUpperCase() }}
            </div>
            <h3>{{ activeTitle }}</h3>
            <p>{{ activeChatType === 'group' ? 'Community Channel' : 'Direct Conversation' }}</p>
          </div>

          <div class="drawer-section" *ngIf="activeChatType === 'group'">
            <h4>Members ({{ groupMembers.length }})</h4>
            <div class="drawer-member-list">
              <div class="drawer-member-item" *ngFor="let gm of groupMembers">
                <div class="gm-avatar">{{ gm.fullName.charAt(0).toUpperCase() }}</div>
                <div class="gm-info">
                  <strong>{{ gm.fullName }}</strong>
                  <span>{{ gm.rolePosition || 'Member' }}</span>
                </div>
                <button type="button" class="btn-dm-user" (click)="startDmWith(gm)" title="Direct Message">
                  <span class="material-symbols-outlined">chat</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <!-- NEW DIRECT MESSAGE MODAL -->
      <div class="modal-backdrop" *ngIf="isNewChatModalOpen">
        <div class="new-chat-card">
          <div class="nc-header">
            <h3>Start Direct Message</h3>
            <button type="button" (click)="isNewChatModalOpen = false">✕</button>
          </div>
          <div class="nc-search">
            <input type="text" [(ngModel)]="userDirectorySearch" (input)="searchUsersDirectory()" placeholder="Search user by name or email..." />
          </div>
          <div class="nc-list">
            <div class="nc-user-item" *ngFor="let u of directoryUsers" (click)="startDirectMessageWithUser(u)">
              <div class="nc-avatar">{{ u.fullName.charAt(0).toUpperCase() }}</div>
              <div class="nc-info">
                <strong>{{ u.fullName }}</strong>
                <span>{{ u.email }} • {{ u.designation || 'Member' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .whatsapp-container {
      display: flex;
      height: calc(100vh - 120px);
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.05);
      position: relative;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }

    .fullscreen-mode {
      position: fixed !important;
      top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      border-radius: 0 !important;
      z-index: 99999 !important;
      border: none !important;
    }

    /* ─── 1. LEFT SIDEBAR ─── */
    .chat-sidebar {
      width: 360px;
      background: #ffffff;
      border-right: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
    }
    .sidebar-user-header {
      padding: 14px 16px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .user-avatar-pill { display: flex; align-items: center; gap: 10px; }
    .avatar-circle {
      width: 38px; height: 38px; border-radius: 50%;
      background: linear-gradient(135deg, #0050e5, #1f6bff);
      color: #ffffff; font-weight: 800; display: flex; align-items: center; justify-content: center;
    }
    .user-name-display { font-size: 14px; font-weight: 700; color: #0f172a; }
    .header-tool-icons { display: flex; gap: 4px; }
    .tool-btn { background: none; border: none; cursor: pointer; color: #64748b; padding: 6px; border-radius: 6px; display: flex; align-items: center; }
    .tool-btn:hover { background: #e2e8f0; color: #0f172a; }

    .sidebar-search-box { padding: 10px 16px; }
    .search-input-wrap {
      display: flex; align-items: center; gap: 8px;
      background: #f1f5f9; border-radius: 8px; padding: 6px 12px;
    }
    .search-input-wrap span { font-size: 18px; color: #64748b; }
    .search-input-wrap input { border: none; outline: none; background: transparent; font-size: 13px; width: 100%; color: #0f172a; }
    .clear-search { background: none; border: none; font-size: 12px; color: #94a3b8; cursor: pointer; }

    .sidebar-filter-tabs { display: flex; gap: 6px; padding: 0 16px 10px; overflow-x: auto; }
    .tab-chip {
      background: #f1f5f9; border: none; border-radius: 16px; padding: 4px 12px;
      font-size: 12px; font-weight: 700; color: #64748b; cursor: pointer; white-space: nowrap;
    }
    .tab-chip.active { background: #0050e5; color: #ffffff; }

    .sidebar-chat-list { flex: 1; overflow-y: auto; }
    .chat-category-header { font-size: 11px; font-weight: 800; color: #94a3b8; padding: 12px 16px 4px; letter-spacing: 0.5px; }
    .chat-row {
      display: flex; gap: 12px; padding: 12px 16px; cursor: pointer;
      border-bottom: 1px solid #f8fafc; transition: background 0.15s;
    }
    .chat-row:hover { background: #f8fafc; }
    .chat-row.active { background: rgba(0, 80, 229, 0.08); }
    .avatar-wrap { position: relative; }
    .group-avatar-icon {
      width: 44px; height: 44px; border-radius: 12px;
      background: rgba(0, 80, 229, 0.1); color: #0050e5;
      display: flex; align-items: center; justify-content: center;
    }
    .user-avatar-icon {
      width: 44px; height: 44px; border-radius: 50%;
      background: rgba(16, 185, 129, 0.12); color: #10b981;
      display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px;
    }
    .online-indicator {
      position: absolute; bottom: 0; right: 0; width: 10px; height: 10px;
      border-radius: 50%; background: #94a3b8; border: 2px solid #ffffff;
    }
    .online-indicator.online { background: #10b981; }

    .chat-row-main { flex: 1; min-width: 0; }
    .row-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; }
    .chat-title { font-size: 13.5px; font-weight: 700; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .chat-time { font-size: 11px; color: #94a3b8; }
    .row-bottom { display: flex; justify-content: space-between; align-items: center; }
    .chat-snippet { font-size: 12px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0; }
    .snippet-sender { font-weight: 600; color: #334155; }
    .unread-badge {
      background: #0050e5; color: #ffffff; font-size: 10.5px; font-weight: 800;
      border-radius: 10px; padding: 2px 6px; min-width: 18px; text-align: center;
    }

    /* ─── 2. MAIN ACTIVE CANVAS ─── */
    .chat-main {
      flex: 1; display: flex; flex-direction: column;
      background: #efeae2; /* WhatsApp classic neutral background */
      background-image: radial-gradient(rgba(0,0,0,0.04) 1px, transparent 1px);
      background-size: 16px 16px;
      position: relative;
    }
    .main-chat-header {
      padding: 10px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;
      display: flex; justify-content: space-between; align-items: center; z-index: 10;
    }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .back-mobile-btn { display: none; background: none; border: none; cursor: pointer; }
    .header-avatar {
      width: 40px; height: 40px; border-radius: 50%;
      background: #0050e5; color: #ffffff; display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 16px;
    }
    .header-meta { display: flex; flex-direction: column; }
    .title-row { display: flex; align-items: center; gap: 8px; }
    .active-title { font-size: 15px; font-weight: 800; color: #0f172a; margin: 0; }
    .role-badge { font-size: 10.5px; font-weight: 700; background: rgba(0, 80, 229, 0.1); color: #0050e5; padding: 2px 6px; border-radius: 4px; }
    .active-presence { font-size: 12px; color: #64748b; margin: 0; }
    .text-green { color: #10b981; }
    .typing-notice { color: #0050e5; font-weight: 600; }

    .header-right { display: flex; gap: 6px; }
    .icon-action { background: none; border: none; cursor: pointer; color: #475569; padding: 6px; border-radius: 6px; display: flex; align-items: center; }
    .icon-action:hover { background: #e2e8f0; }

    /* In-Chat Search Bar */
    .in-chat-search-bar {
      display: flex; align-items: center; gap: 8px; padding: 8px 16px;
      background: #ffffff; border-bottom: 1px solid #cbd5e1;
    }
    .in-chat-search-bar input { flex: 1; border: none; outline: none; font-size: 13px; }
    .btn-close-search { background: none; border: none; cursor: pointer; color: #64748b; }

    /* Pinned Banner */
    .pinned-banner {
      display: flex; align-items: center; gap: 10px; padding: 8px 16px;
      background: #fffbeb; border-bottom: 1px solid #fef3c7; color: #92400e; font-size: 12.5px;
    }
    .pinned-text { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .unpin-btn { background: none; border: none; cursor: pointer; font-size: 12px; color: #92400e; }

    /* Timeline Canvas */
    .chat-timeline { flex: 1; overflow-y: auto; padding: 20px; }
    .messages-flow { display: flex; flex-direction: column; gap: 8px; }
    .date-separator { text-align: center; margin: 16px 0 8px; }
    .date-pill { background: #ffffff; border-radius: 12px; padding: 4px 12px; font-size: 11px; font-weight: 700; color: #64748b; box-shadow: 0 1px 2px rgba(0,0,0,0.06); }

    /* Bubble Styling */
    .message-row { display: flex; position: relative; }
    .message-row.outgoing { justify-content: flex-end; }
    .message-row.incoming { justify-content: flex-start; }

    .message-bubble {
      max-width: 65%; border-radius: 10px; padding: 8px 12px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.08); position: relative; word-break: break-word;
    }
    .message-row.outgoing .message-bubble { background: #d9fdd3; color: #111b21; border-top-right-radius: 2px; }
    .message-row.incoming .message-bubble { background: #ffffff; color: #111b21; border-top-left-radius: 2px; }
    .message-bubble.highlighted { animation: highlight-pulse 2s ease-out; }
    @keyframes highlight-pulse { 0% { background: #fef08a; } 100% { background: #ffffff; } }

    .bubble-sender { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
    .sender-name { font-size: 11.5px; font-weight: 800; color: #0050e5; }
    .badge-role { font-size: 9.5px; font-weight: 700; background: rgba(0,80,229,0.1); color: #0050e5; padding: 1px 4px; border-radius: 3px; }

    /* Quoted Reply Box */
    .quoted-reply-box {
      background: rgba(0,0,0,0.04); border-left: 3px solid #0050e5;
      padding: 4px 8px; border-radius: 4px; margin-bottom: 6px; font-size: 12px;
    }
    .quote-author { font-weight: 700; color: #0050e5; display: block; font-size: 11px; }
    .quote-text { margin: 0; color: #475569; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* Image Attachment */
    .bubble-media-wrap { margin-bottom: 6px; }
    .chat-image-preview { max-width: 100%; border-radius: 8px; cursor: pointer; max-height: 250px; object-fit: cover; }

    /* Voice Note */
    .bubble-voice-note { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
    .voice-icon-wrap { width: 32px; height: 32px; border-radius: 50%; background: #0050e5; color: #ffffff; display: flex; align-items: center; justify-content: center; }
    .custom-audio-player { height: 32px; max-width: 220px; outline: none; }

    /* File Card */
    .bubble-file-card {
      display: flex; align-items: center; gap: 10px;
      background: rgba(0,0,0,0.04); border-radius: 8px; padding: 8px 12px; margin-bottom: 6px;
    }
    .file-icon-box { font-size: 24px; color: #0050e5; display: flex; align-items: center; }
    .file-info-box { flex: 1; min-width: 0; }
    .file-name { font-size: 12.5px; font-weight: 700; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .file-size { font-size: 11px; color: #64748b; }
    .file-download-btn { color: #0050e5; text-decoration: none; display: flex; align-items: center; }

    .bubble-text { font-size: 13.5px; line-height: 1.45; margin: 0 0 2px; }
    .bubble-meta { display: flex; justify-content: flex-end; align-items: center; gap: 4px; font-size: 10.5px; color: #64748b; }
    .msg-time { font-size: 10px; }
    .tick.double-blue { color: #34b7f1; font-weight: 800; }
    .tick.double { color: #94a3b8; font-weight: 800; }
    .tick.single { color: #94a3b8; }

    /* Reactions */
    .bubble-reactions { display: flex; gap: 4px; margin-top: 4px; }
    .reaction-pill {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 1px 6px; font-size: 11px; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }

    /* Message Hover Actions Bar */
    .message-hover-actions {
      display: none; position: absolute; top: -14px; right: 8px;
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px;
      padding: 2px 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); gap: 2px;
    }
    .message-bubble:hover .message-hover-actions { display: flex; }
    .act-btn { background: none; border: none; cursor: pointer; color: #64748b; padding: 4px; border-radius: 50%; display: flex; align-items: center; }
    .act-btn:hover { background: #f1f5f9; color: #0f172a; }
    .act-btn span { font-size: 16px; }

    .reaction-picker-hover { position: relative; }
    .quick-emojis-bar {
      display: none; position: absolute; bottom: 30px; right: 0;
      background: #ffffff; border: 1px solid #cbd5e1; border-radius: 20px;
      padding: 4px 8px; gap: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 20;
    }
    .reaction-picker-hover:hover .quick-emojis-bar { display: flex; }
    .quick-emojis-bar span { cursor: pointer; font-size: 18px; transition: transform 0.1s; }
    .quick-emojis-bar span:hover { transform: scale(1.3); }

    /* Reply Bar Preview */
    .reply-preview-bar {
      background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 8px 16px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .reply-bar-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .reply-icon { color: #0050e5; font-size: 20px; }
    .reply-bar-meta strong { font-size: 12px; color: #0050e5; display: block; }
    .reply-bar-meta p { font-size: 12px; color: #475569; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .cancel-reply-btn { background: none; border: none; cursor: pointer; color: #64748b; font-size: 14px; }

    /* Attachment Staging */
    .attachment-staging-bar { display: flex; gap: 8px; padding: 8px 16px; background: #f8fafc; border-top: 1px solid #e2e8f0; flex-wrap: wrap; }
    .staging-item { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 8px; display: flex; align-items: center; gap: 6px; font-size: 12px; }
    .btn-remove-stage { background: none; border: none; cursor: pointer; color: #ef4444; }

    /* Voice Recorder Bar */
    .voice-recorder-bar {
      display: flex; align-items: center; gap: 16px; padding: 12px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0;
    }
    .recording-pulse-circle { width: 12px; height: 12px; border-radius: 50%; background: #ef4444; animation: pulse-rec 1s infinite; }
    @keyframes pulse-rec { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.3); } }
    .recording-timer { font-size: 14px; font-weight: 800; color: #ef4444; font-family: monospace; }
    .recording-waveform { display: flex; gap: 3px; align-items: center; flex: 1; }
    .recording-waveform span { width: 3px; height: 16px; background: #ef4444; border-radius: 2px; animation: wave-anim 0.8s infinite ease-in-out alternate; }
    @keyframes wave-anim { 0% { height: 6px; } 100% { height: 24px; } }
    .record-actions { display: flex; gap: 10px; }
    .btn-record-cancel { width: 36px; height: 36px; border-radius: 50%; background: #fee2e2; color: #ef4444; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .btn-record-send { width: 36px; height: 36px; border-radius: 50%; background: #10b981; color: #ffffff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; }

    /* Composer Bar */
    .chat-composer {
      padding: 10px 16px; background: #f0f2f5; border-top: 1px solid #e2e8f0;
      display: flex; align-items: center; gap: 10px; position: relative;
    }
    .composer-left-actions, .composer-right-actions { display: flex; align-items: center; gap: 4px; }
    .comp-btn { background: none; border: none; cursor: pointer; color: #54656f; padding: 6px; border-radius: 50%; display: flex; align-items: center; }
    .comp-btn:hover { background: #e2e8f0; }
    .input-composer-wrap { flex: 1; background: #ffffff; border-radius: 8px; padding: 8px 12px; display: flex; align-items: center; }
    .input-composer-wrap textarea {
      width: 100%; border: none; outline: none; resize: none; font-size: 13.5px; font-family: inherit; max-height: 100px;
    }
    .mic-btn, .send-btn {
      width: 40px; height: 40px; border-radius: 50%; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center; color: #ffffff;
    }
    .mic-btn { background: #54656f; }
    .send-btn { background: #0050e5; }

    /* Emoji Picker */
    .emoji-picker-popup {
      position: absolute; bottom: 65px; left: 16px;
      background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px;
      padding: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); z-index: 50; width: 300px;
    }
    .emoji-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 8px; font-size: 20px; }
    .emoji-grid span { cursor: pointer; text-align: center; }
    .emoji-grid span:hover { transform: scale(1.3); }

    /* Dropzone Overlay */
    .dropzone-overlay {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 80, 229, 0.85); color: #ffffff;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      z-index: 100; backdrop-filter: blur(4px);
    }
    .icon-drop { font-size: 64px; margin-bottom: 12px; }

    /* Zero State */
    .zero-chat-state {
      flex: 1; display: flex; align-items: center; justify-content: center; text-align: center;
    }
    .zero-content { max-width: 380px; }
    .zero-logo-circle {
      width: 72px; height: 72px; border-radius: 50%; background: #ffffff;
      color: #0050e5; display: flex; align-items: center; justify-content: center;
      margin: 0 auto 16px; font-size: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }

    /* ─── 3. RIGHT DRAWER ─── */
    .chat-right-drawer {
      width: 320px; background: #ffffff; border-left: 1px solid #e2e8f0; display: flex; flex-direction: column;
    }
    .drawer-header {
      padding: 14px 16px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;
    }
    .drawer-header h3 { margin: 0; font-size: 15px; font-weight: 800; }
    .close-drawer { background: none; border: none; cursor: pointer; font-size: 16px; color: #64748b; }
    .drawer-body { padding: 20px; overflow-y: auto; }
    .drawer-avatar-section { text-align: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 16px; }
    .drawer-avatar {
      width: 64px; height: 64px; border-radius: 50%; background: #0050e5; color: #ffffff;
      font-size: 24px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin: 0 auto 8px;
    }
    .drawer-member-list { display: flex; flex-direction: column; gap: 10px; }
    .drawer-member-item { display: flex; align-items: center; gap: 10px; padding: 6px 0; }
    .gm-avatar { width: 32px; height: 32px; border-radius: 50%; background: rgba(0,80,229,0.1); color: #0050e5; display: flex; align-items: center; justify-content: center; font-weight: 700; }
    .gm-info { flex: 1; }
    .gm-info strong { display: block; font-size: 12.5px; }
    .gm-info span { font-size: 11px; color: #64748b; }
    .btn-dm-user { background: none; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 6px; cursor: pointer; color: #0050e5; }

    /* New Chat Modal */
    .modal-backdrop {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); z-index: 1000;
      display: flex; align-items: center; justify-content: center; padding: 20px;
    }
    .new-chat-card {
      width: 440px; max-width: 100%; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.15);
    }
    .nc-header { padding: 14px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
    .nc-header h3 { margin: 0; font-size: 15px; font-weight: 800; }
    .nc-header button { background: none; border: none; cursor: pointer; font-size: 16px; color: #64748b; }
    .nc-search { padding: 12px 20px; border-bottom: 1px solid #f1f5f9; }
    .nc-search input { width: 100%; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; font-size: 13px; outline: none; }
    .nc-list { max-height: 320px; overflow-y: auto; }
    .nc-user-item { display: flex; align-items: center; gap: 12px; padding: 10px 20px; cursor: pointer; border-bottom: 1px solid #f8fafc; }
    .nc-user-item:hover { background: #f8fafc; }
    .nc-avatar { width: 38px; height: 38px; border-radius: 50%; background: rgba(0,80,229,0.1); color: #0050e5; display: flex; align-items: center; justify-content: center; font-weight: 800; }
    .nc-info strong { display: block; font-size: 13.5px; }
    .nc-info span { font-size: 11.5px; color: #64748b; }
  `]
})
export class GroupsChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('timelineScroll') timelineScrollRef!: ElementRef;

  // Current Auth User
  currentUserId = '';
  currentUserName = 'Me';
  isAdmin = false;

  // Navigation state
  groups: any[] = [];
  filteredGroups: any[] = [];
  dms: any[] = [];
  filteredDms: any[] = [];
  starredMessages: LocalMessage[] = [];

  sidebarTab: 'all' | 'groups' | 'dms' | 'starred' = 'all';
  searchQuery = '';
  isMobileSidebarOpen = false;

  // Active Chat State
  activeChatId = '';
  activeChatType: 'group' | 'dm' = 'group';
  activeTitle = '';
  activeUserRole = '';
  activePresence = 'Offline';
  activeMemberCount = 0;
  activeTypingUser = '';

  messages: LocalMessage[] = [];
  loadingMessages = false;

  // Interactive Features
  messageText = '';
  replyingToMessage: LocalMessage | null = null;
  pinnedMessage: LocalMessage | null = null;
  stagedFiles: File[] = [];
  isDraggingFile = false;
  isFullScreen = false;
  isSearchingInChat = false;
  inChatSearchTerm = '';
  isDrawerOpen = false;
  isEmojiPickerOpen = false;
  groupMembers: any[] = [];

  // Voice Note Recording
  isRecordingVoice = false;
  mediaRecorder: any = null;
  audioChunks: any[] = [];
  recordingDurationSeconds = 0;
  recordingTimerInterval: any = null;

  // New Chat Modal
  isNewChatModalOpen = false;
  userDirectorySearch = '';
  directoryUsers: any[] = [];

  // Emojis Palette
  emojiPalette = ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠','😈','👿','👹','👺','🤡','💩','👻','💀','☠️','👽','👾','🤖','🎃','😺','😸','😹','😻','😼','😽','🙀','😿','😾','👋','🤚','🖐️','✋','🖖','👌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🧠','🫀','🫁','🦷','🦴','👀','👁️','👅','👄','💋','🩸','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟'];

  private subs: Subscription[] = [];
  private shouldScrollToBottom = true;

  constructor(
    private signalR: SignalRService,
    private api: ApiService,
    private toast: ToastService,
    private chatSound: ChatSoundService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initCurrentUser();
    this.signalR.startConnection();
    this.subscribeToSignalREvents();
    this.loadInitialConversations();

    // Query params deep-linking (e.g. ?dmUserId=... or ?groupId=...)
    this.route.queryParams.subscribe(params => {
      if (params['dmUserId']) {
        this.openDirectMessageWithId(params['dmUserId']);
      } else if (params['groupId']) {
        this.openGroupWithId(params['groupId']);
      }
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
    }
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    if (this.recordingTimerInterval) clearInterval(this.recordingTimerInterval);
  }

  private initCurrentUser(): void {
    const userStr = localStorage.getItem('auth_user') || localStorage.getItem('user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        this.currentUserId = u.id || u.userId || '';
        this.currentUserName = u.fullName || u.firstName || 'Me';
        const roles: string[] = u.roles || [];
        this.isAdmin = roles.includes('Admin') || roles.includes('SuperAdmin');
      } catch {}
    }
  }

  private subscribeToSignalREvents(): void {
    // 1. Incoming Message
    this.subs.push(
      this.signalR.message$.subscribe(payload => {
        // If message belongs to currently active conversation
        const isForCurrentGroup = this.activeChatType === 'group' && payload.groupId === this.activeChatId;
        const isForCurrentDm = this.activeChatType === 'dm' && (
          (payload.userId === this.activeChatId && payload.recipientUserId === this.currentUserId) ||
          (payload.userId === this.currentUserId && payload.recipientUserId === this.activeChatId)
        );

        if (isForCurrentGroup || isForCurrentDm) {
          this.messages.push(this.mapPayloadToLocalMessage(payload));
          this.shouldScrollToBottom = true;
          // Acknowledge read if active
          if (payload.userId !== this.currentUserId) {
            this.signalR.markAsRead(payload.groupId, payload.id);
          }
        }

        // Update sidebar preview
        this.updateSidebarSnippet(payload);
      })
    );

    // 2. Typing indicator
    this.subs.push(
      this.signalR.typing$.subscribe(data => {
        if (
          (this.activeChatType === 'group' && data.groupId === this.activeChatId) ||
          (this.activeChatType === 'dm' && data.userId === this.activeChatId)
        ) {
          this.activeTypingUser = data.isTyping && data.userId !== this.currentUserId ? data.userName : '';
        }
      })
    );

    // 3. Reactions
    this.subs.push(
      this.signalR.reaction$.subscribe(data => {
        const msg = this.messages.find(m => m.id === data.messageId);
        if (msg) {
          let rx = msg.reactions.find(r => r.emoji === data.emoji);
          if (rx) {
            if (!rx.users.includes(data.userName)) {
              rx.users.push(data.userName);
              rx.count++;
            }
          } else {
            msg.reactions.push({ emoji: data.emoji, count: 1, users: [data.userName] });
          }
        }
      })
    );

    // 4. Read receipts
    this.subs.push(
      this.signalR.readReceipt$.subscribe(data => {
        const msg = this.messages.find(m => m.id === data.messageId);
        if (msg && this.isCurrentUser(msg.userId)) {
          msg.deliveryStatus = 'Read';
        }
      })
    );

    // 5. Presence updates
    this.subs.push(
      this.signalR.presence$.subscribe(data => {
        if (this.activeChatType === 'dm' && this.activeChatId === data.userId) {
          this.activePresence = data.status;
        }
        const dm = this.dms.find(d => d.otherUserId === data.userId);
        if (dm) dm.presence = data.status;
      })
    );
  }

  loadInitialConversations(): void {
    // Load joined groups
    this.api.get<any[]>('groups/my-groups').subscribe({
      next: (res) => {
        this.groups = res || [];
        this.filteredGroups = [...this.groups];
        // Auto-select first group if none active
        if (!this.activeChatId && this.groups.length > 0) {
          this.selectGroup(this.groups[0]);
        }
      },
      error: () => this.toast.error('Failed to load group channels.')
    });

    // Load direct message conversations
    this.api.get<any[]>('groups/dm/conversations').subscribe({
      next: (res) => {
        this.dms = res || [];
        this.filteredDms = [...this.dms];
      },
      error: () => {}
    });
  }

  selectGroup(g: any): void {
    this.activeChatId = g.id;
    this.activeChatType = 'group';
    this.activeTitle = g.title;
    this.activePresence = 'Active Channel';
    this.messages = [];
    this.stagedFiles = [];
    this.replyingToMessage = null;
    g.unreadCount = 0;

    this.signalR.joinGroup(g.id);
    this.loadGroupMessages(g.id);
    this.loadGroupMembers(g.id);
  }

  selectDirectMessage(dm: any): void {
    this.activeChatId = dm.otherUserId;
    this.activeChatType = 'dm';
    this.activeTitle = dm.otherUserName;
    this.activeUserRole = 'Colleague';
    this.activePresence = dm.presence || 'Offline';
    this.messages = [];
    this.stagedFiles = [];
    this.replyingToMessage = null;
    dm.unreadCount = 0;

    this.loadDirectMessages(dm.otherUserId);
  }

  loadGroupMessages(groupId: string): void {
    this.loadingMessages = true;
    this.api.get<any[]>(`groups/${groupId}/chat/messages`).subscribe({
      next: (res) => {
        this.messages = (res || []).map(m => this.mapApiMessageToLocal(m));
        this.loadingMessages = false;
        this.shouldScrollToBottom = true;
      },
      error: () => {
        this.loadingMessages = false;
      }
    });
  }

  loadDirectMessages(recipientUserId: string): void {
    this.loadingMessages = true;
    this.api.get<any[]>(`groups/dm/${recipientUserId}`).subscribe({
      next: (res) => {
        this.messages = (res || []).map(m => this.mapApiMessageToLocal(m));
        this.loadingMessages = false;
        this.shouldScrollToBottom = true;
      },
      error: () => {
        this.loadingMessages = false;
      }
    });
  }

  loadGroupMembers(groupId: string): void {
    this.api.get<any[]>(`groups/${groupId}/members`).subscribe({
      next: (res) => {
        this.groupMembers = res || [];
        this.activeMemberCount = this.groupMembers.length;
      },
      error: () => {}
    });
  }

  sendMessage(): void {
    if (!this.messageText.trim() && this.stagedFiles.length === 0) return;

    const content = this.messageText.trim();
    const replyToId = this.replyingToMessage?.id;

    if (this.stagedFiles.length > 0) {
      // Upload multi-files with caption
      const formData = new FormData();
      this.stagedFiles.forEach(f => formData.append('files', f));
      if (content) formData.append('content', content);
      if (replyToId) formData.append('replyToId', replyToId);

      this.api.post(`groups/${this.activeChatId}/chat/upload`, formData).subscribe({
        next: () => {
          this.messageText = '';
          this.stagedFiles = [];
          this.replyingToMessage = null;
        },
        error: () => this.toast.error('Failed to upload files.')
      });
      return;
    }

    // Direct text message via SignalR WebSocket
    if (this.activeChatType === 'group') {
      this.signalR.sendMessage(this.activeChatId, content, replyToId).then(() => {
        this.messageText = '';
        this.replyingToMessage = null;
      }).catch(() => {
        this.toast.error('Failed to dispatch message.');
      });
    } else {
      // DM Stream
      const defaultGroupId = this.groups.length > 0 ? this.groups[0].id : 'b0000001-0001-0001-0001-000000000001';
      this.signalR.sendMessage(defaultGroupId, content, replyToId, undefined, this.activeChatId).then(() => {
        this.messageText = '';
        this.replyingToMessage = null;
      }).catch(() => {
        this.toast.error('Failed to dispatch direct message.');
      });
    }
  }

  // ─── Voice Recording (MediaRecorder API) ───
  startVoiceRecording(): void {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.toast.error('Microphone access is not supported in this browser.');
      return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      this.mediaRecorder = new (window as any).MediaRecorder(stream);
      this.audioChunks = [];
      this.isRecordingVoice = true;
      this.recordingDurationSeconds = 0;

      this.recordingTimerInterval = setInterval(() => {
        this.recordingDurationSeconds++;
      }, 1000);

      this.mediaRecorder.ondataavailable = (e: any) => {
        if (e.data.size > 0) this.audioChunks.push(e.data);
      };

      this.mediaRecorder.start();
    }).catch(() => {
      this.toast.error('Microphone permission denied.');
    });
  }

  cancelVoiceRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.isRecordingVoice = false;
    if (this.recordingTimerInterval) clearInterval(this.recordingTimerInterval);
  }

  finishVoiceRecordingAndSend(): void {
    if (!this.mediaRecorder) return;

    this.mediaRecorder.onstop = () => {
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      const voiceFile = new File([audioBlob], `Voice_${Date.now()}.webm`, { type: 'audio/webm' });
      
      const formData = new FormData();
      formData.append('files', voiceFile);
      formData.append('content', '🎙️ Voice Note');

      const targetGroupId = this.activeChatType === 'group' ? this.activeChatId : (this.groups[0]?.id || 'b0000001-0001-0001-0001-000000000001');
      this.api.post(`groups/${targetGroupId}/chat/upload`, formData).subscribe({
        next: () => {
          this.toast.success('Voice note sent!');
        },
        error: () => this.toast.error('Failed to send voice note.')
      });
    };

    this.mediaRecorder.stop();
    this.isRecordingVoice = false;
    if (this.recordingTimerInterval) clearInterval(this.recordingTimerInterval);
  }

  get recordingDurationText(): string {
    const mins = Math.floor(this.recordingDurationSeconds / 60);
    const secs = this.recordingDurationSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  // ─── Drag and Drop Files ───
  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.isDraggingFile = true;
  }

  onFileDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDraggingFile = false;
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        this.stagedFiles.push(e.dataTransfer.files[i]);
      }
    }
  }

  onFileSelected(e: any): void {
    if (e.target.files && e.target.files.length > 0) {
      for (let i = 0; i < e.target.files.length; i++) {
        this.stagedFiles.push(e.target.files[i]);
      }
    }
  }

  removeStagedFile(index: number): void {
    this.stagedFiles.splice(index, 1);
  }

  // ─── Export Chat as PDF/Text ───
  exportChatTranscript(): void {
    if (!this.activeChatId) return;

    let transcript = `=========================================================================\n`;
    transcript += `TEAM CHAT TRANSCRIPT: ${this.activeTitle.toUpperCase()}\n`;
    transcript += `EXPORT DATE: ${new Date().toUTCString()}\n`;
    transcript += `TOTAL MESSAGES: ${this.messages.length}\n`;
    transcript += `=========================================================================\n\n`;

    this.messages.forEach(m => {
      transcript += `[${m.createdAt}] ${m.userName}: ${m.content || '[File Attachment]'}\n\n`;
    });

    const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.activeTitle.replace(/\\s+/g, '_')}_Transcript.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
    this.toast.success('Chat transcript exported successfully!');
  }

  // ─── Full-Screen Pop-Out ───
  toggleFullScreen(): void {
    this.isFullScreen = !this.isFullScreen;
  }

  // ─── Helpers ───
  isCurrentUser(userId: string): boolean {
    return this.currentUserId === userId;
  }

  setReply(m: LocalMessage): void {
    this.replyingToMessage = m;
  }

  cancelReply(): void {
    this.replyingToMessage = null;
  }

  toggleStar(m: LocalMessage): void {
    m.isStarred = !m.isStarred;
    if (m.isStarred) {
      if (!this.starredMessages.some(sm => sm.id === m.id)) this.starredMessages.push(m);
      this.toast.success('Message starred ⭐');
    } else {
      this.starredMessages = this.starredMessages.filter(sm => sm.id !== m.id);
    }
  }

  pinMessage(m: LocalMessage): void {
    if (this.activeChatType === 'group') {
      this.signalR.reactToMessage(this.activeChatId, m.id, '📌');
      this.pinnedMessage = m;
      this.toast.success('Announcement pinned to banner!');
    }
  }

  unpinMessage(m: LocalMessage): void {
    this.pinnedMessage = null;
  }

  showQuickReactions(m: LocalMessage): void {}

  addReaction(m: LocalMessage, emoji: string): void {
    this.signalR.reactToMessage(this.activeChatId, m.id, emoji);
    let rx = m.reactions.find(r => r.emoji === emoji);
    if (rx) {
      if (!rx.users.includes(this.currentUserName)) {
        rx.users.push(this.currentUserName);
        rx.count++;
      }
    } else {
      m.reactions.push({ emoji, count: 1, users: [this.currentUserName] });
    }
  }

  appendEmoji(emoji: string): void {
    this.messageText += emoji;
  }

  onComposerKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.sendMessage();
    }
  }

  onTypingInput(): void {
    const recipient = this.activeChatType === 'dm' ? this.activeChatId : undefined;
    this.signalR.sendTyping(this.activeChatId, true, recipient);
  }

  onSearchFilter(): void {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.filteredGroups = [...this.groups];
      this.filteredDms = [...this.dms];
      return;
    }
    this.filteredGroups = this.groups.filter(g => g.title.toLowerCase().includes(q));
    this.filteredDms = this.dms.filter(d => d.otherUserName && d.otherUserName.toLowerCase().includes(q));
  }

  isHighlighted(m: LocalMessage): boolean {
    return !!this.inChatSearchTerm && m.content.toLowerCase().includes(this.inChatSearchTerm.toLowerCase());
  }

  toggleSearchInChat(): void {
    this.isSearchingInChat = !this.isSearchingInChat;
    if (!this.isSearchingInChat) this.inChatSearchTerm = '';
  }

  isImageFile(url?: string, name?: string): boolean {
    if (!url && !name) return false;
    const str = (url || name || '').toLowerCase();
    return str.includes('.jpg') || str.includes('.jpeg') || str.includes('.png') || str.includes('.gif') || str.includes('.webp') || str.startsWith('data:image');
  }

  isAudioFile(url?: string, name?: string): boolean {
    if (!url && !name) return false;
    const str = (url || name || '').toLowerCase();
    return str.includes('.mp3') || str.includes('.webm') || str.includes('.wav') || str.includes('.ogg') || str.startsWith('data:audio');
  }

  formatFileSize(bytes?: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  formatTime(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  formatShortTime(dateStr?: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  formatDateHeader(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  }

  isNewDay(prevMsg?: LocalMessage, currMsg?: LocalMessage): boolean {
    if (!prevMsg || !currMsg) return true;
    return new Date(prevMsg.createdAt).toDateString() !== new Date(currMsg.createdAt).toDateString();
  }

  openLightbox(imgUrl?: string): void {
    if (imgUrl) window.open(imgUrl, '_blank');
  }

  closeActiveChat(): void {
    this.activeChatId = '';
  }

  refreshChats(): void {
    this.loadInitialConversations();
    this.toast.success('Refreshed conversations.');
  }

  openNewChatModal(): void {
    this.isNewChatModalOpen = true;
    this.searchUsersDirectory();
  }

  searchUsersDirectory(): void {
    this.api.get<any[]>(`profile/biography/members?search=${encodeURIComponent(this.userDirectorySearch)}`).subscribe({
      next: (res) => {
        this.directoryUsers = (res || []).filter(u => u.id !== this.currentUserId);
      },
      error: () => {}
    });
  }

  startDirectMessageWithUser(u: any): void {
    this.isNewChatModalOpen = false;
    this.selectDirectMessage({
      otherUserId: u.id,
      otherUserName: u.fullName,
      presence: 'Online'
    });
  }

  startDmWith(gm: any): void {
    this.isDrawerOpen = false;
    this.selectDirectMessage({
      otherUserId: gm.userProfileId,
      otherUserName: gm.fullName,
      presence: 'Online'
    });
  }

  jumpToMessage(sm: LocalMessage): void {
    const el = document.getElementById('msg-' + sm.id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  onScrollTimeline(): void {
    // could implement load more history here
  }

  private scrollToBottom(): void {
    try {
      if (this.timelineScrollRef) {
        this.timelineScrollRef.nativeElement.scrollTop = this.timelineScrollRef.nativeElement.scrollHeight;
      }
    } catch {}
  }

  private mapPayloadToLocalMessage(p: ChatMessagePayload): LocalMessage {
    return {
      id: p.id,
      groupId: p.groupId,
      userId: p.userId,
      userName: p.userName,
      userAvatar: p.userAvatar,
      content: p.content,
      messageType: p.messageType,
      fileId: p.fileId,
      fileUrl: p.fileUrl,
      fileName: p.fileName,
      fileSize: p.fileSize,
      replyToId: p.replyToId,
      replyToUserName: p.replyToUserName,
      replyToContent: p.replyToContent,
      deliveryStatus: (p.deliveryStatus as any) || 'Sent',
      createdAt: p.createdAt,
      isDirectMessage: p.isDirectMessage,
      recipientUserId: p.recipientUserId,
      reactions: [],
      isAudio: this.isAudioFile(p.fileUrl, p.fileName)
    };
  }

  private mapApiMessageToLocal(m: any): LocalMessage {
    return {
      id: m.id,
      groupId: m.bcpGroupId || m.groupId,
      userId: m.userProfileId || m.senderUserId || m.userId,
      userName: m.userName || m.senderName || 'Member',
      userAvatar: m.userAvatar,
      userRole: m.userRole,
      content: m.content,
      messageType: m.messageType,
      fileId: m.file?.id || m.fileId,
      fileUrl: m.file?.fileUrl || m.fileUrl,
      fileName: m.file?.fileName || m.fileName,
      fileSize: m.file?.fileSize || m.fileSize,
      replyToId: m.replyTo?.id || m.replyToMessageId,
      replyToUserName: m.replyTo?.author || m.replyToUserName,
      replyToContent: m.replyTo?.content || m.replyToContent,
      deliveryStatus: (m.deliveryStatus as any) || 'Read',
      createdAt: m.createdAt,
      isDirectMessage: !!m.receiverUserId,
      recipientUserId: m.receiverUserId,
      reactions: [],
      isPinned: m.isPinned,
      isAudio: this.isAudioFile(m.file?.fileUrl || m.fileUrl, m.file?.fileName || m.fileName)
    };
  }

  private updateSidebarSnippet(p: ChatMessagePayload): void {
    if (p.isDirectMessage) {
      const dm = this.dms.find(d => d.otherUserId === p.userId || d.otherUserId === p.recipientUserId);
      if (dm) {
        dm.lastMessage = { content: p.content, createdAt: p.createdAt };
      }
    } else {
      const g = this.groups.find(gr => gr.id === p.groupId);
      if (g) {
        g.lastMessage = { senderName: p.userName, content: p.content, createdAt: p.createdAt };
      }
    }
  }

  private openDirectMessageWithId(userId: string): void {
    this.api.get<any>(`profile/biography/${userId}`).subscribe({
      next: (res) => {
        this.selectDirectMessage({
          otherUserId: userId,
          otherUserName: res.fullName || 'Member',
          presence: 'Online'
        });
      },
      error: () => {
        this.selectDirectMessage({
          otherUserId: userId,
          otherUserName: 'Direct Chat',
          presence: 'Online'
        });
      }
    });
  }

  private openGroupWithId(groupId: string): void {
    const g = this.groups.find(gr => gr.id === groupId);
    if (g) {
      this.selectGroup(g);
    }
  }
}
