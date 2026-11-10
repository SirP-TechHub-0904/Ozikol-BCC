import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { WorkforceService } from '../../../core/services/workforce.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Dedicated Full-Page View for Duty Inspection, Geofence Verification, Post Reports, and Disciplinary Fines.
 * Route: `/workforce/console/shifts/:id/report`
 * Completely replaces slide-out modals with a clean, navigable inspection page.
 */
@Component({
  selector: 'app-workforce-duty-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="bcp-page-container">
      <!-- 1. Header & Breadcrumbs -->
      <div class="page-header">
        <div class="header-left">
          <div class="breadcrumb">
            <a routerLink="/admin/dashboard">Command Center</a>
            <span class="sep">/</span>
            <span>Workforce &amp; Shifts</span>
            <span class="sep">/</span>
            <a routerLink="/workforce/console/sites">Client Sites &amp; Geofences</a>
            <span class="sep">/</span>
            <a *ngIf="shift?.clientSiteId" [routerLink]="['/workforce/console/sites', shift?.clientSiteId, 'activity']">
              {{ shift?.siteName || 'Venue Duty Hub' }}
            </a>
            <span class="sep">/</span>
            <span class="current">Duty Report: {{ shift?.shiftCode || 'Shift' }}</span>
          </div>
          <div class="title-row">
            <h1>Duty Report &amp; Inspection Sheet</h1>
            <span class="code-badge" *ngIf="shift?.shiftCode">{{ shift?.shiftCode }}</span>
            <span class="status-pill" [ngClass]="getStatusClass(shift)">{{ shift?.status || 'Scheduled' }}</span>
          </div>
          <p class="subtitle" *ngIf="shift">
            Duty inspection records, GPS geofence compliance, post incident report, and fine/penalty deductions for
            <strong>{{ shift.assignedUserName || 'Unassigned Post' }}</strong> at <strong>{{ shift.siteName }}</strong>.
          </p>
        </div>
        <div class="header-actions">
          <button type="button" class="btn btn-outline" (click)="goBack()">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>Back</span>
          </button>
          <button
            type="button"
            class="btn btn-primary"
            (click)="saveReportAndFines()"
            [disabled]="isSaving || isLoading"
          >
            <span class="material-symbols-outlined" *ngIf="!isSaving">save</span>
            <span class="material-symbols-outlined spin" *ngIf="isSaving">sync</span>
            <span>{{ isSaving ? 'Saving...' : 'Save Report &amp; Fines' }}</span>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div class="cms-loading-card" *ngIf="isLoading">
        <span class="material-symbols-outlined spin">progress_activity</span>
        <p>Loading duty report details and attendance telemetry...</p>
      </div>

      <!-- Main Layout: 2 Columns Responsive -->
      <div class="detail-layout" *ngIf="!isLoading && shift">
        <!-- Left Column: Identity & Attendance Geofence Verification -->
        <div class="column">
          <!-- Card 1: Staff Identity & Assignment -->
          <div class="cms-card">
            <div class="card-header">
              <div class="card-title-group">
                <span class="material-symbols-outlined text-blue">person</span>
                <div>
                  <h3>Staff Identity &amp; Duty Post</h3>
                  <p class="card-subtitle">Assigned personnel profile and venue location assignment.</p>
                </div>
              </div>
              <a
                *ngIf="shift.assignedUserId"
                [routerLink]="['/workforce/console/members', shift.assignedUserId]"
                class="btn-text-sm"
              >
                View Staff Profile &rarr;
              </a>
            </div>

            <div class="card-body">
              <div class="staff-profile-banner">
                <div class="staff-avatar-lg">
                  {{ getInitials(shift.assignedUserName || 'Staff Member') }}
                </div>
                <div class="staff-details">
                  <h3 class="staff-name">{{ shift.assignedUserName || 'Open Shift (Unassigned)' }}</h3>
                  <span class="staff-post-badge">{{ shift.postName }}</span>
                  <div class="meta-row">
                    <span class="meta-pill" *ngIf="shift.assignedUserId">ID: {{ shift.assignedUserId }}</span>
                    <span class="meta-pill" *ngIf="shift.facilityName">{{ shift.facilityName }}</span>
                  </div>
                </div>
              </div>

              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Operating Venue / Site:</span>
                  <span class="info-value">
                    <a *ngIf="shift.clientSiteId" [routerLink]="['/workforce/console/sites', shift.clientSiteId, 'activity']">
                      {{ shift.siteName }}
                    </a>
                    <span *ngIf="!shift.clientSiteId">{{ shift.siteName }}</span>
                  </span>
                </div>

                <div class="info-item">
                  <span class="info-label">Site Address:</span>
                  <span class="info-value">{{ shift.address || shift.siteAddress || 'No address specified' }}</span>
                </div>

                <div class="info-item">
                  <span class="info-label">Scheduled Duty Window:</span>
                  <span class="info-value">
                    {{ shift.startsAtUtc | date:'EEE, d MMM y' }} &bull;
                    {{ shift.startsAtUtc | date:'shortTime' }} &ndash; {{ shift.endsAtUtc | date:'shortTime' }}
                    <span class="overnight-tag" *ngIf="shift.isOvernight">(Overnight)</span>
                  </span>
                </div>

                <div class="info-item">
                  <span class="info-label">Contracted Planned Duration:</span>
                  <span class="info-value">{{ shift.plannedDurationHours | number:'1.1-1' }} hours (Break: {{ shift.breakMinutes }}m)</span>
                </div>

                <div class="info-item" *ngIf="shift.requiredWorkspaceStationName">
                  <span class="info-label">Designated Workstation:</span>
                  <span class="info-value text-blue">{{ shift.requiredWorkspaceStationName }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Card 2: Attendance & Geofence Verification Telemetry -->
          <div class="cms-card">
            <div class="card-header">
              <div class="card-title-group">
                <span class="material-symbols-outlined text-blue">radar</span>
                <div>
                  <h3>Attendance &amp; Geofence Telemetry</h3>
                  <p class="card-subtitle">GPS geofence radius validation, clock-in timestamps, and device metrics.</p>
                </div>
              </div>
            </div>

            <div class="card-body">
              <!-- Verification Badges Bar -->
              <div class="telemetry-status-row">
                <div class="telemetry-badge" [class.verified]="shift.isClockInGeofenceVerified" [class.unverified]="shift.isClockedIn && !shift.isClockInGeofenceVerified">
                  <span class="material-symbols-outlined">
                    {{ shift.isClockInGeofenceVerified ? 'verified_user' : 'location_off' }}
                  </span>
                  <div>
                    <strong>{{ shift.isClockInGeofenceVerified ? 'Geofence Verified' : (shift.isClockedIn ? 'Out of Geofence Bounds' : 'Pending Clock-In') }}</strong>
                    <span>{{ shift.isClockInGeofenceVerified ? 'Captured inside site radius' : (shift.clockInDistanceFromSiteMeters ? (shift.clockInDistanceFromSiteMeters | number:'1.0-0') + 'm from site' : 'Awaiting officer arrival') }}</span>
                  </div>
                </div>

                <div class="telemetry-badge" [class.verified]="shift.lateArrivalMinutes === 0 && shift.isClockedIn" [class.unverified]="shift.lateArrivalMinutes > 0">
                  <span class="material-symbols-outlined">
                    {{ shift.lateArrivalMinutes > 0 ? 'alarm_off' : 'alarm_on' }}
                  </span>
                  <div>
                    <strong>{{ shift.lateArrivalMinutes > 0 ? (shift.lateArrivalMinutes + ' Minutes Late') : (shift.isClockedIn ? 'Punctual Arrival' : 'Scheduled Timing') }}</strong>
                    <span>{{ shift.lateArrivalMinutes > 0 ? 'Exceeded grace threshold' : 'Checked in on schedule' }}</span>
                  </div>
                </div>
              </div>

              <!-- Time stamps comparison table -->
              <div class="timing-comparison-grid">
                <div class="timing-box">
                  <span class="timing-lbl">SCHEDULED START</span>
                  <span class="timing-val">{{ shift.startsAtUtc | date:'shortTime' }}</span>
                  <span class="timing-sub">{{ shift.startsAtUtc | date:'mediumDate' }}</span>
                </div>

                <div class="timing-box">
                  <span class="timing-lbl">ACTUAL CLOCK-IN</span>
                  <span class="timing-val text-success" *ngIf="shift.clockInUtc">{{ shift.clockInUtc | date:'shortTime' }}</span>
                  <span class="timing-val text-muted" *ngIf="!shift.clockInUtc">Not Clocked In</span>
                  <span class="timing-sub" *ngIf="shift.clockInUtc">{{ shift.clockInUtc | date:'mediumDate' }}</span>
                </div>

                <div class="timing-box">
                  <span class="timing-lbl">SCHEDULED END</span>
                  <span class="timing-val">{{ shift.endsAtUtc | date:'shortTime' }}</span>
                  <span class="timing-sub">{{ shift.endsAtUtc | date:'mediumDate' }}</span>
                </div>

                <div class="timing-box">
                  <span class="timing-lbl">ACTUAL CLOCK-OUT</span>
                  <span class="timing-val text-primary" *ngIf="shift.clockOutUtc">{{ shift.clockOutUtc | date:'shortTime' }}</span>
                  <span class="timing-val text-muted" *ngIf="!shift.clockOutUtc">Not Clocked Out</span>
                  <span class="timing-sub" *ngIf="shift.clockOutUtc">{{ shift.clockOutUtc | date:'mediumDate' }}</span>
                </div>
              </div>

              <!-- Hours Summary Row -->
              <div class="hours-summary-box">
                <div class="hour-stat">
                  <span class="hour-val">{{ (shift.actualDurationHours || shift.plannedDurationHours) | number:'1.1-1' }}h</span>
                  <span class="hour-lbl">Actual On-Site Hours</span>
                </div>
                <div class="hour-stat">
                  <span class="hour-val text-success">{{ (shift.billableHours || shift.plannedDurationHours) | number:'1.1-1' }}h</span>
                  <span class="hour-lbl">Approved Billable Hours</span>
                </div>
                <div class="hour-stat">
                  <span class="hour-val text-primary">₦{{ ((shift.hourlyPayRate || 0) * (shift.billableHours || shift.plannedDurationHours)) | number:'1.2-2' }}</span>
                  <span class="hour-lbl">Estimated Duty Wage</span>
                </div>
              </div>

              <!-- Flag Warning if any -->
              <div class="alert-flag-box" *ngIf="shift.isFlagged">
                <span class="material-symbols-outlined text-danger">flag</span>
                <div>
                  <strong>Shift Flagged for Administrative Attention:</strong>
                  <p>{{ shift.flagReason || 'Operational discrepancy detected during duty execution.' }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Duty Submission & Occurrence Book + Disciplinary Fines -->
        <div class="column">
          <!-- Card 3: Duty Report & Occurrence Book Entries -->
          <div class="cms-card">
            <div class="card-header">
              <div class="card-title-group">
                <span class="material-symbols-outlined text-blue">edit_note</span>
                <div>
                  <h3>Duty Report &amp; Occurrence Book</h3>
                  <p class="card-subtitle">Submitted observations, key handover notes, and supervisor feedback.</p>
                </div>
              </div>
              <span class="report-submission-chip" *ngIf="shift.reportSubmissionUtc">
                Submitted {{ shift.reportSubmissionUtc | date:'short' }}
              </span>
            </div>

            <div class="card-body">
              <div class="form-group">
                <label class="form-label">Duty Lifecycle Status</label>
                <select class="form-control" [(ngModel)]="dutyStatus" name="dutyStatus">
                  <option value="Scheduled">Scheduled</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="InProgress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Duty Submission Report / Occurrence Notes</label>
                <textarea
                  class="form-control"
                  rows="6"
                  [(ngModel)]="reportContent"
                  name="reportContent"
                  placeholder="Enter occurrence book entries, security observations, patrol notes, or incident briefing..."
                ></textarea>
                <span class="field-hint">Officer submission log or supervisor post review.</span>
              </div>

              <div class="form-group" *ngIf="shift.notes">
                <label class="form-label">Original Supervisor Shift Briefing / Notes:</label>
                <div class="briefing-box">
                  <span class="material-symbols-outlined">info</span>
                  <p>{{ shift.notes }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Card 4: Fines & Disciplinary Penalty Deductions -->
          <div class="cms-card penalty-card" [class.has-fine]="fineAttached">
            <div class="card-header">
              <div class="card-title-group">
                <span class="material-symbols-outlined text-danger">gavel</span>
                <div>
                  <h3>Disciplinary Fines &amp; Penalty Deductions</h3>
                  <p class="card-subtitle">Operational non-compliance fines attached to this duty shift.</p>
                </div>
              </div>
            </div>

            <div class="card-body">
              <!-- Fine Toggle Switch -->
              <div class="toggle-control-box">
                <label class="switch">
                  <input
                    type="checkbox"
                    [(ngModel)]="fineAttached"
                    name="fineAttached"
                  />
                  <span class="slider round"></span>
                </label>
                <div class="toggle-text">
                  <strong>Attach Disciplinary Fine / Penalty to this Shift</strong>
                  <span>When enabled, deducts the specified penalty amount from staff remuneration for this post.</span>
                </div>
              </div>

              <!-- Fine Details (Displayed when fineAttached === true) -->
              <div class="fine-inputs-container" *ngIf="fineAttached">
                <div class="form-row-dual">
                  <div class="form-group">
                    <label class="form-label">Fine Penalty Amount (₦) <span class="required">*</span></label>
                    <input
                      type="number"
                      step="50"
                      min="0"
                      class="form-control"
                      [(ngModel)]="fineAmount"
                      name="fineAmount"
                      placeholder="e.g. 500"
                      required
                    />
                  </div>

                  <div class="form-group">
                    <label class="form-label">Deduction Status</label>
                    <select class="form-control" [(ngModel)]="fineStatus" name="fineStatus">
                      <option value="Applied">Applied (Deducted)</option>
                      <option value="Pending">Pending Review</option>
                      <option value="Waived">Waived / Forgiven</option>
                    </select>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">Reason for Disciplinary Fine <span class="required">*</span></label>
                  <select class="form-control" [(ngModel)]="fineReasonPreset" (change)="onPresetChange()">
                    <option value="">Select standard violation reason...</option>
                    <option value="Late check-in > 30 mins">Late check-in > 30 mins</option>
                    <option value="Uniform / ID Badge violation">Uniform / ID Badge violation</option>
                    <option value="Abandoned post before handover">Abandoned post before handover</option>
                    <option value="Sleeping / inattention on duty">Sleeping / inattention on duty</option>
                    <option value="Failure to submit occurrence report">Failure to submit occurrence report</option>
                    <option value="Out of geofence bounds violation">Out of geofence bounds violation</option>
                    <option value="Custom">Custom Violation Reason</option>
                  </select>
                </div>

                <div class="form-group" *ngIf="fineReasonPreset === 'Custom' || !fineReasonPreset">
                  <label class="form-label">Custom Violation Description</label>
                  <input
                    type="text"
                    class="form-control"
                    [(ngModel)]="fineReason"
                    name="fineReason"
                    placeholder="Describe specific infraction..."
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">Authorized By (Supervisor)</label>
                  <input
                    type="text"
                    class="form-control"
                    [(ngModel)]="fineAuthorizedBy"
                    name="fineAuthorizedBy"
                    placeholder="e.g. First Last"
                  />
                </div>
              </div>

              <!-- Action Bar -->
              <div class="card-footer-actions">
                <button
                  type="button"
                  class="btn btn-primary btn-block"
                  (click)="saveReportAndFines()"
                  [disabled]="isSaving || isLoading"
                >
                  <span class="material-symbols-outlined" *ngIf="!isSaving">save</span>
                  <span class="material-symbols-outlined spin" *ngIf="isSaving">sync</span>
                  <span>{{ isSaving ? 'Saving Records...' : 'Save Duty Report & Fines' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bcp-page-container {
      padding: 1.5rem 2rem;
      background-color: #f8fafc;
      min-height: calc(100vh - 70px);
      box-sizing: border-box;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      color: #64748b;
      margin-bottom: 0.75rem;
    }

    .breadcrumb a {
      color: #64748b;
      text-decoration: none;
      transition: color 0.15s ease;
    }

    .breadcrumb a:hover {
      color: #0050e5;
    }

    .sep {
      color: #cbd5e1;
    }

    .current {
      color: #0f172a;
      font-weight: 600;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
      gap: 1.5rem;
    }

    .title-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.35rem;
    }

    .title-row h1 {
      font-size: 1.5rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
      letter-spacing: -0.02em;
    }

    .subtitle {
      font-size: 0.875rem;
      color: #64748b;
      margin: 0;
      line-height: 1.4;
    }

    .code-badge {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #0050e5;
      font-size: 0.75rem;
      font-weight: 700;
      border-radius: 0.375rem;
    }

    .status-pill {
      display: inline-block;
      padding: 0.2rem 0.6rem;
      border-radius: 1rem;
      font-size: 0.75rem;
      font-weight: 700;
    }

    .status-completed { background: #ecfdf5; color: #059669; }
    .status-in-progress { background: #eff6ff; color: #0050e5; }
    .status-scheduled { background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; }
    .status-flagged { background: #fef2f2; color: #dc2626; }

    .header-actions {
      display: flex;
      gap: 0.75rem;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.55rem 1rem;
      font-size: 0.875rem;
      font-weight: 600;
      border-radius: 0.5rem;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s ease;
      border: 1px solid transparent;
    }

    .btn-primary {
      background: #0050e5;
      color: #ffffff;
    }

    .btn-primary:hover {
      background: #0043c0;
    }

    .btn-outline {
      background: #ffffff;
      color: #334155;
      border-color: #cbd5e1;
    }

    .btn-outline:hover {
      background: #f8fafc;
      border-color: #94a3b8;
    }

    .btn-block {
      width: 100%;
      justify-content: center;
    }

    .spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Layout 2 Columns */
    .detail-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 1.5rem;
      align-items: start;
    }

    @media (max-width: 1024px) {
      .detail-layout {
        grid-template-columns: 1fr;
      }
    }

    .column {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .cms-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }

    .penalty-card.has-fine {
      border-color: #fca5a5;
    }

    .card-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .card-title-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .card-title-group h3 {
      font-size: 1rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }

    .card-subtitle {
      font-size: 0.8125rem;
      color: #64748b;
      margin: 0.15rem 0 0 0;
    }

    .text-blue { color: #0050e5; }
    .text-danger { color: #dc2626; }
    .text-success { color: #16a34a; }
    .text-primary { color: #7c3aed; }
    .text-muted { color: #94a3b8; }

    .card-body {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .btn-text-sm {
      background: none;
      border: none;
      color: #0050e5;
      font-size: 0.8125rem;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
    }

    .btn-text-sm:hover {
      text-decoration: underline;
    }

    /* Staff Profile Banner */
    .staff-profile-banner {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
    }

    .staff-avatar-lg {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: #0050e5;
      color: #ffffff;
      font-size: 1.25rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .staff-details {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .staff-name {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 700;
      color: #0f172a;
    }

    .staff-post-badge {
      font-size: 0.8125rem;
      color: #0050e5;
      font-weight: 600;
    }

    .meta-row {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .meta-pill {
      font-size: 0.6875rem;
      padding: 0.15rem 0.45rem;
      background: #e2e8f0;
      border-radius: 0.25rem;
      color: #334155;
    }

    /* Info Grid */
    .info-grid {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .info-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.8125rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px dashed #f1f5f9;
    }

    .info-label {
      color: #64748b;
    }

    .info-value {
      font-weight: 600;
      color: #0f172a;
      text-align: right;
    }

    .info-value a {
      color: #0050e5;
      text-decoration: none;
    }

    .overnight-tag {
      color: #7c3aed;
      font-weight: 700;
      font-size: 0.75rem;
    }

    /* Telemetry */
    .telemetry-status-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }

    @media (max-width: 640px) {
      .telemetry-status-row {
        grid-template-columns: 1fr;
      }
    }

    .telemetry-badge {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      border-radius: 0.5rem;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
    }

    .telemetry-badge.verified {
      background: #f0fdf4;
      border-color: #bbf7d0;
      color: #166534;
    }

    .telemetry-badge.unverified {
      background: #fef2f2;
      border-color: #fecaca;
      color: #991b1b;
    }

    .telemetry-badge span.material-symbols-outlined {
      font-size: 1.5rem;
    }

    .telemetry-badge strong {
      display: block;
      font-size: 0.8125rem;
    }

    .telemetry-badge span {
      font-size: 0.6875rem;
      color: #64748b;
    }

    .timing-comparison-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.75rem;
      text-align: center;
    }

    @media (max-width: 640px) {
      .timing-comparison-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    .timing-box {
      padding: 0.75rem 0.5rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      display: flex;
      flex-direction: column;
    }

    .timing-lbl {
      font-size: 0.625rem;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.04em;
    }

    .timing-val {
      font-size: 1.125rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0.2rem 0;
    }

    .timing-sub {
      font-size: 0.6875rem;
      color: #94a3b8;
    }

    .hours-summary-box {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
      padding: 0.875rem;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 0.5rem;
      text-align: center;
    }

    .hour-stat {
      display: flex;
      flex-direction: column;
    }

    .hour-val {
      font-size: 1.35rem;
      font-weight: 800;
      color: #0f172a;
    }

    .hour-lbl {
      font-size: 0.6875rem;
      font-weight: 600;
      color: #475569;
    }

    .alert-flag-box {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.75rem;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 0.5rem;
      color: #991b1b;
      font-size: 0.8125rem;
    }

    .alert-flag-box p {
      margin: 0.2rem 0 0 0;
      font-size: 0.75rem;
      color: #b91c1c;
    }

    /* Form Controls */
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .form-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #334155;
    }

    .required {
      color: #ef4444;
    }

    .form-control {
      width: 100%;
      padding: 0.625rem 0.875rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      color: #0f172a;
      background: #ffffff;
      outline: none;
      box-sizing: border-box;
    }

    .form-control:focus {
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.1);
    }

    .field-hint {
      font-size: 0.75rem;
      color: #64748b;
    }

    .briefing-box {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.75rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      font-size: 0.8125rem;
      color: #334155;
    }

    .briefing-box p {
      margin: 0;
      line-height: 1.4;
    }

    .report-submission-chip {
      font-size: 0.75rem;
      color: #166534;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      padding: 0.2rem 0.5rem;
      border-radius: 0.375rem;
      font-weight: 600;
    }

    /* Penalty Card & Switch */
    .toggle-control-box {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
    }

    .toggle-text {
      display: flex;
      flex-direction: column;
    }

    .toggle-text strong {
      font-size: 0.8125rem;
      color: #0f172a;
    }

    .toggle-text span {
      font-size: 0.6875rem;
      color: #64748b;
    }

    .switch {
      position: relative;
      display: inline-block;
      width: 36px;
      height: 20px;
      flex-shrink: 0;
    }

    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #cbd5e1;
      transition: 0.2s;
    }

    .slider:before {
      position: absolute;
      content: "";
      height: 14px;
      width: 14px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: 0.2s;
    }

    input:checked + .slider {
      background-color: #dc2626;
    }

    input:checked + .slider:before {
      transform: translateX(16px);
    }

    .slider.round {
      border-radius: 20px;
    }

    .slider.round:before {
      border-radius: 50%;
    }

    .fine-inputs-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
      background: #fff7ed;
      border: 1px solid #ffedd5;
      border-radius: 0.5rem;
    }

    .form-row-dual {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    @media (max-width: 640px) {
      .form-row-dual {
        grid-template-columns: 1fr;
      }
    }

    .card-footer-actions {
      margin-top: 0.5rem;
    }

    .cms-loading-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 3rem;
      text-align: center;
      color: #64748b;
    }

    .cms-loading-card span {
      font-size: 2.5rem;
      color: #0050e5;
      margin-bottom: 0.5rem;
    }
  `]
})
export class WorkforceDutyDetailComponent implements OnInit {
  shiftId = '';
  shift: any = null;
  isLoading = false;
  isSaving = false;

  // Form State
  dutyStatus = 'Completed';
  reportContent = '';

  // Fine State
  fineAttached = false;
  fineAmount: number | null = null;
  fineReasonPreset = '';
  fineReason = '';
  fineAuthorizedBy = '';
  fineStatus = 'Applied';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private workforceService: WorkforceService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      if (params['id']) {
        this.shiftId = params['id'];
        this.loadShiftReport();
      }
    });
  }

  loadShiftReport(): void {
    this.isLoading = true;
    this.workforceService.getShiftReport(this.shiftId).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        const data = res?.data || res;
        if (!data) return;

        this.shift = data;
        this.dutyStatus = data.status || 'Completed';
        this.reportContent = data.reportContent || '';

        this.fineAttached = !!data.fineAttached;
        this.fineAmount = data.fineAmount;
        this.fineReason = data.fineReason || '';
        this.fineAuthorizedBy = data.fineAuthorizedBy || '';
        this.fineStatus = data.fineStatus || 'Applied';

        // Check if preset matches
        const presets = [
          'Late check-in > 30 mins',
          'Uniform / ID Badge violation',
          'Abandoned post before handover',
          'Sleeping / inattention on duty',
          'Failure to submit occurrence report',
          'Out of geofence bounds violation'
        ];
        if (presets.includes(this.fineReason)) {
          this.fineReasonPreset = this.fineReason;
        } else if (this.fineReason) {
          this.fineReasonPreset = 'Custom';
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.toast.error(err?.error?.message || 'Failed to load duty report.');
      }
    });
  }

  onPresetChange(): void {
    if (this.fineReasonPreset && this.fineReasonPreset !== 'Custom') {
      this.fineReason = this.fineReasonPreset;
    }
  }

  saveReportAndFines(): void {
    if (this.fineAttached && (!this.fineAmount || this.fineAmount <= 0)) {
      this.toast.error('Please enter a valid fine amount greater than zero.');
      return;
    }

    if (this.fineAttached && !this.fineReason) {
      this.toast.error('Please specify a violation reason for the attached fine.');
      return;
    }

    this.isSaving = true;

    const payload = {
      reportContent: this.reportContent,
      dutyStatus: this.dutyStatus,
      fineAttached: this.fineAttached,
      fineAmount: this.fineAttached ? this.fineAmount : null,
      fineReason: this.fineAttached ? (this.fineReasonPreset === 'Custom' ? this.fineReason : (this.fineReasonPreset || this.fineReason)) : null,
      fineAuthorizedBy: this.fineAuthorizedBy,
      fineStatus: this.fineAttached ? this.fineStatus : null
    };

    this.workforceService.submitShiftReport(this.shiftId, payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.toast.success('Duty report and fine records saved successfully.');
        // Refresh shift state
        this.loadShiftReport();
      },
      error: (err) => {
        this.isSaving = false;
        this.toast.error(err?.error?.message || 'Failed to save duty report.');
      }
    });
  }

  goBack(): void {
    if (this.shift?.clientSiteId) {
      this.router.navigate(['/workforce/console/sites', this.shift.clientSiteId, 'activity']);
    } else {
      this.router.navigate(['/workforce/console/sites']);
    }
  }

  getStatusClass(s: any): string {
    if (!s) return 'status-scheduled';
    if (s.isFlagged || s.fineAttached) return 'status-flagged';
    if (s.status === 'Completed') return 'status-completed';
    if (s.status === 'InProgress') return 'status-in-progress';
    return 'status-scheduled';
  }

  getInitials(name: string): string {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
}
