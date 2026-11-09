import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { WorkforceService } from '../../../core/services/workforce.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Administrator Graphical Analytics & Workforce Roster Dashboard (`/workforce/console/analytics`).
 * High-fidelity executive cockpit displaying KPI metrics, venue labor spend breakdowns,
 * attendance compliance distribution, and interactive staff directory with rating scorecards.
 */
@Component({
  selector: 'app-workforce-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="bcp-page-container">
      <!-- 1. Canonical Page Header -->
      <div class="page-header">
        <div class="header-left">
          <div class="breadcrumb">
            <a routerLink="/admin/dashboard">Command Center</a>
            <span class="sep">/</span>
            <span>Workforce &amp; Shifts</span>
            <span class="sep">/</span>
            <span class="current">Staff Rota &amp; Analytics</span>
          </div>
          <div class="title-row">
            <h1>Workforce Analytics &amp; Staff Directory</h1>
            <button type="button" class="info-trigger-btn" (click)="showInfoModal = true" title="Workforce Intelligence Guide">
              <span class="material-symbols-outlined">info</span>
            </button>
            <span class="badge-suite">Suite: Workforce &amp; Shifts</span>
          </div>
          <p class="subtitle">Graphical fulfillment trends, labor spend, punctuality ratings, and staff roster management.</p>
        </div>
        <div class="header-actions">
          <button type="button" class="btn btn-outline" (click)="loadAll()">
            <span class="material-symbols-outlined" [class.spin]="isLoading">refresh</span>
            <span>Refresh</span>
          </button>
          <button type="button" class="btn btn-primary" (click)="showEnrollModal = true">
            <span class="material-symbols-outlined">person_add</span>
            <span>Enroll Member</span>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-state-card" *ngIf="isLoading && !analytics">
        <div class="spinner-ring"></div>
        <p>Loading workforce analytics and roster intelligence...</p>
      </div>

      <!-- Main Content -->
      <ng-container *ngIf="!isLoading || analytics">
        <!-- 2. Five Comprehensive Smart Metric Cards (Clickable) -->
        <div class="metrics-grid">
          <!-- Card 1: Shift Fulfillment Rate -->
          <div
            class="metric-card clickable"
            (click)="navigateTo('/workforce/console/schedule')"
            title="Click to view and schedule shifts in Rota Calendar"
          >
            <div class="card-top">
              <div class="card-icon bg-blue">
                <span class="material-symbols-outlined">event_available</span>
              </div>
              <span class="card-chip chip-blue">
                {{ (analytics?.totalShiftsCount || 0) > 0 ? 'Target 95%' : 'No Shifts' }}
              </span>
            </div>
            <div class="card-value">
              {{ (analytics?.totalShiftsCount || 0) > 0 ? (analytics?.shiftFulfillmentRatePercent || 0) + '%' : '0%' }}
            </div>
            <div class="card-label">Shift Fulfillment Rate</div>
            <div class="card-progress-track">
              <div
                class="card-progress-bar bg-blue"
                [style.width.%]="(analytics?.totalShiftsCount || 0) > 0 ? (analytics?.shiftFulfillmentRatePercent || 0) : 0"
              ></div>
            </div>
            <div class="card-sub-info">
              <span>
                {{ (analytics?.totalShiftsCount || 0) > 0
                    ? (analytics?.totalShiftsCount - analytics?.openShiftsCount) + ' of ' + analytics?.totalShiftsCount + ' staffed'
                    : 'No planned shifts recorded' }}
              </span>
            </div>
          </div>

          <!-- Card 2: Punctuality Score -->
          <div
            class="metric-card clickable"
            (click)="navigateTo('/attendance/console/live')"
            title="Click to view live duty attendance and clock-in logs"
          >
            <div class="card-top">
              <div class="card-icon bg-green">
                <span class="material-symbols-outlined">schedule</span>
              </div>
              <span class="card-chip chip-teal">
                {{ (analytics?.completedShiftsCount || 0) > 0 ? 'On-Time Ratio' : 'No Check-Ins' }}
              </span>
            </div>
            <div class="card-value">
              {{ (analytics?.completedShiftsCount || 0) > 0 ? (analytics?.overallPunctualityPercent || 0) + '%' : '0%' }}
            </div>
            <div class="card-label">Overall Punctuality Score</div>
            <div class="card-progress-track">
              <div
                class="card-progress-bar bg-green"
                [style.width.%]="(analytics?.completedShiftsCount || 0) > 0 ? (analytics?.overallPunctualityPercent || 0) : 0"
              ></div>
            </div>
            <div class="card-sub-info">
              <span>
                {{ (analytics?.completedShiftsCount || 0) > 0
                    ? 'Clock-ins within grace window'
                    : 'No verified check-ins recorded' }}
              </span>
            </div>
          </div>

          <!-- Card 3: Active Duty Strength -->
          <div
            class="metric-card clickable"
            (click)="navigateTo('/attendance/console/live')"
            title="Click to view guards active on site now"
          >
            <div class="card-top">
              <div class="card-icon bg-teal">
                <span class="material-symbols-outlined">security</span>
              </div>
              <span class="card-chip chip-teal live-chip">
                <span class="live-dot"></span> Live Duty
              </span>
            </div>
            <div class="card-value">{{ analytics?.activeOnDutyCount ?? 0 }}</div>
            <div class="card-label">Guards On Duty Now</div>
            <div class="card-sub-info mt-auto">
              <strong>{{ analytics?.completedShiftsCount ?? 0 }}</strong> shifts fulfilled (30d)
            </div>
          </div>

          <!-- Card 4: Gross Labor Spend -->
          <div
            class="metric-card clickable"
            (click)="navigateTo('/workforce/console/schedule')"
            title="Click to review shift hours, timesheets, and pay rates"
          >
            <div class="card-top">
              <div class="card-icon bg-amber">
                <span class="material-symbols-outlined">payments</span>
              </div>
              <span class="card-chip chip-amber">30-Day Period</span>
            </div>
            <div class="card-value">£{{ (analytics?.totalGrossLaborSpend ?? 0) | number:'1.2-2' }}</div>
            <div class="card-label">Gross Labor Spend</div>
            <div class="card-sub-info mt-auto">
              <strong>{{ (analytics?.totalWorkedHours ?? 0) | number:'1.1-1' }} hrs</strong> worked / {{ (analytics?.totalScheduledHours ?? 0) | number:'1.1-1' }} planned
            </div>
          </div>

          <!-- Card 5: Enrolled Talent Pool -->
          <div
            class="metric-card clickable"
            (click)="scrollToRoster()"
            title="Click to jump to Staff Directory & Roster"
          >
            <div class="card-top">
              <div class="card-icon bg-purple">
                <span class="material-symbols-outlined">groups</span>
              </div>
              <span class="card-chip chip-purple">Talent Pool</span>
            </div>
            <div class="card-value">{{ staffMembers.length }}</div>
            <div class="card-label">Enrolled Staff Members</div>
            <div class="card-sub-info mt-auto">
              <span class="text-teal">● Active duty profiles</span>
            </div>
          </div>
        </div>

        <!-- 3. Graphical Analytics Row: Venue Spend & Compliance Breakdown -->
        <div class="analytics-row">
          <!-- Client Venue Spend Breakdown (Clickable) -->
          <div
            class="analytics-card flex-3 clickable"
            (click)="navigateTo('/workforce/console/sites')"
            title="Click to manage operating client sites & geofences"
          >
            <div class="card-header-bar">
              <div>
                <h3>Labor Hours &amp; Spend by Client Venue</h3>
                <p class="card-sub">Shift deployment density and wage distribution across operating customer sites.</p>
              </div>
              <span class="counter-pill" *ngIf="analytics?.siteBreakdowns?.length">
                {{ analytics.siteBreakdowns.length }} Active Sites
              </span>
            </div>

            <div class="venue-bars-list" *ngIf="analytics?.siteBreakdowns?.length">
              <div class="venue-bar-item" *ngFor="let site of analytics.siteBreakdowns">
                <div class="venue-meta">
                  <div class="venue-title-row">
                    <span class="venue-name">{{ site.siteName }}</span>
                    <span class="venue-stats">
                      <strong>{{ site.totalHours | number:'1.1-1' }} hrs</strong>
                      <span class="bullet">&bull;</span>
                      {{ site.shiftCount }} shifts
                      <span class="bullet">&bull;</span>
                      £{{ site.totalSpend | number:'1.2-2' }}
                    </span>
                  </div>
                </div>
                <div class="venue-track">
                  <div class="venue-fill" [style.width.%]="getSitePercent(site.totalHours)"></div>
                </div>
              </div>
            </div>

            <div class="venue-empty-state" *ngIf="!analytics?.siteBreakdowns?.length">
              <span class="material-symbols-outlined">location_city</span>
              <h4>No Site Duty Hours Recorded</h4>
              <p>Completed shifts will aggregate hours and labor spend here automatically.</p>
            </div>
          </div>

          <!-- Attendance Compliance Breakdown (Balanced 2x2 Grid & Clickable) -->
          <div class="analytics-card flex-2">
            <div class="card-header-bar">
              <div>
                <h3>Attendance Compliance</h3>
                <p class="card-sub">Real-time check-in adherence &amp; audit status.</p>
              </div>
            </div>

            <div class="compliance-cards-grid">
              <!-- On-Time Check-Ins (Clickable) -->
              <div
                class="compliance-metric-box box-green clickable"
                (click)="navigateTo('/attendance/console/live')"
                title="View on-time check-in logs in Live Duty Monitor"
              >
                <div class="compliance-box-top">
                  <span class="material-symbols-outlined">check_circle</span>
                  <span class="compliance-title">On-Time Check-In</span>
                </div>
                <div class="compliance-count">{{ analytics?.attendanceDistribution?.OnTime ?? 0 }}</div>
              </div>

              <!-- Late Arrivals (Clickable) -->
              <div
                class="compliance-metric-box box-amber clickable"
                (click)="navigateTo('/attendance/console/live')"
                title="View late arrivals in Live Duty Monitor"
              >
                <div class="compliance-box-top">
                  <span class="material-symbols-outlined">schedule</span>
                  <span class="compliance-title">Late Arrivals (&gt;5m)</span>
                </div>
                <div class="compliance-count">{{ analytics?.attendanceDistribution?.LateArrivals ?? 0 }}</div>
              </div>

              <!-- Geofence Violations (Clickable) -->
              <div
                class="compliance-metric-box box-rose clickable"
                (click)="navigateTo('/attendance/console/live')"
                title="View geofence violation alerts in Live Duty Monitor"
              >
                <div class="compliance-box-top">
                  <span class="material-symbols-outlined">wrong_location</span>
                  <span class="compliance-title">Geofence Violations</span>
                </div>
                <div class="compliance-count">{{ analytics?.attendanceDistribution?.GeofenceViolations ?? 0 }}</div>
              </div>

              <!-- No-Shows (Clickable) -->
              <div
                class="compliance-metric-box box-muted clickable"
                (click)="navigateTo('/workforce/console/schedule')"
                title="Inspect unassigned & absent shifts in Rota Schedule"
              >
                <div class="compliance-box-top">
                  <span class="material-symbols-outlined">person_off</span>
                  <span class="compliance-title">Unexcused No-Shows</span>
                </div>
                <div class="compliance-count">{{ analytics?.attendanceDistribution?.NoShows ?? 0 }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. Staff Directory & Performance Roster Table -->
        <div class="cms-card" id="staffRosterSection">
          <div class="table-toolbar">
            <div class="toolbar-left">
              <h3>Workforce Staff Roster &amp; Ratings</h3>
              <span class="count-badge">{{ filteredStaffMembers.length }} Staff Enrolled</span>
            </div>
            <div class="toolbar-right">
              <div class="search-input-box">
                <span class="material-symbols-outlined">search</span>
                <input
                  type="text"
                  [(ngModel)]="searchQuery"
                  placeholder="Search staff by name or email..."
                  class="search-input"
                />
                <button type="button" class="clear-search-btn" *ngIf="searchQuery" (click)="searchQuery = ''">
                  &times;
                </button>
              </div>
              <select class="filter-dropdown" [(ngModel)]="selectedRoleFilter">
                <option value="">All Job Titles</option>
                <option value="Security Guard">Security Guard</option>
                <option value="SIA Door Supervisor">SIA Door Supervisor</option>
                <option value="Event Steward">Event Steward</option>
                <option value="Care Assistant">Care Assistant</option>
                <option value="Healthcare Worker">Healthcare Worker</option>
                <option value="Operations Supervisor">Operations Supervisor</option>
              </select>
            </div>
          </div>

          <div class="table-responsive">
            <table class="cms-table">
              <thead>
                <tr>
                  <th>STAFF MEMBER</th>
                  <th>JOB TITLE</th>
                  <th>DEFAULT HOURLY RATE</th>
                  <th>COMPLETED SHIFTS</th>
                  <th>AVG RATING</th>
                  <th>PUNCTUALITY</th>
                  <th style="text-align: right;">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let m of filteredStaffMembers">
                  <td>
                    <div class="staff-user-cell">
                      <div class="avatar-circle">{{ getInitials(m.fullName) }}</div>
                      <div class="user-info">
                        <div class="user-name">{{ m.fullName }}</div>
                        <div class="user-email">{{ m.email }}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="job-title-pill">{{ m.jobTitle }}</span>
                  </td>
                  <td>
                    <span class="rate-text">
                      {{ m.defaultHourlyRate ? ('£' + (m.defaultHourlyRate | number:'1.2-2') + '/h') : 'Standard Rate' }}
                    </span>
                  </td>
                  <td>
                    <span class="shifts-count">{{ m.totalShiftsCompleted }}</span>
                  </td>
                  <td>
                    <div class="rating-display">
                      <span class="material-symbols-outlined star-icon">star</span>
                      <strong>{{ (m.averageRating || 5.0) | number:'1.1-1' }}</strong>
                      <span class="ratings-sub">({{ m.totalRatingsCount || 0 }})</span>
                    </div>
                  </td>
                  <td>
                    <span
                      class="punctuality-pill"
                      [class.good]="(m.punctualityScorePercent || 100) >= 90"
                      [class.warning]="(m.punctualityScorePercent || 100) < 90"
                    >
                      {{ (m.punctualityScorePercent || 100) | number:'1.0-0' }}% On-Time
                    </span>
                  </td>
                  <td style="text-align: right;">
                    <button type="button" class="btn-action-sm" (click)="openRateModal(m)">
                      <span class="material-symbols-outlined">rate_review</span>
                      <span>Rate Duty</span>
                    </button>
                  </td>
                </tr>
                <tr *ngIf="filteredStaffMembers.length === 0">
                  <td colspan="7" class="empty-cell">
                    <div class="empty-roster-box">
                      <span class="material-symbols-outlined">person_search</span>
                      <h4>No Workforce Members Found</h4>
                      <p *ngIf="searchQuery || selectedRoleFilter">No staff members match the selected filters. Clear your filters to see the full roster.</p>
                      <p *ngIf="!searchQuery && !selectedRoleFilter">No staff members enrolled yet. Click "Enroll Member" to send an onboarding invitation.</p>
                      <button type="button" class="btn btn-primary mt-2" (click)="showEnrollModal = true" *ngIf="!searchQuery && !selectedRoleFilter">
                        <span class="material-symbols-outlined">person_add</span>
                        <span>Enroll First Member</span>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </ng-container>

      <!-- 5. Enroll Member Modal -->
      <div class="modal-backdrop" *ngIf="showEnrollModal" (click)="showEnrollModal = false">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="material-symbols-outlined text-blue">person_add</span>
              <div>
                <h3>Enroll New Workforce Member</h3>
                <p class="modal-subtitle">Add a staff member to the rota and dispatch an onboarding invitation email.</p>
              </div>
            </div>
            <button type="button" class="btn-close" (click)="showEnrollModal = false">&times;</button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Full Name <span class="required">*</span></label>
              <input
                type="text"
                class="form-control"
                [(ngModel)]="newMember.fullName"
                placeholder="e.g. First Last"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Email Address <span class="required">*</span></label>
              <input
                type="email"
                class="form-control"
                [(ngModel)]="newMember.email"
                placeholder="name@company.com"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Designated Job Title <span class="required">*</span></label>
              <select class="form-control" [(ngModel)]="newMember.jobTitle">
                <option value="Security Guard">Security Guard</option>
                <option value="SIA Door Supervisor">SIA Door Supervisor</option>
                <option value="Event Steward">Event Steward</option>
                <option value="Care Assistant">Care Assistant</option>
                <option value="Healthcare Worker">Healthcare Worker</option>
                <option value="Operations Supervisor">Operations Supervisor</option>
              </select>
            </div>

            <div class="form-row-dual">
              <div class="form-group">
                <label class="form-label">Default Hourly Rate (£)</label>
                <input
                  type="number"
                  class="form-control"
                  [(ngModel)]="newMember.defaultHourlyRate"
                  placeholder="e.g. 15.00"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Contracted Hours / Week</label>
                <input
                  type="number"
                  class="form-control"
                  [(ngModel)]="newMember.contractedWeeklyHours"
                  placeholder="e.g. 40"
                />
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="showEnrollModal = false">Cancel</button>
            <button type="button" class="btn btn-primary" (click)="saveEnrollMember()" [disabled]="isSubmitting">
              <span class="material-symbols-outlined" *ngIf="!isSubmitting">send</span>
              <span>{{ isSubmitting ? 'Enrolling...' : 'Send Invitation & Enroll' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 6. Rate Member Modal -->
      <div class="modal-backdrop" *ngIf="showRateModal" (click)="showRateModal = false">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="material-symbols-outlined text-amber">rate_review</span>
              <div>
                <h3>Submit Duty Rating: {{ targetMember?.fullName }}</h3>
                <p class="modal-subtitle">Record supervisor scorecard and punctuality feedback for completed duty.</p>
              </div>
            </div>
            <button type="button" class="btn-close" (click)="showRateModal = false">&times;</button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Overall Performance Rating</label>
              <div class="star-rating-selector">
                <span
                  *ngFor="let star of [1,2,3,4,5]"
                  class="material-symbols-outlined star-select-icon"
                  [class.active]="star <= ratingForm.ratingStars"
                  (click)="ratingForm.ratingStars = star"
                >
                  {{ star <= ratingForm.ratingStars ? 'star' : 'star_border' }}
                </span>
                <span class="star-score-text">{{ ratingForm.ratingStars }} of 5 Stars</span>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Punctuality Score</label>
              <select class="form-control" [(ngModel)]="ratingForm.punctualityScore">
                <option [value]="5">5 - Arrived Early / Prompt</option>
                <option [value]="4">4 - On-Time (Within Grace)</option>
                <option [value]="3">3 - Slight Delay (5-10m)</option>
                <option [value]="2">2 - Moderately Late (10-20m)</option>
                <option [value]="1">1 - Severely Late / Poor</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Supervisory Feedback &amp; Notes</label>
              <textarea
                class="form-control"
                rows="3"
                [(ngModel)]="ratingForm.feedbackNotes"
                placeholder="Record qualitative performance feedback..."
              ></textarea>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="showRateModal = false">Cancel</button>
            <button type="button" class="btn btn-primary" (click)="saveRating()" [disabled]="isSubmitting">
              <span class="material-symbols-outlined" *ngIf="!isSubmitting">save</span>
              <span>{{ isSubmitting ? 'Saving...' : 'Submit Rating' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 7. Contextual Info Guide Modal (i) -->
      <div class="modal-backdrop" *ngIf="showInfoModal" (click)="showInfoModal = false">
        <div class="modal-card modal-large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="material-symbols-outlined text-blue">info</span>
              <div>
                <h3>Workforce Analytics &amp; Staff Intelligence Guide</h3>
                <p class="modal-subtitle">How shifts, attendance metrics, and compliance scorecards are computed.</p>
              </div>
            </div>
            <button type="button" class="btn-close" (click)="showInfoModal = false">&times;</button>
          </div>

          <div class="modal-body info-guide-body">
            <div class="info-guide-section">
              <h4><span class="material-symbols-outlined text-blue">monitoring</span> Real-Time Fulfillment &amp; Spend</h4>
              <p>
                <strong>Shift Fulfillment Rate:</strong> Evaluates the ratio between total planned shifts and fulfilled shifts. Maintains a 95% threshold for operational SLA compliance.
              </p>
              <p>
                <strong>Gross Labor Spend:</strong> Computes the real-time monetary liability based on confirmed clocked hours multiplied by each staff member's designated hourly rate.
              </p>
            </div>

            <div class="info-guide-section">
              <h4><span class="material-symbols-outlined text-green">verified</span> Punctuality &amp; Geofence Adherence</h4>
              <p>
                <strong>Clock-In Grace Period:</strong> Clock-ins within 5 minutes of designated shift start times are recognized as 100% on-time.
              </p>
              <p>
                <strong>Geofence Coordinates:</strong> Every attendance timestamp captures device latitude and longitude, validating physical proximity against the client site's arbitrary geofence perimeter.
              </p>
            </div>

            <div class="info-guide-section">
              <h4><span class="material-symbols-outlined text-purple">badge</span> Staff Performance Scorecards</h4>
              <p>
                Supervisors can record post-duty performance ratings (1 to 5 stars) alongside qualitative notes. Aggregate scores update live on the staff member's duty card.
              </p>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-primary" (click)="showInfoModal = false">Got it</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bcp-page-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
      padding: 0 4px 32px 4px;
    }

    /* Page Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      background: var(--md-sys-color-surface, #ffffff);
      padding: 24px 28px;
      border-radius: 16px;
      border: 1px solid var(--md-sys-color-outline, #e2e8f0);
      box-shadow: 0 4px 20px rgba(0,0,0,0.03);
    }
    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #64748b;
      margin-bottom: 6px;
    }
    .breadcrumb a {
      color: #0050e5;
      text-decoration: none;
      font-weight: 600;
    }
    .breadcrumb .sep {
      color: #cbd5e1;
    }
    .breadcrumb .current {
      color: #334155;
      font-weight: 600;
    }
    .title-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 4px;
      flex-wrap: wrap;
    }
    .title-row h1 {
      font-size: 26px;
      font-weight: 800;
      color: var(--md-sys-color-on-surface, #0f172a);
      margin: 0;
      letter-spacing: -0.5px;
    }
    .badge-suite {
      font-size: 11px;
      font-weight: 700;
      background: #eff6ff;
      color: #0050e5;
      padding: 3px 10px;
      border-radius: 20px;
      border: 1px solid #bfdbfe;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .info-trigger-btn {
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      color: #64748b;
      display: inline-flex;
      align-items: center;
      transition: color 0.2s;
    }
    .info-trigger-btn:hover {
      color: #0050e5;
    }
    .subtitle {
      color: #64748b;
      font-size: 14px;
      margin: 0;
    }
    .header-actions {
      display: flex;
      gap: 12px;
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s;
    }
    .btn-primary {
      background: #0050e5;
      color: #ffffff;
      border: 1px solid #0050e5;
    }
    .btn-primary:hover:not(:disabled) {
      background: #003ebd;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 80, 229, 0.25);
    }
    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .btn-outline {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #334155;
    }
    .btn-outline:hover {
      background: #f8fafc;
      border-color: #94a3b8;
    }
    .spin {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    /* Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 18px;
    }
    .metric-card {
      background: var(--md-sys-color-surface, #ffffff);
      border: 1px solid var(--md-sys-color-outline, #e2e8f0);
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.02);
      display: flex;
      flex-direction: column;
      transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
    }
    .metric-card.clickable {
      cursor: pointer;
    }
    .metric-card.clickable:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 25px rgba(0, 80, 229, 0.12);
      border-color: #0050e5;
    }
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .card-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
    }
    .bg-blue { background: linear-gradient(135deg, #0050e5, #3b82f6); }
    .bg-green { background: linear-gradient(135deg, #16a34a, #22c55e); }
    .bg-teal { background: linear-gradient(135deg, #0d9488, #14b8a6); }
    .bg-amber { background: linear-gradient(135deg, #d97706, #f59e0b); }
    .bg-purple { background: linear-gradient(135deg, #9333ea, #a855f7); }

    .card-chip {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .chip-blue { background: #eff6ff; color: #1d4ed8; }
    .chip-teal { background: #f0fdf4; color: #15803d; }
    .chip-amber { background: #fffbeb; color: #b45309; }
    .chip-purple { background: #faf5ff; color: #7e22ce; }
    .live-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .live-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #16a34a;
      display: inline-block;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
      100% { opacity: 1; transform: scale(1); }
    }

    .card-value {
      font-size: 28px;
      font-weight: 800;
      color: var(--md-sys-color-on-surface, #0f172a);
      line-height: 1.2;
    }
    .card-label {
      font-size: 13px;
      font-weight: 600;
      color: #64748b;
      margin-top: 2px;
      margin-bottom: 10px;
    }
    .card-progress-track {
      height: 6px;
      background: #f1f5f9;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 8px;
    }
    .card-progress-bar {
      height: 100%;
      border-radius: 4px;
      transition: width 0.4s ease;
    }
    .card-sub-info {
      font-size: 12px;
      color: #64748b;
    }

    /* Analytics Row */
    .analytics-row {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }
    .flex-3 { flex: 3 1 480px; }
    .flex-2 { flex: 2 1 340px; }

    .analytics-card {
      background: var(--md-sys-color-surface, #ffffff);
      border: 1px solid var(--md-sys-color-outline, #e2e8f0);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.02);
      display: flex;
      flex-direction: column;
      transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
    }
    .analytics-card.clickable {
      cursor: pointer;
    }
    .analytics-card.clickable:hover {
      border-color: #0050e5;
      box-shadow: 0 8px 24px rgba(0, 80, 229, 0.08);
      transform: translateY(-2px);
    }
    .card-header-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      gap: 12px;
    }
    .card-header-bar h3 {
      font-size: 17px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 4px 0;
    }
    .card-sub {
      font-size: 13px;
      color: #64748b;
      margin: 0;
    }
    .counter-pill {
      font-size: 12px;
      font-weight: 700;
      background: #f1f5f9;
      color: #334155;
      padding: 4px 12px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      white-space: nowrap;
    }

    /* Venue Bars */
    .venue-bars-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .venue-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
      font-size: 13px;
      flex-wrap: wrap;
      gap: 6px;
    }
    .venue-name {
      font-weight: 700;
      color: #1e293b;
    }
    .venue-stats {
      color: #64748b;
    }
    .venue-stats .bullet {
      margin: 0 4px;
      color: #cbd5e1;
    }
    .venue-track {
      height: 8px;
      background: #f1f5f9;
      border-radius: 4px;
      overflow: hidden;
    }
    .venue-fill {
      height: 100%;
      background: linear-gradient(90deg, #0050e5, #3b82f6);
      border-radius: 4px;
      transition: width 0.4s ease;
    }
    .venue-empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #94a3b8;
    }
    .venue-empty-state .material-symbols-outlined {
      font-size: 44px;
      color: #cbd5e1;
      margin-bottom: 8px;
    }
    .venue-empty-state h4 {
      font-size: 15px;
      font-weight: 700;
      color: #475569;
      margin: 0 0 4px 0;
    }
    .venue-empty-state p {
      font-size: 13px;
      color: #94a3b8;
      margin: 0;
    }

    /* Compliance Metric Boxes (Clean 2x2 Grid) */
    .compliance-cards-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    .compliance-metric-box {
      padding: 16px;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 10px;
      border: 1px solid transparent;
      transition: transform 0.2s, box-shadow 0.2s, filter 0.2s;
    }
    .compliance-metric-box.clickable {
      cursor: pointer;
    }
    .compliance-metric-box.clickable:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
      filter: brightness(0.97);
    }
    .compliance-box-top {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .compliance-box-top .material-symbols-outlined {
      font-size: 20px;
      flex-shrink: 0;
    }
    .compliance-title {
      font-size: 12px;
      font-weight: 700;
      line-height: 1.3;
    }
    .compliance-count {
      font-size: 26px;
      font-weight: 800;
    }
    .box-green {
      background: #f0fdf4;
      border-color: #bbf7d0;
      color: #166534;
    }
    .box-amber {
      background: #fffbeb;
      border-color: #fde68a;
      color: #92400e;
    }
    .box-rose {
      background: #fff1f2;
      border-color: #fecdd3;
      color: #9f1239;
    }
    .box-muted {
      background: #f8fafc;
      border-color: #e2e8f0;
      color: #475569;
    }

    /* CMS Card & Table */
    .cms-card {
      background: var(--md-sys-color-surface, #ffffff);
      border: 1px solid var(--md-sys-color-outline, #e2e8f0);
      border-radius: 16px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.02);
      overflow: hidden;
    }
    .table-toolbar {
      padding: 20px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      border-bottom: 1px solid #e2e8f0;
      flex-wrap: wrap;
    }
    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .toolbar-left h3 {
      font-size: 17px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }
    .count-badge {
      font-size: 12px;
      font-weight: 700;
      background: #eff6ff;
      color: #0050e5;
      padding: 3px 10px;
      border-radius: 12px;
      border: 1px solid #bfdbfe;
    }
    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .search-input-box {
      position: relative;
      display: flex;
      align-items: center;
    }
    .search-input-box .material-symbols-outlined {
      position: absolute;
      left: 12px;
      color: #94a3b8;
      font-size: 18px;
    }
    .search-input {
      padding: 8px 32px 8px 36px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13px;
      width: 240px;
      outline: none;
      transition: border-color 0.2s;
    }
    .search-input:focus {
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.1);
    }
    .clear-search-btn {
      position: absolute;
      right: 10px;
      background: none;
      border: none;
      font-size: 18px;
      color: #94a3b8;
      cursor: pointer;
    }
    .filter-dropdown {
      padding: 8px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13px;
      color: #334155;
      background: #ffffff;
      outline: none;
    }

    .table-responsive {
      overflow-x: auto;
    }
    .cms-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    .cms-table thead th {
      background: #f8fafc;
      padding: 14px 20px;
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      border-bottom: 1px solid #e2e8f0;
      white-space: nowrap;
    }
    .cms-table tbody tr {
      border-bottom: 1px solid #f1f5f9;
      transition: background 0.15s;
    }
    .cms-table tbody tr:hover {
      background: #f8fafc;
    }
    .cms-table tbody td {
      padding: 16px 20px;
      font-size: 13px;
      color: #334155;
      vertical-align: middle;
    }

    .staff-user-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .avatar-circle {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: #eff6ff;
      color: #0050e5;
      font-weight: 700;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #bfdbfe;
      flex-shrink: 0;
    }
    .user-name {
      font-weight: 700;
      color: #0f172a;
    }
    .user-email {
      font-size: 12px;
      color: #64748b;
    }
    .job-title-pill {
      display: inline-block;
      font-size: 12px;
      font-weight: 600;
      background: #f1f5f9;
      color: #0050e5;
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    .rate-text {
      font-weight: 600;
      color: #0f172a;
    }
    .shifts-count {
      font-weight: 700;
      color: #334155;
    }
    .rating-display {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .star-icon {
      color: #f59e0b;
      font-size: 18px;
    }
    .ratings-sub {
      font-size: 12px;
      color: #94a3b8;
    }
    .punctuality-pill {
      display: inline-block;
      font-size: 12px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 12px;
    }
    .punctuality-pill.good {
      background: #f0fdf4;
      color: #15803d;
      border: 1px solid #bbf7d0;
    }
    .punctuality-pill.warning {
      background: #fffbeb;
      color: #b45309;
      border: 1px solid #fde68a;
    }

    .btn-action-sm {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-action-sm .material-symbols-outlined {
      font-size: 16px;
      color: #0050e5;
    }
    .btn-action-sm:hover {
      background: #eff6ff;
      border-color: #93c5fd;
      color: #0050e5;
    }

    .empty-cell {
      text-align: center;
      padding: 48px 20px !important;
    }
    .empty-roster-box {
      max-width: 440px;
      margin: 0 auto;
      color: #64748b;
    }
    .empty-roster-box .material-symbols-outlined {
      font-size: 48px;
      color: #cbd5e1;
      margin-bottom: 8px;
    }
    .empty-roster-box h4 {
      font-size: 16px;
      font-weight: 800;
      color: #1e293b;
      margin: 0 0 6px 0;
    }
    .empty-roster-box p {
      font-size: 13px;
      color: #64748b;
      margin: 0 0 16px 0;
      line-height: 1.5;
    }

    /* Modals */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      padding: 20px;
    }
    .modal-card {
      background: #ffffff;
      border-radius: 16px;
      width: 100%;
      max-width: 520px;
      box-shadow: 0 25px 60px rgba(0,0,0,0.3);
      overflow: hidden;
      animation: modalSlide 0.2s ease-out;
    }
    .modal-card.modal-large {
      max-width: 640px;
    }
    @keyframes modalSlide {
      from { transform: translateY(12px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .modal-header {
      padding: 20px 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid #e2e8f0;
    }
    .modal-title-group {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    .modal-title-group .material-symbols-outlined {
      font-size: 26px;
      margin-top: 2px;
    }
    .text-blue { color: #0050e5; }
    .text-amber { color: #d97706; }
    .modal-title-group h3 {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 4px 0;
    }
    .modal-subtitle {
      font-size: 13px;
      color: #64748b;
      margin: 0;
    }
    .btn-close {
      background: none;
      border: none;
      font-size: 24px;
      color: #94a3b8;
      cursor: pointer;
      line-height: 1;
    }
    .btn-close:hover {
      color: #334155;
    }
    .modal-body {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-height: 70vh;
      overflow-y: auto;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-row-dual {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .form-label {
      font-size: 13px;
      font-weight: 700;
      color: #334155;
    }
    .form-label .required {
      color: #ef4444;
    }
    .form-control {
      padding: 10px 14px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13.5px;
      color: #0f172a;
      outline: none;
      transition: border-color 0.2s;
      font-family: inherit;
    }
    .form-control:focus {
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.1);
    }
    .star-rating-selector {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .star-select-icon {
      font-size: 32px;
      color: #cbd5e1;
      cursor: pointer;
      transition: color 0.15s;
    }
    .star-select-icon.active {
      color: #f59e0b;
    }
    .star-score-text {
      font-size: 13px;
      font-weight: 700;
      color: #334155;
      margin-left: 8px;
    }
    .modal-footer {
      padding: 16px 24px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    /* Info Guide */
    .info-guide-body {
      gap: 20px;
    }
    .info-guide-section h4 {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 6px 0;
    }
    .info-guide-section p {
      font-size: 13px;
      color: #475569;
      line-height: 1.55;
      margin: 0 0 6px 0;
    }

    /* Loading state */
    .loading-state-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 60px 20px;
      text-align: center;
      color: #64748b;
    }
    .spinner-ring {
      width: 36px;
      height: 36px;
      border: 3px solid #e2e8f0;
      border-top-color: #0050e5;
      border-radius: 50%;
      margin: 0 auto 16px auto;
      animation: spin 0.8s linear infinite;
    }

    /* Mobile & Tablet Responsiveness */
    @media (max-width: 900px) {
      .page-header {
        flex-direction: column;
        gap: 16px;
        padding: 20px;
      }
      .header-actions {
        width: 100%;
        justify-content: flex-start;
      }
      .analytics-row {
        flex-direction: column;
      }
      .flex-3, .flex-2 {
        flex: 1 1 100%;
      }
      .table-toolbar {
        flex-direction: column;
        align-items: flex-start;
      }
      .toolbar-right {
        width: 100%;
      }
      .search-input-box, .search-input {
        width: 100%;
      }
      .filter-dropdown {
        width: 100%;
      }
    }

    @media (max-width: 600px) {
      .metrics-grid {
        grid-template-columns: 1fr;
      }
      .form-row-dual {
        grid-template-columns: 1fr;
      }
      .compliance-cards-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class WorkforceAnalyticsComponent implements OnInit {
  isLoading = true;
  isSubmitting = false;
  analytics: any = null;
  staffMembers: any[] = [];

  // Filter & Search states
  searchQuery = '';
  selectedRoleFilter = '';

  // Modals
  showEnrollModal = false;
  showRateModal = false;
  showInfoModal = false;
  targetMember: any = null;

  newMember = {
    fullName: '',
    email: '',
    jobTitle: 'Security Guard',
    defaultHourlyRate: null as number | null,
    contractedWeeklyHours: 40
  };

  ratingForm = {
    shiftId: '00000000-0000-0000-0000-000000000000',
    ratingStars: 5,
    punctualityScore: 5,
    feedbackNotes: ''
  };

  constructor(
    private readonly workforceService: WorkforceService,
    private readonly toast: ToastService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.isLoading = true;
    this.workforceService.getAnalytics().subscribe({
      next: (res: any) => {
        if (res.isSuccess) {
          this.analytics = res.data;
        }
        this.loadMembers();
      },
      error: () => {
        this.loadMembers();
      }
    });
  }

  loadMembers(): void {
    this.workforceService.getMembers().subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res.isSuccess) {
          this.staffMembers = res.data || [];
        }
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  navigateTo(route: string): void {
    this.router.navigateByUrl(route);
  }

  scrollToRoster(): void {
    const el = document.getElementById('staffRosterSection');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  get filteredStaffMembers(): any[] {
    let list = this.staffMembers;
    if (this.selectedRoleFilter) {
      list = list.filter(m => m.jobTitle === this.selectedRoleFilter);
    }
    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(m =>
        (m.fullName && m.fullName.toLowerCase().includes(q)) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.jobTitle && m.jobTitle.toLowerCase().includes(q))
      );
    }
    return list;
  }

  getSitePercent(hours: number): number {
    if (!this.analytics || !this.analytics.totalWorkedHours || this.analytics.totalWorkedHours === 0) return 0;
    return Math.min(100, Math.round((hours / this.analytics.totalWorkedHours) * 100));
  }

  getInitials(name?: string): string {
    if (!name) return 'ST';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  }

  saveEnrollMember(): void {
    if (!this.newMember.fullName || !this.newMember.email) {
      this.toast.error('Full name and email address are required.');
      return;
    }
    this.isSubmitting = true;
    this.workforceService.enrollMember(this.newMember).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        if (res.isSuccess) {
          this.toast.success('Member enrolled successfully! Onboarding email sent.');
          this.showEnrollModal = false;
          this.newMember = { fullName: '', email: '', jobTitle: 'Security Guard', defaultHourlyRate: null, contractedWeeklyHours: 40 };
          this.loadMembers();
        } else {
          this.toast.error(res.message || 'Enrollment failed.');
        }
      },
      error: (err: any) => {
        this.isSubmitting = false;
        this.toast.error(err?.error?.message || 'Enrollment failed.');
      }
    });
  }

  openRateModal(member: any): void {
    this.targetMember = member;
    this.ratingForm = {
      shiftId: '00000000-0000-0000-0000-000000000000',
      ratingStars: 5,
      punctualityScore: 5,
      feedbackNotes: ''
    };
    this.showRateModal = true;
  }

  saveRating(): void {
    if (!this.targetMember) return;
    this.isSubmitting = true;
    this.workforceService.submitRating({
      shiftId: this.ratingForm.shiftId,
      userId: this.targetMember.userId,
      ratingStars: this.ratingForm.ratingStars,
      punctualityScore: this.ratingForm.punctualityScore,
      feedbackNotes: this.ratingForm.feedbackNotes
    }).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        if (res.isSuccess) {
          this.toast.success('Rating recorded successfully.');
          this.showRateModal = false;
          this.loadMembers();
        } else {
          this.toast.error(res.message || 'Failed to submit rating.');
        }
      },
      error: (err: any) => {
        this.isSubmitting = false;
        this.toast.error(err?.error?.message || 'Failed to submit rating.');
      }
    });
  }
}
