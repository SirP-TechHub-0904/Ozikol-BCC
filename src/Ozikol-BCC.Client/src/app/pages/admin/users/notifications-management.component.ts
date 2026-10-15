import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-notifications-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="notif-mgmt-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Notification Studio</h1>
          <p class="page-sub">Send targeted security notices, member account alerts, and workspace broadcast announcements.</p>
        </div>
      </div>

      <!-- Main Navigation Tabs -->
      <div class="tabs-bar">
        <button class="tab-item" [class.active]="activeTab === 'dispatch'" (click)="activeTab = 'dispatch'">
          <span class="material-symbols-outlined">send</span>
          <span>Dispatch New Notification</span>
        </button>
        <button class="tab-item" [class.active]="activeTab === 'history'" (click)="activeTab = 'history'; loadHistory();">
          <span class="material-symbols-outlined">history</span>
          <span>Notification Logs & Broadcasts</span>
        </button>
      </div>

      <!-- TAB 1: Dispatch Studio -->
      <div class="studio-card" *ngIf="activeTab === 'dispatch'">
        <form (ngSubmit)="sendNotification()">
          <!-- Quick Presets -->
          <div class="presets-section">
            <label class="section-label">⚡ Quick Notification Presets:</label>
            <div class="preset-chips">
              <button type="button" class="preset-btn" (click)="applyPreset('security_tip')">
                <span class="material-symbols-outlined text-red">shield_lock</span>
                <span>Security Reminder & OTP Tip</span>
              </button>
              <button type="button" class="preset-btn" (click)="applyPreset('greetings')">
                <span class="material-symbols-outlined text-blue">celebration</span>
                <span>Warm Greetings & Happy Day</span>
              </button>
              <button type="button" class="preset-btn" (click)="applyPreset('checkin')">
                <span class="material-symbols-outlined text-green">favorite</span>
                <span>Member Check-in & Support</span>
              </button>
              <button type="button" class="preset-btn" (click)="applyPreset('maintenance')">
                <span class="material-symbols-outlined text-purple">campaign</span>
                <span>System Maintenance Broadcast</span>
              </button>
              <button type="button" class="preset-btn" (click)="applyPreset('meeting')">
                <span class="material-symbols-outlined text-amber">event</span>
                <span>General Assembly & Meeting</span>
              </button>
              <button type="button" class="preset-btn" (click)="applyPreset('guidelines')">
                <span class="material-symbols-outlined text-blue">info</span>
                <span>Community Guidelines Notice</span>
              </button>
            </div>
          </div>

          <div class="form-layout">
            <!-- Left Column: Targeting & Basic Info -->
            <div class="form-col">
              <div class="form-group">
                <label>Target Recipients</label>
                <div class="target-type-selector">
                  <label class="radio-label" [class.checked]="model.targetType === 'SingleUser'">
                    <input type="radio" [(ngModel)]="model.targetType" name="targetType" value="SingleUser" />
                    <span>Single Member</span>
                  </label>
                  <label class="radio-label" [class.checked]="model.targetType === 'Category'">
                    <input type="radio" [(ngModel)]="model.targetType" name="targetType" value="Category" />
                    <span>User Category</span>
                  </label>
                  <label class="radio-label" [class.checked]="model.targetType === 'BroadcastAll'">
                    <input type="radio" [(ngModel)]="model.targetType" name="targetType" value="BroadcastAll" />
                    <span>Broadcast to All</span>
                  </label>
                </div>
              </div>

              <!-- Target: Single User -->
              <div class="form-group" *ngIf="model.targetType === 'SingleUser'">
                <label>Select Target Member</label>
                <select [(ngModel)]="model.targetUserId" name="targetUserId" required class="form-select">
                  <option value="">-- Choose Member --</option>
                  <option *ngFor="let u of membersList" [value]="u.id">
                    {{ u.fullName || u.email }} ({{ u.email }})
                  </option>
                </select>
              </div>

              <!-- Target: Category -->
              <div class="form-group" *ngIf="model.targetType === 'Category'">
                <label>Select User Category</label>
                <select [(ngModel)]="model.targetCategoryId" name="targetCategoryId" required class="form-select">
                  <option value="">-- Choose Category --</option>
                  <option *ngFor="let c of categoriesList" [value]="c.id">{{ c.name }}</option>
                </select>
              </div>

              <div class="form-group">
                <label>Notification Title</label>
                <input type="text" [(ngModel)]="model.title" name="title" required placeholder="e.g. Account Security Alert" class="form-input" />
              </div>

              <div class="form-group">
                <label>Message Content</label>
                <textarea [(ngModel)]="model.message" name="message" required rows="4" placeholder="Enter full notification body..." class="form-textarea"></textarea>
              </div>
            </div>

            <!-- Right Column: Metadata & Channels -->
            <div class="form-col">
              <div class="form-grid-3">
                <div class="form-group">
                  <label>Severity Level</label>
                  <select [(ngModel)]="model.severity" name="severity" class="form-select">
                    <option value="Error">Error (#F06548)</option>
                    <option value="Failed">Failed (#F7B84B)</option>
                    <option value="Success">Success (#0AB39C)</option>
                    <option value="NewFeature">New Feature (#38BDF8)</option>
                    <option value="Update">Update (#1F6BFF)</option>
                    <option value="Maintenance">Maintenance (#9333EA)</option>
                  </select>
                </div>

                <div class="form-group">
                  <label>Category</label>
                  <select [(ngModel)]="model.category" name="category" class="form-select">
                    <option value="General">General</option>
                    <option value="Security">Security</option>
                    <option value="Membership">Membership</option>
                    <option value="Performance">Performance / KPI</option>
                    <option value="System">System</option>
                  </select>
                </div>

                <div class="form-group">
                  <label>Priority Level</label>
                  <select [(ngModel)]="model.priority" name="priority" class="form-select">
                    <option value="Low">Low</option>
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div class="form-grid-2">
                <div class="form-group">
                  <label>Module / Feature</label>
                  <input type="text" [(ngModel)]="model.module" name="module" placeholder="e.g. Security, Users" class="form-input" />
                </div>

                <div class="form-group">
                  <label>Material Icon Name</label>
                  <input type="text" [(ngModel)]="model.icon" name="icon" placeholder="e.g. notifications, lock_reset" class="form-input" />
                </div>
              </div>

              <div class="form-group">
                <label>Action Link URL (Optional)</label>
                <input type="text" [(ngModel)]="model.actionUrl" name="actionUrl" placeholder="e.g. /users/workspace/security" class="form-input" />
              </div>

              <!-- Multi-Channel Delivery Channels Selection -->
              <div class="form-group channels-section">
                <label class="section-label" style="display:block; margin-bottom:8px; font-weight:700;">Delivery Channels</label>
                <div style="display:flex; flex-direction:column; gap:6px;">
                  <label class="checkbox-label">
                    <input type="checkbox" [(ngModel)]="model.sendInApp" name="sendInApp" />
                    <span>In-App Feed & SignalR Real-Time Socket</span>
                  </label>
                  <label class="checkbox-label">
                    <input type="checkbox" [(ngModel)]="model.sendPush" name="sendPush" />
                    <span>Mobile & Desktop Native Push (OneSignal / FCM)</span>
                  </label>
                  <label class="checkbox-label">
                    <input type="checkbox" [(ngModel)]="model.sendEmailCopy" name="sendEmailCopy" />
                    <span>Transactional Email via Postmark Suite</span>
                  </label>
                  <label class="checkbox-label">
                    <input type="checkbox" [(ngModel)]="model.sendSms" name="sendSms" />
                    <span>Carrier SMS Text Alert</span>
                  </label>
                  <label class="checkbox-label">
                    <input type="checkbox" [(ngModel)]="model.sendWhatsApp" name="sendWhatsApp" />
                    <span>Transactional WhatsApp Message</span>
                  </label>
                </div>
              </div>

              <!-- Live Preview Card -->
              <div class="preview-card">
                <div class="preview-label">Live Preview:</div>
                <div class="preview-item">
                  <div class="preview-icon">
                    <span class="material-symbols-outlined">{{ model.icon || 'notifications' }}</span>
                  </div>
                  <div>
                    <div class="preview-title">{{ model.title || 'Notification Headline' }}</div>
                    <div class="preview-msg">{{ model.message || 'Notification message description will appear here...' }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Channel-Specific Message Customization (Optional overrides for Push, SMS, Email, WhatsApp) -->
          <div class="channel-custom-panel">
            <button type="button" class="btn-toggle-channel-custom" (click)="customChannelsExpanded = !customChannelsExpanded">
              <div style="display:flex; align-items:center; gap:8px;">
                <span class="material-symbols-outlined">{{ customChannelsExpanded ? 'expand_less' : 'tune' }}</span>
                <span style="font-weight:700;">Customize Channel Messages & Templates (SMS, Push, WhatsApp, Email)</span>
              </div>
              <span class="custom-badge">{{ customChannelsExpanded ? 'Hide Overrides' : 'Fine-Tune Copies' }}</span>
            </button>

            <div *ngIf="customChannelsExpanded" class="channel-custom-body">
              <div class="channel-tabs">
                <button type="button" class="ch-tab" [class.active]="activeCustomTab === 'push'" (click)="activeCustomTab = 'push'">
                  <span class="material-symbols-outlined">notifications_active</span>
                  <span>Push Lock-Screen</span>
                </button>
                <button type="button" class="ch-tab" [class.active]="activeCustomTab === 'sms'" (click)="activeCustomTab = 'sms'">
                  <span class="material-symbols-outlined">sms</span>
                  <span>Carrier SMS (160 char limit)</span>
                </button>
                <button type="button" class="ch-tab" [class.active]="activeCustomTab === 'email'" (click)="activeCustomTab = 'email'">
                  <span class="material-symbols-outlined">mail</span>
                  <span>Email & Anti-Spam</span>
                </button>
                <button type="button" class="ch-tab" [class.active]="activeCustomTab === 'whatsapp'" (click)="activeCustomTab = 'whatsapp'">
                  <span class="material-symbols-outlined">chat</span>
                  <span>WhatsApp Markdown</span>
                </button>
              </div>

              <!-- Push Tab -->
              <div *ngIf="activeCustomTab === 'push'" class="channel-tab-content">
                <div class="form-group">
                  <div style="display:flex; justify-content:space-between;">
                    <label>Push Notification Title (Max 50 chars)</label>
                    <span class="char-count" [class.over]="(model.pushTitle || model.title).length > 50">
                      {{ (model.pushTitle || model.title).length }}/50
                    </span>
                  </div>
                  <input type="text" [(ngModel)]="model.pushTitle" name="pushTitle" placeholder="Defaults to main title (e.g. Security Alert)" class="form-input" maxlength="70" />
                </div>
                <div class="form-group">
                  <div style="display:flex; justify-content:space-between;">
                    <label>Push Notification Body (Lock-screen recommended max 140 chars)</label>
                    <span class="char-count" [class.over]="(model.pushBody || model.message).length > 140">
                      {{ (model.pushBody || model.message).length }}/140
                    </span>
                  </div>
                  <textarea [(ngModel)]="model.pushBody" name="pushBody" rows="2" placeholder="Defaults to main message content..." class="form-textarea" maxlength="200"></textarea>
                </div>
                <div class="lockscreen-preview">
                  <div class="lockscreen-header">
                    <span class="material-symbols-outlined text-blue">phone_iphone</span>
                    <span>Mobile Lock-Screen Notification Preview</span>
                  </div>
                  <div class="lockscreen-bubble">
                    <div style="font-weight:700; font-size:12px;">{{ companyName }} • {{ model.severity }}</div>
                    <div style="font-weight:600; font-size:13px; color:#0f172a; margin-top:2px;">{{ (model.pushTitle || model.title || 'Title') | slice:0:50 }}</div>
                    <div style="font-size:12px; color:#475569; margin-top:2px;">{{ (model.pushBody || model.message || 'Message preview...') | slice:0:140 }}</div>
                  </div>
                </div>
              </div>

              <!-- SMS Tab -->
              <div *ngIf="activeCustomTab === 'sms'" class="channel-tab-content">
                <div class="form-group">
                  <div style="display:flex; justify-content:space-between;">
                    <label>Carrier SMS Content (Plain Text Only, GSM 7-bit)</label>
                    <span class="char-count" [class.over]="getSmsTextLength() > 160">
                      {{ getSmsTextLength() }}/160 characters ({{ getSmsSegments() }} segment{{ getSmsSegments() > 1 ? 's' : '' }})
                    </span>
                  </div>
                  <textarea [(ngModel)]="model.smsMessage" name="smsMessage" rows="3" placeholder="Leave empty to auto-format: [{{companyName}}] Title: Body" class="form-textarea"></textarea>
                  <div *ngIf="getSmsTextLength() > 160" class="warning-text">
                    ⚠️ Message exceeds 160 characters. Carriers will split this into {{ getSmsSegments() }} SMS messages, increasing delivery costs.
                  </div>
                </div>
                <div class="sms-preview-bubble">
                  <span class="sms-sender">From: {{ companyName | slice:0:11 }}</span>
                  <div class="sms-body">{{ getEffectiveSmsText() }}</div>
                </div>
              </div>

              <!-- Email Tab -->
              <div *ngIf="activeCustomTab === 'email'" class="channel-tab-content">
                <div class="form-group">
                  <div style="display:flex; justify-content:space-between;">
                    <label>Email Subject Line</label>
                    <span *ngIf="isAllCaps(model.emailSubject || model.title)" class="spam-badge">
                      ⚠️ ALL CAPS Subject Hurts Deliverability
                    </span>
                  </div>
                  <input type="text" [(ngModel)]="model.emailSubject" name="emailSubject" placeholder="Defaults to: [{{model.severity.toUpperCase()}}] {{model.title}}" class="form-input" />
                  <div *ngIf="getSpamKeywordWarning(model.emailSubject || model.title)" class="warning-text">
                    ⚠️ {{ getSpamKeywordWarning(model.emailSubject || model.title) }}
                  </div>
                </div>
                <div class="form-group">
                  <label>Custom HTML Body (Optional)</label>
                  <textarea [(ngModel)]="model.emailHtmlBody" name="emailHtmlBody" rows="3" placeholder="Leave empty to use standard responsive branded template with severity colors..." class="form-textarea font-mono"></textarea>
                </div>
              </div>

              <!-- WhatsApp Tab -->
              <div *ngIf="activeCustomTab === 'whatsapp'" class="channel-tab-content">
                <div class="form-group">
                  <label>WhatsApp Message (*bold*, _italic_, bullet points)</label>
                  <textarea [(ngModel)]="model.whatsAppMessage" name="whatsAppMessage" rows="3" placeholder="Leave empty to auto-format with WhatsApp markdown..." class="form-textarea"></textarea>
                </div>
                <div class="wa-preview-bubble">
                  <div class="wa-title">*{{ (model.title || 'Headline') }}*</div>
                  <div class="wa-msg">{{ model.whatsAppMessage || model.message || 'Notification content...' }}</div>
                  <div *ngIf="model.actionUrl" class="wa-link">👉 *Open in Workspace:* {{ model.actionUrl }}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" [disabled]="submitting" class="btn-dispatch">
              <span class="material-symbols-outlined">{{ submitting ? 'hourglass_top' : 'send' }}</span>
              <span>{{ submitting ? 'Dispatching...' : 'Dispatch Notification' }}</span>
            </button>
            <span *ngIf="successMsg" class="success-banner">{{ successMsg }}</span>
            <span *ngIf="errorMsg" class="error-banner">{{ errorMsg }}</span>
          </div>
        </form>
      </div>

      <!-- TAB 2: History & Broadcast Logs -->
      <div class="history-card" *ngIf="activeTab === 'history'">
        <div class="table-wrap">
          <table class="history-table">
            <thead>
              <tr>
                <th>Type / Recipient</th>
                <th>Notification Details</th>
                <th>Severity</th>
                <th>Priority</th>
                <th>Category</th>
                <th>Date Dispatched</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of historyList">
                <td>
                  <span class="type-pill" [class.broadcast]="item.isBroadcast">
                    {{ item.isBroadcast ? 'Broadcast All' : 'Target Member' }}
                  </span>
                </td>
                <td>
                  <strong>{{ item.title }}</strong>
                  <div class="sub-desc">{{ item.message }}</div>
                </td>
                <td>
                  <span class="severity-pill" [style.background-color]="(item.severityColor || '#1F6BFF') + '22'" [style.color]="item.severityColor || '#1F6BFF'" [style.border]="'1px solid ' + (item.severityColor || '#1F6BFF')" [style.padding]="'3px 8px'" [style.border-radius]="'100px'" [style.font-size]="'11px'" [style.font-weight]="'700'">
                    {{ item.severity || 'Update' }}
                  </span>
                </td>
                <td><span class="priority-pill" [ngClass]="item.priority?.toLowerCase()">{{ item.priority }}</span></td>
                <td><span class="cat-pill">{{ item.category }}</span></td>
                <td class="date-cell">{{ item.createdAt | date:'short' }}</td>
                <td>
                  <button (click)="deleteHistoryItem(item)" class="btn-icon-del" title="Delete log">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </td>
              </tr>
              <tr *ngIf="!historyList.length">
                <td colspan="7" class="empty-cell">No notifications dispatched yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notif-mgmt-container { display: flex; flex-direction: column; gap: 20px; }
    .page-header { margin-bottom: 4px; }
    .page-title { font-size: 22px; font-weight: 800; color: var(--md-sys-color-on-surface, #0f172a); margin: 0 0 4px; }
    .page-sub { font-size: 13px; color: #64748b; margin: 0; }
    .tabs-bar {
      display: flex;
      gap: 12px;
      border-bottom: 1px solid var(--md-sys-color-outline, #e2e8f0);
      padding-bottom: 10px;
    }
    .tab-item {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: none;
      border: none;
      padding: 10px 18px;
      border-radius: 10px;
      font-size: 13.5px;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      transition: all 0.2s;
    }
    .tab-item:hover { background: rgba(0, 80, 229, 0.08); color: #0050e5; }
    .tab-item.active { background: #0050e5; color: #ffffff; font-weight: 700; box-shadow: 0 4px 12px rgba(0, 80, 229, 0.25); }
    .studio-card, .history-card {
      background: var(--md-sys-color-surface, #ffffff);
      border: 1px solid var(--md-sys-color-outline, #e2e8f0);
      border-radius: 14px;
      padding: 28px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
    }
    .presets-section {
      background: var(--md-sys-color-surface-variant, #f8fafc);
      border: 1px solid var(--md-sys-color-outline, #e2e8f0);
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 24px;
    }
    .section-label { font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 10px; display: block; }
    .preset-chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .preset-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12.5px;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
      transition: all 0.2s;
    }
    .preset-btn:hover { border-color: #0050e5; color: #0050e5; transform: translateY(-1px); }
    .preset-btn span.material-symbols-outlined { font-size: 16px; }
    .text-red { color: #ef4444; }
    .text-blue { color: #0050e5; }
    .text-green { color: #16a34a; }
    .text-purple { color: #9333ea; }
    .text-amber { color: #d97706; }
    .form-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 28px;
      margin-bottom: 24px;
    }
    @media (max-width: 860px) {
      .form-layout { grid-template-columns: 1fr; }
    }
    .form-col { display: flex; flex-direction: column; gap: 16px; }
    .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label {
      font-size: 12px;
      font-weight: 700;
      color: var(--md-sys-color-on-surface, #334155);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .target-type-selector { display: flex; gap: 10px; flex-wrap: wrap; }
    .radio-label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--md-sys-color-surface-variant, #f8fafc);
      border: 1px solid var(--md-sys-color-outline, #cbd5e1);
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .radio-label.checked { border-color: #0050e5; background: rgba(0, 80, 229, 0.08); color: #0050e5; }
    .form-input, .form-select, .form-textarea {
      padding: 10px 14px;
      border: 1px solid var(--md-sys-color-outline, #cbd5e1);
      border-radius: 8px;
      font-size: 13.5px;
      color: var(--md-sys-color-on-surface, #0f172a);
      background: var(--md-sys-color-surface-variant, #f8fafc);
      box-sizing: border-box;
      outline: none;
      transition: all 0.2s;
    }
    .form-input:focus, .form-select:focus, .form-textarea:focus {
      border-color: #0050e5;
      background: #ffffff;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.15);
    }
    .form-textarea { resize: vertical; }
    .email-copy-group {
      background: #f0fdf4;
      border: 1px solid #86efac;
      padding: 10px 14px;
      border-radius: 8px;
    }
    .checkbox-label {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 600;
      color: #166534;
      cursor: pointer;
    }
    .preview-card {
      background: #1e293b;
      border-radius: 10px;
      padding: 14px;
      color: #ffffff;
    }
    .preview-label { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px; }
    .preview-item { display: flex; align-items: flex-start; gap: 10px; }
    .preview-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: #0050e5;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .preview-icon span { font-size: 18px; color: #ffffff; }
    .preview-title { font-size: 13px; font-weight: 700; color: #ffffff; }
    .preview-msg { font-size: 11.5px; color: #94a3b8; margin-top: 2px; }
    .form-actions { display: flex; align-items: center; gap: 16px; border-top: 1px solid var(--md-sys-color-outline, #e2e8f0); padding-top: 20px; }
    .btn-dispatch {
      background: linear-gradient(135deg, #0050e5, #1f6bff);
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 11px 24px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 12px rgba(0, 80, 229, 0.35);
      transition: all 0.2s;
    }
    .btn-dispatch:hover:not(:disabled) { transform: translateY(-1px); }
    .btn-dispatch:disabled { opacity: 0.5; cursor: not-allowed; }
    .success-banner { color: #16a34a; font-size: 13px; font-weight: 700; }
    .error-banner { color: #ef4444; font-size: 13px; font-weight: 700; }
    .table-wrap { overflow-x: auto; }
    .history-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .history-table th {
      text-align: left;
      padding: 10px 14px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      border-bottom: 1px solid var(--md-sys-color-outline, #e2e8f0);
    }
    .history-table td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--md-sys-color-outline, #f1f5f9);
      color: var(--md-sys-color-on-surface, #0f172a);
    }
    .sub-desc { font-size: 11.5px; color: #64748b; margin-top: 2px; }
    .type-pill {
      background: rgba(0, 80, 229, 0.1);
      color: #0050e5;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
    }
    .type-pill.broadcast { background: rgba(168, 85, 247, 0.12); color: #9333ea; }
    .priority-pill { padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; }
    .priority-pill.urgent, .priority-pill.high { background: rgba(239, 68, 68, 0.12); color: #ef4444; }
    .priority-pill.normal, .priority-pill.low { background: #f1f5f9; color: #475569; }
    .cat-pill { font-size: 11.5px; color: #64748b; }
    .date-cell { color: #64748b; font-size: 11.5px; }
    .btn-icon-del { background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px; }
    .btn-icon-del:hover { color: #ef4444; }
    .empty-cell { text-align: center; padding: 28px; color: #64748b; }
    .channel-custom-panel {
      margin-top: 20px;
      margin-bottom: 20px;
      border: 1px solid var(--md-sys-color-outline, #cbd5e1);
      border-radius: 12px;
      background: var(--md-sys-color-surface-variant, #f8fafc);
      overflow: hidden;
    }
    .btn-toggle-channel-custom {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 13.5px;
      color: var(--md-sys-color-on-surface, #0f172a);
    }
    .custom-badge {
      font-size: 11px;
      font-weight: 700;
      color: #0050e5;
      background: rgba(0, 80, 229, 0.1);
      padding: 4px 10px;
      border-radius: 100px;
    }
    .channel-custom-body {
      padding: 16px;
      border-top: 1px solid var(--md-sys-color-outline, #e2e8f0);
      background: #ffffff;
    }
    .channel-tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 8px;
      flex-wrap: wrap;
    }
    .ch-tab {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 6px;
      background: none;
      border: 1px solid transparent;
      font-size: 12.5px;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
    }
    .ch-tab.active {
      background: rgba(0, 80, 229, 0.08);
      color: #0050e5;
      border-color: #93c5fd;
    }
    .char-count { font-size: 11px; font-weight: 600; color: #64748b; }
    .char-count.over { color: #ef4444; font-weight: 700; }
    .spam-badge { font-size: 11px; font-weight: 700; color: #ef4444; background: #fef2f2; padding: 2px 6px; border-radius: 4px; }
    .warning-text { font-size: 11.5px; color: #d97706; margin-top: 4px; font-weight: 600; }
    .lockscreen-preview {
      background: #0f172a;
      border-radius: 12px;
      padding: 14px;
      margin-top: 12px;
      color: #ffffff;
    }
    .lockscreen-header { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #94a3b8; font-weight: 600; margin-bottom: 8px; }
    .lockscreen-bubble {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 10px;
      padding: 10px 12px;
      color: #0f172a;
    }
    .sms-preview-bubble {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 12px;
      margin-top: 12px;
      font-family: monospace;
      font-size: 12px;
    }
    .sms-sender { font-weight: 700; color: #0050e5; display: block; margin-bottom: 4px; }
    .sms-body { color: #334155; }
    .wa-preview-bubble {
      background: #dcf8c6;
      border-radius: 12px;
      padding: 12px 14px;
      margin-top: 12px;
      color: #111b21;
      font-size: 13px;
      line-height: 1.4;
      max-width: 400px;
      border: 1px solid #b2d8a0;
    }
    .wa-title { font-weight: 700; margin-bottom: 4px; }
    .wa-msg { white-space: pre-wrap; }
    .wa-link { color: #00a884; font-weight: 600; margin-top: 6px; }
    .font-mono { font-family: monospace; font-size: 12px; }
  `]
})
export class NotificationsManagementComponent implements OnInit {
  activeTab = 'dispatch';
  model = {
    targetType: 'SingleUser',
    targetUserId: '',
    targetCategoryId: '',
    title: '',
    message: '',
    actionUrl: '',
    module: 'General',
    icon: 'notifications',
    priority: 'Normal',
    category: 'General',
    severity: 'Update',
    sendInApp: true,
    sendPush: false,
    sendEmailCopy: false,
    sendSms: false,
    sendWhatsApp: false,
    pushTitle: '',
    pushBody: '',
    emailSubject: '',
    emailHtmlBody: '',
    smsMessage: '',
    whatsAppMessage: ''
  };

  customChannelsExpanded = false;
  activeCustomTab: 'push' | 'sms' | 'email' | 'whatsapp' = 'push';

  readonly spamBlacklist = [
    '100% Free', 'Earn Money Fast', 'No Risk', 'Act Now', 'Guaranteed Return',
    'Click Here Now', 'Winner', 'Risk Free', 'Double Your Cash', 'Million Dollars'
  ];

  isAllCaps(text: string): boolean {
    if (!text || text.length < 8) return false;
    return text === text.toUpperCase() && /[A-Z]/.test(text);
  }

  getSpamKeywordWarning(text: string): string | null {
    if (!text) return null;
    for (const kw of this.spamBlacklist) {
      if (text.toLowerCase().includes(kw.toLowerCase())) {
        return `Subject contains spam trigger phrase "${kw}". This may cause mailbox filters to junk the message.`;
      }
    }
    return null;
  }

  getEffectiveSmsText(): string {
    if (this.model.smsMessage) return this.model.smsMessage;
    const prefix = `[${this.companyName.toUpperCase().slice(0, 8)}] `;
    return `${prefix}${this.model.title || 'Title'}: ${this.model.message || 'Message'}`;
  }

  getSmsTextLength(): number {
    return this.getEffectiveSmsText().length;
  }

  getSmsSegments(): number {
    const len = this.getSmsTextLength();
    if (len <= 160) return 1;
    return Math.ceil(len / 153);
  }

  membersList: any[] = [];
  categoriesList: any[] = [];
  historyList: any[] = [];
  submitting = false;
  successMsg = '';
  errorMsg = '';

  companyName = localStorage.getItem('tenant_company_name') || 'Organization';

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadTenantSettings();
    this.loadMembersAndCategories();
  }

  loadTenantSettings(): void {
    this.api.get<any>('SettingsApi').subscribe({
      next: (res) => {
        if (res?.data?.companyName) {
          this.companyName = res.data.companyName;
          localStorage.setItem('tenant_company_name', this.companyName);
        }
      },
      error: () => {}
    });
  }

  loadMembersAndCategories(): void {
    this.api.get<any>('UsersApi').subscribe({
      next: (res) => {
        if (Array.isArray(res?.data)) {
          this.membersList = res.data;
        } else if (Array.isArray(res?.data?.items)) {
          this.membersList = res.data.items;
        }
      },
      error: () => {}
    });

    this.api.get<any>('UsersApi/categories').subscribe({
      next: (res) => {
        if (Array.isArray(res?.data)) {
          this.categoriesList = res.data;
        } else if (Array.isArray(res?.data?.items)) {
          this.categoriesList = res.data.items;
        }
      },
      error: () => {}
    });
  }

  loadHistory(): void {
    this.api.get<any>('NotificationsApi/all').subscribe({
      next: (res) => {
        if (res?.data) {
          this.historyList = res.data;
        }
      },
      error: () => {}
    });
  }

  applyPreset(type: string): void {
    const cName = this.companyName || 'Organization';

    if (type === 'security_tip') {
      this.model.title = 'Security Advisory: Protect Your Credentials';
      this.model.message = `Security Reminder: Please note that ${cName} administrators will never ask for your password, PIN, or OTP verification code. Never share your verification codes with anyone.`;
      this.model.category = 'Security';
      this.model.priority = 'High';
      this.model.severity = 'Error';
      this.model.module = 'Security';
      this.model.icon = 'shield_lock';
      this.model.actionUrl = '/users/workspace/security';
    } else if (type === 'greetings') {
      this.model.title = `Warm Greetings from ${cName}!`;
      this.model.message = `Wishing you a productive and joyful week ahead! Thank you for being a valued member of ${cName}.`;
      this.model.category = 'General';
      this.model.priority = 'Normal';
      this.model.severity = 'Success';
      this.model.module = 'Community';
      this.model.icon = 'celebration';
      this.model.actionUrl = '/dashboard/workspace';
    } else if (type === 'checkin') {
      this.model.title = `${cName} Member Check-in & Support`;
      this.model.message = `We are checking in on your experience and milestones. If you need any assistance, guidance, or support, please reach out to the ${cName} management team.`;
      this.model.category = 'Membership';
      this.model.priority = 'Normal';
      this.model.severity = 'Update';
      this.model.module = 'Users';
      this.model.icon = 'favorite';
      this.model.actionUrl = '/users/workspace/profile';
    } else if (type === 'maintenance') {
      this.model.targetType = 'BroadcastAll';
      this.model.title = 'Scheduled System Maintenance Notice';
      this.model.message = 'System maintenance is scheduled for tonight at 10:00 PM UTC. Platform services will remain available with minor intermittency.';
      this.model.category = 'System';
      this.model.priority = 'Normal';
      this.model.severity = 'Maintenance';
      this.model.module = 'Announcement';
      this.model.icon = 'campaign';
      this.model.actionUrl = '/dashboard/console';
    } else if (type === 'meeting') {
      this.model.targetType = 'BroadcastAll';
      this.model.title = `Upcoming ${cName} General Assembly & Meeting`;
      this.model.message = `Please join us for our upcoming virtual general assembly meeting. We will discuss key community milestones, updates, and upcoming events.`;
      this.model.category = 'General';
      this.model.priority = 'High';
      this.model.severity = 'Update';
      this.model.module = 'Events';
      this.model.icon = 'event';
      this.model.actionUrl = '/groups/workspace';
    } else if (type === 'guidelines') {
      this.model.targetType = 'BroadcastAll';
      this.model.title = `${cName} Community Guidelines Notice`;
      this.model.message = `Please take a moment to review our updated workspace conduct and operational guidelines to ensure a productive and collaborative environment.`;
      this.model.category = 'System';
      this.model.priority = 'Normal';
      this.model.severity = 'Update';
      this.model.module = 'Policy';
      this.model.icon = 'info';
      this.model.actionUrl = '/dashboard/workspace';
    }
  }

  sendNotification(): void {
    if (this.model.targetType === 'SingleUser' && !this.model.targetUserId) {
      this.errorMsg = 'Please select a target member.';
      return;
    }
    if (this.model.targetType === 'Category' && !this.model.targetCategoryId) {
      this.errorMsg = 'Please select a target category.';
      return;
    }

    this.submitting = true;
    this.successMsg = '';
    this.errorMsg = '';

    const payload = {
      ...this.model,
      targetUserId: this.model.targetType === 'SingleUser' ? this.model.targetUserId : null,
      targetCategoryId: this.model.targetType === 'Category' ? this.model.targetCategoryId : null
    };

    this.api.post<any>('NotificationsApi/dispatch', payload).subscribe({
      next: (res) => {
        this.submitting = false;
        this.successMsg = `Notification successfully dispatched! (${res?.data?.dispatchedCount || 1} recipient(s))`;
        setTimeout(() => this.successMsg = '', 6000);
      },
      error: (err) => {
        this.submitting = false;
        this.errorMsg = err?.error?.message || err?.error?.title || 'Failed to dispatch notification.';
        setTimeout(() => this.errorMsg = '', 6000);
      }
    });
  }

  deleteHistoryItem(item: any): void {
    this.api.delete<any>(`NotificationsApi/${item.id}`).subscribe({
      next: () => {
        this.historyList = this.historyList.filter(h => h.id !== item.id);
      },
      error: () => {}
    });
  }
}
