import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

export interface MessagePoolItem {
  id: string;
  channel: 'Email' | 'Sms' | 'WhatsApp' | 'InAppNotification' | 'Push' | string;
  recipientAddress: string;
  recipientName?: string;
  subject: string;
  snippet: string;
  category: string;
  severity: string;
  priority: string;
  status: 'Queued' | 'Processing' | 'Sent' | 'Failed' | string;
  retries: number;
  maxRetries: number;
  lastError?: string;
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
  actionUrl?: string;
  icon?: string;
  senderOrTemplateName?: string;
  hasHtmlContent: boolean;
}

export interface MessagePoolStats {
  totalMessages: number;
  sentCount: number;
  queuedCount: number;
  failedCount: number;
  processingCount: number;
  emailCount: number;
  smsCount: number;
  whatsAppCount: number;
  inAppCount: number;
  pushCount: number;
}

@Component({
  selector: 'app-communications-hub',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent],
  template: `
    <div class="comms-hub-container">
      <app-page-header
        eyebrow="UNIFIED COMMUNICATIONS & OUTBOX POOL"
        icon="hub"
        title="Communications Hub & Telemetry"
        subtitle="Centralized multi-channel delivery engine across Email, SMS, WhatsApp, In-App Notifications, and Push alerts with live telemetry, diagnostics, and manual retry controls."
        [buttons]="headerButtons"
        [loading]="isLoading"
      ></app-page-header>

      <!-- Contextual Tour / Info Banner -->
      <div class="guide-banner" *ngIf="showTourGuide">
        <div class="guide-content">
          <div class="guide-icon-wrap">
            <span class="material-symbols-outlined">lightbulb</span>
          </div>
          <div class="guide-text">
            <strong>Welcome to the Unified Communications Hub</strong>
            <p>Every transactional notification, password reset, broadcast announcement, and SMS dispatch across all channels flows through this single pool. Filter channels below to inspect deliveries, preview rich HTML or SMS bubbles, and instantly retry failed dispatches.</p>
          </div>
        </div>
        <button type="button" class="btn-guide-close" (click)="dismissTour()" title="Dismiss Guide">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <!-- KPI Summary Cards -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-icon-wrap bg-blue-subtle">
            <span class="material-symbols-outlined text-blue">all_inbox</span>
          </div>
          <div class="kpi-meta">
            <span class="kpi-label">Total Outbox Pool</span>
            <span class="kpi-value">{{ stats.totalMessages | number }}</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-wrap bg-green-subtle">
            <span class="material-symbols-outlined text-green">verified</span>
          </div>
          <div class="kpi-meta">
            <span class="kpi-label">Delivered Successfully</span>
            <span class="kpi-value">{{ stats.sentCount | number }}</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-wrap bg-amber-subtle">
            <span class="material-symbols-outlined text-amber">hourglass_top</span>
          </div>
          <div class="kpi-meta">
            <span class="kpi-label">Queued / Processing</span>
            <span class="kpi-value">{{ (stats.queuedCount + stats.processingCount) | number }}</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-wrap bg-red-subtle">
            <span class="material-symbols-outlined text-red">error</span>
          </div>
          <div class="kpi-meta">
            <span class="kpi-label">Delivery Failures</span>
            <span class="kpi-value">{{ stats.failedCount | number }}</span>
          </div>
        </div>
      </div>

      <!-- Channel Breakdown Strip -->
      <div class="channel-pills-strip">
        <button 
          type="button" 
          class="channel-pill" 
          [class.active]="selectedChannel === 'All'" 
          (click)="setChannel('All')"
        >
          <span class="material-symbols-outlined">select_all</span>
          <span>All Channels</span>
          <span class="pill-badge">{{ stats.totalMessages }}</span>
        </button>

        <button 
          type="button" 
          class="channel-pill channel-email" 
          [class.active]="selectedChannel === 'Email'" 
          (click)="setChannel('Email')"
        >
          <span class="material-symbols-outlined">mail</span>
          <span>Emails</span>
          <span class="pill-badge">{{ stats.emailCount }}</span>
        </button>

        <button 
          type="button" 
          class="channel-pill channel-sms" 
          [class.active]="selectedChannel === 'Sms'" 
          (click)="setChannel('Sms')"
        >
          <span class="material-symbols-outlined">sms</span>
          <span>SMS Text</span>
          <span class="pill-badge">{{ stats.smsCount }}</span>
        </button>

        <button 
          type="button" 
          class="channel-pill channel-whatsapp" 
          [class.active]="selectedChannel === 'WhatsApp'" 
          (click)="setChannel('WhatsApp')"
        >
          <span class="material-symbols-outlined">chat</span>
          <span>WhatsApp</span>
          <span class="pill-badge">{{ stats.whatsAppCount }}</span>
        </button>

        <button 
          type="button" 
          class="channel-pill channel-inapp" 
          [class.active]="selectedChannel === 'InAppNotification'" 
          (click)="setChannel('InAppNotification')"
        >
          <span class="material-symbols-outlined">notifications</span>
          <span>In-App Alerts</span>
          <span class="pill-badge">{{ stats.inAppCount }}</span>
        </button>

        <button 
          type="button" 
          class="channel-pill channel-push" 
          [class.active]="selectedChannel === 'Push'" 
          (click)="setChannel('Push')"
        >
          <span class="material-symbols-outlined">phonelink_ring</span>
          <span>Push Alerts</span>
          <span class="pill-badge">{{ stats.pushCount }}</span>
        </button>
      </div>

      <!-- Filter & Search Toolbar -->
      <div class="toolbar-card">
        <div class="filter-tabs">
          <button 
            type="button" 
            class="tab-btn" 
            [class.active]="selectedStatus === 'All'" 
            (click)="setStatus('All')"
          >
            All Statuses
          </button>
          <button 
            type="button" 
            class="tab-btn" 
            [class.active]="selectedStatus === 'Sent'" 
            (click)="setStatus('Sent')"
          >
            <span class="status-dot dot-green"></span>
            Delivered
          </button>
          <button 
            type="button" 
            class="tab-btn" 
            [class.active]="selectedStatus === 'Queued'" 
            (click)="setStatus('Queued')"
          >
            <span class="status-dot dot-blue"></span>
            Queued
          </button>
          <button 
            type="button" 
            class="tab-btn" 
            [class.active]="selectedStatus === 'Failed'" 
            (click)="setStatus('Failed')"
          >
            <span class="status-dot dot-red"></span>
            Failed
          </button>
        </div>

        <div class="search-box">
          <span class="material-symbols-outlined search-icon">search</span>
          <input 
            type="text" 
            [(ngModel)]="searchQuery" 
            (keyup.enter)="loadLogs()" 
            placeholder="Search recipient address, name, subject, or content..." 
            class="search-input"
          />
          <button *ngIf="searchQuery" (click)="searchQuery = ''; loadLogs()" class="clear-btn" type="button">
            <span class="material-symbols-outlined">close</span>
          </button>
          <button type="button" class="btn btn-outline btn-sm" (click)="loadLogs()">Filter</button>
        </div>
      </div>

      <!-- Main Logs Table Card -->
      <div class="logs-card">
        <div class="table-responsive" *ngIf="!isLoading && logs.length > 0">
          <table class="table-clean">
            <thead>
              <tr>
                <th style="width: 110px;">Channel</th>
                <th style="width: 120px;">Status</th>
                <th>Recipient</th>
                <th>Subject & Content Snippet</th>
                <th style="width: 110px;">Severity</th>
                <th style="width: 160px;">Timeline</th>
                <th style="width: 130px; text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of logs" [class.row-failed]="item.status === 'Failed'">
                <!-- Channel Badge -->
                <td>
                  <span class="channel-badge" [ngClass]="getChannelClass(item.channel)">
                    <span class="material-symbols-outlined channel-icon">{{ getChannelIcon(item.channel) }}</span>
                    <span>{{ getChannelLabel(item.channel) }}</span>
                  </span>
                </td>

                <!-- Status Badge -->
                <td>
                  <span class="status-badge" [ngClass]="getStatusClass(item.status)">
                    <span class="status-indicator"></span>
                    <span>{{ item.status }}</span>
                  </span>
                  <div *ngIf="item.retries > 0" class="retry-counter">
                    Retry #{{ item.retries }}/{{ item.maxRetries }}
                  </div>
                </td>

                <!-- Recipient Info -->
                <td>
                  <div class="recipient-cell">
                    <div class="recipient-avatar">
                      {{ getInitials(item.recipientName || item.recipientAddress) }}
                    </div>
                    <div class="recipient-details">
                      <div class="recipient-address" [title]="item.recipientAddress">{{ item.recipientAddress }}</div>
                      <div class="recipient-name" *ngIf="item.recipientName">{{ item.recipientName }}</div>
                    </div>
                  </div>
                </td>

                <!-- Subject & Snippet -->
                <td>
                  <div class="content-cell">
                    <div class="message-subject">
                      {{ item.subject }}
                      <span class="category-tag">{{ item.category }}</span>
                    </div>
                    <div class="message-snippet">{{ item.snippet }}</div>
                  </div>
                </td>

                <!-- Severity Pill -->
                <td>
                  <span class="severity-pill" [ngClass]="getSeverityClass(item.severity)">
                    {{ item.severity }}
                  </span>
                </td>

                <!-- Timeline -->
                <td>
                  <div class="timeline-cell">
                    <span class="time-primary">
                      {{ (item.sentAt || item.createdAt) | date:'MMM d, y HH:mm' }}
                    </span>
                    <span class="time-sub">
                      {{ item.sentAt ? 'Delivered' : 'Created' }} (UTC)
                    </span>
                  </div>
                </td>

                <!-- Actions -->
                <td style="text-align: right;">
                  <div class="actions-group">
                    <button 
                      type="button" 
                      class="action-btn" 
                      (click)="inspectMessage(item.id)" 
                      title="Inspect message payload & previews"
                    >
                      <span class="material-symbols-outlined">visibility</span>
                    </button>

                    <button 
                      type="button" 
                      class="action-btn text-blue" 
                      (click)="retryMessage(item.id)" 
                      [disabled]="isRetrying === item.id"
                      [title]="item.status === 'Sent' ? 'Re-dispatch message' : 'Retry delivery'"
                    >
                      <span class="material-symbols-outlined" [class.spinning]="isRetrying === item.id">refresh</span>
                    </button>

                    <button 
                      type="button" 
                      class="action-btn text-amber" 
                      *ngIf="item.status === 'Queued' || item.status === 'Processing'"
                      (click)="cancelMessage(item.id)" 
                      title="Cancel dispatch"
                    >
                      <span class="material-symbols-outlined">cancel</span>
                    </button>

                    <button 
                      type="button" 
                      class="action-btn text-red" 
                      (click)="deleteMessage(item.id)" 
                      title="Delete log"
                    >
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="!isLoading && logs.length === 0">
          <div class="empty-icon-wrap">
            <span class="material-symbols-outlined">move_to_inbox</span>
          </div>
          <h3>No Outbox Logs Found</h3>
          <p *ngIf="searchQuery || selectedStatus !== 'All' || selectedChannel !== 'All'">
            No messages match your selected filters. Try clearing your search or channel tabs.
          </p>
          <p *ngIf="!searchQuery && selectedStatus === 'All' && selectedChannel === 'All'">
            No notifications or messages have been dispatched yet. When your workspace sends transactional emails, SMS alerts, or announcements, they will appear here.
          </p>
          <button 
            type="button" 
            class="btn btn-outline btn-sm" 
            *ngIf="searchQuery || selectedStatus !== 'All' || selectedChannel !== 'All'"
            (click)="resetFilters()"
          >
            Reset All Filters
          </button>
        </div>

        <!-- Loading State -->
        <div class="loading-state" *ngIf="isLoading">
          <div class="spinner"></div>
          <span>Loading communications outbox pool...</span>
        </div>

        <!-- Pagination Footer -->
        <div class="pagination-footer" *ngIf="!isLoading && totalPages > 1">
          <span class="pagination-info">
            Showing page {{ page }} of {{ totalPages }} ({{ totalCount | number }} messages)
          </span>
          <div class="pagination-buttons">
            <button 
              type="button" 
              class="btn btn-outline btn-xs" 
              [disabled]="page <= 1" 
              (click)="goToPage(page - 1)"
            >
              Previous
            </button>
            <button 
              type="button" 
              class="btn btn-outline btn-xs" 
              [disabled]="page >= totalPages" 
              (click)="goToPage(page + 1)"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <!-- Detail / Preview Inspector Modal -->
      <div class="modal-backdrop" *ngIf="selectedMessageDetails" (click)="closeInspector()">
        <div class="modal-card inspector-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-wrap">
              <span class="channel-badge" [ngClass]="getChannelClass(selectedMessageDetails.channel)">
                <span class="material-symbols-outlined">{{ getChannelIcon(selectedMessageDetails.channel) }}</span>
                <span>{{ selectedMessageDetails.channel }}</span>
              </span>
              <h3>{{ selectedMessageDetails.subject || 'Message Inspector' }}</h3>
            </div>
            <button type="button" class="btn-close" (click)="closeInspector()">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <!-- Metadata Grid -->
          <div class="inspector-meta-strip">
            <div class="meta-item">
              <span class="meta-label">Recipient:</span>
              <span class="meta-val font-mono">{{ selectedMessageDetails.recipientAddress }}</span>
            </div>
            <div class="meta-item" *ngIf="selectedMessageDetails.recipientName">
              <span class="meta-label">Name:</span>
              <span class="meta-val">{{ selectedMessageDetails.recipientName }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Status:</span>
              <span class="status-badge" [ngClass]="getStatusClass(selectedMessageDetails.status)">
                {{ selectedMessageDetails.status }}
              </span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Severity:</span>
              <span class="severity-pill" [ngClass]="getSeverityClass(selectedMessageDetails.severity)">
                {{ selectedMessageDetails.severity }}
              </span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Priority:</span>
              <span class="meta-val">{{ selectedMessageDetails.priority }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Created:</span>
              <span class="meta-val">{{ selectedMessageDetails.createdAt | date:'yyyy-MM-dd HH:mm:ss' }} UTC</span>
            </div>
            <div class="meta-item" *ngIf="selectedMessageDetails.sentAt">
              <span class="meta-label text-green">Delivered:</span>
              <span class="meta-val">{{ selectedMessageDetails.sentAt | date:'yyyy-MM-dd HH:mm:ss' }} UTC</span>
            </div>
          </div>

          <!-- Diagnostic Error Alert if Failed -->
          <div class="diagnostic-error-banner" *ngIf="selectedMessageDetails.lastError">
            <span class="material-symbols-outlined text-red">error</span>
            <div>
              <strong>Delivery Error Diagnostic:</strong>
              <div class="error-text">{{ selectedMessageDetails.lastError }}</div>
            </div>
          </div>

          <!-- Channel-Specific Inspector Previews -->
          <div class="inspector-preview-body">
            <!-- EMAIL PREVIEW -->
            <div *ngIf="selectedMessageDetails.channel === 'Email'">
              <div class="inspector-tabs">
                <button 
                  type="button" 
                  class="tab-link" 
                  [class.active]="inspectorTab === 'preview'" 
                  (click)="inspectorTab = 'preview'"
                >
                  <span class="material-symbols-outlined">preview</span>
                  Rendered Email HTML
                </button>
                <button 
                  type="button" 
                  class="tab-link" 
                  [class.active]="inspectorTab === 'source'" 
                  (click)="inspectorTab = 'source'"
                >
                  <span class="material-symbols-outlined">code</span>
                  HTML Source
                </button>
                <button 
                  type="button" 
                  class="tab-link" 
                  [class.active]="inspectorTab === 'plain'" 
                  (click)="inspectorTab = 'plain'" 
                  *ngIf="selectedMessageDetails.plainTextFallback"
                >
                  <span class="material-symbols-outlined">notes</span>
                  Plain Text Fallback
                </button>
              </div>

              <div class="preview-frame-container" *ngIf="inspectorTab === 'preview'">
                <div class="email-preview-render" [innerHTML]="safeHtmlBody"></div>
              </div>
              <div class="raw-code-container" *ngIf="inspectorTab === 'source'">
                <pre><code>{{ selectedMessageDetails.content }}</code></pre>
              </div>
              <div class="plain-text-container" *ngIf="inspectorTab === 'plain'">
                <p>{{ selectedMessageDetails.plainTextFallback }}</p>
              </div>
            </div>

            <!-- SMS SIMULATION -->
            <div *ngIf="selectedMessageDetails.channel === 'Sms'" class="sms-preview-wrapper">
              <div class="phone-frame">
                <div class="phone-notch"></div>
                <div class="phone-screen">
                  <div class="phone-sender-header">
                    <span class="material-symbols-outlined">sms</span>
                    <span>{{ selectedMessageDetails.senderOrTemplateName || 'BCC SMS' }}</span>
                  </div>
                  <div class="sms-bubble">
                    <p>{{ selectedMessageDetails.content }}</p>
                    <span class="bubble-time">{{ (selectedMessageDetails.sentAt || selectedMessageDetails.createdAt) | date:'HH:mm' }}</span>
                  </div>
                </div>
              </div>
              <div class="sms-meta-panel">
                <h4>SMS Segment Breakdown</h4>
                <div class="meta-row">
                  <span>Character Count:</span>
                  <strong>{{ selectedMessageDetails.content.length }} chars</strong>
                </div>
                <div class="meta-row">
                  <span>GSM 7-bit Segments:</span>
                  <strong>{{ getSmsSegmentCount(selectedMessageDetails.content) }} segment(s)</strong>
                </div>
                <div class="meta-row" *ngIf="selectedMessageDetails.senderOrTemplateName">
                  <span>Sender ID:</span>
                  <strong>{{ selectedMessageDetails.senderOrTemplateName }}</strong>
                </div>
              </div>
            </div>

            <!-- WHATSAPP SIMULATION -->
            <div *ngIf="selectedMessageDetails.channel === 'WhatsApp'" class="whatsapp-preview-wrapper">
              <div class="whatsapp-card">
                <div class="wa-header">
                  <span class="material-symbols-outlined wa-logo">chat</span>
                  <div class="wa-title-wrap">
                    <div class="wa-name">{{ brandName }} Notification <span class="wa-verified">✓</span></div>
                    <div class="wa-sub">Official Workspace Channel</div>
                  </div>
                </div>
                <div class="wa-body">
                  <div class="wa-bubble">
                    <div class="wa-text">{{ selectedMessageDetails.content }}</div>
                    <div class="wa-time-wrap">
                      <span>{{ (selectedMessageDetails.sentAt || selectedMessageDetails.createdAt) | date:'HH:mm' }}</span>
                      <span class="wa-ticks">✓✓</span>
                    </div>
                  </div>
                  <div class="wa-action-btn" *ngIf="selectedMessageDetails.actionUrl">
                    <a [href]="selectedMessageDetails.actionUrl" target="_blank" rel="noopener">
                      <span class="material-symbols-outlined">open_in_new</span>
                      Open in Workspace
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <!-- IN-APP / PUSH CARD PREVIEW -->
            <div *ngIf="selectedMessageDetails.channel === 'InAppNotification' || selectedMessageDetails.channel === 'Push'" class="inapp-preview-wrapper">
              <div class="notification-card-preview" [ngClass]="getSeverityClass(selectedMessageDetails.severity)">
                <div class="notif-icon-wrap">
                  <span class="material-symbols-outlined">{{ selectedMessageDetails.icon || getSeverityIcon(selectedMessageDetails.severity) }}</span>
                </div>
                <div class="notif-text-wrap">
                  <div class="notif-title">{{ selectedMessageDetails.subject }}</div>
                  <div class="notif-message">{{ selectedMessageDetails.content }}</div>
                  <a *ngIf="selectedMessageDetails.actionUrl" [href]="selectedMessageDetails.actionUrl" class="notif-action-link">
                    Open Destination →
                  </a>
                </div>
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="closeInspector()">Close</button>
            <button 
              type="button" 
              class="btn btn-primary" 
              (click)="retryMessage(selectedMessageDetails.id)" 
              [disabled]="isRetrying === selectedMessageDetails.id"
            >
              <span class="material-symbols-outlined" [class.spinning]="isRetrying === selectedMessageDetails.id">refresh</span>
              Retry Delivery
            </button>
          </div>
        </div>
      </div>

      <!-- Purge Confirmation Modal -->
      <div class="modal-backdrop" *ngIf="showPurgeModal" (click)="showPurgeModal = false">
        <div class="modal-card purge-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Purge Historical Message Logs</h3>
            <button type="button" class="btn-close" (click)="showPurgeModal = false">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="purge-body">
            <p>Retain essential communications and free up space by purging old delivered or failed message records.</p>
            <div class="form-group">
              <label>Purge records older than:</label>
              <select [(ngModel)]="purgeDays" class="form-control">
                <option [value]="30">30 Days</option>
                <option [value]="60">60 Days</option>
                <option [value]="90">90 Days</option>
                <option [value]="180">180 Days (6 Months)</option>
              </select>
            </div>
            <div class="purge-warning">
              <span class="material-symbols-outlined text-amber">warning</span>
              <span>This operation permanently deletes historical logs older than {{ purgeDays }} days. Active queued messages will not be affected.</span>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="showPurgeModal = false">Cancel</button>
            <button type="button" class="btn btn-danger" [disabled]="isPurging" (click)="confirmPurge()">
              <span class="material-symbols-outlined" *ngIf="!isPurging">delete_forever</span>
              <span class="spinner-sm" *ngIf="isPurging"></span>
              Purge Records
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .comms-hub-container {
      padding: 24px;
      max-width: 1500px;
      margin: 0 auto;
    }

    /* Guide Banner */
    .guide-banner {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .guide-content {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .guide-icon-wrap {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: #0050e5;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .guide-text strong {
      font-size: 14px;
      color: #1e3a8a;
      display: block;
      margin-bottom: 3px;
    }
    .guide-text p {
      font-size: 13px;
      color: #3b82f6;
      margin: 0;
      line-height: 1.4;
    }
    .btn-guide-close {
      background: transparent;
      border: none;
      color: #60a5fa;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      border-radius: 6px;
    }
    .btn-guide-close:hover {
      background: rgba(0, 80, 229, 0.1);
      color: #1e3a8a;
    }

    /* KPI Summary Cards */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 20px;
    }
    .kpi-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 18px 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
    .kpi-icon-wrap {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .bg-blue-subtle { background: #eff6ff; }
    .bg-green-subtle { background: #ecfdf5; }
    .bg-amber-subtle { background: #fffbeb; }
    .bg-red-subtle { background: #fef2f2; }
    .text-blue { color: #0050e5; }
    .text-green { color: #059669; }
    .text-amber { color: #d97706; }
    .text-red { color: #dc2626; }

    .kpi-meta {
      display: flex;
      flex-direction: column;
    }
    .kpi-label {
      font-size: 12.5px;
      font-weight: 600;
      color: #64748b;
      margin-bottom: 4px;
    }
    .kpi-value {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.1;
    }

    /* Channel Pills Strip */
    .channel-pills-strip {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      overflow-x: auto;
      padding-bottom: 4px;
    }
    .channel-pill {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 30px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      color: #475569;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }
    .channel-pill:hover {
      border-color: #94a3b8;
      background: #f8fafc;
    }
    .channel-pill.active {
      background: #0050e5;
      color: #ffffff;
      border-color: #0050e5;
      box-shadow: 0 2px 8px rgba(0, 80, 229, 0.25);
    }
    .channel-pill.active .pill-badge {
      background: rgba(255, 255, 255, 0.25);
      color: #ffffff;
    }
    .pill-badge {
      background: #f1f5f9;
      color: #475569;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11.5px;
      font-weight: 700;
    }

    /* Toolbar */
    .toolbar-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 12px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .filter-tabs {
      display: flex;
      gap: 6px;
      background: #f8fafc;
      padding: 4px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
    }
    .tab-btn {
      background: transparent;
      border: none;
      border-radius: 8px;
      padding: 6px 14px;
      font-size: 12.5px;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    .tab-btn:hover {
      color: #0f172a;
    }
    .tab-btn.active {
      background: #ffffff;
      color: #0050e5;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }
    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
    }
    .dot-green { background: #10b981; }
    .dot-blue { background: #3b82f6; }
    .dot-red { background: #ef4444; }

    .search-box {
      position: relative;
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      max-width: 440px;
    }
    .search-icon {
      position: absolute;
      left: 12px;
      font-size: 18px;
      color: #94a3b8;
      pointer-events: none;
    }
    .search-input {
      width: 100%;
      height: 38px;
      border: 1px solid #cbd5e1;
      border-radius: 9px;
      padding: 0 34px 0 36px;
      font-size: 13px;
      outline: none;
      transition: border-color 0.15s;
    }
    .search-input:focus {
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.1);
    }
    .clear-btn {
      position: absolute;
      right: 76px;
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2px;
    }

    /* Logs Card & Table */
    .logs-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
    .table-responsive {
      overflow-x: auto;
    }
    .table-clean {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    .table-clean thead tr {
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }
    .table-clean th {
      padding: 12px 16px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748b;
    }
    .table-clean tbody tr {
      border-bottom: 1px solid #f1f5f9;
      transition: background 0.15s ease;
    }
    .table-clean tbody tr:hover {
      background: #f8fafc;
    }
    .table-clean tbody tr.row-failed {
      background: #fef2f2;
    }
    .table-clean td {
      padding: 14px 16px;
      font-size: 13px;
      color: #334155;
      vertical-align: middle;
    }

    /* Badges */
    .channel-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 11.5px;
      font-weight: 700;
    }
    .channel-icon { font-size: 14px; }
    .badge-email { background: #eff6ff; color: #0050e5; }
    .badge-sms { background: #ecfdf5; color: #059669; }
    .badge-whatsapp { background: #f0fdf4; color: #16a34a; }
    .badge-inapp { background: #f5f3ff; color: #7c3aed; }
    .badge-push { background: #fdf2f8; color: #db2777; }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 700;
    }
    .status-indicator {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
    .status-sent { background: #dcfce7; color: #15803d; }
    .status-sent .status-indicator { background: #15803d; }
    .status-queued { background: #dbeafe; color: #1d4ed8; }
    .status-queued .status-indicator { background: #1d4ed8; }
    .status-failed { background: #fee2e2; color: #b91c1c; }
    .status-failed .status-indicator { background: #b91c1c; }
    .status-processing { background: #fef3c7; color: #b45309; }
    .status-processing .status-indicator { background: #b45309; }

    .retry-counter {
      font-size: 10.5px;
      color: #b91c1c;
      font-weight: 600;
      margin-top: 3px;
    }

    /* Recipient cell */
    .recipient-cell {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .recipient-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #e2e8f0;
      color: #475569;
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .recipient-details {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .recipient-address {
      font-weight: 600;
      color: #0f172a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 220px;
    }
    .recipient-name {
      font-size: 11.5px;
      color: #64748b;
    }

    /* Content cell */
    .content-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
      max-width: 380px;
    }
    .message-subject {
      font-weight: 700;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .category-tag {
      font-size: 10.5px;
      font-weight: 600;
      color: #64748b;
      background: #f1f5f9;
      padding: 1px 6px;
      border-radius: 4px;
    }
    .message-snippet {
      font-size: 12px;
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Severity pill */
    .severity-pill {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 12px;
      text-transform: capitalize;
    }
    .sev-error { background: #fee2e2; color: #dc2626; }
    .sev-failed { background: #ffedd5; color: #ea580c; }
    .sev-success { background: #dcfce7; color: #16a34a; }
    .sev-newfeature { background: #e0f2fe; color: #0284c7; }
    .sev-update { background: #eff6ff; color: #0050e5; }
    .sev-maintenance { background: #f3e8ff; color: #9333ea; }

    /* Timeline cell */
    .timeline-cell {
      display: flex;
      flex-direction: column;
    }
    .time-primary {
      font-weight: 600;
      color: #0f172a;
      font-size: 12.5px;
    }
    .time-sub {
      font-size: 11px;
      color: #94a3b8;
    }

    /* Actions */
    .actions-group {
      display: inline-flex;
      gap: 4px;
    }
    .action-btn {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      color: #475569;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .action-btn:hover:not(:disabled) {
      background: #f8fafc;
      border-color: #cbd5e1;
    }
    .action-btn span { font-size: 16px; }
    .action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .spinning {
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    /* Pagination */
    .pagination-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 18px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      font-size: 12.5px;
      color: #64748b;
    }
    .pagination-buttons {
      display: flex;
      gap: 8px;
    }

    /* Empty & Loading */
    .empty-state {
      padding: 56px 24px;
      text-align: center;
      color: #64748b;
    }
    .empty-icon-wrap {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: #f1f5f9;
      color: #94a3b8;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
    }
    .empty-icon-wrap span { font-size: 32px; }
    .empty-state h3 {
      font-size: 17px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 6px;
    }
    .empty-state p {
      font-size: 13.5px;
      max-width: 480px;
      margin: 0 auto 20px;
      line-height: 1.5;
    }

    .loading-state {
      padding: 56px 24px;
      text-align: center;
      color: #64748b;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #e2e8f0;
      border-top-color: #0050e5;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .spinner-sm {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.4);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      display: inline-block;
    }

    /* Modals */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .modal-card {
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      width: 100%;
      display: flex;
      flex-direction: column;
      max-height: 90vh;
      overflow: hidden;
    }
    .inspector-modal {
      max-width: 860px;
    }
    .purge-modal {
      max-width: 500px;
    }
    .modal-header {
      padding: 16px 22px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .modal-title-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .modal-title-wrap h3 {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .btn-close {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      border-radius: 6px;
    }
    .btn-close:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    /* Inspector Meta */
    .inspector-meta-strip {
      display: flex;
      flex-wrap: wrap;
      gap: 16px 24px;
      padding: 14px 22px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      font-size: 12.5px;
    }
    .meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .meta-label {
      font-weight: 600;
      color: #64748b;
    }
    .meta-val {
      font-weight: 700;
      color: #0f172a;
    }
    .font-mono {
      font-family: monospace;
    }

    .diagnostic-error-banner {
      background: #fef2f2;
      border-bottom: 1px solid #fecaca;
      padding: 12px 22px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      font-size: 13px;
      color: #991b1b;
    }
    .error-text {
      margin-top: 2px;
      font-family: monospace;
      font-size: 12px;
    }

    /* Inspector Previews */
    .inspector-preview-body {
      padding: 22px;
      overflow-y: auto;
      flex: 1;
    }
    .inspector-tabs {
      display: flex;
      gap: 8px;
      border-bottom: 1px solid #e2e8f0;
      margin-bottom: 16px;
    }
    .tab-link {
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-bottom: -1px;
    }
    .tab-link.active {
      color: #0050e5;
      border-bottom-color: #0050e5;
    }
    .preview-frame-container {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
      background: #ffffff;
      min-height: 280px;
      max-height: 480px;
      overflow-y: auto;
    }
    .email-preview-render {
      padding: 18px;
    }
    .raw-code-container {
      background: #0f172a;
      color: #e2e8f0;
      padding: 16px;
      border-radius: 10px;
      font-family: monospace;
      font-size: 12px;
      overflow-x: auto;
      max-height: 400px;
    }
    .plain-text-container {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 18px;
      font-size: 13.5px;
      line-height: 1.6;
      color: #334155;
      white-space: pre-wrap;
    }

    /* Phone / SMS simulation */
    .sms-preview-wrapper {
      display: flex;
      gap: 24px;
      align-items: flex-start;
      flex-wrap: wrap;
    }
    .phone-frame {
      width: 280px;
      background: #1e293b;
      border-radius: 28px;
      padding: 14px 10px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    }
    .phone-notch {
      width: 80px;
      height: 12px;
      background: #0f172a;
      border-radius: 6px;
      margin: 0 auto 10px;
    }
    .phone-screen {
      background: #f1f5f9;
      border-radius: 18px;
      min-height: 320px;
      padding: 14px;
      display: flex;
      flex-direction: column;
    }
    .phone-sender-header {
      font-size: 12px;
      font-weight: 700;
      color: #475569;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e2e8f0;
    }
    .sms-bubble {
      background: #0050e5;
      color: #ffffff;
      border-radius: 16px 16px 4px 16px;
      padding: 12px 14px;
      font-size: 13px;
      line-height: 1.4;
      align-self: flex-end;
      max-width: 85%;
    }
    .sms-bubble p { margin: 0 0 6px; }
    .bubble-time {
      font-size: 10px;
      color: rgba(255, 255, 255, 0.7);
      float: right;
    }
    .sms-meta-panel {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px;
    }
    .sms-meta-panel h4 {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 14px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }

    /* WhatsApp simulation */
    .whatsapp-preview-wrapper {
      max-width: 480px;
      margin: 0 auto;
    }
    .whatsapp-card {
      background: #efeae2;
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid #d1d5db;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }
    .wa-header {
      background: #075e54;
      color: #ffffff;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .wa-logo { font-size: 22px; }
    .wa-name { font-weight: 700; font-size: 14px; }
    .wa-verified { color: #25d366; }
    .wa-sub { font-size: 11px; opacity: 0.8; }
    .wa-body {
      padding: 18px;
    }
    .wa-bubble {
      background: #ffffff;
      border-radius: 8px;
      padding: 12px 14px;
      font-size: 13px;
      line-height: 1.5;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      margin-bottom: 12px;
    }
    .wa-text { white-space: pre-wrap; }
    .wa-time-wrap {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 4px;
      font-size: 10px;
      color: #64748b;
      margin-top: 4px;
    }
    .wa-ticks { color: #34b7f1; }
    .wa-action-btn a {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      background: #25d366;
      color: #ffffff;
      text-decoration: none;
      font-weight: 700;
      font-size: 13px;
      padding: 10px;
      border-radius: 8px;
      transition: background 0.15s;
    }
    .wa-action-btn a:hover { background: #1eb956; }

    /* In-App / Push Card */
    .inapp-preview-wrapper {
      max-width: 520px;
      margin: 0 auto;
    }
    .notification-card-preview {
      display: flex;
      gap: 14px;
      padding: 16px 18px;
      border-radius: 12px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
    }
    .notif-icon-wrap {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: #eff6ff;
      color: #0050e5;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .notif-title {
      font-weight: 700;
      font-size: 14px;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .notif-message {
      font-size: 13px;
      color: #475569;
      line-height: 1.4;
      margin-bottom: 8px;
    }
    .notif-action-link {
      font-size: 12.5px;
      font-weight: 700;
      color: #0050e5;
      text-decoration: none;
    }

    /* Modal Footer */
    .modal-footer {
      padding: 14px 22px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
    }

    /* Purge Body */
    .purge-body {
      padding: 22px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      font-size: 13.5px;
      color: #475569;
    }
    .purge-warning {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 8px;
      padding: 12px 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 12.5px;
      color: #92400e;
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-weight: 600;
      font-size: 13.5px;
      border-radius: 10px;
      padding: 9px 16px;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.2s ease;
    }
    .btn-primary { background: #0050e5; color: #ffffff; }
    .btn-primary:hover:not(:disabled) { background: #003eb8; }
    .btn-danger { background: #dc2626; color: #ffffff; }
    .btn-danger:hover:not(:disabled) { background: #b91c1c; }
    .btn-outline { background: #ffffff; border-color: #cbd5e1; color: #334155; }
    .btn-outline:hover:not(:disabled) { background: #f8fafc; border-color: #94a3b8; }
    .btn-sm { padding: 7px 12px; font-size: 12.5px; border-radius: 8px; }
    .btn-xs { padding: 4px 8px; font-size: 11.5px; border-radius: 6px; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }

    .form-control {
      width: 100%;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 13px;
      outline: none;
    }
  `]
})
export class CommunicationsHubComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private sanitizer = inject(DomSanitizer);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isLoading = false;
  logs: MessagePoolItem[] = [];
  stats: MessagePoolStats = {
    totalMessages: 0,
    sentCount: 0,
    queuedCount: 0,
    failedCount: 0,
    processingCount: 0,
    emailCount: 0,
    smsCount: 0,
    whatsAppCount: 0,
    inAppCount: 0,
    pushCount: 0
  };

  searchQuery = '';
  selectedChannel = 'All';
  selectedStatus = 'All';
  page = 1;
  pageSize = 25;
  totalCount = 0;
  totalPages = 1;

  isRetrying: string | null = null;
  selectedMessageDetails: any = null;
  safeHtmlBody: SafeHtml = '';
  inspectorTab: 'preview' | 'source' | 'plain' = 'preview';

  get brandName(): string {
    return localStorage.getItem('tenant_brand_name') || localStorage.getItem('company_name') || 'Workspace';
  }

  showTourGuide = false;
  showPurgeModal = false;
  purgeDays = 30;
  isPurging = false;

  headerButtons: PageHeaderButton[] = [
    {
      text: 'Purge Old Logs',
      icon: 'auto_delete',
      isPrimary: false,
      action: () => (this.showPurgeModal = true)
    },
    {
      text: 'Refresh Telemetry',
      icon: 'refresh',
      isPrimary: true,
      action: () => this.loadLogs()
    }
  ];

  ngOnInit(): void {
    // Check local tour completion state (AGENTS.md Rule 13)
    const tourDone = localStorage.getItem('has_completed_tour_comms_hub');
    this.showTourGuide = !tourDone;

    // React to query params (e.g. ?channel=Email or ?channel=Sms)
    this.route.queryParams.subscribe((params) => {
      if (params['channel']) {
        this.selectedChannel = params['channel'];
      }
      if (params['status']) {
        this.selectedStatus = params['status'];
      }
      this.loadLogs();
    });
  }

  ngOnDestroy(): void {}

  dismissTour(): void {
    this.showTourGuide = false;
    localStorage.setItem('has_completed_tour_comms_hub', 'true');
  }

  loadLogs(): void {
    this.isLoading = true;
    const params = new URLSearchParams();
    if (this.searchQuery.trim()) params.append('search', this.searchQuery.trim());
    if (this.selectedChannel && this.selectedChannel !== 'All') params.append('channel', this.selectedChannel);
    if (this.selectedStatus && this.selectedStatus !== 'All') params.append('status', this.selectedStatus);
    params.append('page', this.page.toString());
    params.append('pageSize', this.pageSize.toString());

    this.api.get<any>(`communications/messages/logs?${params.toString()}`).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res?.data) {
          this.logs = res.data.items || [];
          if (res.data.pagination) {
            this.totalCount = res.data.pagination.totalCount || 0;
            this.totalPages = res.data.pagination.totalPages || 1;
          }
          if (res.data.stats) {
            this.stats = res.data.stats;
          }
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.toast.error(err?.error?.message || 'Failed to fetch communication logs.');
      }
    });
  }

  setChannel(channel: string): void {
    this.selectedChannel = channel;
    this.page = 1;
    this.loadLogs();
  }

  setStatus(status: string): void {
    this.selectedStatus = status;
    this.page = 1;
    this.loadLogs();
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedChannel = 'All';
    this.selectedStatus = 'All';
    this.page = 1;
    this.loadLogs();
  }

  goToPage(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.page = newPage;
      this.loadLogs();
    }
  }

  inspectMessage(id: string): void {
    this.api.get<any>(`communications/messages/${id}`).subscribe({
      next: (res) => {
        if (res?.data) {
          this.selectedMessageDetails = res.data;
          this.safeHtmlBody = this.sanitizer.bypassSecurityTrustHtml(res.data.content || '<p>No content recorded.</p>');
          this.inspectorTab = 'preview';
        }
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to load message details.');
      }
    });
  }

  closeInspector(): void {
    this.selectedMessageDetails = null;
  }

  retryMessage(id: string): void {
    this.isRetrying = id;
    this.api.post<any>(`communications/messages/${id}/retry`, {}).subscribe({
      next: (res) => {
        this.isRetrying = null;
        this.toast.success(res?.message || 'Message retry executed successfully.');
        this.loadLogs();
        if (this.selectedMessageDetails?.id === id) {
          this.inspectMessage(id);
        }
      },
      error: (err) => {
        this.isRetrying = null;
        this.toast.error(err?.error?.message || 'Failed to re-dispatch message.');
      }
    });
  }

  cancelMessage(id: string): void {
    this.api.post<any>(`communications/messages/${id}/cancel`, {}).subscribe({
      next: (res) => {
        this.toast.success('Message dispatch was cancelled.');
        this.loadLogs();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to cancel message dispatch.');
      }
    });
  }

  deleteMessage(id: string): void {
    if (!confirm('Are you sure you want to remove this message log?')) return;
    this.api.delete<any>(`communications/messages/${id}`).subscribe({
      next: () => {
        this.toast.success('Message log removed.');
        this.loadLogs();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to delete message log.');
      }
    });
  }

  confirmPurge(): void {
    this.isPurging = true;
    this.api.post<any>(`communications/messages/purge?olderThanDays=${this.purgeDays}`, {}).subscribe({
      next: (res) => {
        this.isPurging = false;
        this.showPurgeModal = false;
        this.toast.success(res?.message || 'Purged historical message records successfully.');
        this.loadLogs();
      },
      error: (err) => {
        this.isPurging = false;
        this.toast.error(err?.error?.message || 'Failed to purge message records.');
      }
    });
  }

  // Helpers
  getInitials(nameOrAddress: string): string {
    if (!nameOrAddress) return 'U';
    const clean = nameOrAddress.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (nameOrAddress.trim()[0] || 'U').toUpperCase();
  }

  getChannelClass(channel: string): string {
    switch (channel) {
      case 'Email': return 'badge-email';
      case 'Sms': return 'badge-sms';
      case 'WhatsApp': return 'badge-whatsapp';
      case 'InAppNotification': return 'badge-inapp';
      case 'Push': return 'badge-push';
      default: return 'badge-email';
    }
  }

  getChannelIcon(channel: string): string {
    switch (channel) {
      case 'Email': return 'mail';
      case 'Sms': return 'sms';
      case 'WhatsApp': return 'chat';
      case 'InAppNotification': return 'notifications';
      case 'Push': return 'phonelink_ring';
      default: return 'all_inbox';
    }
  }

  getChannelLabel(channel: string): string {
    switch (channel) {
      case 'InAppNotification': return 'In-App';
      default: return channel;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Sent': return 'status-sent';
      case 'Queued': return 'status-queued';
      case 'Failed': return 'status-failed';
      case 'Processing': return 'status-processing';
      default: return 'status-queued';
    }
  }

  getSeverityClass(severity: string): string {
    switch (severity?.toLowerCase()) {
      case 'error': return 'sev-error';
      case 'failed': return 'sev-failed';
      case 'success': return 'sev-success';
      case 'newfeature': return 'sev-newfeature';
      case 'update': return 'sev-update';
      case 'maintenance': return 'sev-maintenance';
      default: return 'sev-update';
    }
  }

  getSeverityIcon(severity: string): string {
    switch (severity?.toLowerCase()) {
      case 'error': return 'error';
      case 'failed': return 'warning';
      case 'success': return 'check_circle';
      case 'newfeature': return 'campaign';
      case 'maintenance': return 'build';
      default: return 'info';
    }
  }

  getSmsSegmentCount(content: string): number {
    if (!content) return 1;
    const len = content.length;
    if (len <= 160) return 1;
    return Math.ceil(len / 153);
  }
}

