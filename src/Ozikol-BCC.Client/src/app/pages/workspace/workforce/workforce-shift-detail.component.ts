import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { WorkforceService, Shift } from '../../../core/services/workforce.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Dedicated operational page for inspecting shift duty details, venue instructions,
 * attendance status, submitting duty activity reports, and triggering emergency protocols.
 */
@Component({
  selector: 'app-workforce-shift-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="shift-detail-page">
      <!-- Top Action & Navigation Bar -->
      <div class="top-nav-bar">
        <a routerLink="/workforce/workspace/my-shifts" [queryParams]="{ tab: 'shifts' }" class="back-link">
          <span class="material-symbols-outlined">arrow_back</span>
          <span>Back to My Schedule &amp; Rota</span>
        </a>

        <div class="top-actions">
          <button type="button" class="btn btn-outline btn-sm d-inline-flex align-items-center gap-1" (click)="loadShiftDetails()">
            <span class="material-symbols-outlined" [class.spin]="isLoading">refresh</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-state-card" *ngIf="isLoading">
        <div class="spinner-circle"></div>
        <p>Loading shift duty specifications &amp; venue directives...</p>
      </div>

      <!-- Error State -->
      <div class="error-state-card" *ngIf="!isLoading && errorMessage">
        <span class="material-symbols-outlined error-icon">error</span>
        <h3>Shift Information Unavailable</h3>
        <p>{{ errorMessage }}</p>
        <a routerLink="/workforce/workspace/my-shifts" class="btn btn-primary mt-3">Return to Schedule</a>
      </div>

      <!-- Shift Content View -->
      <div class="shift-content-container" *ngIf="!isLoading && shift">
        <!-- Hero Header -->
        <div class="shift-hero-header">
          <div class="hero-left">
            <div class="d-flex align-items-center gap-2 flex-wrap mb-1">
              <span class="shift-code-badge">{{ shift.shiftCode }}</span>
              <span class="status-pill status-active" *ngIf="isShiftActive(shift)">
                <span class="live-dot pulse"></span> ACTIVE ON DUTY
              </span>
              <span class="status-pill status-upcoming" *ngIf="!isShiftActive(shift) && isShiftUpcoming(shift)">
                UPCOMING SCHEDULED
              </span>
              <span class="status-pill status-completed" *ngIf="isShiftCompleted(shift)">
                COMPLETED
              </span>
              <span class="badge-chip chip-overnight" *ngIf="shift.isOvernight">24/7 Overnight</span>
            </div>

            <h1 class="shift-title">{{ shift.facilityName || shift.siteName }}</h1>
            <p class="shift-subtitle">
              <span class="material-symbols-outlined">place</span>
              <span>{{ shift.address || shift.siteAddress }} <strong *ngIf="shift.postCode">({{ shift.postCode }})</strong></span>
            </p>
          </div>

          <!-- Quick Actions on Header -->
          <div class="hero-right">
            <!-- Clock In (if today and not clocked in) -->
            <a
              routerLink="/attendance/workspace/clock"
              [queryParams]="{ shiftId: shift.id }"
              class="btn btn-primary d-inline-flex align-items-center gap-1"
              *ngIf="(isToday(shift) || isShiftActive(shift)) && !isShiftCompleted(shift)"
            >
              <span class="material-symbols-outlined">fingerprint</span>
              <span>{{ isShiftActive(shift) ? 'Live Duty Clock-Out' : 'Duty Clock-In' }}</span>
            </a>

            <!-- Accept / Acknowledge -->
            <button
              type="button"
              class="btn btn-success d-inline-flex align-items-center gap-1"
              *ngIf="!shift.isConfirmedByGuard && shift.status !== 'ClaimPending'"
              (click)="confirmShift()"
              [disabled]="isActionLoading"
            >
              <span class="material-symbols-outlined">check_circle</span>
              <span>{{ shift.assignmentMode === 'Mandatory' ? 'Acknowledge Assignment' : 'Accept Shift' }}</span>
            </button>
          </div>
        </div>

        <!-- Operational Status Banner -->
        <div class="duty-banner-card banner-active" *ngIf="isShiftActive(shift)">
          <div class="banner-icon-box">
            <span class="material-symbols-outlined">sensors</span>
          </div>
          <div class="banner-body">
            <h4>Live Duty Session in Progress</h4>
            <p>You are actively clocked in for this shift. GPS location telemetry, guard welfare checks, and occurrence logging are operational.</p>
            <div class="banner-telemetry-strip" *ngIf="shift.clockInUtc">
              <span><strong>Clock-In Time:</strong> {{ shift.clockInUtc | date:'HH:mm:ss (d MMM yyyy)' }}</span>
            </div>
          </div>
        </div>

        <div class="duty-banner-card banner-upcoming" *ngIf="!isShiftActive(shift) && isShiftUpcoming(shift)">
          <div class="banner-icon-box">
            <span class="material-symbols-outlined">event</span>
          </div>
          <div class="banner-body">
            <h4>Scheduled Roster Duty</h4>
            <p>This shift is scheduled for {{ shift.startsAtUtc | date:'EEEE, d MMMM yyyy' }} from {{ shift.startsAtUtc | date:'HH:mm' }} to {{ shift.endsAtUtc | date:'HH:mm' }}.</p>
          </div>
        </div>

        <div class="duty-banner-card banner-completed" *ngIf="isShiftCompleted(shift)">
          <div class="banner-icon-box">
            <span class="material-symbols-outlined">task_alt</span>
          </div>
          <div class="banner-body">
            <h4>Shift Completed &amp; Archived</h4>
            <p>This assignment has concluded. Recorded duty hours have been compiled for payroll timesheet approval.</p>
            <div class="banner-telemetry-strip" *ngIf="shift.clockInUtc || shift.clockOutUtc">
              <span *ngIf="shift.clockInUtc"><strong>In:</strong> {{ shift.clockInUtc | date:'HH:mm' }}</span>
              <span *ngIf="shift.clockOutUtc">&bull; <strong>Out:</strong> {{ shift.clockOutUtc | date:'HH:mm' }}</span>
              <span *ngIf="shift.actualDurationHours">&bull; <strong>Duration:</strong> {{ shift.actualDurationHours }} hrs</span>
            </div>
          </div>
        </div>

        <!-- 4-Column Key Metrics Grid -->
        <div class="kpi-specs-grid mt-4">
          <div class="kpi-card">
            <span class="kpi-label">Assigned Post</span>
            <strong class="kpi-value text-primary">{{ shift.postName }}</strong>
            <span class="kpi-sub">{{ shift.requiredWorkspaceStationName || 'General Security Deployment' }}</span>
          </div>

          <div class="kpi-card">
            <span class="kpi-label">Duty Window</span>
            <strong class="kpi-value">{{ shift.startsAtUtc | date:'HH:mm' }} &ndash; {{ shift.endsAtUtc | date:'HH:mm' }}</strong>
            <span class="kpi-sub">{{ shift.plannedDurationHours }} Planned Hours &bull; {{ shift.breakMinutes }}m Break</span>
          </div>

          <div class="kpi-card">
            <span class="kpi-label">Agreed Pay Rate</span>
            <strong class="kpi-value val-rate">{{ shift.hourlyPayRate ? (currencySymbol + shift.hourlyPayRate + '/hr') : (currencySymbol + '10.00/hr') }}</strong>
            <span class="kpi-sub">Est. Gross: {{ currencySymbol }}{{ ((shift.hourlyPayRate || 10) * shift.plannedDurationHours).toFixed(2) }}</span>
          </div>

          <div class="kpi-card">
            <span class="kpi-label">Confirmation State</span>
            <strong class="kpi-value" [class.text-success]="shift.isConfirmedByGuard" [class.text-warning]="!shift.isConfirmedByGuard">
              {{ shift.isConfirmedByGuard ? 'Confirmed by Officer' : 'Awaiting Confirmation' }}
            </strong>
            <span class="kpi-sub">{{ shift.isConfirmedByGuard ? ('Confirmed at ' + (shift.confirmedAtUtc | date:'d MMM, HH:mm')) : 'Action required' }}</span>
          </div>
        </div>

        <!-- Main Grid: Left Details + Right Actions & Report -->
        <div class="details-layout-grid mt-4">
          <!-- LEFT COLUMN: Venue Details & Site Directives -->
          <div class="layout-main">
            <!-- Venue & Access Directives Card -->
            <div class="card-section">
              <div class="cs-header">
                <span class="material-symbols-outlined text-primary">location_city</span>
                <h3>Venue &amp; Deployment Instructions</h3>
              </div>
              <div class="cs-body">
                <div class="info-row">
                  <span class="info-label">Facility / Site:</span>
                  <span class="info-val font-semibold">{{ shift.facilityName || shift.siteName }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Address:</span>
                  <span class="info-val">{{ shift.address || shift.siteAddress }} <strong *ngIf="shift.postCode">({{ shift.postCode }})</strong></span>
                </div>
                <div class="info-row" *ngIf="shift.emergencyContactPhone">
                  <span class="info-label">Site Contact Phone:</span>
                  <span class="info-val">
                    <a [href]="'tel:' + shift.emergencyContactPhone" class="text-primary font-semibold">
                      {{ shift.emergencyContactPhone }}
                    </a>
                  </span>
                </div>

                <!-- Google Maps Directions Link -->
                <div class="mt-3">
                  <a
                    [href]="getDirectionsUrl()"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn btn-outline btn-sm d-inline-flex align-items-center gap-1"
                  >
                    <span class="material-symbols-outlined text-primary">directions</span>
                    <span>Get Directions in Google Maps</span>
                  </a>
                </div>
              </div>
            </div>

            <!-- Site Orders & Post Briefing Notes -->
            <div class="card-section mt-4">
              <div class="cs-header">
                <span class="material-symbols-outlined text-primary">menu_book</span>
                <h3>Site Orders &amp; Post Briefing Notes</h3>
              </div>
              <div class="cs-body">
                <div *ngIf="shift.siteAssignmentInstructions || shift.notes" class="briefing-box">
                  <p class="briefing-text">{{ shift.siteAssignmentInstructions || shift.notes }}</p>
                </div>

                <div *ngIf="!shift.siteAssignmentInstructions && !shift.notes" class="empty-briefing">
                  <span class="material-symbols-outlined text-muted">description</span>
                  <p>Standard site orders apply. Adhere to baseline security post procedures, access control protocols, and routine patrol schedules.</p>
                </div>
              </div>
            </div>

            <!-- Shift Duty Activity Report (Occurrence Log) -->
            <div class="card-section mt-4">
              <div class="cs-header d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-center gap-2">
                  <span class="material-symbols-outlined text-primary">assignment</span>
                  <h3>Shift Duty Activity Report</h3>
                </div>
                <span class="badge-chip chip-saved" *ngIf="shift.reportSubmissionUtc">
                  Submitted {{ shift.reportSubmissionUtc | date:'HH:mm (d MMM)' }}
                </span>
              </div>
              <div class="cs-body">
                <p class="text-muted small mb-2">
                  Log your routine patrol checkpoints, incident observations, visitor access logs, and handover remarks for supervisor review.
                </p>

                <div class="form-group">
                  <textarea
                    class="form-control"
                    rows="6"
                    [(ngModel)]="reportContent"
                    placeholder="e.g. 08:00 - Commenced post duty. Perimeter gates inspected and secured. 12:30 - Relief officer attended for 30m meal break. Handover completed smoothly."
                  ></textarea>
                </div>

                <div class="d-flex justify-content-end mt-2">
                  <button
                    type="button"
                    class="btn btn-primary d-inline-flex align-items-center gap-1"
                    (click)="submitDutyReport()"
                    [disabled]="isSubmittingReport || !reportContent.trim()"
                  >
                    <span class="material-symbols-outlined" *ngIf="!isSubmittingReport">check_circle</span>
                    <span class="material-symbols-outlined spin" *ngIf="isSubmittingReport">sync</span>
                    <span>{{ isSubmittingReport ? 'Submitting...' : 'Save Duty Report' }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- RIGHT COLUMN: Protocols & Emergency Controls -->
          <div class="layout-side">
            <!-- Shift Actions Card -->
            <div class="card-section">
              <div class="cs-header">
                <span class="material-symbols-outlined text-primary">tune</span>
                <h3>Operational Actions</h3>
              </div>
              <div class="cs-body d-flex flex-column gap-2">
                <!-- Clock In / Out Button -->
                <a
                  routerLink="/attendance/workspace/clock"
                  [queryParams]="{ shiftId: shift.id }"
                  class="btn btn-primary w-100 d-inline-flex align-items-center justify-content-center gap-1"
                  *ngIf="(isToday(shift) || isShiftActive(shift)) && !isShiftCompleted(shift)"
                >
                  <span class="material-symbols-outlined">fingerprint</span>
                  <span>{{ isShiftActive(shift) ? 'Live Duty Clock-Out' : 'Duty Clock-In' }}</span>
                </a>

                <!-- Request Swap (Upcoming) -->
                <button
                  type="button"
                  class="btn btn-outline w-100 d-inline-flex align-items-center justify-content-center gap-1"
                  *ngIf="isShiftUpcoming(shift) && shift.status !== 'SwapOffered'"
                  (click)="showSwapModal = true"
                >
                  <span class="material-symbols-outlined">swap_horiz</span>
                  <span>Request Shift Swap</span>
                </button>

                <div class="alert alert-info text-center p-2 mb-0" *ngIf="shift.status === 'SwapOffered'">
                  <span class="material-symbols-outlined" style="font-size: 16px; vertical-align: middle;">hourglass_top</span>
                  <span class="small ms-1">Swap request active awaiting peer cover.</span>
                </div>
              </div>
            </div>

            <!-- Emergency SOS Panic Protocol (Active Shifts Only) -->
            <div class="card-section emergency-card mt-4" *ngIf="isShiftActive(shift)">
              <div class="cs-header emergency-header">
                <div class="d-flex align-items-center gap-2">
                  <span class="material-symbols-outlined text-danger pulse-icon">e911</span>
                  <h3 class="text-danger">EMERGENCY SOS</h3>
                </div>
              </div>
              <div class="cs-body">
                <p class="emergency-desc">
                  Immediately alerts duty dispatchers, incident commanders, and emergency administrators across Web Push, SMS, and WhatsApp with your live GPS location.
                </p>

                <div class="emergency-btn-wrapper mt-3">
                  <button
                    type="button"
                    class="btn btn-danger w-100 py-3 d-inline-flex align-items-center justify-content-center gap-2"
                    (click)="triggerEmergencySos()"
                    [disabled]="isTriggeringSos"
                  >
                    <span class="material-symbols-outlined" *ngIf="!isTriggeringSos">warning</span>
                    <span class="material-symbols-outlined spin" *ngIf="isTriggeringSos">sync</span>
                    <span class="fw-bold">TRIGGER EMERGENCY SOS</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      box-sizing: border-box;
    }
    .shift-detail-page {
      padding: 20px 28px 48px 28px;
      max-width: 1320px;
      margin: 0 auto;
    }
    .top-nav-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #0050e5;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      transition: color 0.15s ease;
    }
    .back-link:hover {
      color: #003bb5;
      text-decoration: underline;
    }

    /* Hero Header */
    .shift-hero-header {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 22px 26px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .shift-title {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      margin: 6px 0 4px 0;
    }
    .shift-subtitle {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13.5px;
      color: #64748b;
      margin: 0;
    }
    .shift-subtitle .material-symbols-outlined { font-size: 18px; color: #94a3b8; }
    .hero-right {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }

    .shift-code-badge {
      background: #f1f5f9;
      color: #475569;
      padding: 3px 8px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 11.5px;
      font-weight: 700;
    }
    .chip-overnight {
      background: #312e81;
      color: #ffffff;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }

    /* Status Pills */
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 11.5px;
      font-weight: 700;
    }
    .status-active { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
    .status-upcoming { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
    .status-completed { background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; }

    .live-dot.pulse {
      display: inline-block;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #16a34a;
      box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.7);
      animation: pulse-dot 1.8s infinite;
    }
    @keyframes pulse-dot {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(22, 163, 74, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
    }

    /* Duty Banner Card */
    .duty-banner-card {
      margin-top: 20px;
      border-radius: 10px;
      padding: 16px 20px;
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }
    .duty-banner-card h4 { margin: 0 0 4px 0; font-size: 15px; font-weight: 700; }
    .duty-banner-card p { margin: 0; font-size: 13px; line-height: 1.4; }
    .banner-icon-box {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .banner-icon-box .material-symbols-outlined { font-size: 24px; }

    .banner-active { background: #f0fdf4; border: 1px solid #86efac; color: #14532d; }
    .banner-active .banner-icon-box { background: #dcfce7; color: #15803d; }
    .banner-upcoming { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e3a8a; }
    .banner-upcoming .banner-icon-box { background: #dbeafe; color: #1d4ed8; }
    .banner-completed { background: #f8fafc; border: 1px solid #e2e8f0; color: #334155; }
    .banner-completed .banner-icon-box { background: #e2e8f0; color: #475569; }

    .banner-telemetry-strip {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px dashed rgba(0,0,0,0.1);
      font-size: 12px;
    }

    /* KPI Specs Grid */
    .kpi-specs-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }
    .kpi-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .kpi-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
    .kpi-value { font-size: 16px; font-weight: 800; color: #0f172a; }
    .kpi-sub { font-size: 12px; color: #64748b; }
    .val-rate { color: #0050e5; }

    /* Layout Main vs Side */
    .details-layout-grid {
      display: grid;
      grid-template-columns: 1fr 340px;
      gap: 20px;
      align-items: start;
    }
    .card-section {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px 24px;
    }
    .cs-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #f1f5f9;
    }
    .cs-header h3 { font-size: 16px; font-weight: 700; color: #0f172a; margin: 0; }
    .cs-header .material-symbols-outlined { font-size: 20px; }

    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #f8fafc;
      font-size: 13.5px;
    }
    .info-label { color: #64748b; }
    .info-val { color: #0f172a; }

    .briefing-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px 18px;
    }
    .briefing-text { font-size: 13.5px; color: #334155; line-height: 1.6; margin: 0; white-space: pre-wrap; }
    .empty-briefing {
      text-align: center;
      padding: 20px;
      color: #64748b;
      font-size: 13px;
    }
    .empty-briefing .material-symbols-outlined { font-size: 32px; display: block; margin-bottom: 6px; }

    .chip-saved {
      background: #dcfce7;
      color: #15803d;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }

    /* Emergency Card */
    .emergency-card {
      border: 1.5px solid #ef4444;
      background: #fef2f2;
    }
    .emergency-desc {
      font-size: 12.5px;
      color: #991b1b;
      line-height: 1.5;
      margin: 0;
    }

    /* Loading / Error */
    .loading-state-card, .error-state-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 60px 20px;
      text-align: center;
    }
    .spinner-circle {
      width: 36px;
      height: 36px;
      border: 3px solid #e2e8f0;
      border-top-color: #0050e5;
      border-radius: 50%;
      margin: 0 auto 16px auto;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 992px) {
      .details-layout-grid { grid-template-columns: 1fr; }
      .kpi-specs-grid { grid-template-columns: repeat(2, 1fr); }
      .shift-hero-header { flex-direction: column; }
    }
    @media (max-width: 600px) {
      .kpi-specs-grid { grid-template-columns: 1fr; }
      .shift-detail-page { padding: 16px 12px; }
    }
  `]
})
export class WorkforceShiftDetailComponent implements OnInit, OnDestroy {
  shiftId: string = '';
  shift: Shift | null = null;
  isLoading: boolean = true;
  errorMessage: string = '';
  currencySymbol: string = '£';

  reportContent: string = '';
  isSubmittingReport: boolean = false;
  isActionLoading: boolean = false;
  isTriggeringSos: boolean = false;
  showSwapModal: boolean = false;

  private routeSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private workforceService: WorkforceService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.routeSub = this.route.params.subscribe(params => {
      this.shiftId = params['id'];
      if (this.shiftId) {
        this.loadShiftDetails();
      } else {
        this.isLoading = false;
        this.errorMessage = 'No shift ID specified.';
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  loadShiftDetails(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.workforceService.getShift(this.shiftId).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        const data = res?.data || res;
        if (data) {
          this.shift = data;
          this.reportContent = this.shift?.reportContent || '';
        } else {
          this.errorMessage = 'Shift records could not be found.';
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Failed to retrieve shift specifications.';
      }
    });
  }

  isShiftActive(s: Shift | null): boolean {
    if (!s) return false;
    return !!(s.isClockedIn || s.status === 'InProgress' || s.status === 'Active');
  }

  isShiftCompleted(s: Shift | null): boolean {
    if (!s) return false;
    if (s.isClockedOut || s.status === 'Completed' || s.status === 'Done') return true;
    const end = new Date(s.endsAtUtc).getTime();
    return !isNaN(end) && end < Date.now() && !s.isClockedIn;
  }

  isShiftUpcoming(s: Shift | null): boolean {
    if (!s) return false;
    return !this.isShiftActive(s) && !this.isShiftCompleted(s);
  }

  isToday(s: Shift | null): boolean {
    if (!s?.startsAtUtc) return false;
    const start = new Date(s.startsAtUtc);
    const now = new Date();
    return start.toDateString() === now.toDateString();
  }

  getDirectionsUrl(): string {
    if (!this.shift) return '#';
    const destination = encodeURIComponent(
      (this.shift.address || this.shift.siteAddress || this.shift.facilityName || this.shift.siteName) +
      (this.shift.postCode ? ` ${this.shift.postCode}` : '')
    );
    return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  }

  confirmShift(): void {
    if (!this.shift) return;
    this.isActionLoading = true;
    this.workforceService.confirmShift(this.shift.id).subscribe({
      next: () => {
        this.isActionLoading = false;
        if (this.shift) {
          this.shift.isConfirmedByGuard = true;
          this.shift.confirmedAtUtc = new Date().toISOString();
        }
        this.toast.success('Shift assignment confirmed successfully.');
      },
      error: (err: any) => {
        this.isActionLoading = false;
        this.toast.error(err?.error?.message || 'Failed to confirm shift.');
      }
    });
  }

  submitDutyReport(): void {
    if (!this.shift || !this.reportContent.trim()) return;
    this.isSubmittingReport = true;

    this.workforceService.submitShiftDutyReport(this.shift.id, {
      reportContent: this.reportContent.trim()
    }).subscribe({
      next: () => {
        this.isSubmittingReport = false;
        if (this.shift) {
          this.shift.reportContent = this.reportContent.trim();
          this.shift.reportSubmissionUtc = new Date().toISOString();
        }
        this.toast.success('Duty activity report submitted successfully.');
      },
      error: (err: any) => {
        this.isSubmittingReport = false;
        this.toast.error(err?.error?.message || 'Failed to save duty report.');
      }
    });
  }

  triggerEmergencySos(): void {
    if (!this.shift) return;
    if (!confirm('Engage immediate Emergency SOS security alert? Duty controllers and administrators will be alerted immediately.')) {
      return;
    }

    this.isTriggeringSos = true;
    this.workforceService.triggerEmergencySos(this.shift.id, {
      categoryId: 'urgent_security',
      categoryTitle: 'Immediate Operational Assistance',
      description: 'Emergency SOS initiated from Shift Duty Details page.'
    }).subscribe({
      next: () => {
        this.isTriggeringSos = false;
        this.toast.success('Emergency SOS panic alert broadcasted successfully.');
      },
      error: (err: any) => {
        this.isTriggeringSos = false;
        this.toast.error(err?.error?.message || 'Failed to broadcast emergency SOS alert.');
      }
    });
  }
}
