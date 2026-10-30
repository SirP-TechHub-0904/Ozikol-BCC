import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
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
  machineName: string;
  userName?: string;
  processName: string;
  windowTitle?: string;
  filePath?: string;
  actionTaken: string;
  violationType: string;
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
            {{ 'workspace.subtitle' | translate:'Supervise native office PCs, enforce company-only application execution, sandbox working documents, and prevent unauthorized side-job activities.' }}
          </p>
        </div>
        <div class="header-right">
          <button (click)="refreshAll()" class="btn-refresh" [class.spinning]="isLoading">
            <span class="material-symbols-outlined">refresh</span>
            <span>{{ 'btn.refresh' | translate:'Refresh Fleet' }}</span>
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

        <div class="kpi-card">
          <div class="kpi-icon-wrap bg-red-subtle">
            <span class="material-symbols-outlined text-red">security_update_warning</span>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Violations Blocked</span>
            <span class="kpi-value text-red">{{ violations.length }}</span>
          </div>
        </div>

        <div class="kpi-card cursor-pointer" (click)="activeTab = 'requests'">
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
        <button class="tab-btn" [class.active]="activeTab === 'stations'" (click)="activeTab = 'stations'">
          <span class="material-symbols-outlined">devices</span>
          <span>Connected Workstations ({{ stations.length }})</span>
        </button>

        <button class="tab-btn" [class.active]="activeTab === 'policies'" (click)="activeTab = 'policies'">
          <span class="material-symbols-outlined">rule</span>
          <span>App Whitelist & Sandbox Policy ({{ appPolicies.length }})</span>
        </button>

        <button class="tab-btn" [class.active]="activeTab === 'requests'" (click)="activeTab = 'requests'">
          <span class="material-symbols-outlined">notification_important</span>
          <span>Access Requests</span>
          <span *ngIf="pendingRequestsCount > 0" class="badge-count">{{ pendingRequestsCount }}</span>
        </button>

        <button class="tab-btn" [class.active]="activeTab === 'violations'" (click)="activeTab = 'violations'">
          <span class="material-symbols-outlined">shield_with_heart</span>
          <span>Interception & Violation Logs</span>
        </button>
      </div>

      <!-- TAB 1: CONNECTED WORKSTATIONS (LIVE FLEET MONITOR) -->
      <div *ngIf="activeTab === 'stations'" class="tab-content">
        <div class="toolbar-row">
          <div class="search-box">
            <span class="material-symbols-outlined">search</span>
            <input type="text" [(ngModel)]="stationSearch" placeholder="Search by station, staff name, or current application..." />
          </div>
          <div class="filter-actions">
            <select [(ngModel)]="statusFilter" class="filter-select">
              <option value="all">All Stations ({{ stations.length }})</option>
              <option value="online">Online Only ({{ onlineCount }})</option>
              <option value="locked">Locked Only ({{ lockedCount }})</option>
            </select>
          </div>
        </div>

        <div *ngIf="filteredStations.length === 0" class="empty-state">
          <span class="material-symbols-outlined empty-icon">desktop_access_disabled</span>
          <h3>No Workstations Detected</h3>
          <p>Launch the native Flutter desktop app on an office PC to automatically register the station and begin live monitoring.</p>
        </div>

        <div *ngIf="filteredStations.length > 0" class="stations-grid">
          <div *ngFor="let s of filteredStations" class="station-card" [class.is-locked]="s.isLocked">
            <div class="station-card-head">
              <div class="station-title-box">
                <span class="station-status-dot" [class.online]="s.isOnline"></span>
                <h3 class="station-name">{{ s.machineName }}</h3>
                <span class="station-pill">{{ s.stationKey }}</span>
              </div>
              <div class="station-action-btns">
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
                  <span class="window-title-text" [title]="s.currentWindowTitle">{{ s.currentWindowTitle }}</span>
                </div>

                <div class="telemetry-doc-path" *ngIf="s.currentDocumentPath">
                  <span class="material-symbols-outlined text-gray">folder_open</span>
                  <span class="doc-path-text" [title]="s.currentDocumentPath">{{ s.currentDocumentPath }}</span>
                </div>
              </div>
            </div>

            <div class="station-card-footer">
              <span class="footer-time">Last active: {{ formatTime(s.lastHeartbeat) }}</span>
              <span class="footer-os">{{ s.osVersion || 'Windows 11' }}</span>
            </div>
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
                <span>Document Sandboxing & Peripheral Security</span>
              </h3>
              <p class="box-desc">Prevent staff from editing documents outside approved company folders or sneaking side jobs on USB drives.</p>

              <div class="form-group">
                <label>Approved Corporate Document Directory</label>
                <input type="text" [(ngModel)]="filePolicy.approvedDirectoryPath" class="input-text" placeholder="e.g. C:\\Ozikol-Workspace" />
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
                  <span>Update Sandbox Policy</span>
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

          <div *ngIf="requests.length === 0" class="empty-state">
            <span class="material-symbols-outlined empty-icon">task_alt</span>
            <h3>No Pending Access Requests</h3>
            <p>Whenever an employee encounters a blocked application and clicks "Request Access", their ticket will appear here in real time.</p>
          </div>

          <div *ngIf="requests.length > 0" class="table-wrap">
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
                <tr *ngFor="let r of requests">
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
                      <button (click)="respondRequest(r.id, true, 2)" class="btn-approve" title="Approve for 2 Hours">
                        Approve (2h)
                      </button>
                      <button (click)="respondRequest(r.id, true, 8)" class="btn-approve-day" title="Approve for Today">
                        Approve (8h)
                      </button>
                      <button (click)="respondRequest(r.id, true, 8760, true)" class="btn-approve-perm" title="Approve Permanently">
                        Permanent
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

    /* Stations Grid */
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
      padding: 4px 8px;
      background: #dcfce7;
      color: #166534;
      border: 1px solid #bbf7d0;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-approve-day {
      padding: 4px 8px;
      background: #eff6ff;
      color: #1e40af;
      border: 1px solid #bfdbfe;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-approve-perm {
      padding: 4px 8px;
      background: #faf5ff;
      color: #6b21a8;
      border: 1px solid #e9d5ff;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-deny {
      padding: 4px 8px;
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fecaca;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
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
  `]
})
export class WorkstationsConsoleComponent implements OnInit, OnDestroy {
  activeTab: 'stations' | 'policies' | 'requests' | 'violations' = 'stations';
  isLoading: boolean = false;
  pollInterval: any;

  stations: WorkstationItem[] = [];
  appPolicies: AppPolicyItem[] = [];
  filePolicy: FilePolicyItem = {
    approvedDirectoryPath: 'C:\\Ozikol-Workspace',
    usbStoragePolicy: 'Blocked',
    blockUsbStorage: true,
    enforceDirectorySandbox: true
  };
  requests: AccessRequestItem[] = [];
  violations: ViolationLogItem[] = [];

  stationSearch: string = '';
  statusFilter: 'all' | 'online' | 'locked' = 'all';

  newApp = {
    displayName: '',
    processName: '',
    category: 'Productivity'
  };

  constructor(
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.refreshAll();
    // Auto-refresh live station telemetry every 15 seconds
    this.pollInterval = setInterval(() => {
      if (this.activeTab === 'stations') {
        this.loadStations(false);
      }
    }, 15000);
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
      this.loadPolicies(),
      this.loadRequests(),
      this.loadViolations()
    ]).finally(() => {
      this.isLoading = false;
    });
  }

  get onlineCount(): number {
    return this.stations.filter(s => s.isOnline).length;
  }

  get lockedCount(): number {
    return this.stations.filter(s => s.isLocked).length;
  }

  get pendingRequestsCount(): number {
    return this.requests.filter(r => r.status === 'Pending').length;
  }

  get filteredStations(): WorkstationItem[] {
    return this.stations.filter(s => {
      if (this.statusFilter === 'online' && !s.isOnline) return false;
      if (this.statusFilter === 'locked' && !s.isLocked) return false;
      if (!this.stationSearch) return true;
      const term = this.stationSearch.toLowerCase();
      return (s.machineName && s.machineName.toLowerCase().includes(term)) ||
             (s.stationKey && s.stationKey.toLowerCase().includes(term)) ||
             (s.assignedUserName && s.assignedUserName.toLowerCase().includes(term)) ||
             (s.currentProcessName && s.currentProcessName.toLowerCase().includes(term)) ||
             (s.currentWindowTitle && s.currentWindowTitle.toLowerCase().includes(term));
    });
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
            this.stations = res.data;
          }
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  loadPolicies(): Promise<void> {
    return new Promise(resolve => {
      this.api.get<any>('/Workstations/policies').subscribe({
        next: res => {
          if (res && res.success && res.data) {
            this.appPolicies = res.data.apps || [];
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
        this.toast.success('Document sandbox and USB policies updated.');
      },
      error: () => {
        this.toast.error('Failed to update sandbox policy.');
      }
    });
  }

  respondRequest(requestId: string, approve: boolean, durationHours: number = 4, permanent: boolean = false): void {
    this.api.post<any>(`/Workstations/requests/${requestId}/respond`, {
      approve: approve,
      durationHours: durationHours,
      addToPermanentWhitelist: permanent
    }).subscribe({
      next: () => {
        this.toast.success(`Request ${approve ? 'Approved' : 'Denied'}.`);
        this.loadRequests();
        if (permanent) this.loadPolicies();
      },
      error: () => {
        this.toast.error('Failed to submit response.');
      }
    });
  }

  formatTime(isoString?: string): string {
    if (!isoString) return 'Never';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (_) {
      return isoString;
    }
  }
}

