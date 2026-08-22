import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-workspace-notifications',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="notif-center-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Notification Center</h1>
          <p class="page-sub">View your account activity, security alerts, and workspace broadcast announcements.</p>
        </div>
        <div class="header-actions">
          <button (click)="markAllAsRead()" class="btn-action primary" [disabled]="!hasUnread()">
            <span class="material-symbols-outlined">done_all</span>
            <span>Mark All as Read</span>
          </button>
          <button (click)="clearAll()" class="btn-action danger" [disabled]="!notifications.length">
            <span class="material-symbols-outlined">delete_sweep</span>
            <span>Clear History</span>
          </button>
        </div>
      </div>

      <!-- Filter Tabs Strip -->
      <div class="tabs-strip">
        <button class="tab-btn" [class.active]="activeFilter === 'all'" (click)="setFilter('all')">
          All Notifications ({{ notifications.length }})
        </button>
        <button class="tab-btn" [class.active]="activeFilter === 'unread'" (click)="setFilter('unread')">
          Unread ({{ getUnreadCount() }})
        </button>
        <button class="tab-btn" [class.active]="activeFilter === 'security'" (click)="setFilter('security')">
          Security Alerts
        </button>
        <button class="tab-btn" [class.active]="activeFilter === 'broadcast'" (click)="setFilter('broadcast')">
          Broadcast Announcements
        </button>
      </div>

      <!-- Notifications List View -->
      <div class="notif-list-card">
        <div class="notif-card-item" *ngFor="let notif of getFilteredNotifications()" [class.unread]="!notif.isRead">
          <div class="notif-icon-box" [ngClass]="getColorClass(notif.module, notif.category)">
            <span class="material-symbols-outlined">{{ notif.icon || 'notifications' }}</span>
          </div>
          <div class="notif-details">
            <div class="notif-head-row">
              <span class="notif-tag" *ngIf="notif.isBroadcast">Broadcast</span>
              <span class="notif-tag category">{{ notif.category }}</span>
              <span class="notif-tag priority" *ngIf="notif.priority === 'High' || notif.priority === 'Urgent'">Urgent</span>
              <span class="notif-date">{{ notif.createdAt | date:'medium' }}</span>
            </div>
            <h3 class="notif-heading">{{ notif.title }}</h3>
            <p class="notif-body">{{ notif.message }}</p>
            <div class="notif-footer-actions">
              <a *ngIf="notif.actionUrl" [routerLink]="notif.actionUrl" (click)="markAsRead(notif)" class="btn-open-link">
                <span>View Details</span>
                <span class="material-symbols-outlined">arrow_forward</span>
              </a>
              <button *ngIf="!notif.isRead" (click)="markAsRead(notif)" class="btn-mark-read">
                <span class="material-symbols-outlined">check</span>
                <span>Mark as read</span>
              </button>
              <button (click)="deleteNotification(notif)" class="btn-delete" title="Delete notification">
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
          </div>
          <span class="unread-pill" *ngIf="!notif.isRead">New</span>
        </div>

        <div class="empty-state" *ngIf="!getFilteredNotifications().length">
          <span class="material-symbols-outlined empty-icon">notifications_off</span>
          <h3>No notifications in this filter</h3>
          <p>You are completely caught up with all activity and updates.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notif-center-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }
    .page-title { font-size: 22px; font-weight: 800; color: var(--md-sys-color-on-surface, #0f172a); margin: 0 0 4px; }
    .page-sub { font-size: 13px; color: #64748b; margin: 0; }
    .header-actions { display: flex; gap: 10px; }
    .btn-action {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 9px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .btn-action.primary {
      background: #0050e5;
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(0, 80, 229, 0.25);
    }
    .btn-action.primary:hover:not(:disabled) { transform: translateY(-1px); }
    .btn-action.danger {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.2);
    }
    .btn-action.danger:hover:not(:disabled) { background: rgba(239, 68, 68, 0.2); }
    .btn-action:disabled { opacity: 0.5; cursor: not-allowed; }
    .tabs-strip {
      display: flex;
      gap: 8px;
      border-bottom: 1px solid var(--md-sys-color-outline, #e2e8f0);
      padding-bottom: 8px;
      overflow-x: auto;
    }
    .tab-btn {
      background: none;
      border: none;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
    }
    .tab-btn:hover { background: rgba(0, 80, 229, 0.08); color: #0050e5; }
    .tab-btn.active { background: #0050e5; color: #ffffff; font-weight: 700; }
    .notif-list-card {
      background: var(--md-sys-color-surface, #ffffff);
      border: 1px solid var(--md-sys-color-outline, #e2e8f0);
      border-radius: 14px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
      overflow: hidden;
    }
    .notif-card-item {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 20px 24px;
      border-bottom: 1px solid var(--md-sys-color-outline, #f1f5f9);
      position: relative;
      transition: background 0.15s;
    }
    .notif-card-item:last-child { border-bottom: none; }
    .notif-card-item.unread {
      background: var(--sidebar-active-bg, rgba(0, 80, 229, 0.04));
      border-left: 4px solid #0050e5;
    }
    .notif-icon-box {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .notif-icon-box span { font-size: 22px; }
    .bg-blue { background: rgba(0, 80, 229, 0.12); color: #0050e5; }
    .bg-green { background: rgba(34, 197, 94, 0.12); color: #16a34a; }
    .bg-red { background: rgba(239, 68, 68, 0.12); color: #ef4444; }
    .bg-purple { background: rgba(168, 85, 247, 0.12); color: #9333ea; }
    .bg-amber { background: rgba(245, 158, 11, 0.12); color: #d97706; }
    .notif-details { flex: 1; min-width: 0; }
    .notif-head-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
      font-size: 11.5px;
    }
    .notif-tag {
      background: rgba(0, 80, 229, 0.1);
      color: #0050e5;
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 10px;
    }
    .notif-tag.category { background: #f1f5f9; color: #475569; }
    .notif-tag.priority { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
    .notif-date { color: #94a3b8; margin-left: auto; }
    .notif-heading {
      font-size: 15px;
      font-weight: 700;
      color: var(--md-sys-color-on-surface, #0f172a);
      margin: 0 0 6px;
    }
    .notif-body {
      font-size: 13px;
      color: #475569;
      line-height: 1.5;
      margin: 0 0 12px;
    }
    .notif-footer-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .btn-open-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12.5px;
      font-weight: 700;
      color: #0050e5;
      text-decoration: none;
    }
    .btn-open-link:hover { text-decoration: underline; }
    .btn-open-link span.material-symbols-outlined { font-size: 16px; }
    .btn-mark-read {
      background: none;
      border: 1px solid #cbd5e1;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      color: #475569;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .btn-mark-read:hover { background: #f1f5f9; color: #0f172a; }
    .btn-mark-read span { font-size: 14px; }
    .btn-delete {
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 4px;
      margin-left: auto;
    }
    .btn-delete:hover { color: #ef4444; }
    .btn-delete span { font-size: 18px; }
    .unread-pill {
      background: #0050e5;
      color: #ffffff;
      font-size: 10px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 12px;
      text-transform: uppercase;
    }
    .empty-state {
      padding: 48px 24px;
      text-align: center;
      color: #64748b;
    }
    .empty-icon { font-size: 48px; color: #cbd5e1; margin-bottom: 12px; }
    .empty-state h3 { font-size: 16px; font-weight: 700; color: #334155; margin: 0 0 6px; }
    .empty-state p { font-size: 13px; margin: 0; }
  `]
})
export class WorkspaceNotificationsComponent implements OnInit {
  notifications: any[] = [];
  activeFilter = 'all';

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.api.get<any>('NotificationsApi/all').subscribe({
      next: (res) => {
        if (res?.data) {
          this.notifications = res.data;
        }
      },
      error: () => {}
    });
  }

  setFilter(filter: string): void {
    this.activeFilter = filter;
  }

  getFilteredNotifications(): any[] {
    if (this.activeFilter === 'unread') {
      return this.notifications.filter(n => !n.isRead);
    } else if (this.activeFilter === 'security') {
      return this.notifications.filter(n => (n.module || '').toLowerCase().includes('security') || (n.category || '').toLowerCase().includes('security'));
    } else if (this.activeFilter === 'broadcast') {
      return this.notifications.filter(n => n.isBroadcast);
    }
    return this.notifications;
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.isRead).length;
  }

  hasUnread(): boolean {
    return this.getUnreadCount() > 0;
  }

  markAsRead(notif: any): void {
    this.api.put<any>(`NotificationsApi/${notif.id}/read`, {}).subscribe({
      next: () => {
        notif.isRead = true;
      },
      error: () => {}
    });
  }

  markAllAsRead(): void {
    this.api.put<any>('NotificationsApi/mark-all-read', {}).subscribe({
      next: () => {
        this.notifications.forEach(n => n.isRead = true);
      },
      error: () => {}
    });
  }

  deleteNotification(notif: any): void {
    this.api.delete<any>(`NotificationsApi/${notif.id}`).subscribe({
      next: () => {
        this.notifications = this.notifications.filter(n => n.id !== notif.id);
      },
      error: () => {}
    });
  }

  clearAll(): void {
    this.api.delete<any>('NotificationsApi/clear-all').subscribe({
      next: () => {
        this.notifications = [];
      },
      error: () => {}
    });
  }

  getColorClass(module: string, category: string): string {
    const key = (module || category || '').toLowerCase();
    if (key.includes('security') || key.includes('password')) return 'bg-red';
    if (key.includes('kpi') || key.includes('performance')) return 'bg-green';
    if (key.includes('announcement') || key.includes('broadcast')) return 'bg-purple';
    if (key.includes('membership') || key.includes('tier')) return 'bg-amber';
    return 'bg-blue';
  }
}
