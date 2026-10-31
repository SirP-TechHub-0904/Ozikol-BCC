import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

export interface WorkstationItem {
  id: string;
  stationKey: string;
  machineName: string;
  hardwareGuid?: string;
  assignedUserId?: string;
  assignedUserName?: string;
  assignedUserEmail?: string;
  department?: string;
  ipAddress?: string;
  osVersion?: string;
  clientVersion?: string;
  isOnline: boolean;
  lastHeartbeat?: string;
  currentProcessName?: string;
  currentWindowTitle?: string;
  currentDocumentPath?: string;
  isLocked: boolean;
  lockReason?: string;
  kioskEnforced: boolean;
  createdAt: string;
}

export interface AppPolicyItem {
  id: string;
  displayName: string;
  processName: string;
  category: string;
  isAllowed: boolean;
  applicableRole?: string;
  iconName?: string;
}

export interface FilePolicyItem {
  id?: string;
  approvedDirectoryPath: string;
  usbStoragePolicy: string;
  blockUsbStorage: boolean;
  enforceDirectorySandbox: boolean;
}

export interface AccessRequestItem {
  id: string;
  workstationId?: string;
  machineName: string;
  userId: string;
  userName: string;
  requestedProcessName: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Denied';
  approvedUntil?: string;
  reviewedByUserId?: string;
  createdAt: string;
}

export interface ViolationLogItem {
  id: string;
  workstationId?: string;
  machineName: string;
  userName?: string;
  processName: string;
  windowTitle?: string;
  filePath?: string;
  actionTaken: string;
  violationType: string;
  timestamp: string;
}

export interface WorkstationActivityLogItem {
  id: string;
  workstationId?: string;
  stationKey?: string;
  machineName: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  eventType: string;
  processName?: string;
  appDisplayName?: string;
  windowTitle?: string;
  fileName?: string;
  filePath?: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
  screenshotUrl?: string;
  details?: string;
  timestamp: string;
}

@Component({
  selector: 'app-workstations-console',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslatePipe],
  template: `
    <div class="workstations-container animate-fade">
      <!-- Top Title & Navigation Breadcrumb -->
      <div class="page-header">
        <div class="header-left">
          <div class="badge-tag">
            <span class="material-symbols-outlined text-blue">desktop_windows</span>
            <span>SUITE 11 &bull; WORKSPACE [DESKTOP ONLY]</span>
          </div>
          <h1 class="page-title">{{ 'workspace.title' | translate:'Workstations & Application Gatekeeper' }}</h1>
          <p class="page-subtitle">
            {{ 'workspace.subtitle' | translate:'Supervise native office PCs, enforce company-only application execution, isolate corporate working documents, and prevent unauthorized side-job activities.' }}
          </p>
        </div>
        <div class="header-right">
          <button (click)="refreshAll()" class="btn-refresh" [class.spinning]="isLoading">
            <span class="material-symbols-outlined">refresh</span>
            <span>{{ 'btn.refresh' | translate:'Refresh' }}</span>
          </button>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-icon-wrap bg-blue-subtle">
            <span class="material-symbols-outlined text-blue">computer</span>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Total Workstations</span>
            <span class="kpi-value">{{ stations.length }}</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-wrap bg-green-subtle">
            <span class="material-symbols-outlined text-green">wifi_tethering</span>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Active Online PCs</span>
            <span class="kpi-value text-green">{{ onlineCount }}</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-wrap bg-amber-subtle">
            <span class="material-symbols-outlined text-amber">lock</span>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Locked Stations</span>
            <span class="kpi-value text-amber">{{ lockedCount }}</span>
          </div>
        </div>

        <div class="kpi-card cursor-pointer" (click)="activeTab = 'violations'; selectedStation = null">
          <div class="kpi-icon-wrap bg-red-subtle">
            <span class="material-symbols-outlined text-red">security_update_warning</span>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Violations Blocked</span>
            <span class="kpi-value text-red">{{ violations.length }}</span>
          </div>
        </div>

        <div class="kpi-card cursor-pointer" (click)="activeTab = 'requests'; selectedStation = null">
          <div class="kpi-icon-wrap bg-purple-subtle">
            <span class="material-symbols-outlined text-purple">hourglass_top</span>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Pending App Requests</span>
            <span class="kpi-value text-purple">{{ pendingRequestsCount }}</span>
          </div>
        </div>
      </div>

      <!-- Primary Navigation Tabs -->
      <div class="nav-tabs-bar">
        <button class="tab-btn" [class.active]="activeTab === 'stations'" (click)="activeTab = 'stations'; selectedStation = null">
          <span class="material-symbols-outlined">devices</span>
          <span>Connected Workstations ({{ stations.length }})</span>
        </button>

        <button class="tab-btn" [class.active]="activeTab === 'policies'" (click)="activeTab = 'policies'; selectedStation = null">
          <span class="material-symbols-outlined">rule</span>
          <span>App Whitelist & Directory Policy ({{ appPolicies.length }})</span>
        </button>

        <button class="tab-btn" [class.active]="activeTab === 'requests'" (click)="activeTab = 'requests'; selectedStation = null">
          <span class="material-symbols-outlined">notification_important</span>
          <span>Access Requests</span>
          <span *ngIf="pendingRequestsCount > 0" class="badge-count">{{ pendingRequestsCount }}</span>
        </button>

        <button class="tab-btn" [class.active]="activeTab === 'violations'" (click)="activeTab = 'violations'; selectedStation = null">
          <span class="material-symbols-outlined">shield_with_heart</span>
          <span>Interception & Violation Logs</span>
        </button>

        <button class="tab-btn" [class.active]="activeTab === 'activity'" (click)="activeTab = 'activity'; selectedStation = null">
          <span class="material-symbols-outlined">history</span>
          <span>General Activity Logs ({{ activityLogs.length }})</span>
        </button>
      </div>

      <!-- TAB 1: CONNECTED WORKSTATIONS (LIVE ENDPOINT DIRECTORY) -->
      <div *ngIf="activeTab === 'stations' && !selectedStation" class="tab-content">
        <!-- Interactive Status Taxonomy Filter Pills -->
        <div class="status-pills-bar">
          <button class="pill-btn" [class.active]="statusFilter === 'all'" (click)="statusFilter = 'all'">
            <span>All Stations</span>
            <span class="pill-badge">{{ stations.length }}</span>
          </button>
          <button class="pill-btn pill-active" [class.active]="statusFilter === 'active'" (click)="statusFilter = 'active'">
            <span class="dot-indicator dot-green"></span>
            <span>Active Duty</span>
            <span class="pill-badge">{{ activeCount }}</span>
          </button>
          <button class="pill-btn pill-idle" [class.active]="statusFilter === 'idle'" (click)="statusFilter = 'idle'">
            <span class="dot-indicator dot-amber"></span>
            <span>Idle (Inactive)</span>
            <span class="pill-badge">{{ idleCount }}</span>
          </button>
          <button class="pill-btn pill-break" [class.active]="statusFilter === 'break'" (click)="statusFilter = 'break'">
            <span class="dot-indicator dot-blue"></span>
            <span>On Break</span>
            <span class="pill-badge">{{ breakCount }}</span>
          </button>
          <button class="pill-btn pill-locked" [class.active]="statusFilter === 'locked'" (click)="statusFilter = 'locked'">
            <span class="dot-indicator dot-red"></span>
            <span>Locked</span>
            <span class="pill-badge">{{ lockedCount }}</span>
          </button>
          <button class="pill-btn pill-offline" [class.active]="statusFilter === 'offline'" (click)="statusFilter = 'offline'">
            <span class="dot-indicator dot-gray"></span>
            <span>Offline</span>
            <span class="pill-badge">{{ offlineCount }}</span>
          </button>
        </div>

        <div class="toolbar-row">
          <div class="search-box">
            <span class="material-symbols-outlined">search</span>
            <input type="text" [(ngModel)]="stationSearch" placeholder="Search by station, staff name, or current application..." />
          </div>
          <div class="view-mode-toggle">
            <button class="view-btn" [class.active]="viewMode === 'grid'" (click)="viewMode = 'grid'" title="Card Grid View">
              <span class="material-symbols-outlined">grid_view</span>
              <span>Cards</span>
            </button>
            <button class="view-btn" [class.active]="viewMode === 'table'" (click)="viewMode = 'table'" title="Compact Table View">
              <span class="material-symbols-outlined">table_rows</span>
              <span>Table</span>
            </button>
          </div>
        </div>

        <div *ngIf="filteredStations.length === 0" class="empty-state">
          <span class="material-symbols-outlined empty-icon">desktop_access_disabled</span>
          <h3>No Workstations Detected</h3>
          <p>No stations match the selected filter criteria. Launch the native Flutter desktop app to begin live monitoring.</p>
        </div>

        <!-- GRID CARDS VIEW -->
        <div *ngIf="filteredStations.length > 0 && viewMode === 'grid'" class="stations-grid">
          <div *ngFor="let s of filteredStations" class="station-card clickable-card" [class.is-locked]="s.isLocked" (click)="openStationDetails(s)">
            <div class="station-card-head">
              <div class="station-title-box">
                <span class="badge-status-pill pill-active" *ngIf="getStationStatus(s) === 'active'">
                  <span class="dot-indicator dot-green"></span> ACTIVE
                </span>
                <span class="badge-status-pill pill-idle" *ngIf="getStationStatus(s) === 'idle'">
                  <span class="dot-indicator dot-amber"></span> IDLE
                </span>
                <span class="badge-status-pill pill-break" *ngIf="getStationStatus(s) === 'break'">
                  <span class="dot-indicator dot-blue"></span> BREAK
                </span>
                <span class="badge-status-pill pill-locked" *ngIf="getStationStatus(s) === 'locked'">
                  <span class="dot-indicator dot-red"></span> LOCKED
                </span>
                <span class="badge-status-pill pill-offline" *ngIf="getStationStatus(s) === 'offline'">
                  <span class="dot-indicator dot-gray"></span> OFFLINE
                </span>

                <h3 class="station-name">{{ s.machineName }}</h3>
                <span class="station-pill">{{ s.stationKey }}</span>
              </div>
              <div class="station-action-btns" (click)="$event.stopPropagation()">
                <button *ngIf="!s.isLocked" (click)="toggleStationLock(s, true)" class="btn-lock" title="Force Remote Lock">
                  <span class="material-symbols-outlined">lock</span>
                  <span>Lock PC</span>
                </button>
                <button *ngIf="s.isLocked" (click)="toggleStationLock(s, false)" class="btn-unlock" title="Unlock Station">
                  <span class="material-symbols-outlined">lock_open</span>
                  <span>Unlock</span>
                </button>
              </div>
            </div>

            <div class="station-meta-row">
              <div class="meta-item">
                <span class="material-symbols-outlined">person</span>
                <span class="meta-val font-semibold">{{ s.assignedUserName || 'Unassigned Staff' }}</span>
              </div>
              <div class="meta-item" *ngIf="s.ipAddress">
                <span class="material-symbols-outlined">lan</span>
                <span class="meta-val">{{ s.ipAddress }}</span>
              </div>
            </div>

            <!-- Active Window / Document Telemetry Box -->
            <div class="telemetry-box" [class.telemetry-warning]="!isAppAllowed(s.currentProcessName)">
              <div class="telemetry-head">
                <span class="telemetry-label">CURRENT ACTIVE APPLICATION</span>
                <span *ngIf="s.isOnline" class="badge-live">LIVE TELEMETRY</span>
                <span *ngIf="!s.isOnline" class="badge-offline">OFFLINE</span>
              </div>

              <div class="telemetry-content">
                <div class="telemetry-process">
                  <span class="material-symbols-outlined text-blue">terminal</span>
                  <span class="process-name">{{ s.currentProcessName || 'Desktop Idle' }}</span>
                  <span *ngIf="s.currentProcessName && isAppAllowed(s.currentProcessName)" class="badge-status-approved">APPROVED</span>
                  <span *ngIf="s.currentProcessName && !isAppAllowed(s.currentProcessName)" class="badge-status-unapproved">RESTRICTED</span>
                </div>

                <div class="telemetry-window-title" *ngIf="s.currentWindowTitle">
                  <span class="material-symbols-outlined text-gray">web_asset</span>
                  <span class="window-title-text" [title]="cleanWindowTitle(s.currentWindowTitle)">{{ cleanWindowTitle(s.currentWindowTitle) }}</span>
                </div>

                <div class="telemetry-doc-path" *ngIf="s.currentDocumentPath">
                  <span class="material-symbols-outlined text-gray">folder_open</span>
                  <span class="doc-path-text" [title]="s.currentDocumentPath">{{ s.currentDocumentPath }}</span>
                </div>
              </div>
            </div>

            <div class="station-card-footer">
              <span class="footer-time">Last active: {{ formatTime(s.lastHeartbeat) }}</span>
              <span class="footer-inspect-link">
                <span>View Details ({{ getStationPendingRequestsCount(s) }} pending)</span>
                <span class="material-symbols-outlined" style="font-size: 14px;">open_in_new</span>
              </span>
            </div>
          </div>
        </div>

        <!-- COMPACT TABLE VIEW (10+ WORKSTATIONS) -->
        <div *ngIf="filteredStations.length > 0 && viewMode === 'table'" class="card-box mt-3">
          <div class="table-wrap">
            <table class="policy-table">
              <thead>
                <tr>
                  <th>STATION & HOST</th>
                  <th>ASSIGNED STAFF</th>
                  <th>STATUS</th>
                  <th>CURRENT ACTIVE APP / WINDOW</th>
                  <th>LAST TELEMETRY</th>
                  <th>REMOTE ACTION</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let s of filteredStations" class="clickable-row" [class.row-locked]="s.isLocked" (click)="openStationDetails(s)">
                  <td>
                    <div class="station-meta-cell">
                      <strong class="text-sm font-bold">{{ s.machineName }}</strong>
                      <span class="text-xs text-gray block">{{ s.stationKey }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="staff-cell">
                      <span class="font-semibold block">{{ s.assignedUserName || 'Unassigned Staff' }}</span>
                      <span class="text-xs text-gray block" *ngIf="s.ipAddress">{{ s.ipAddress }}</span>
                    </div>
                  </td>
                  <td>
                    <span class="badge-status-pill pill-active" *ngIf="getStationStatus(s) === 'active'">
                      <span class="dot-indicator dot-green"></span> ACTIVE
                    </span>
                    <span class="badge-status-pill pill-idle" *ngIf="getStationStatus(s) === 'idle'">
                      <span class="dot-indicator dot-amber"></span> IDLE
                    </span>
                    <span class="badge-status-pill pill-break" *ngIf="getStationStatus(s) === 'break'">
                      <span class="dot-indicator dot-blue"></span> BREAK
                    </span>
                    <span class="badge-status-pill pill-locked" *ngIf="getStationStatus(s) === 'locked'">
                      <span class="dot-indicator dot-red"></span> LOCKED
                    </span>
                    <span class="badge-status-pill pill-offline" *ngIf="getStationStatus(s) === 'offline'">
                      <span class="dot-indicator dot-gray"></span> OFFLINE
                    </span>
                  </td>
                  <td>
                    <div class="table-app-cell">
                      <div class="flex items-center gap-1">
                        <code class="process-tag">{{ s.currentProcessName || 'Desktop Idle' }}</code>
                        <span *ngIf="s.currentProcessName && isAppAllowed(s.currentProcessName)" class="badge-status-approved">APPROVED</span>
                        <span *ngIf="s.currentProcessName && !isAppAllowed(s.currentProcessName)" class="badge-status-unapproved">RESTRICTED</span>
                      </div>
                      <span class="text-xs text-gray truncate max-w-xs block mt-1" *ngIf="s.currentWindowTitle">
                        {{ cleanWindowTitle(s.currentWindowTitle) }}
                      </span>
                    </div>
                  </td>
                  <td class="text-xs whitespace-nowrap text-gray">
                    {{ formatTime(s.lastHeartbeat) }}
                  </td>
                  <td (click)="$event.stopPropagation()">
                    <button *ngIf="!s.isLocked" (click)="toggleStationLock(s, true)" class="btn-table-lock" title="Lock PC">
                      <span class="material-symbols-outlined text-sm">lock</span>
                      <span>Lock</span>
                    </button>
                    <button *ngIf="s.isLocked" (click)="toggleStationLock(s, false)" class="btn-table-unlock" title="Unlock PC">
                      <span class="material-symbols-outlined text-sm">lock_open</span>
                      <span>Unlock</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB 2: APPLICATION WHITELIST & POLICIES -->
      <div *ngIf="activeTab === 'policies'" class="tab-content">
        <div class="policy-layout-grid">
          <!-- Left Column: Add / Whitelist Policies -->
          <div class="policy-pane-left">
            <!-- Add App Form -->
            <div class="card-box">
              <h3 class="box-title">
                <span class="material-symbols-outlined text-blue">add_circle</span>
                <span>Add Approved Application to Whitelist</span>
              </h3>
              <p class="box-desc">Permit workstations to launch and keep this process open during official work sessions.</p>

              <div class="form-grid">
                <div class="form-group">
                  <label>Application Display Name</label>
                  <input type="text" [(ngModel)]="newApp.displayName" placeholder="e.g. Microsoft Excel" class="input-text" />
                </div>
                <div class="form-group">
                  <label>Process Name (.exe)</label>
                  <input type="text" [(ngModel)]="newApp.processName" placeholder="e.g. excel.exe" class="input-text" />
                </div>
                <div class="form-group">
                  <label>Category</label>
                  <select [(ngModel)]="newApp.category" class="input-select">
                    <option value="Productivity">Productivity (Office, Docs)</option>
                    <option value="Accounting">Accounting & Finance</option>
                    <option value="Communication">Approved Communication</option>
                    <option value="Utilities">Utilities & Tools</option>
                    <option value="Development">Design & Development</option>
                  </select>
                </div>
              </div>

              <div class="form-actions">
                <button (click)="saveAppPolicy()" class="btn-primary" [disabled]="!newApp.displayName || !newApp.processName">
                  <span class="material-symbols-outlined">save</span>
                  <span>Save to Whitelist</span>
                </button>
              </div>

              <!-- Quick 1-Click Presets -->
              <div class="preset-section">
                <span class="preset-label">QUICK 1-CLICK POPULAR OFFICE PRESETS:</span>
                <div class="preset-pills">
                  <button (click)="addPreset('Microsoft Word', 'winword.exe', 'Productivity')" class="btn-preset">+ Word</button>
                  <button (click)="addPreset('Microsoft Excel', 'excel.exe', 'Productivity')" class="btn-preset">+ Excel</button>
                  <button (click)="addPreset('Microsoft PowerPoint', 'powerpnt.exe', 'Productivity')" class="btn-preset">+ PowerPoint</button>
                  <button (click)="addPreset('Adobe Acrobat', 'acrord32.exe', 'Productivity')" class="btn-preset">+ Adobe PDF</button>
                  <button (click)="addPreset('Windows Calculator', 'calc.exe', 'Utilities')" class="btn-preset">+ Calculator</button>
                  <button (click)="addPreset('Microsoft Teams', 'ms-teams.exe', 'Communication')" class="btn-preset">+ Teams</button>
                  <button (click)="addPreset('Zoom Workplace', 'zoom.exe', 'Communication')" class="btn-preset">+ Zoom</button>
                </div>
              </div>
            </div>

            <!-- Approved Document Directory & USB Lockdown -->
            <div class="card-box mt-4">
              <h3 class="box-title">
                <span class="material-symbols-outlined text-blue">folder_supervised</span>
                <span>Corporate Work Directory & Peripheral Security</span>
              </h3>
              <p class="box-desc">Prevent staff from editing documents outside approved company folders or sneaking side jobs on USB drives.</p>

              <div class="form-group">
                <label>Approved Corporate Document Directory</label>
                <input type="text" [(ngModel)]="filePolicy.approvedDirectoryPath" class="input-text" [placeholder]="'e.g. C:\\\\' + (brandName || 'Company') + '-Workspace'" />
                <span class="helper-text">Documents opened from outside this folder (e.g. personal folders or downloads) trigger a security audit alert.</span>
              </div>

              <div class="form-group mt-3">
                <label>External USB Storage Drive Policy</label>
                <select [(ngModel)]="filePolicy.usbStoragePolicy" (change)="filePolicy.blockUsbStorage = filePolicy.usbStoragePolicy === 'Blocked'" class="input-select">
                  <option value="Blocked">Strictly Blocked (Flash drives cannot mount or read files)</option>
                  <option value="ReadOnly">Read-Only (Can view files, cannot write/copy company data)</option>
                  <option value="Allowed">Unrestricted Access</option>
                </select>
              </div>

              <div class="form-actions">
                <button (click)="saveFilePolicy()" class="btn-primary">
                  <span class="material-symbols-outlined">save</span>
                  <span>Update Directory Policy</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Right Column: Current Whitelist Table -->
          <div class="policy-pane-right">
            <div class="card-box">
              <div class="table-header-row">
                <h3 class="box-title">
                  <span class="material-symbols-outlined text-green">verified</span>
                  <span>Active Permitted Applications ({{ appPolicies.length }})</span>
                </h3>
              </div>

              <div class="table-wrap">
                <table class="policy-table">
                  <thead>
                    <tr>
                      <th>APPLICATION</th>
                      <th>PROCESS NAME</th>
                      <th>CATEGORY</th>
                      <th>STATUS</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let p of appPolicies">
                      <td class="font-semibold">{{ p.displayName }}</td>
                      <td><code class="process-tag">{{ p.processName }}</code></td>
                      <td><span class="cat-pill">{{ p.category }}</span></td>
                      <td>
                        <span class="badge-status-approved">ALLOWED</span>
                      </td>
                      <td>
                        <button (click)="deleteAppPolicy(p.id)" class="btn-delete" title="Remove from Whitelist">
                          <span class="material-symbols-outlined">delete</span>
                        </button>
                      </td>
                    </tr>
                    <tr *ngIf="appPolicies.length === 0">
                      <td colspan="5" class="text-center py-4 text-gray">No approved applications configured yet.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 3: ACCESS REQUESTS INBOX -->
      <div *ngIf="activeTab === 'requests'" class="tab-content">
        <div class="card-box">
          <div class="table-header-row">
            <div>
              <h3 class="box-title">
                <span class="material-symbols-outlined text-purple">pending_actions</span>
                <span>Employee Application Access Requests</span>
              </h3>
              <p class="box-desc">Staff submitted these requests from their workstation when attempting to open a restricted application.</p>
            </div>
          </div>

          <div *ngIf="pendingRequestsList.length === 0" class="empty-state">
            <span class="material-symbols-outlined empty-icon">task_alt</span>
            <h3>No Pending Access Requests</h3>
            <p>Whenever an employee encounters a blocked application and clicks "Request Access", their ticket will appear here in real time. Approved apps move automatically to the Approved Apps tab.</p>
          </div>

          <div *ngIf="pendingRequestsList.length > 0" class="table-wrap">
            <table class="policy-table">
              <thead>
                <tr>
                  <th>STAFF & WORKSTATION</th>
                  <th>REQUESTED APP</th>
                  <th>STATED REASON / JUSTIFICATION</th>
                  <th>REQUESTED AT</th>
                  <th>STATUS</th>
                  <th>ADMIN ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let r of pendingRequestsList">
                  <td>
                    <div class="staff-meta">
                      <strong>{{ r.userName }}</strong>
                      <span class="sub-text">{{ r.machineName }}</span>
                    </div>
                  </td>
                  <td><code class="process-tag font-bold text-blue">{{ r.requestedProcessName }}</code></td>
                  <td class="reason-cell">{{ r.reason }}</td>
                  <td>{{ formatTime(r.createdAt) }}</td>
                  <td>
                    <span *ngIf="r.status === 'Pending'" class="badge-pending">PENDING</span>
                    <span *ngIf="r.status === 'Approved'" class="badge-status-approved">APPROVED</span>
                    <span *ngIf="r.status === 'Denied'" class="badge-status-unapproved">DENIED</span>
                  </td>
                  <td>
                    <div class="btn-group" *ngIf="r.status === 'Pending'">
                      <button (click)="respondRequest(r.id, true)" class="btn-approve" title="Approve Request">
                        Approve
                      </button>
                      <button (click)="respondRequest(r.id, false)" class="btn-deny" title="Deny Request">
                        Deny
                      </button>
                    </div>
                    <span *ngIf="r.status !== 'Pending'" class="text-gray text-xs">Reviewed</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB 4: VIOLATION & INTERCEPTION AUDIT FEED -->
      <div *ngIf="activeTab === 'violations'" class="tab-content">
        <div class="card-box">
          <div class="table-header-row">
            <div>
              <h3 class="box-title">
                <span class="material-symbols-outlined text-red">gavel</span>
                <span>Workstation Policy Violation & Process Interception Audit Trail</span>
              </h3>
              <p class="box-desc">Automated security audit trail of unauthorized tasks, unapproved document paths, and peripheral intercepts killed on office computers.</p>
            </div>
          </div>

          <div *ngIf="violations.length === 0" class="empty-state">
            <span class="material-symbols-outlined empty-icon text-green">verified_user</span>
            <h3>Clean Workstation Compliance</h3>
            <p>No unauthorized applications, side jobs, or restricted document attempts recorded today.</p>
          </div>

          <div *ngIf="violations.length > 0" class="table-wrap">
            <table class="policy-table">
              <thead>
                <tr>
                  <th>TIMESTAMP</th>
                  <th>WORKSTATION</th>
                  <th>STAFF OPERATOR</th>
                  <th>INTERCEPTED PROCESS</th>
                  <th>WINDOW TITLE / DOCUMENT</th>
                  <th>ACTION ENFORCED</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let v of violations">
                  <td class="whitespace-nowrap text-gray">{{ formatTime(v.timestamp) }}</td>
                  <td class="font-bold">{{ v.machineName }}</td>
                  <td>{{ v.userName || 'Unknown Staff' }}</td>
                  <td><code class="process-tag text-red">{{ v.processName }}</code></td>
                  <td class="max-w-xs truncate" [title]="v.windowTitle || ''">{{ v.windowTitle || 'No Title' }}</td>
                  <td>
                    <span class="badge-status-unapproved">{{ v.actionTaken }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB 5: GENERAL ACTIVITY & APP TIMELINE LOGS -->
      <div *ngIf="activeTab === 'activity'" class="tab-content">
        <div class="status-pills-bar" style="margin-bottom: 14px;">
          <button class="pill-btn" [class.active]="activityFilter === 'all'" (click)="activityFilter = 'all'">
            <span>All Activity</span>
            <span class="pill-badge">{{ activityLogs.length }}</span>
          </button>
          <button class="pill-btn" [class.active]="activityFilter === 'apps'" (click)="activityFilter = 'apps'">
            <span class="material-symbols-outlined" style="font-size: 15px;">apps</span>
            <span>Opened & Closed Apps (Duration)</span>
          </button>
          <button class="pill-btn" [class.active]="activityFilter === 'files'" (click)="activityFilter = 'files'">
            <span class="material-symbols-outlined" style="font-size: 15px;">description</span>
            <span>Files & Documents Worked On</span>
          </button>
          <button class="pill-btn" [class.active]="activityFilter === 'idle'" (click)="activityFilter = 'idle'">
            <span class="material-symbols-outlined" style="font-size: 15px;">lock_clock</span>
            <span>Logins, Idle & Password Resume</span>
          </button>
          <button class="pill-btn" [class.active]="activityFilter === 'screenshots'" (click)="activityFilter = 'screenshots'">
            <span class="material-symbols-outlined" style="font-size: 15px;">screenshot_monitor</span>
            <span>Screen Captures</span>
          </button>
        </div>

        <div class="card-box">
          <div class="table-header-row">
            <div>
              <h3 class="box-title">
                <span class="material-symbols-outlined text-blue">history</span>
                <span>General Workstation Activity, App Duration, File Paths & Screen Captures</span>
              </h3>
              <p class="box-desc">Complete chronological timeline of opened/closed applications, how long each app stayed open, active file names & paths, idle lockouts, password resumes, and periodic desktop screenshots.</p>
            </div>
          </div>

          <div *ngIf="filteredActivityLogs.length === 0" class="empty-state">
            <span class="material-symbols-outlined empty-icon">history</span>
            <h3>No Activity Logs Found</h3>
            <p>Activity events, opened/closed app durations, active file paths, idle/password resumes, and periodic screenshots appear here in real time.</p>
          </div>

          <div *ngIf="filteredActivityLogs.length > 0" class="table-wrap">
            <table class="policy-table">
              <thead>
                <tr>
                  <th>TIME & DURATION</th>
                  <th>SIGNED-IN USER & PC</th>
                  <th>EVENT</th>
                  <th>APPLICATION & WINDOW</th>
                  <th>FILE NAME & FILE PATH</th>
                  <th>DETAILS / SCREENSHOT</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let a of filteredActivityLogs">
                  <td class="whitespace-nowrap">
                    <div class="text-xs font-semibold">{{ formatTime(a.startedAt || a.timestamp) }}</div>
                    <div class="text-xs text-gray" *ngIf="a.endedAt">Closed: {{ formatTime(a.endedAt) }}</div>
                    <span *ngIf="a.durationSeconds" class="badge-live" style="display: inline-block; margin-top: 3px;">
                      Duration: {{ formatDuration(a.durationSeconds) }}
                    </span>
                  </td>
                  <td>
                    <div class="staff-meta" style="display: flex; flex-direction: column; align-items: flex-start; gap: 2px;">
                      <strong>{{ a.userName || 'Station Staff' }}</strong>
                      <span class="text-xs text-gray" *ngIf="a.userEmail && a.userEmail !== a.userName">{{ a.userEmail }}</span>
                      <code class="process-tag" style="font-size: 10px;">PC: {{ a.machineName }} ({{ a.stationKey || ('WS-' + a.machineName) }})</code>
                    </div>
                  </td>
                  <td>
                    <span class="badge-status-approved" *ngIf="a.eventType === 'APP_OPENED' || a.eventType === 'PASSWORD_RESUMED' || a.eventType === 'SHIFT_STARTED' || a.eventType === 'USER_LOGIN'">
                      {{ formatEventLabel(a.eventType) }}
                    </span>
                    <span class="badge-pending" *ngIf="a.eventType === 'APP_CLOSED' || a.eventType === 'DOCUMENT_ACTIVE' || a.eventType === 'IDLE_WARNING' || a.eventType === 'IDLE_RESUMED' || a.eventType === 'USER_SWITCHED'">
                      {{ formatEventLabel(a.eventType) }}
                    </span>
                    <span class="badge-status-unapproved" *ngIf="a.eventType === 'IDLE_LOCKED' || a.eventType === 'ADMIN_LOCKED'">
                      {{ formatEventLabel(a.eventType) }}
                    </span>
                    <span class="badge-live" *ngIf="a.eventType === 'SCREENSHOT_CAPTURED'">
                      SCREENSHOT
                    </span>
                  </td>
                  <td>
                    <div *ngIf="a.processName || a.appDisplayName" style="display: flex; flex-direction: column; align-items: flex-start; gap: 3px;">
                      <code class="process-tag font-bold text-blue">{{ a.appDisplayName || a.processName }}</code>
                      <span class="text-xs text-gray max-w-xs truncate" *ngIf="a.windowTitle" [title]="cleanWindowTitle(a.windowTitle)">
                        {{ cleanWindowTitle(a.windowTitle) }}
                      </span>
                    </div>
                    <span *ngIf="!a.processName && !a.appDisplayName" class="text-xs text-gray">—</span>
                  </td>
                  <td>
                    <div *ngIf="a.fileName || a.filePath" style="display: flex; flex-direction: column; align-items: flex-start; gap: 3px;">
                      <strong class="text-xs" *ngIf="a.fileName">{{ a.fileName }}</strong>
                      <code class="text-xs text-gray max-w-xs truncate" *ngIf="a.filePath" [title]="a.filePath">{{ a.filePath }}</code>
                    </div>
                    <span *ngIf="!a.fileName && !a.filePath" class="text-xs text-gray">—</span>
                  </td>
                  <td>
                    <div class="text-xs text-gray" *ngIf="a.details">{{ a.details }}</div>
                    <button *ngIf="a.screenshotUrl" (click)="previewScreenshotItem = a" class="btn-approve" style="margin-top: 4px; display: inline-flex; align-items: center; gap: 4px;">
                      <span class="material-symbols-outlined" style="font-size: 14px;">image</span>
                      <span>View Screenshot</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- WORKSTATION 360 FULL-PAGE INLINE VIEW (ON CARD / ROW CLICK) -->
      <div *ngIf="activeTab === 'stations' && selectedStation" class="tab-content">
        <div class="station-page-breadcrumb-bar">
          <button (click)="closeStationDetails()" class="btn-back-stations">
            <span class="material-symbols-outlined" style="font-size: 18px;">arrow_back</span>
            <span>Back to Connected Workstations</span>
          </button>
          <div class="flex items-center gap-2">
            <span class="badge-live">
              <span class="dot-indicator dot-green" style="margin-right: 4px;"></span>
              REAL-TIME SYNC ACTIVE (3s)
            </span>
          </div>
        </div>

        <div class="station-detail-page-card">
          <!-- Page Section Header -->
          <div class="station-modal-header">
            <div class="station-modal-title-group">
              <div class="station-modal-icon">
                <span class="material-symbols-outlined">desktop_windows</span>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h2 class="station-modal-title">{{ selectedStation.machineName }}</h2>
                  <span class="station-pill">{{ selectedStation.stationKey }}</span>
                  <span class="badge-status-pill pill-active" *ngIf="getStationStatus(selectedStation) === 'active'">
                    <span class="dot-indicator dot-green"></span> ACTIVE
                  </span>
                  <span class="badge-status-pill pill-idle" *ngIf="getStationStatus(selectedStation) === 'idle'">
                    <span class="dot-indicator dot-amber"></span> IDLE
                  </span>
                  <span class="badge-status-pill pill-break" *ngIf="getStationStatus(selectedStation) === 'break'">
                    <span class="dot-indicator dot-blue"></span> BREAK
                  </span>
                  <span class="badge-status-pill pill-locked" *ngIf="getStationStatus(selectedStation) === 'locked'">
                    <span class="dot-indicator dot-red"></span> LOCKED
                  </span>
                  <span class="badge-status-pill pill-offline" *ngIf="getStationStatus(selectedStation) === 'offline'">
                    <span class="dot-indicator dot-gray"></span> OFFLINE
                  </span>
                </div>
                <p class="station-modal-subtitle">
                  Operator: <strong>{{ selectedStation.assignedUserName || 'Unassigned Staff' }}</strong>
                  • IP: {{ selectedStation.ipAddress || '127.0.0.1' }}
                  • OS: {{ selectedStation.osVersion || 'Windows 11' }}
                </p>
              </div>
            </div>
            <div class="station-modal-actions">
              <button (click)="requestScreenshot(selectedStation)" class="btn-back-stations" title="Capture live desktop screenshot from this PC">
                <span class="material-symbols-outlined" style="font-size: 16px;">screenshot_monitor</span>
                <span>Capture Screenshot</span>
              </button>
              <button *ngIf="!selectedStation.isLocked" (click)="toggleStationLock(selectedStation, true)" class="btn-lock">
                <span class="material-symbols-outlined">lock</span>
                <span>Lock PC</span>
              </button>
              <button *ngIf="selectedStation.isLocked" (click)="toggleStationLock(selectedStation, false)" class="btn-unlock">
                <span class="material-symbols-outlined">lock_open</span>
                <span>Unlock PC</span>
              </button>
            </div>
          </div>

          <!-- Modal Sub-Navigation Tabs (Scoped to this Workstation) -->
          <div class="station-modal-tabs">
            <button class="modal-tab-btn" [class.active]="stationDetailTab === 'overview'" (click)="stationDetailTab = 'overview'">
              <span class="material-symbols-outlined">monitoring</span>
              <span>Station Overview</span>
            </button>
            <button class="modal-tab-btn" [class.active]="stationDetailTab === 'activity'" (click)="stationDetailTab = 'activity'">
              <span class="material-symbols-outlined">history</span>
              <span>User Activity & App Logs ({{ getStationActivityLogs(selectedStation).length }})</span>
            </button>
            <button class="modal-tab-btn" [class.active]="stationDetailTab === 'approved'" (click)="stationDetailTab = 'approved'">
              <span class="material-symbols-outlined">verified</span>
              <span>Approved Apps ({{ appPolicies.length }})</span>
            </button>
            <button class="modal-tab-btn" [class.active]="stationDetailTab === 'pending'" (click)="stationDetailTab = 'pending'">
              <span class="material-symbols-outlined">pending_actions</span>
              <span>Pending Requests ({{ getStationPendingRequestsCount(selectedStation) }})</span>
              <span *ngIf="getStationPendingRequestsCount(selectedStation) > 0" class="badge-count">
                {{ getStationPendingRequestsCount(selectedStation) }}
              </span>
            </button>
            <button class="modal-tab-btn" [class.active]="stationDetailTab === 'violations'" (click)="stationDetailTab = 'violations'">
              <span class="material-symbols-outlined">gavel</span>
              <span>Station Violations ({{ getStationViolations(selectedStation).length }})</span>
            </button>
          </div>

          <!-- Modal Body -->
          <div class="station-modal-body">
            <!-- SUB-TAB 1: STATION OVERVIEW -->
            <div *ngIf="stationDetailTab === 'overview'">
              <div class="detail-grid-2">
                <div class="detail-info-card">
                  <span class="detail-card-label">CURRENT FOREGROUND APPLICATION</span>
                  <div class="flex items-center gap-2 mt-2">
                    <span class="material-symbols-outlined text-blue">terminal</span>
                    <strong class="text-base">{{ selectedStation.currentProcessName || 'Desktop Idle' }}</strong>
                    <span *ngIf="selectedStation.currentProcessName && isAppAllowed(selectedStation.currentProcessName)" class="badge-status-approved">APPROVED</span>
                    <span *ngIf="selectedStation.currentProcessName && !isAppAllowed(selectedStation.currentProcessName)" class="badge-status-unapproved">RESTRICTED</span>
                  </div>
                  <p class="text-xs text-gray mt-2" *ngIf="selectedStation.currentWindowTitle">
                    Window: {{ cleanWindowTitle(selectedStation.currentWindowTitle) }}
                  </p>
                  <div class="mt-3" *ngIf="selectedStation.currentProcessName && !isAppAllowed(selectedStation.currentProcessName)">
                    <button (click)="quickApproveProcess(selectedStation.currentProcessName)" class="btn-approve">
                      + Whitelist {{ selectedStation.currentProcessName }} Now
                    </button>
                  </div>
                </div>

                <div class="detail-info-card">
                  <span class="detail-card-label">WORKSTATION SANDBOX & TELEMETRY</span>
                  <div class="detail-kv-row mt-2">
                    <span>Approved Work Folder:</span>
                    <code>{{ resolvedApprovedFolder }}</code>
                  </div>
                  <div class="detail-kv-row">
                    <span>USB Storage Policy:</span>
                    <strong>{{ filePolicy.usbStoragePolicy }}</strong>
                  </div>
                  <div class="detail-kv-row">
                    <span>Last Heartbeat:</span>
                    <strong>{{ formatTime(selectedStation.lastHeartbeat) }}</strong>
                  </div>
                </div>
              </div>
            </div>

            <!-- SUB-TAB 2: APPROVED APPS FOR THIS WORKSTATION -->
            <div *ngIf="stationDetailTab === 'approved'">
              <div class="table-wrap">
                <table class="policy-table">
                  <thead>
                    <tr>
                      <th>APPLICATION</th>
                      <th>PROCESS (.EXE)</th>
                      <th>CATEGORY</th>
                      <th>STATUS ON {{ selectedStation.machineName }}</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let p of appPolicies">
                      <td class="font-semibold">{{ p.displayName }}</td>
                      <td><code class="process-tag">{{ p.processName }}</code></td>
                      <td><span class="cat-pill">{{ p.category }}</span></td>
                      <td>
                        <span class="badge-status-approved">APPROVED</span>
                        <span *ngIf="selectedStation.currentProcessName && selectedStation.currentProcessName.toLowerCase() === p.processName.toLowerCase()" class="badge-live ml-2">
                          RUNNING NOW
                        </span>
                      </td>
                      <td>
                        <button (click)="deleteAppPolicy(p.id)" class="btn-delete" title="Revoke / Remove from Approved Whitelist">
                          <span class="material-symbols-outlined">delete</span>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- SUB-TAB 3: PENDING & ACCESS REQUESTS FOR THIS WORKSTATION -->
            <div *ngIf="stationDetailTab === 'pending'">
              <div *ngIf="getStationRequests(selectedStation).length === 0" class="empty-state">
                <span class="material-symbols-outlined empty-icon">task_alt</span>
                <h3>No Pending Requests from {{ selectedStation.machineName }}</h3>
                <p>All approved applications have been moved to the <strong>Approved Apps ({{ appPolicies.length }})</strong> tab. New requests from {{ selectedStation.assignedUserName || 'the operator' }} will appear here in real time.</p>
              </div>

              <div *ngIf="getStationRequests(selectedStation).length > 0" class="table-wrap">
                <table class="policy-table">
                  <thead>
                    <tr>
                      <th>REQUESTED APP</th>
                      <th>REASON / JUSTIFICATION</th>
                      <th>REQUESTED AT</th>
                      <th>STATUS</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let r of getStationRequests(selectedStation)">
                      <td><code class="process-tag font-bold text-blue">{{ r.requestedProcessName }}</code></td>
                      <td class="reason-cell">{{ r.reason }}</td>
                      <td>{{ formatTime(r.createdAt) }}</td>
                      <td>
                        <span *ngIf="r.status === 'Pending'" class="badge-pending">PENDING</span>
                        <span *ngIf="r.status === 'Approved'" class="badge-status-approved">APPROVED</span>
                        <span *ngIf="r.status === 'Denied'" class="badge-status-unapproved">DENIED</span>
                      </td>
                      <td>
                        <div class="btn-group" *ngIf="r.status === 'Pending'">
                          <button (click)="respondRequest(r.id, true, 8, true)" class="btn-approve">
                            Approve
                          </button>
                          <button (click)="respondRequest(r.id, false)" class="btn-deny">
                            Deny
                          </button>
                        </div>
                        <span *ngIf="r.status !== 'Pending'" class="text-gray text-xs">Reviewed</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- SUB-TAB 4: VIOLATIONS FOR THIS WORKSTATION -->
            <div *ngIf="stationDetailTab === 'violations'">
              <div *ngIf="getStationViolations(selectedStation).length === 0" class="empty-state">
                <span class="material-symbols-outlined empty-icon text-green">verified_user</span>
                <h3>Zero Violations on {{ selectedStation.machineName }}</h3>
                <p>No unauthorized processes or directory violations recorded for this workstation.</p>
              </div>

              <div *ngIf="getStationViolations(selectedStation).length > 0" class="table-wrap">
                <table class="policy-table">
                  <thead>
                    <tr>
                      <th>TIME</th>
                      <th>PROCESS</th>
                      <th>WINDOW / PATH</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let v of getStationViolations(selectedStation)">
                      <td class="whitespace-nowrap text-gray">{{ formatTime(v.timestamp) }}</td>
                      <td><code class="process-tag text-red">{{ v.processName }}</code></td>
                      <td class="max-w-xs truncate" [title]="v.windowTitle || ''">{{ v.windowTitle || 'No Title' }}</td>
                      <td><span class="badge-status-unapproved">{{ v.actionTaken }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- SUB-TAB 5: USER ACTIVITY & APP TIMELINE LOGS FOR THIS WORKSTATION -->
            <div *ngIf="stationDetailTab === 'activity'">
              <div *ngIf="getStationActivityLogs(selectedStation).length === 0" class="empty-state">
                <span class="material-symbols-outlined empty-icon">history</span>
                <h3>No Activity Recorded Yet on {{ selectedStation.machineName }}</h3>
                <p>Opened apps, closed apps with duration, active file paths, idle lockouts, password resumes, and periodic screenshots for {{ selectedStation.assignedUserName || 'this operator' }} appear here in real time.</p>
              </div>

              <div *ngIf="getStationActivityLogs(selectedStation).length > 0" class="table-wrap">
                <table class="policy-table">
                  <thead>
                    <tr>
                      <th>TIME & DURATION</th>
                      <th>SIGNED-IN USER & PC</th>
                      <th>EVENT</th>
                      <th>APPLICATION & WINDOW</th>
                      <th>FILE NAME & FILE PATH</th>
                      <th>DETAILS / SCREENSHOT</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let a of getStationActivityLogs(selectedStation)">
                      <td class="whitespace-nowrap">
                        <div class="text-xs font-semibold">{{ formatTime(a.startedAt || a.timestamp) }}</div>
                        <div class="text-xs text-gray" *ngIf="a.endedAt">Closed: {{ formatTime(a.endedAt) }}</div>
                        <span *ngIf="a.durationSeconds" class="badge-live" style="display: inline-block; margin-top: 3px;">
                          Duration: {{ formatDuration(a.durationSeconds) }}
                        </span>
                      </td>
                      <td>
                        <div class="staff-meta" style="display: flex; flex-direction: column; align-items: flex-start; gap: 2px;">
                          <strong>{{ a.userName || selectedStation.assignedUserName || 'Operator' }}</strong>
                          <span class="text-xs text-gray" *ngIf="a.userEmail && a.userEmail !== a.userName">{{ a.userEmail }}</span>
                          <code class="process-tag" style="font-size: 10px;">PC: {{ a.machineName || selectedStation.machineName }} ({{ a.stationKey || selectedStation.stationKey }})</code>
                        </div>
                      </td>
                      <td>
                        <span class="badge-status-approved" *ngIf="a.eventType === 'APP_OPENED' || a.eventType === 'PASSWORD_RESUMED' || a.eventType === 'SHIFT_STARTED' || a.eventType === 'USER_LOGIN'">
                          {{ formatEventLabel(a.eventType) }}
                        </span>
                        <span class="badge-pending" *ngIf="a.eventType === 'APP_CLOSED' || a.eventType === 'DOCUMENT_ACTIVE' || a.eventType === 'IDLE_WARNING' || a.eventType === 'IDLE_RESUMED' || a.eventType === 'USER_SWITCHED'">
                          {{ formatEventLabel(a.eventType) }}
                        </span>
                        <span class="badge-status-unapproved" *ngIf="a.eventType === 'IDLE_LOCKED' || a.eventType === 'ADMIN_LOCKED'">
                          {{ formatEventLabel(a.eventType) }}
                        </span>
                        <span class="badge-live" *ngIf="a.eventType === 'SCREENSHOT_CAPTURED'">
                          SCREENSHOT
                        </span>
                      </td>
                      <td>
                        <div *ngIf="a.processName || a.appDisplayName" style="display: flex; flex-direction: column; align-items: flex-start; gap: 3px;">
                          <code class="process-tag font-bold text-blue">{{ a.appDisplayName || a.processName }}</code>
                          <span class="text-xs text-gray max-w-xs truncate" *ngIf="a.windowTitle" [title]="cleanWindowTitle(a.windowTitle)">
                            {{ cleanWindowTitle(a.windowTitle) }}
                          </span>
                        </div>
                        <span *ngIf="!a.processName && !a.appDisplayName" class="text-xs text-gray">—</span>
                      </td>
                      <td>
                        <div *ngIf="a.fileName || a.filePath" style="display: flex; flex-direction: column; align-items: flex-start; gap: 3px;">
                          <strong class="text-xs" *ngIf="a.fileName">{{ a.fileName }}</strong>
                          <code class="text-xs text-gray max-w-xs truncate" *ngIf="a.filePath" [title]="a.filePath">{{ a.filePath }}</code>
                        </div>
                        <span *ngIf="!a.fileName && !a.filePath" class="text-xs text-gray">—</span>
                      </td>
                      <td>
                        <div class="text-xs text-gray" *ngIf="a.details">{{ a.details }}</div>
                        <button *ngIf="a.screenshotUrl" (click)="previewScreenshotItem = a" class="btn-approve" style="margin-top: 4px; display: inline-flex; align-items: center; gap: 4px;">
                          <span class="material-symbols-outlined" style="font-size: 14px;">image</span>
                          <span>View Screenshot</span>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- SCREENSHOT PREVIEW VIEWER -->
      <div *ngIf="previewScreenshotItem" style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.78); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 24px;" (click)="previewScreenshotItem = null">
        <div style="background: #ffffff; border-radius: 16px; max-width: 1100px; width: 100%; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.4);" (click)="$event.stopPropagation()">
          <div style="padding: 14px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #f8fafc;">
            <div>
              <strong style="font-size: 15px; color: #0f172a;">Screen Capture • {{ previewScreenshotItem.machineName }} ({{ previewScreenshotItem.userName || 'Operator' }})</strong>
              <div style="font-size: 12px; color: #64748b;">
                Captured at {{ formatTime(previewScreenshotItem.timestamp) }}
                <span *ngIf="previewScreenshotItem.windowTitle"> • Window: {{ cleanWindowTitle(previewScreenshotItem.windowTitle) }}</span>
              </div>
            </div>
            <button (click)="previewScreenshotItem = null" class="btn-back-stations">Close Preview</button>
          </div>
          <div style="padding: 16px; background: #0f172a; text-align: center; max-height: 78vh; overflow: auto;">
            <img [src]="previewScreenshotItem.screenshotUrl" alt="Workstation Screenshot" style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #334155;" />
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .workstations-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .badge-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 800;
      color: #1e40af;
      margin-bottom: 8px;
    }
    .page-title {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 6px 0;
      letter-spacing: -0.5px;
    }
    .page-subtitle {
      font-size: 13.5px;
      color: #64748b;
      margin: 0;
      max-width: 800px;
      line-height: 1.5;
    }
    .btn-refresh {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      color: #0f172a;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-refresh:hover {
      background: #f8fafc;
      border-color: #94a3b8;
    }
    .spinning span {
      animation: spin 1s infinite linear;
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .kpi-card {
      background: #ffffff;
      padding: 16px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 14px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .kpi-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.06);
    }
    .kpi-icon-wrap {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
    }
    .bg-blue-subtle { background: #eff6ff; }
    .bg-green-subtle { background: #f0fdf4; }
    .bg-amber-subtle { background: #fffbeb; }
    .bg-red-subtle { background: #fef2f2; }
    .bg-purple-subtle { background: #faf5ff; }
    .text-blue { color: #2563eb; }
    .text-green { color: #16a34a; }
    .text-amber { color: #d97706; }
    .text-red { color: #dc2626; }
    .text-purple { color: #9333ea; }
    .kpi-info {
      display: flex;
      flex-direction: column;
    }
    .kpi-label {
      font-size: 11.5px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .kpi-value {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
    }

    /* Tabs Bar */
    .nav-tabs-bar {
      display: flex;
      border-bottom: 2px solid #e2e8f0;
      margin-bottom: 24px;
      gap: 8px;
      overflow-x: auto;
    }
    .tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      font-size: 13.5px;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
    }
    .tab-btn:hover {
      color: #0050e5;
    }
    .tab-btn.active {
      color: #0050e5;
      border-bottom-color: #0050e5;
      font-weight: 700;
    }
    .badge-count {
      background: #dc2626;
      color: #ffffff;
      font-size: 10.5px;
      font-weight: 800;
      padding: 2px 7px;
      border-radius: 999px;
    }

    /* Stations Grid & Status Pills */
    .status-pills-bar {
      display: flex;
      gap: 10px;
      margin-bottom: 16px;
      overflow-x: auto;
      padding-bottom: 4px;
      flex-wrap: wrap;
    }
    .pill-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 999px;
      font-size: 12.5px;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .pill-btn:hover {
      background: #f8fafc;
      border-color: #cbd5e1;
    }
    .pill-btn.active {
      background: #0f172a;
      color: #ffffff;
      border-color: #0f172a;
    }
    .pill-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 999px;
      background: #f1f5f9;
      color: #475569;
    }
    .pill-btn.active .pill-badge {
      background: rgba(255, 255, 255, 0.2);
      color: #ffffff;
    }
    .dot-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: inline-block;
    }
    .dot-green { background: #16a34a; box-shadow: 0 0 6px rgba(22, 163, 74, 0.4); }
    .dot-amber { background: #d97706; box-shadow: 0 0 6px rgba(217, 119, 6, 0.4); }
    .dot-blue { background: #2563eb; box-shadow: 0 0 6px rgba(37, 99, 235, 0.4); }
    .dot-red { background: #dc2626; box-shadow: 0 0 6px rgba(220, 38, 38, 0.4); }
    .dot-gray { background: #94a3b8; }

    .view-mode-toggle {
      display: inline-flex;
      background: #f1f5f9;
      border-radius: 8px;
      padding: 3px;
      gap: 2px;
    }
    .view-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 10px;
      border: none;
      background: transparent;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      transition: all 0.15s;
    }
    .view-btn span.material-symbols-outlined {
      font-size: 17px;
    }
    .view-btn.active {
      background: #ffffff;
      color: #0f172a;
      box-shadow: 0 1px 2px rgba(0,0,0,0.06);
    }

    .badge-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px;
      border-radius: 999px;
      font-size: 10.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .badge-status-pill.pill-active { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
    .badge-status-pill.pill-idle { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
    .badge-status-pill.pill-break { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
    .badge-status-pill.pill-locked { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .badge-status-pill.pill-offline { background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0; }

    .btn-table-lock {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 700;
      color: #b91c1c;
      cursor: pointer;
    }
    .btn-table-lock:hover { background: #fee2e2; }
    .btn-table-unlock {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 700;
      color: #15803d;
      cursor: pointer;
    }
    .btn-table-unlock:hover { background: #dcfce7; }
    .row-locked {
      background: #fff8f8;
    }

    .toolbar-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      gap: 12px;
      flex-wrap: wrap;
    }
    .search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      padding: 8px 14px;
      border-radius: 8px;
      flex: 1;
      max-width: 480px;
    }
    .search-box input {
      border: none;
      outline: none;
      width: 100%;
      font-size: 13px;
    }
    .filter-select {
      padding: 8px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13px;
      background: #ffffff;
      color: #0f172a;
      outline: none;
    }
    .stations-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 18px;
    }
    .station-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      display: flex;
      flex-direction: column;
      transition: all 0.2s;
    }
    .station-card.is-locked {
      border-color: #fca5a5;
      background: #fffafa;
    }
    .station-card-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }
    .station-title-box {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .station-status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #94a3b8;
    }
    .station-status-dot.online {
      background: #16a34a;
      box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.2);
    }
    .station-name {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }
    .station-pill {
      font-size: 10.5px;
      padding: 2px 6px;
      background: #f1f5f9;
      color: #475569;
      border-radius: 4px;
      font-family: monospace;
    }
    .btn-lock {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 5px 10px;
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fecaca;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-lock:hover { background: #fecaca; }
    .btn-unlock {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 5px 10px;
      background: #dcfce7;
      color: #166534;
      border: 1px solid #bbf7d0;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-unlock:hover { background: #bbf7d0; }
    .station-meta-row {
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 12px;
      color: #475569;
      margin-bottom: 12px;
    }
    .meta-item {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .meta-item span.material-symbols-outlined { font-size: 15px; color: #64748b; }

    /* Telemetry Box */
    .telemetry-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
      flex: 1;
    }
    .telemetry-box.telemetry-warning {
      background: #fff7ed;
      border-color: #fed7aa;
    }
    .telemetry-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .telemetry-label {
      font-size: 10px;
      font-weight: 800;
      color: #64748b;
      letter-spacing: 0.5px;
    }
    .badge-live {
      font-size: 9px;
      font-weight: 800;
      padding: 2px 6px;
      background: #dcfce7;
      color: #15803d;
      border-radius: 4px;
    }
    .badge-offline {
      font-size: 9px;
      font-weight: 800;
      padding: 2px 6px;
      background: #f1f5f9;
      color: #64748b;
      border-radius: 4px;
    }
    .telemetry-process {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
    }
    .process-name {
      font-family: monospace;
      font-weight: 800;
      font-size: 13px;
      color: #0f172a;
    }
    .badge-status-approved {
      font-size: 9.5px;
      font-weight: 800;
      padding: 2px 6px;
      background: #dcfce7;
      color: #166534;
      border-radius: 4px;
    }
    .badge-status-unapproved {
      font-size: 9.5px;
      font-weight: 800;
      padding: 2px 6px;
      background: #fee2e2;
      color: #991b1b;
      border-radius: 4px;
    }
    .telemetry-window-title, .telemetry-doc-path {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      color: #334155;
      margin-top: 4px;
    }
    .window-title-text, .doc-path-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .station-card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
      padding-top: 8px;
    }

    /* Policy Layout */
    .policy-layout-grid {
      display: grid;
      grid-template-columns: 1fr 1.3fr;
      gap: 20px;
    }
    @media (max-width: 980px) {
      .policy-layout-grid { grid-template-columns: 1fr; }
    }
    .card-box {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .box-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 4px 0;
    }
    .box-desc {
      font-size: 12.5px;
      color: #64748b;
      margin: 0 0 16px 0;
    }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 12px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .form-group label {
      font-size: 12px;
      font-weight: 700;
      color: #334155;
    }
    .input-text, .input-select {
      padding: 8px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13px;
      outline: none;
    }
    .input-text:focus, .input-select:focus {
      border-color: #0050e5;
    }
    .helper-text {
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
    }
    .form-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 14px;
    }
    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: #0050e5;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-primary:hover { background: #0040b8; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .preset-section {
      margin-top: 18px;
      padding-top: 14px;
      border-top: 1px dashed #e2e8f0;
    }
    .preset-label {
      font-size: 10.5px;
      font-weight: 800;
      color: #64748b;
      letter-spacing: 0.4px;
      display: block;
      margin-bottom: 8px;
    }
    .preset-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .btn-preset {
      padding: 5px 10px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 600;
      color: #1e293b;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-preset:hover {
      background: #e2e8f0;
      border-color: #94a3b8;
    }

    /* Policy & Audit Tables */
    .table-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }
    .table-wrap {
      overflow-x: auto;
    }
    .policy-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12.5px;
    }
    .policy-table th {
      text-align: left;
      padding: 10px 12px;
      background: #f8fafc;
      color: #475569;
      font-weight: 800;
      font-size: 11px;
      letter-spacing: 0.4px;
      border-bottom: 1px solid #e2e8f0;
    }
    .policy-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #f1f5f9;
      color: #0f172a;
    }
    .process-tag {
      padding: 2px 6px;
      background: #f1f5f9;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
    }
    .cat-pill {
      font-size: 11px;
      padding: 2px 8px;
      background: #f1f5f9;
      border-radius: 999px;
      color: #475569;
    }
    .btn-delete {
      background: transparent;
      border: none;
      color: #dc2626;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
    }
    .btn-delete:hover { background: #fee2e2; }
    .staff-meta strong { display: block; font-size: 13px; }
    .staff-meta .sub-text { font-size: 11px; color: #64748b; }
    .reason-cell { max-width: 280px; }
    .btn-group { display: flex; gap: 4px; flex-wrap: wrap; }
    .btn-approve {
      padding: 6px 14px;
      background: #dcfce7;
      color: #166534;
      border: 1px solid #86efac;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-approve:hover {
      background: #bbf7d0;
      border-color: #4ade80;
    }
    .btn-deny {
      padding: 6px 14px;
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fca5a5;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-deny:hover {
      background: #fecaca;
      border-color: #f87171;
    }

    /* Empty State */
    .empty-state {
      padding: 48px 24px;
      text-align: center;
      background: #ffffff;
      border: 1px dashed #cbd5e1;
      border-radius: 12px;
      margin-top: 12px;
    }
    .empty-icon {
      font-size: 48px;
      color: #94a3b8;
      margin-bottom: 12px;
    }
    .empty-state h3 {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 6px 0;
    }
    .empty-state p {
      font-size: 13px;
      color: #64748b;
      max-width: 500px;
      margin: 0 auto;
    }

    /* Clickable Cards & Workstation 360 Details Modal */
    .clickable-card {
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
    }
    .clickable-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 24px -6px rgba(15, 23, 42, 0.1);
      border-color: #93c5fd;
    }
    .clickable-row {
      cursor: pointer;
    }
    .clickable-row:hover td {
      background: #f8fafc;
    }
    .footer-inspect-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: #2563eb;
      font-weight: 700;
      font-size: 11.5px;
    }
    .station-page-breadcrumb-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .btn-back-stations {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      border-radius: 10px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #1e293b;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-back-stations:hover {
      background: #f1f5f9;
      border-color: #94a3b8;
      color: #0f172a;
    }
    .station-detail-page-card {
      background: #ffffff;
      border-radius: 16px;
      width: 100%;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 18px rgba(15, 23, 42, 0.06);
      border: 1px solid #e2e8f0;
      overflow: hidden;
    }
    .station-modal-header {
      padding: 18px 22px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      background: #f8fafc;
    }
    .station-modal-title-group {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .station-modal-icon {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: #eff6ff;
      color: #2563eb;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .station-modal-title {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }
    .station-modal-subtitle {
      font-size: 12.5px;
      color: #64748b;
      margin: 4px 0 0 0;
    }
    .station-modal-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn-close-modal {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #475569;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .btn-close-modal:hover {
      background: #f1f5f9;
      color: #0f172a;
    }
    .station-modal-tabs {
      display: flex;
      gap: 6px;
      padding: 0 22px;
      border-bottom: 1px solid #e2e8f0;
      background: #ffffff;
      overflow-x: auto;
    }
    .modal-tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 12px 14px;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      font-size: 13px;
      font-weight: 700;
      color: #64748b;
      cursor: pointer;
      white-space: nowrap;
    }
    .modal-tab-btn.active {
      color: #2563eb;
      border-bottom-color: #2563eb;
    }
    .station-modal-body {
      padding: 20px 22px;
      overflow-y: auto;
      flex: 1;
    }
    .detail-grid-2 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 16px;
    }
    .detail-info-card {
      padding: 16px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: #f8fafc;
    }
    .detail-card-label {
      font-size: 10.5px;
      font-weight: 800;
      color: #64748b;
      letter-spacing: 0.5px;
    }
    .detail-kv-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12.5px;
      padding: 6px 0;
      border-bottom: 1px dashed #e2e8f0;
    }
    .detail-kv-row:last-child {
      border-bottom: none;
    }
  `]
})
export class WorkstationsConsoleComponent implements OnInit, OnDestroy {
  brandName: string = (typeof localStorage !== "undefined" ? (localStorage.getItem("tenant_name") || localStorage.getItem("company_name")) : null) || "Workspace";
  activeTab: 'stations' | 'policies' | 'requests' | 'violations' | 'activity' = 'stations';
  selectedStation: WorkstationItem | null = null;
  stationDetailTab: 'overview' | 'activity' | 'approved' | 'pending' | 'violations' = 'overview';
  isLoading: boolean = false;
  pollInterval: any;

  stations: WorkstationItem[] = [];
  appPolicies: AppPolicyItem[] = [];
  filePolicy: FilePolicyItem = {
    approvedDirectoryPath: '',
    usbStoragePolicy: 'Blocked',
    blockUsbStorage: true,
    enforceDirectorySandbox: true
  };
  requests: AccessRequestItem[] = [];
  violations: ViolationLogItem[] = [];
  activityLogs: WorkstationActivityLogItem[] = [];
  activityFilter: 'all' | 'apps' | 'files' | 'idle' | 'screenshots' = 'all';
  previewScreenshotItem: WorkstationActivityLogItem | null = null;

  stationSearch: string = '';
  viewMode: 'grid' | 'table' = 'grid';
  statusFilter: 'all' | 'active' | 'idle' | 'break' | 'locked' | 'offline' = 'all';

  openStationDetails(s: WorkstationItem): void {
    this.selectedStation = s;
    this.stationDetailTab = 'overview';
  }

  closeStationDetails(): void {
    this.selectedStation = null;
  }

  get filteredActivityLogs(): WorkstationActivityLogItem[] {
    if (this.activityFilter === 'apps') {
      return this.activityLogs.filter(a => a.eventType === 'APP_OPENED' || a.eventType === 'APP_CLOSED');
    }
    if (this.activityFilter === 'files') {
      return this.activityLogs.filter(a => a.eventType === 'DOCUMENT_ACTIVE' || !!a.fileName || !!a.filePath);
    }
    if (this.activityFilter === 'idle') {
      return this.activityLogs.filter(a =>
        a.eventType === 'USER_LOGIN' ||
        a.eventType === 'USER_SWITCHED' ||
        a.eventType === 'IDLE_WARNING' ||
        a.eventType === 'IDLE_LOCKED' ||
        a.eventType === 'PASSWORD_RESUMED' ||
        a.eventType === 'IDLE_RESUMED' ||
        a.eventType === 'ADMIN_LOCKED' ||
        a.eventType === 'ADMIN_UNLOCKED'
      );
    }
    if (this.activityFilter === 'screenshots') {
      return this.activityLogs.filter(a => a.eventType === 'SCREENSHOT_CAPTURED' || !!a.screenshotUrl);
    }
    return this.activityLogs;
  }

  getStationActivityLogs(s: WorkstationItem): WorkstationActivityLogItem[] {
    const key = (s.machineName || '').trim().toLowerCase();
    const sKey = (s.stationKey || '').trim().toLowerCase();
    const uName = (s.assignedUserName || '').trim().toLowerCase();
    const uId = (s.assignedUserId || '').trim().toLowerCase();
    return this.activityLogs.filter(a => {
      const matchPc =
        (a.machineName || '').trim().toLowerCase() === key ||
        (a.stationKey || '').trim().toLowerCase() === sKey ||
        a.workstationId === s.id;
      const matchUser =
        (uName.length > 0 && (a.userName || '').trim().toLowerCase() === uName) ||
        (uId.length > 0 && ((a.userId || '').trim().toLowerCase() === uId || (a.userEmail || '').trim().toLowerCase() === uId));
      return matchPc || matchUser;
    });
  }

  get pendingRequestsList(): AccessRequestItem[] {
    return this.requests.filter(r => r.status === 'Pending');
  }

  getStationRequests(s: WorkstationItem): AccessRequestItem[] {
    const key = (s.machineName || '').trim().toLowerCase();
    return this.requests.filter(r =>
      r.status === 'Pending' &&
      ((r.machineName || '').trim().toLowerCase() === key || r.workstationId === s.id)
    );
  }

  getStationPendingRequestsCount(s: WorkstationItem): number {
    return this.getStationRequests(s).length;
  }

  getStationViolations(s: WorkstationItem): ViolationLogItem[] {
    const key = (s.machineName || '').trim().toLowerCase();
    return this.violations.filter(v =>
      (v.machineName || '').trim().toLowerCase() === key ||
      v.workstationId === s.id
    );
  }

  quickApproveProcess(processName: string): void {
    const clean = processName.trim();
    const display = clean.replace(/\.exe$/i, '');
    this.addPreset(display.charAt(0).toUpperCase() + display.slice(1), clean, 'Productivity');
  }

  getStationStatus(s: WorkstationItem): 'active' | 'idle' | 'break' | 'locked' | 'offline' {
    if (s.isLocked) return 'locked';
    if (!s.isOnline) return 'offline';
    const proc = (s.currentProcessName || '').toLowerCase();
    const title = (s.currentWindowTitle || '').toLowerCase();
    if (proc.includes('break') || title.includes('break')) return 'break';
    if (proc.includes('idle') || title.includes('idle') || proc === 'desktop idle') return 'idle';
    return 'active';
  }

  get activeCount(): number {
    return this.stations.filter(s => this.getStationStatus(s) === 'active').length;
  }

  get idleCount(): number {
    return this.stations.filter(s => this.getStationStatus(s) === 'idle').length;
  }

  get breakCount(): number {
    return this.stations.filter(s => this.getStationStatus(s) === 'break').length;
  }

  get lockedCount(): number {
    return this.stations.filter(s => this.getStationStatus(s) === 'locked').length;
  }

  get offlineCount(): number {
    return this.stations.filter(s => this.getStationStatus(s) === 'offline').length;
  }

  get filteredStations(): WorkstationItem[] {
    const list = this.stations.filter(s => {
      const status = this.getStationStatus(s);
      if (this.statusFilter !== 'all' && status !== this.statusFilter) return false;
      if (!this.stationSearch) return true;
      const term = this.stationSearch.toLowerCase();
      return (s.machineName && s.machineName.toLowerCase().includes(term)) ||
             (s.stationKey && s.stationKey.toLowerCase().includes(term)) ||
             (s.assignedUserName && s.assignedUserName.toLowerCase().includes(term)) ||
             (s.currentProcessName && s.currentProcessName.toLowerCase().includes(term)) ||
             (s.currentWindowTitle && s.currentWindowTitle.toLowerCase().includes(term));
    });

    // Priority sorting:
    // 1. Restricted apps / warnings first
    // 2. Locked stations
    // 3. Active duty
    // 4. Idle / Inactive
    // 5. Break
    // 6. Offline
    const priorityWeight: Record<string, number> = {
      'locked': 1,
      'active': 2,
      'idle': 3,
      'break': 4,
      'offline': 5
    };

    return list.sort((a, b) => {
      const aRestricted = a.currentProcessName && !this.isAppAllowed(a.currentProcessName);
      const bRestricted = b.currentProcessName && !this.isAppAllowed(b.currentProcessName);
      if (aRestricted && !bRestricted) return -1;
      if (!aRestricted && bRestricted) return 1;

      const wA = priorityWeight[this.getStationStatus(a)] || 99;
      const wB = priorityWeight[this.getStationStatus(b)] || 99;
      if (wA !== wB) return wA - wB;

      const tA = a.lastHeartbeat ? new Date(a.lastHeartbeat).getTime() : 0;
      const tB = b.lastHeartbeat ? new Date(b.lastHeartbeat).getTime() : 0;
      return tB - tA;
    });
  }

  newApp = {
    displayName: '',
    processName: '',
    category: 'Productivity'
  };

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Defense-in-depth: Verify tenant has active bcp-workspace subscription
    const activeFeatures = this.getActiveFeatures();
    if (!activeFeatures.has('bcp-workspace')) {
      this.router.navigate(['/feature-unavailable'], {
        queryParams: {
          feature: 'bcp-workspace',
          featureName: 'Workspace (Desktop only)',
          attemptedUrl: '/workspace/stations'
        }
      });
      return;
    }

    this.refreshAll();
    // Real-time live polling every 3 seconds across stations, policies, access requests, violations, and activity logs
    this.pollInterval = setInterval(() => {
      this.loadStations(false);
      this.loadRequests().then(() => this.loadPolicies());
      this.loadViolations();
      this.loadActivityLogs();
    }, 3000);
  }

  private getActiveFeatures(): Set<string> {
    try {
      const raw = localStorage.getItem('bcp_active_feature_codes');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          return new Set<string>(arr.map(x => String(x).toLowerCase()));
        }
      }
    } catch {}
    return new Set<string>();
  }

  ngOnDestroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  refreshAll(): void {
    this.isLoading = true;
    Promise.all([
      this.loadStations(true),
      this.loadRequests().then(() => this.loadPolicies()),
      this.loadViolations(),
      this.loadActivityLogs()
    ]).finally(() => {
      this.isLoading = false;
    });
  }

  get onlineCount(): number {
    return this.stations.filter(s => s.isOnline).length;
  }

  get resolvedApprovedFolder(): string {
    if (this.filePolicy?.approvedDirectoryPath && this.filePolicy.approvedDirectoryPath.trim().length > 0) {
      return this.filePolicy.approvedDirectoryPath;
    }
    const cleanBrand = (this.brandName || 'Workspace').replace(/[^a-zA-Z0-9_-]/g, '') || 'Workspace';
    return `C:\\${cleanBrand}-Workspace`;
  }

  get pendingRequestsCount(): number {
    return this.requests.filter(r => r.status === 'Pending').length;
  }

  isAppAllowed(processName?: string): boolean {
    if (!processName) return true;
    const clean = processName.toLowerCase();
    return this.appPolicies.some(p => p.processName.toLowerCase() === clean && p.isAllowed);
  }

  loadStations(showLoading: boolean = false): Promise<void> {
    if (showLoading) this.isLoading = true;
    return new Promise(resolve => {
      this.api.get<any>('/Workstations/stations').subscribe({
        next: res => {
          if (res && res.success && res.data) {
            // Deduplicate incoming stations by stationKey or machineName, keeping the freshest heartbeat
            const map = new Map<string, WorkstationItem>();
            for (const s of (res.data as WorkstationItem[])) {
              const key = (s.stationKey || s.machineName || s.id).trim().toUpperCase();
              const existing = map.get(key);
              if (!existing) {
                map.set(key, s);
              } else {
                const t1 = s.lastHeartbeat ? new Date(s.lastHeartbeat).getTime() : 0;
                const t2 = existing.lastHeartbeat ? new Date(existing.lastHeartbeat).getTime() : 0;
                if (t1 >= t2) {
                  map.set(key, s);
                }
              }
            }
            this.stations = Array.from(map.values());
            if (this.selectedStation) {
              const selKey = (this.selectedStation.stationKey || this.selectedStation.machineName || this.selectedStation.id).trim().toUpperCase();
              const updated = map.get(selKey);
              if (updated) this.selectedStation = updated;
            }
          }
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  private hasCleanedLegacyDuplicates = false;

  loadPolicies(): Promise<void> {
    return new Promise(resolve => {
      this.api.get<any>('/Workstations/policies').subscribe({
        next: res => {
          if (res && res.success && res.data) {
            const rawApps: AppPolicyItem[] = res.data.apps || [];
            const seen = new Set<string>();
            const unapprovedAutoSeedProcs = new Set([
              'winword.exe',
              'excel.exe',
              'powerpnt.exe',
              'acrord32.exe',
              'calc.exe',
              'ms-teams.exe'
            ]);
            const approvedRequestProcs = new Set(
              (this.requests || [])
                .filter(r => r.status === 'Approved')
                .map(r => (r.requestedProcessName || '').toLowerCase().trim())
            );

            const cleanApps: AppPolicyItem[] = [];
            const duplicateIdsToDelete: string[] = [];

            for (const app of rawApps) {
              const key = (app.processName || '').toLowerCase().trim();
              if (!key) continue;

              // If this was one of the 5 hardcoded auto-seeded apps and never requested/approved, remove it
              const isAutoSeededDefault =
                unapprovedAutoSeedProcs.has(key) &&
                !approvedRequestProcs.has(key) &&
                app.category !== 'Approved Requests';

              if (isAutoSeededDefault) {
                duplicateIdsToDelete.push(app.id);
                continue;
              }

              if (seen.has(key)) {
                duplicateIdsToDelete.push(app.id);
                continue;
              }

              seen.add(key);
              cleanApps.push(app);
            }

            // Ensure every Approved request in this.requests is present in Approved Apps (cleanApps)
            for (const req of (this.requests || [])) {
              if (req.status !== 'Approved') continue;
              const procKey = (req.requestedProcessName || '').toLowerCase().trim();
              if (!procKey || seen.has(procKey)) continue;

              seen.add(procKey);
              let friendlyName = procKey.replace(/\.exe$/i, '');
              const reasonMatch = (req.reason || '').match(/for\s+(.+)$/i);
              if (reasonMatch && reasonMatch[1]) {
                friendlyName = reasonMatch[1].trim();
              } else if (friendlyName.length > 0) {
                friendlyName = friendlyName.charAt(0).toUpperCase() + friendlyName.slice(1);
              }

              const syncedPolicy: AppPolicyItem = {
                id: req.id,
                displayName: friendlyName,
                processName: procKey,
                category: 'Approved Requests',
                isAllowed: true
              };
              cleanApps.push(syncedPolicy);

              if (!this.hasCleanedLegacyDuplicates) {
                this.api.post<any>('/Workstations/policies/apps', {
                  displayName: friendlyName,
                  processName: procKey,
                  category: 'Approved Requests',
                  isAllowed: true
                }).subscribe({ error: () => {} });
              }
            }

            this.appPolicies = cleanApps;

            if (!this.hasCleanedLegacyDuplicates && duplicateIdsToDelete.length > 0) {
              this.hasCleanedLegacyDuplicates = true;
              for (const id of duplicateIdsToDelete) {
                this.api.delete<any>(`/Workstations/policies/apps/${id}`).subscribe({ error: () => {} });
              }
            }

            if (res.data.filePolicy) {
              this.filePolicy = res.data.filePolicy;
            }
          }
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  loadRequests(): Promise<void> {
    return new Promise(resolve => {
      this.api.get<any>('/Workstations/requests').subscribe({
        next: res => {
          if (res && res.success && res.data) {
            this.requests = res.data;
          }
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  loadViolations(): Promise<void> {
    return new Promise(resolve => {
      this.api.get<any>('/Workstations/violations').subscribe({
        next: res => {
          if (res && res.success && res.data) {
            this.violations = res.data;
          }
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  toggleStationLock(station: WorkstationItem, lock: boolean): void {
    const action = lock ? 'lock' : 'unlock';
    this.api.post<any>('/Workstations/lock', {
      stationId: station.id,
      lock: lock,
      reason: lock ? 'Remote lock enforced by administrator.' : null
    }).subscribe({
      next: res => {
        station.isLocked = lock;
        this.toast.success(`Workstation ${station.machineName} has been ${action}ed.`);
      },
      error: () => {
        this.toast.error(`Failed to ${action} station.`);
      }
    });
  }

  saveAppPolicy(): void {
    if (!this.newApp.displayName || !this.newApp.processName) return;
    this.api.post<any>('/Workstations/policies/apps', {
      displayName: this.newApp.displayName,
      processName: this.newApp.processName,
      category: this.newApp.category,
      isAllowed: true
    }).subscribe({
      next: res => {
        this.toast.success(`Added ${this.newApp.displayName} to whitelist.`);
        this.newApp.displayName = '';
        this.newApp.processName = '';
        this.loadPolicies();
      },
      error: () => {
        this.toast.error('Failed to save app policy.');
      }
    });
  }

  addPreset(name: string, process: string, cat: string): void {
    this.newApp.displayName = name;
    this.newApp.processName = process;
    this.newApp.category = cat;
    this.saveAppPolicy();
  }

  deleteAppPolicy(id: string): void {
    if (!confirm('Are you sure you want to remove this application from the approved whitelist? Workstations will block it.')) return;
    this.api.delete<any>(`/Workstations/policies/apps/${id}`).subscribe({
      next: () => {
        this.toast.success('Application policy removed.');
        this.appPolicies = this.appPolicies.filter(p => p.id !== id);
      },
      error: () => {
        this.toast.error('Failed to remove app policy.');
      }
    });
  }

  saveFilePolicy(): void {
    this.api.post<any>('/Workstations/policies/file-rules', this.filePolicy).subscribe({
      next: () => {
        this.toast.success('Corporate document directory and USB policies updated.');
      },
      error: () => {
        this.toast.error('Failed to update directory policy.');
      }
    });
  }

  respondRequest(requestId: string, approve: boolean, durationHours: number = 8, permanent: boolean = true): void {
    this.api.post<any>(`/Workstations/requests/${requestId}/respond`, {
      approve: approve,
      durationHours: durationHours,
      addToPermanentWhitelist: permanent
    }).subscribe({
      next: () => {
        this.toast.success(`Request ${approve ? 'Approved' : 'Denied'}.`);
        this.loadRequests();
        this.loadPolicies();
      },
      error: () => {
        this.toast.error('Failed to submit response.');
      }
    });
  }

  loadActivityLogs(): Promise<void> {
    return new Promise(resolve => {
      this.api.get<any>('/Workstations/activity-logs?limit=200').subscribe({
        next: res => {
          if (res && res.success && Array.isArray(res.data)) {
            this.activityLogs = res.data
              .filter((a: WorkstationActivityLogItem) => {
                const p = (a.processName || '').toLowerCase();
                const d = (a.appDisplayName || '').toLowerCase();
                const w = (a.windowTitle || '').toLowerCase();
                if (p.includes('ozikol') || d === 'ozikol' || w === 'business command center' || p.includes('webview2') || d.includes('webview2')) {
                  return false;
                }
                const isBrowser = p.includes('chrome') || p.includes('msedge') || p.includes('firefox') || p.includes('brave') || d.includes('chrome');
                const hasFileExt = !!(a.fileName && /\.[a-z0-9]{2,5}$/i.test(a.fileName.trim()));
                if (isBrowser && a.eventType === 'DOCUMENT_ACTIVE' && !hasFileExt) {
                  return false;
                }
                return true;
              })
              .map((a: WorkstationActivityLogItem) => this.normalizeActivityLogItem(a));
          }
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  private normalizeActivityLogItem(a: WorkstationActivityLogItem): WorkstationActivityLogItem {
    const sanitize = (val?: string) => {
      if (!val) return val;
      return val
        .replace(/OzikolBCCClient/gi, this.brandName)
        .replace(/Ozikol-BCC/gi, `${this.brandName}-Workspace`)
        .replace(/Ozikol/gi, this.brandName);
    };

    const proc = (a.processName || a.appDisplayName || '').toLowerCase();
    const isBrowser = proc.includes('chrome') || proc.includes('msedge') || proc.includes('firefox') || proc.includes('brave');
    let fileName = sanitize(a.fileName);
    let filePath = sanitize(a.filePath);
    let details = sanitize(a.details);
    const windowTitle = this.cleanWindowTitle(a.windowTitle);

    const hasFileExt = !!(fileName && /\.[a-z0-9]{2,5}$/i.test(fileName.trim()));
    if (isBrowser && fileName && !hasFileExt) {
      const tabTitle = fileName;
      fileName = undefined;
      filePath = undefined;
      details = a.eventType === 'APP_OPENED'
        ? `Opened ${a.appDisplayName || 'Chrome'} (${windowTitle || tabTitle})`
        : `Active browser tab "${tabTitle}" in ${a.appDisplayName || 'Chrome'}`;
    }

    return {
      ...a,
      appDisplayName: sanitize(a.appDisplayName),
      windowTitle,
      fileName,
      filePath,
      details
    };
  }

  requestScreenshot(station: WorkstationItem): void {
    this.api.post<any>('/Workstations/request-screenshot', {
      stationKey: station.stationKey,
      machineName: station.machineName
    }).subscribe({
      next: res => {
        this.toast.success(res?.message || `Live screenshot requested for ${station.machineName}.`);
        setTimeout(() => this.loadActivityLogs(), 4500);
      },
      error: () => {
        this.toast.error('Failed to request screenshot.');
      }
    });
  }

  formatDuration(seconds?: number): string {
    if (!seconds || seconds <= 0) return '0s';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  }

  formatEventLabel(eventType?: string): string {
    switch ((eventType || '').toUpperCase()) {
      case 'USER_LOGIN': return 'DESKTOP LOGIN';
      case 'USER_SWITCHED': return 'ACCOUNT SWITCHED';
      case 'APP_OPENED': return 'APP OPENED';
      case 'APP_CLOSED': return 'APP CLOSED';
      case 'DOCUMENT_ACTIVE': return 'FILE WORKED ON';
      case 'IDLE_WARNING': return 'IDLE WARNING (3M)';
      case 'IDLE_LOCKED': return 'IDLE LOCKED';
      case 'PASSWORD_RESUMED': return 'PASSWORD RESUMED';
      case 'IDLE_RESUMED': return 'IDLE RESUMED';
      case 'ADMIN_LOCKED': return 'ADMIN LOCKED';
      case 'ADMIN_UNLOCKED': return 'ADMIN UNLOCKED';
      case 'SHIFT_STARTED': return 'SHIFT STARTED';
      case 'BREAK_STARTED': return 'BREAK STARTED';
      case 'BREAK_ENDED': return 'BREAK ENDED';
      case 'SHIFT_CLOSED': return 'SHIFT CLOSED';
      case 'SCREENSHOT_CAPTURED': return 'SCREENSHOT';
      default: return eventType || 'ACTIVITY';
    }
  }

  cleanWindowTitle(title?: string): string {
    if (!title) return '';
    // Strip any leading digit count prefix (e.g., "45 " or "37 ") from Win32 GetWindowText
    // and replace any legacy Angular scaffold title ("OzikolBCCClient") with the tenant brandName
    return title
      .replace(/^\d+\s+/, '')
      .replace(/OzikolBCCClient/gi, this.brandName)
      .replace(/Ozikol-BCC/gi, this.brandName)
      .trim();
  }

  formatTime(isoString?: string): string {
    if (!isoString) return 'Never';
    try {
      const utcString = isoString.endsWith('Z') || isoString.includes('+') ? isoString : `${isoString}Z`;
      const d = new Date(utcString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (_) {
      return isoString;
    }
  }
}

