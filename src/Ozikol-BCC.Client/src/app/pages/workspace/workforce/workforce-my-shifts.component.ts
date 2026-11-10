import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { WorkforceService, Shift } from '../../../core/services/workforce.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Member "My Roster & Shifts" hub (`/workforce/workspace/my-shifts`).
 * Shows the signed-in member's upcoming and active shifts with site briefing (SIs),
 * one-tap shift confirmation, swap/cover requests, and leave submission.
 */
@Component({
  selector: 'app-workforce-my-shifts',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="my-shifts-page p-4">
      <div class="page-header d-flex align-items-center justify-content-between mb-4">
        <div>
          <h2 class="page-title m-0">My Roster & Shifts</h2>
          <p class="text-muted m-0 mt-1">Review, confirm and manage your assigned shifts.</p>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-primary d-flex align-items-center gap-1" (click)="showLeaveModal = true">
            <span class="material-symbols-outlined">event_busy</span> Request Leave
          </button>
          <a class="btn btn-primary d-flex align-items-center gap-1" routerLink="/workforce/workspace/clock">
            <span class="material-symbols-outlined">fingerprint</span> Clock In / Out
          </a>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="tabs-nav-bar mb-4 d-flex gap-2 border-bottom pb-2 flex-wrap">
        <button class="tab-btn btn btn-sm" [class.btn-primary]="activeTab === 'shifts'" [class.btn-light]="activeTab !== 'shifts'" (click)="activeTab = 'shifts'">
          <span class="material-symbols-outlined fs-6 align-middle">calendar_month</span> My Shifts & Roster
        </button>
        <button class="tab-btn btn btn-sm" [class.btn-primary]="activeTab === 'availability'" [class.btn-light]="activeTab !== 'availability'" (click)="activeTab = 'availability'; loadAvailability()">
          <span class="material-symbols-outlined fs-6 align-middle">event_available</span> My Availability
        </button>
        <button class="tab-btn btn btn-sm" [class.btn-primary]="activeTab === 'documents'" [class.btn-light]="activeTab !== 'documents'" (click)="activeTab = 'documents'; loadDocuments()">
          <span class="material-symbols-outlined fs-6 align-middle">badge</span> Compliance Vault
        </button>
        <button class="tab-btn btn btn-sm" [class.btn-primary]="activeTab === 'reminders'" [class.btn-light]="activeTab !== 'reminders'" (click)="activeTab = 'reminders'; loadReminders()">
          <span class="material-symbols-outlined fs-6 align-middle">notifications_active</span> Shift Reminders
        </button>
      </div>

      <div class="text-center p-5" *ngIf="isLoading">
        <div class="spinner-border text-primary" role="status"></div>
      </div>

      <!-- TAB 1: MY SHIFTS -->
      <div *ngIf="activeTab === 'shifts' && !isLoading">
        <div class="empty-state text-center p-5 bg-white rounded shadow-sm" *ngIf="shifts.length === 0">
          <span class="material-symbols-outlined display-4 text-muted mb-3">event_available</span>
          <h5>No shifts assigned</h5>
          <p class="text-muted">You have no upcoming shifts assigned on your rota schedule.</p>
        </div>

        <div class="row g-3" *ngIf="shifts.length > 0">
          <div class="col-md-6 col-xl-4" *ngFor="let s of shifts">
            <div class="card h-100 border-0 shadow-sm shift-card" [class.border-start-overnight]="s.isOvernight">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <span class="badge bg-light text-dark font-monospace">{{ s.shiftCode }}</span>
                    <span class="badge bg-purple ms-1" *ngIf="s.isOvernight">24/7 Overnight</span>
                  </div>
                  <span class="badge" [ngClass]="getStatusBadge(s)">{{ s.status }}</span>
                </div>

                <h5 class="card-title mb-1 text-primary">{{ s.facilityName || s.siteName }}</h5>
                <p class="text-muted small mb-2">
                  <span class="material-symbols-outlined align-middle fs-6">place</span> 
                  {{ s.address || s.siteAddress }} <span *ngIf="s.postCode" class="fw-bold">({{ s.postCode }})</span>
                </p>

                <div class="border rounded p-2 bg-light mb-3">
                  <div class="d-flex justify-content-between small">
                    <span class="text-muted">Role / Post:</span>
                    <span class="fw-semibold">{{ s.postName }}</span>
                  </div>
                  <div class="d-flex justify-content-between small mt-1">
                    <span class="text-muted">Starts:</span>
                    <span class="fw-semibold">{{ s.startsAtUtc | date:'dd MMM, HH:mm' }}</span>
                  </div>
                  <div class="d-flex justify-content-between small mt-1">
                    <span class="text-muted">Ends:</span>
                    <span class="fw-semibold">{{ s.endsAtUtc | date:'dd MMM, HH:mm' }}</span>
                  </div>
                  <div class="d-flex justify-content-between small mt-1">
                    <span class="text-muted">Duration:</span>
                    <span>{{ s.plannedDurationHours }} hrs (break: {{ s.breakMinutes }}m)</span>
                  </div>
                  <div class="d-flex justify-content-between small mt-1">
                    <span class="text-muted">Pay Rate:</span>
                    <span class="fw-bold text-success">{{ s.hourlyPayRate ? currencySymbol + s.hourlyPayRate + '/hr' : (currencySymbol + '10.00/hr') }}</span>
                  </div>
                  <div class="d-flex justify-content-between small mt-1" *ngIf="s.requiredWorkspaceStationName">
                    <span class="text-muted">Workstation:</span>
                    <span class="badge bg-info text-dark">{{ s.requiredWorkspaceStationName }}</span>
                  </div>
                </div>

                <!-- Live Acceptance Countdown Alert -->
                <div class="acceptance-countdown-box p-2 rounded mb-3" *ngIf="!s.isConfirmedByGuard">
                  <div class="d-flex align-items-center justify-content-between small">
                    <span class="fw-bold d-flex align-items-center gap-1" [ngClass]="isShiftExpired(s) ? 'text-danger' : 'text-primary'">
                      <span class="material-symbols-outlined fs-6">{{ isShiftExpired(s) ? 'timer_off' : 'timer' }}</span>
                      {{ isShiftExpired(s) ? 'Acceptance Expired' : 'Acceptance Deadline' }}
                    </span>
                    <span class="font-monospace fw-bold" [ngClass]="isShiftExpired(s) ? 'text-danger' : 'text-dark'">
                      {{ getCountdown(s) }}
                    </span>
                  </div>
                  <div class="small text-muted mt-1" *ngIf="!isShiftExpired(s)">
                    Please confirm before the timer lapses to secure this shift.
                  </div>
                  <div class="small text-danger mt-1" *ngIf="isShiftExpired(s)">
                    This assignment has expired and may be reclaimed by other team members.
                  </div>
                </div>

                <div class="site-briefing-alert p-2 rounded mb-3 small" *ngIf="s.siteAssignmentInstructions">
                  <div class="fw-semibold text-dark d-flex align-items-center gap-1 mb-1">
                    <span class="material-symbols-outlined fs-6 text-warning">info</span> Site Assignment Instructions (SIs)
                  </div>
                  <div class="text-secondary">{{ s.siteAssignmentInstructions }}</div>
                </div>

                <div class="d-flex gap-2">
                  <button
                    class="btn btn-sm btn-outline-success flex-fill"
                    *ngIf="!s.isConfirmedByGuard"
                    (click)="confirmShift(s)"
                    [disabled]="isActionLoading || isShiftExpired(s)">
                    Confirm Shift
                  </button>
                  <button
                    class="btn btn-sm btn-outline-secondary flex-fill"
                    (click)="openSwapModal(s)">
                    Request Swap
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 2: MY AVAILABILITY -->
      <div *ngIf="activeTab === 'availability' && !isLoading">
        <div class="row g-4">
          <div class="col-md-5">
            <div class="card p-3 shadow-sm border-0">
              <h5 class="fw-bold mb-3 text-primary">Log My Availability</h5>
              <div class="mb-3">
                <label class="form-label">Target Date *</label>
                <input type="date" class="form-control" [(ngModel)]="availForm.targetDate" />
              </div>
              <div class="mb-3">
                <label class="form-label">Availability State *</label>
                <select class="form-select" [(ngModel)]="availForm.state">
                  <option value="Available">Available (Full Day)</option>
                  <option value="Unavailable">Unavailable (All Day)</option>
                  <option value="PartlyUnavailable">Partly Unavailable (Time Slots)</option>
                </select>
              </div>
              <div class="row g-2 mb-3" *ngIf="availForm.state === 'PartlyUnavailable'">
                <div class="col-6">
                  <label class="form-label">From Time</label>
                  <input type="time" class="form-control" [(ngModel)]="availForm.unavailableFromTime" />
                </div>
                <div class="col-6">
                  <label class="form-label">To Time</label>
                  <input type="time" class="form-control" [(ngModel)]="availForm.unavailableToTime" />
                </div>
              </div>
              <div class="mb-3">
                <label class="form-label">Reason / Notes</label>
                <textarea class="form-control" rows="2" [(ngModel)]="availForm.reason" placeholder="e.g. University lectures, family commitment"></textarea>
              </div>
              <button class="btn btn-primary w-100" (click)="saveAvailability()" [disabled]="!availForm.targetDate">
                Save Availability
              </button>
            </div>
          </div>
          <div class="col-md-7">
            <div class="card p-3 shadow-sm border-0">
              <h5 class="fw-bold mb-3 text-dark">Upcoming Availability Logs</h5>
              <div class="table-responsive" *ngIf="availList.length > 0">
                <table class="table table-hover align-middle">
                  <thead class="table-light">
                    <tr>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Window</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let a of availList">
                      <td class="fw-bold">{{ a.targetDate | date:'dd MMM yyyy' }}</td>
                      <td>
                        <span class="badge" [class.bg-success]="a.state === 'Available'" [class.bg-danger]="a.state === 'Unavailable'" [class.bg-warning]="a.state === 'PartlyUnavailable'" [class.text-dark]="a.state === 'PartlyUnavailable'">
                          {{ a.state }}
                        </span>
                      </td>
                      <td class="small">{{ a.unavailableFromTime ? a.unavailableFromTime + ' - ' + a.unavailableToTime : 'Full Day' }}</td>
                      <td class="small text-muted">{{ a.reason || '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="empty-state text-center p-4 text-muted" *ngIf="availList.length === 0">
                No availability logs recorded yet.
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 3: COMPLIANCE VAULT -->
      <div *ngIf="activeTab === 'documents' && !isLoading">
        <div class="row g-4">
          <div class="col-md-5">
            <div class="card p-3 shadow-sm border-0">
              <h5 class="fw-bold mb-3 text-primary">Upload Document</h5>
              <div class="mb-3">
                <label class="form-label">Document Type *</label>
                <select class="form-select" [(ngModel)]="docForm.documentType">
                  <option value="SiaLicense">SIA Security License</option>
                  <option value="RightToWork">Right to Work Proof / Passport</option>
                  <option value="FacialIdSnapshot">Facial ID / Headshot Verification</option>
                  <option value="FirstAidCert">First Aid Certificate</option>
                  <option value="DrivingLicense">Driving License</option>
                  <option value="Other">Other Compliance Document</option>
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label">Document Name *</label>
                <input type="text" class="form-control" [(ngModel)]="docForm.documentName" placeholder="e.g. SIA Door Supervisor Badge #1002" />
              </div>
              <div class="mb-3">
                <label class="form-label">Expiry Date</label>
                <input type="date" class="form-control" [(ngModel)]="docForm.expiryDateUtc" />
              </div>
              <div class="mb-3">
                <label class="form-label">Document File URL</label>
                <input type="text" class="form-control" [(ngModel)]="docForm.fileUrl" placeholder="https://..." />
              </div>
              <button class="btn btn-primary w-100" (click)="saveDocument()" [disabled]="!docForm.documentName || !docForm.fileUrl">
                Upload to Vault
              </button>
            </div>
          </div>
          <div class="col-md-7">
            <div class="card p-3 shadow-sm border-0">
              <h5 class="fw-bold mb-3 text-dark">Verified Documents</h5>
              <div class="table-responsive" *ngIf="docList.length > 0">
                <table class="table table-hover align-middle">
                  <thead class="table-light">
                    <tr>
                      <th>Document</th>
                      <th>Type</th>
                      <th>Expiry</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let d of docList">
                      <td class="fw-bold">{{ d.documentName }}</td>
                      <td><span class="badge bg-light text-dark border">{{ d.documentType }}</span></td>
                      <td class="small">{{ d.expiryDateUtc ? (d.expiryDateUtc | date:'shortDate') : 'No Expiry' }}</td>
                      <td><span class="badge bg-success">Verified</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="empty-state text-center p-4 text-muted" *ngIf="docList.length === 0">
                No documents uploaded yet.
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 4: SHIFT REMINDERS -->
      <div *ngIf="activeTab === 'reminders' && !isLoading">
        <div class="card p-4 shadow-sm border-0" style="max-width: 700px; margin: 0 auto;">
          <h5 class="fw-bold text-primary mb-2">Shift Readiness & Departure Reminders</h5>
          <p class="text-muted small mb-4">
            Customize up to 3 notification intervals before each shift. Choose the channels that ensure you never miss duty call.
          </p>
          <div class="row g-3 mb-4">
            <div class="col-md-4">
              <label class="form-label fw-bold">Slot 1 Reminder</label>
              <select class="form-select" [(ngModel)]="reminderPrefs.reminderSlot1Minutes">
                <option [ngValue]="1440">1 Day Before (24h)</option>
                <option [ngValue]="720">12 Hours Before</option>
                <option [ngValue]="480">8 Hours Before</option>
                <option [ngValue]="0">Disabled</option>
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label fw-bold">Slot 2 Reminder</label>
              <select class="form-select" [(ngModel)]="reminderPrefs.reminderSlot2Minutes">
                <option [ngValue]="240">4 Hours Before</option>
                <option [ngValue]="180">3 Hours Before</option>
                <option [ngValue]="120">2 Hours Before</option>
                <option [ngValue]="0">Disabled</option>
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label fw-bold">Slot 3 Reminder</label>
              <select class="form-select" [(ngModel)]="reminderPrefs.reminderSlot3Minutes">
                <option [ngValue]="60">1 Hour Before</option>
                <option [ngValue]="30">30 Mins Before</option>
                <option [ngValue]="15">15 Mins Before</option>
                <option [ngValue]="0">Disabled</option>
              </select>
            </div>
          </div>
          <h6 class="fw-bold text-dark mb-3">Notification Channels</h6>
          <div class="d-flex flex-column gap-2 mb-4">
            <label class="d-flex align-items-center gap-2">
              <input type="checkbox" [(ngModel)]="reminderPrefs.allowInApp" />
              <span>In-App & Browser Push Notifications</span>
            </label>
            <label class="d-flex align-items-center gap-2">
              <input type="checkbox" [(ngModel)]="reminderPrefs.allowEmail" />
              <span>Transactional Email Dispatch</span>
            </label>
            <label class="d-flex align-items-center gap-2">
              <input type="checkbox" [(ngModel)]="reminderPrefs.allowWhatsApp" />
              <span>WhatsApp Duty Broadcasts</span>
            </label>
          </div>
          <button class="btn btn-primary" (click)="saveReminderPreferences()">
            Save Reminder Preferences
          </button>
        </div>
      </div>

      <!-- Swap Modal -->
      <div class="modal fade show d-block" *ngIf="showSwapModal" style="background: rgba(0,0,0,0.5)">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Request Shift Swap / Cover</h5>
              <button type="button" class="btn-close" (click)="showSwapModal = false"></button>
            </div>
            <div class="modal-body">
              <p class="small text-muted mb-3">
                Request a swap for your shift at <strong>{{ selectedShift?.siteName }}</strong> on {{ selectedShift?.startsAtUtc | date:'mediumDate' }}.
              </p>
              <div class="mb-3">
                <label class="form-label">Reason for Swap</label>
                <textarea class="form-control" rows="3" [(ngModel)]="swapReason" placeholder="e.g. Family emergency, university exam"></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline-secondary" (click)="showSwapModal = false">Cancel</button>
              <button class="btn btn-primary" (click)="submitSwap()" [disabled]="!swapReason">Submit Swap Request</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Leave Request Modal -->
      <div class="modal fade show d-block" *ngIf="showLeaveModal" style="background: rgba(0,0,0,0.5)">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Submit Leave Request</h5>
              <button type="button" class="btn-close" (click)="showLeaveModal = false"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label">Leave Type</label>
                <select class="form-select" [(ngModel)]="leaveType">
                  <option value="Annual">Annual Leave</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="Compassionate">Compassionate Leave</option>
                  <option value="Unpaid">Unpaid Leave</option>
                </select>
              </div>
              <div class="row">
                <div class="col-6 mb-3">
                  <label class="form-label">Start Date</label>
                  <input type="date" class="form-control" [(ngModel)]="leaveStartDate">
                </div>
                <div class="col-6 mb-3">
                  <label class="form-label">End Date</label>
                  <input type="date" class="form-control" [(ngModel)]="leaveEndDate">
                </div>
              </div>
              <div class="mb-3">
                <label class="form-label">Reason</label>
                <textarea class="form-control" rows="3" [(ngModel)]="leaveReason" placeholder="Optional notes for supervisor"></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline-secondary" (click)="showLeaveModal = false">Cancel</button>
              <button class="btn btn-primary" (click)="submitLeave()" [disabled]="!leaveStartDate || !leaveEndDate">Submit Request</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .my-shifts-page {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .page-title {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.4px;
      margin: 0;
    }
    .text-muted {
      color: #64748b !important;
      font-size: 13.5px;
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 13px;
      padding: 8px 16px;
      border-radius: 8px;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.15s ease;
      text-decoration: none;
    }
    .btn-primary {
      background: #0050e5;
      color: #ffffff;
      border-color: #0050e5;
    }
    .btn-primary:hover {
      background: #003db3;
      border-color: #003db3;
    }
    .btn-outline-primary {
      background: #ffffff;
      color: #0050e5;
      border-color: #0050e5;
    }
    .btn-outline-primary:hover {
      background: #eff6ff;
    }
    .btn-outline-secondary {
      background: #ffffff;
      color: #475569;
      border-color: #cbd5e1;
    }
    .btn-outline-secondary:hover {
      background: #f8fafc;
      color: #0f172a;
    }
    .btn-sm {
      padding: 6px 12px;
      font-size: 12px;
    }
    .btn-close {
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      color: #64748b;
      padding: 4px;
    }
    .btn-close::before { content: '✕'; font-family: Arial, sans-serif; }

    /* Layout & Cards */
    .row {
      display: flex;
      flex-wrap: wrap;
      margin: -12px;
    }
    .g-3 > [class*="col"] {
      padding: 12px;
      box-sizing: border-box;
    }
    .col-md-6 { flex: 0 0 50%; max-width: 50%; }
    .col-6 { flex: 0 0 50%; max-width: 50%; }
    @media (max-width: 768px) {
      .col-md-6, .col-6 { flex: 0 0 100%; max-width: 100%; }
    }

    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      display: flex;
      flex-direction: column;
    }
    .card-body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .border-start-overnight {
      border-left: 4px solid #9333ea !important;
    }
    .site-briefing-alert {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 16px;
    }

    /* Badges */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
    }
    .bg-primary { background: #0050e5 !important; color: #ffffff !important; }
    .bg-success { background: #16a34a !important; color: #ffffff !important; }
    .bg-warning { background: #f59e0b !important; color: #ffffff !important; }
    .bg-light { background: #f1f5f9 !important; color: #475569 !important; }
    .bg-purple { background: #9333ea !important; color: #ffffff !important; }
    .bg-purple-subtle { background: #faf5ff; border: 1px solid #e9d5ff; }
    .text-purple { color: #9333ea; }
    .text-primary { color: #0050e5; }
    .text-dark { color: #0f172a; }
    .font-monospace { font-family: monospace; }
    .fw-bold { font-weight: 700; }
    .fw-semibold { font-weight: 600; }
    .fw-medium { font-weight: 500; }
    .fs-6 { font-size: 16px; }
    .small { font-size: 12px; }
    .d-flex { display: flex; }
    .justify-content-between { justify-content: space-between; }
    .align-items-center { align-items: center; }
    .gap-2 { gap: 8px; }
    .mb-1 { margin-bottom: 4px; }
    .mb-2 { margin-bottom: 8px; }
    .mb-3 { margin-bottom: 12px; }
    .mb-4 { margin-bottom: 24px; }
    .m-0 { margin: 0; }
    .mt-1 { margin-top: 4px; }
    .mt-auto { margin-top: auto; }
    .p-3 { padding: 16px; }
    .p-4 { padding: 24px; }
    .p-5 { padding: 48px; }
    .border { border: 1px solid #e2e8f0; }
    .rounded { border-radius: 8px; }
    .shadow-sm { box-shadow: 0 1px 3px rgba(0,0,0,0.04); }

    /* Forms */
    .form-label {
      display: block;
      margin-bottom: 6px;
      font-size: 12px;
      font-weight: 600;
      color: #475569;
    }
    .form-select, .form-control {
      width: 100%;
      padding: 9px 12px;
      font-size: 13px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      background: #ffffff;
      color: #0f172a;
      box-sizing: border-box;
    }
    .form-select:focus, .form-control:focus {
      outline: none;
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0,80,229,0.12);
    }

    /* Modals */
    .modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 1050;
      display: flex !important;
      align-items: center;
      justify-content: center;
      padding: 20px;
      box-sizing: border-box;
    }
    .modal-dialog {
      width: 100%;
      max-width: 540px;
      margin: auto;
    }
    .modal-content {
      background: #ffffff;
      border-radius: 14px;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
      border: 1px solid #e2e8f0;
      overflow: hidden;
    }
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid #e2e8f0;
    }
    .modal-title {
      font-size: 16px;
      font-weight: 700;
      margin: 0;
      color: #0f172a;
    }
    .modal-body {
      padding: 20px;
    }
    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      padding: 14px 20px;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
    }

    .acceptance-countdown-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
    }
    .text-danger {
      color: #dc2626 !important;
    }
    .w-100 {
      width: 100%;
    }

    /* Dark Mode */
    :host-context(.dark-mode) .my-shifts-page { color: #f8fafc; }
    :host-context(.dark-mode) .page-title { color: #f8fafc; }
    :host-context(.dark-mode) .card,
    :host-context(.dark-mode) .modal-content {
      background: #1e293b;
      border-color: rgba(255,255,255,0.08);
      color: #f8fafc;
    }
    :host-context(.dark-mode) .acceptance-countdown-box {
      background: #0f172a;
      border-color: #334155;
    }
    :host-context(.dark-mode) .form-select,
    :host-context(.dark-mode) .form-control {
      background: #0f172a;
      border-color: #334155;
      color: #f8fafc;
    }
    :host-context(.dark-mode) .modal-footer {
      background: #0f172a;
      border-top-color: #334155;
    }
  `]
})
export class WorkforceMyShiftsComponent implements OnInit {
  shifts: Shift[] = [];
  isLoading = false;
  isActionLoading = false;
  currencySymbol = '₦';

  activeTab: 'shifts' | 'availability' | 'documents' | 'reminders' = 'shifts';

  showSwapModal = false;
  selectedShift: Shift | null = null;
  swapReason = '';

  showLeaveModal = false;
  leaveType = 'Annual';
  leaveStartDate = '';
  leaveEndDate = '';
  leaveReason = '';

  // Availability state
  availList: any[] = [];
  availForm: any = {
    targetDate: '',
    state: 'Available',
    unavailableFromTime: '09:00',
    unavailableToTime: '17:00',
    reason: ''
  };

  // Documents state
  docList: any[] = [];
  docForm: any = {
    documentType: 'SiaLicense',
    documentName: '',
    expiryDateUtc: '',
    fileUrl: ''
  };

  // Reminders state
  reminderPrefs: any = {
    reminderSlot1Minutes: 1440,
    reminderSlot2Minutes: 240,
    reminderSlot3Minutes: 30,
    allowInApp: true,
    allowEmail: true,
    allowWhatsApp: true
  };

  constructor(
    private readonly workforceService: WorkforceService,
    private readonly toast: ToastService
  ) { }

  ngOnInit(): void {
    this.workforceService.getTenantCurrency().subscribe({
      next: (res: any) => {
        if (res?.data?.currencySymbol) {
          this.currencySymbol = res.data.currencySymbol;
        }
      },
      error: () => {}
    });
    this.loadMyShifts();
  }

  loadMyShifts(): void {
    this.isLoading = true;
    this.workforceService.getMyShifts().subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.isSuccess && res.data) {
          this.shifts = res.data;
        }
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('Unable to load your assigned shifts.');
      }
    });
  }

  // --- ACCEPTANCE COUNTDOWN & EXPIRATION ---
  getCountdown(s: Shift): string {
    if (s.isConfirmedByGuard) return 'Accepted';
    if (!s.acceptanceDeadlineUtc) return 'No Deadline Set';
    const diff = new Date(s.acceptanceDeadlineUtc).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const hrs = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hrs.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m remaining`;
  }

  isShiftExpired(s: Shift): boolean {
    if (s.isConfirmedByGuard || !s.acceptanceDeadlineUtc) return false;
    return new Date(s.acceptanceDeadlineUtc).getTime() <= Date.now();
  }

  confirmShift(shift: Shift): void {
    if (this.isShiftExpired(shift)) {
      this.toast.error('This shift acceptance deadline has expired.');
      return;
    }

    this.isActionLoading = true;
    this.workforceService.confirmShift(shift.id).subscribe({
      next: (res) => {
        this.isActionLoading = false;
        if (res.isSuccess) {
          shift.isConfirmedByGuard = true;
          shift.status = 'Confirmed';
          this.toast.success('Shift confirmed.');
        } else {
          this.toast.error(res.message || 'Confirmation failed.');
        }
      },
      error: () => {
        this.isActionLoading = false;
        this.toast.error('Failed to confirm shift.');
      }
    });
  }

  // --- AVAILABILITY LOGIC ---
  loadAvailability(): void {
    this.workforceService.getAvailability().subscribe({
      next: (res: any) => {
        if (res.isSuccess && res.data) {
          this.availList = res.data;
        }
      }
    });
  }

  saveAvailability(): void {
    if (!this.availForm.targetDate) return;
    this.workforceService.upsertAvailability(this.availForm).subscribe({
      next: (res: any) => {
        if (res.isSuccess) {
          this.toast.success('Availability saved.');
          this.loadAvailability();
          this.availForm.reason = '';
        } else {
          this.toast.error(res.message || 'Failed to save availability.');
        }
      },
      error: () => this.toast.error('Error recording availability.')
    });
  }

  // --- COMPLIANCE VAULT LOGIC ---
  loadDocuments(): void {
    this.workforceService.getDocuments().subscribe({
      next: (res: any) => {
        if (res.isSuccess && res.data) {
          this.docList = res.data;
        }
      }
    });
  }

  saveDocument(): void {
    if (!this.docForm.documentName || !this.docForm.fileUrl) return;
    this.workforceService.uploadDocument(this.docForm).subscribe({
      next: (res: any) => {
        if (res.isSuccess) {
          this.toast.success('Document uploaded to vault.');
          this.loadDocuments();
          this.docForm.documentName = '';
          this.docForm.fileUrl = '';
        } else {
          this.toast.error(res.message || 'Failed to save document.');
        }
      },
      error: () => this.toast.error('Error uploading document.')
    });
  }

  // --- REMINDERS LOGIC ---
  loadReminders(): void {
    this.workforceService.getNotificationPreferences().subscribe({
      next: (res: any) => {
        if (res.isSuccess && res.data) {
          this.reminderPrefs = res.data;
        }
      }
    });
  }

  saveReminderPreferences(): void {
    this.workforceService.updateNotificationPreferences(this.reminderPrefs).subscribe({
      next: (res: any) => {
        if (res.isSuccess) {
          this.toast.success('Notification preferences saved.');
        } else {
          this.toast.error(res.message || 'Failed to update preferences.');
        }
      },
      error: () => this.toast.error('Error updating notification preferences.')
    });
  }

  openSwapModal(shift: Shift): void {
    this.selectedShift = shift;
    this.swapReason = '';
    this.showSwapModal = true;
  }

  submitSwap(): void {
    if (!this.selectedShift) return;
    this.workforceService.requestSwap({
      shiftId: this.selectedShift.id,
      reason: this.swapReason
    }).subscribe({
      next: (res: any) => {
        this.showSwapModal = false;
        if (res.isSuccess) {
          this.toast.success('Swap request submitted for supervisor approval.');
          this.loadMyShifts();
        } else {
          this.toast.error(res.message || 'Swap request failed.');
        }
      },
      error: () => {
        this.showSwapModal = false;
        this.toast.error('Failed to request shift swap.');
      }
    });
  }

  submitLeave(): void {
    const req = {
      leaveType: this.leaveType,
      startDate: new Date(this.leaveStartDate).toISOString(),
      endDate: new Date(this.leaveEndDate).toISOString(),
      reason: this.leaveReason
    };
    this.workforceService.requestLeave(req).subscribe({
      next: (res: any) => {
        this.showLeaveModal = false;
        if (res.isSuccess) {
          this.toast.success('Leave request submitted successfully.');
        } else {
          this.toast.error(res.message || 'Leave submission failed.');
        }
      },
      error: () => {
        this.showLeaveModal = false;
        this.toast.error('Failed to submit leave request.');
      }
    });
  }

  getStatusBadge(s: Shift): string {
    if (s.isClockedIn) return 'bg-primary';
    if (s.isClockedOut) return 'bg-secondary';
    if (s.isConfirmedByGuard) return 'bg-success';
    return 'bg-warning text-dark';
  }
}
