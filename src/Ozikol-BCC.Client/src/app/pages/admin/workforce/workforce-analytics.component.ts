import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { WorkforceService } from '../../../core/services/workforce.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Administrator Graphical Analytics & Workforce Roster Dashboard (`/workforce/console/analytics`).
 * Displays executive KPI metrics, shift fulfillment rates, punctuality scores, site spend breakdowns,
 * staff rating scorecards, and member enrollment with transactional welcome email dispatches.
 */
@Component({
  selector: 'app-workforce-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="analytics-page p-4">
      <!-- Header -->
      <div class="page-header d-flex align-items-center justify-content-between mb-4">
        <div>
          <div class="d-flex align-items-center gap-2">
            <h2 class="page-title m-0">Workforce Analytics &amp; Staff Directory</h2>
            <span class="badge bg-primary text-white">Executive Suite</span>
          </div>
          <p class="text-muted m-0 mt-1">Graphical fulfillment trends, labor spend, punctuality ratings, and talent enrollment.</p>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-primary d-flex align-items-center gap-1" (click)="loadAll()">
            <span class="material-symbols-outlined">refresh</span> Refresh
          </button>
          <button class="btn btn-primary d-flex align-items-center gap-1" (click)="showEnrollModal = true">
            <span class="material-symbols-outlined">person_add</span> Enroll Member
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div class="text-center p-5" *ngIf="isLoading">
        <div class="spinner-border text-primary" role="status"></div>
      </div>

      <div *ngIf="!isLoading">
        <!-- KPI Overview Cards -->
        <div class="row g-3 mb-4" *ngIf="analytics">
          <div class="col-md-3">
            <div class="kpi-card p-3 rounded shadow-sm bg-white border-start border-primary border-4">
              <div class="text-muted small fw-semibold">Shift Fulfillment Rate</div>
              <div class="d-flex align-items-baseline gap-2 mt-1">
                <span class="fs-2 fw-bold text-dark">{{ analytics.shiftFulfillmentRatePercent }}%</span>
                <span class="small text-success fw-medium">Target 95%</span>
              </div>
              <div class="progress mt-2" style="height: 6px;">
                <div class="progress-bar bg-primary" [style.width.%]="analytics.shiftFulfillmentRatePercent"></div>
              </div>
            </div>
          </div>

          <div class="col-md-3">
            <div class="kpi-card p-3 rounded shadow-sm bg-white border-start border-success border-4">
              <div class="text-muted small fw-semibold">Punctuality Score</div>
              <div class="d-flex align-items-baseline gap-2 mt-1">
                <span class="fs-2 fw-bold text-success">{{ analytics.overallPunctualityPercent }}%</span>
                <span class="small text-muted">On-Time Clock-Ins</span>
              </div>
              <div class="progress mt-2" style="height: 6px;">
                <div class="progress-bar bg-success" [style.width.%]="analytics.overallPunctualityPercent"></div>
              </div>
            </div>
          </div>

          <div class="col-md-3">
            <div class="kpi-card p-3 rounded shadow-sm bg-white border-start border-info border-4">
              <div class="text-muted small fw-semibold">Active Duty Strength</div>
              <div class="d-flex align-items-center gap-2 mt-1">
                <span class="fs-2 fw-bold text-info">{{ analytics.activeOnDutyCount }}</span>
                <span class="badge bg-success-subtle text-success border border-success-subtle d-flex align-items-center gap-1">
                  <span class="live-dot"></span> Active Now
                </span>
              </div>
              <small class="text-muted mt-2 d-block">{{ analytics.completedShiftsCount }} shifts completed (30d)</small>
            </div>
          </div>

          <div class="col-md-3">
            <div class="kpi-card p-3 rounded shadow-sm bg-white border-start border-warning border-4">
              <div class="text-muted small fw-semibold">Gross Labor Spend (30d)</div>
              <div class="d-flex align-items-baseline gap-2 mt-1">
                <span class="fs-2 fw-bold text-dark">£{{ analytics.totalGrossLaborSpend | number:'1.2-2' }}</span>
              </div>
              <small class="text-muted mt-2 d-block">{{ analytics.totalWorkedHours | number:'1.1-1' }} hrs worked / {{ analytics.totalScheduledHours | number:'1.1-1' }} planned</small>
            </div>
          </div>
        </div>

        <!-- Graphical Breakdown Section -->
        <div class="row g-4 mb-4" *ngIf="analytics">
          <!-- Client Venue Spend Breakdown -->
          <div class="col-lg-7">
            <div class="card p-4 rounded shadow-sm bg-white border-0">
              <h5 class="fw-bold mb-3 d-flex align-items-center gap-2">
                <span class="material-symbols-outlined text-primary">location_city</span>
                Labor Hours &amp; Spend by Client Venue
              </h5>
              <div class="venue-bars" *ngIf="analytics.siteBreakdowns.length > 0">
                <div class="venue-bar-row mb-3" *ngFor="let site of analytics.siteBreakdowns">
                  <div class="d-flex justify-content-between small fw-medium mb-1">
                    <span>{{ site.siteName }}</span>
                    <span><strong>{{ site.totalHours | number:'1.1-1' }} hrs</strong> ({{ site.shiftCount }} shifts) &bull; £{{ site.totalSpend | number:'1.2-2' }}</span>
                  </div>
                  <div class="progress" style="height: 10px;">
                    <div class="progress-bar bg-primary" [style.width.%]="getSitePercent(site.totalHours)"></div>
                  </div>
                </div>
              </div>
              <div class="text-muted text-center p-3" *ngIf="analytics.siteBreakdowns.length === 0">
                No site duty hours recorded in the last 30 days.
              </div>
            </div>
          </div>

          <!-- Attendance Distribution Donut / Status -->
          <div class="col-lg-5">
            <div class="card p-4 rounded shadow-sm bg-white border-0">
              <h5 class="fw-bold mb-3 d-flex align-items-center gap-2">
                <span class="material-symbols-outlined text-primary">pie_chart</span>
                Attendance Compliance Breakdown
              </h5>
              <div class="status-grid g-2">
                <div class="status-pill-box p-3 rounded mb-2 bg-success-subtle border border-success-subtle d-flex justify-content-between align-items-center">
                  <span class="d-flex align-items-center gap-2 fw-semibold text-success">
                    <span class="material-symbols-outlined">check_circle</span> On-Time Check-In
                  </span>
                  <span class="fs-5 fw-bold text-success">{{ analytics.attendanceDistribution.OnTime }}</span>
                </div>
                <div class="status-pill-box p-3 rounded mb-2 bg-warning-subtle border border-warning-subtle d-flex justify-content-between align-items-center">
                  <span class="d-flex align-items-center gap-2 fw-semibold text-warning-emphasis">
                    <span class="material-symbols-outlined">schedule</span> Late Arrivals (&gt;5m)
                  </span>
                  <span class="fs-5 fw-bold text-warning-emphasis">{{ analytics.attendanceDistribution.LateArrivals }}</span>
                </div>
                <div class="status-pill-box p-3 rounded mb-2 bg-danger-subtle border border-danger-subtle d-flex justify-content-between align-items-center">
                  <span class="d-flex align-items-center gap-2 fw-semibold text-danger">
                    <span class="material-symbols-outlined">wrong_location</span> Geofence Violations
                  </span>
                  <span class="fs-5 fw-bold text-danger">{{ analytics.attendanceDistribution.GeofenceViolations }}</span>
                </div>
                <div class="status-pill-box p-3 rounded mb-2 bg-secondary-subtle border border-secondary-subtle d-flex justify-content-between align-items-center">
                  <span class="d-flex align-items-center gap-2 fw-semibold text-secondary">
                    <span class="material-symbols-outlined">person_off</span> Unexcused No-Shows
                  </span>
                  <span class="fs-5 fw-bold text-secondary">{{ analytics.attendanceDistribution.NoShows }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Staff Roster & Performance Scorecards Table -->
        <div class="card p-4 rounded shadow-sm bg-white border-0">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="fw-bold m-0 d-flex align-items-center gap-2">
              <span class="material-symbols-outlined text-primary">groups</span>
              Workforce Staff Roster &amp; Ratings
            </h5>
            <span class="badge bg-light text-dark border">{{ staffMembers.length }} Staff Enrolled</span>
          </div>

          <div class="table-responsive" *ngIf="staffMembers.length > 0">
            <table class="table table-hover align-middle m-0">
              <thead class="table-light">
                <tr>
                  <th>Staff Member</th>
                  <th>Designated Job Title</th>
                  <th>Default Hourly Rate</th>
                  <th>Completed Shifts</th>
                  <th>Average Rating</th>
                  <th>Punctuality Score</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let m of staffMembers">
                  <td>
                    <div class="d-flex align-items-center gap-2">
                      <div class="avatar-circle">{{ getInitials(m.fullName) }}</div>
                      <div>
                        <div class="fw-bold text-dark">{{ m.fullName }}</div>
                        <small class="text-muted">{{ m.email }}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="badge bg-light text-primary border">{{ m.jobTitle }}</span>
                  </td>
                  <td>
                    <span class="fw-semibold">{{ m.defaultHourlyRate ? ('£' + (m.defaultHourlyRate | number:'1.2-2') + '/h') : 'Standard' }}</span>
                  </td>
                  <td>
                    <span class="fw-semibold">{{ m.totalShiftsCompleted }}</span>
                  </td>
                  <td>
                    <div class="d-flex align-items-center gap-1">
                      <span class="material-symbols-outlined text-warning fs-6">star</span>
                      <strong class="text-dark">{{ m.averageRating | number:'1.1-1' }}</strong>
                      <small class="text-muted">({{ m.totalRatingsCount }})</small>
                    </div>
                  </td>
                  <td>
                    <span class="badge" [ngClass]="m.punctualityScorePercent >= 90 ? 'bg-success' : 'bg-warning text-dark'">
                      {{ m.punctualityScorePercent | number:'1.0-0' }}% On-Time
                    </span>
                  </td>
                  <td>
                    <button class="btn btn-sm btn-outline-primary" (click)="openRateModal(m)">
                      <span class="material-symbols-outlined fs-6 align-middle">rate_review</span> Rate Duty
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="text-center p-4 text-muted" *ngIf="staffMembers.length === 0">
            No staff members enrolled yet. Click "Enroll Member" to invite staff.
          </div>
        </div>
      </div>

      <!-- Enroll Member Modal -->
      <div class="modal-backdrop-custom" *ngIf="showEnrollModal">
        <div class="modal-box p-4 bg-white rounded shadow-lg">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="fw-bold m-0">Enroll New Workforce Member</h5>
            <button class="btn-close" (click)="showEnrollModal = false"></button>
          </div>
          <p class="text-muted small mb-3">Enrolls the staff member into the rota system and sends a transactional onboarding welcome email.</p>

          <div class="mb-3">
            <label class="form-label small fw-semibold">Full Name *</label>
            <input type="text" class="form-control" [(ngModel)]="newMember.fullName" placeholder="e.g. First Last" />
          </div>

          <div class="mb-3">
            <label class="form-label small fw-semibold">Email Address *</label>
            <input type="email" class="form-control" [(ngModel)]="newMember.email" placeholder="name@company.com" />
          </div>

          <div class="mb-3">
            <label class="form-label small fw-semibold">Job Title *</label>
            <select class="form-select" [(ngModel)]="newMember.jobTitle">
              <option value="Security Guard">Security Guard</option>
              <option value="SIA Door Supervisor">SIA Door Supervisor</option>
              <option value="Event Steward">Event Steward</option>
              <option value="Care Assistant">Care Assistant</option>
              <option value="Healthcare Worker">Healthcare Worker</option>
              <option value="Operations Supervisor">Operations Supervisor</option>
            </select>
          </div>

          <div class="row g-2 mb-3">
            <div class="col-6">
              <label class="form-label small fw-semibold">Default Hourly Rate (£)</label>
              <input type="number" class="form-control" [(ngModel)]="newMember.defaultHourlyRate" placeholder="e.g. 15.00" />
            </div>
            <div class="col-6">
              <label class="form-label small fw-semibold">Contract Hours/Week</label>
              <input type="number" class="form-control" [(ngModel)]="newMember.contractedWeeklyHours" placeholder="e.g. 40" />
            </div>
          </div>

          <div class="d-flex justify-content-end gap-2 mt-4">
            <button class="btn btn-outline-secondary" (click)="showEnrollModal = false">Cancel</button>
            <button class="btn btn-primary" (click)="saveEnrollMember()" [disabled]="isSubmitting">
              {{ isSubmitting ? 'Enrolling...' : 'Send Invitation & Enroll' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Rate Member Modal -->
      <div class="modal-backdrop-custom" *ngIf="showRateModal">
        <div class="modal-box p-4 bg-white rounded shadow-lg">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="fw-bold m-0">Submit Post-Duty Rating for {{ targetMember?.fullName }}</h5>
            <button class="btn-close" (click)="showRateModal = false"></button>
          </div>

          <div class="mb-3">
            <label class="form-label small fw-semibold">Overall Performance Rating (1 to 5 Stars)</label>
            <div class="d-flex gap-2 align-items-center fs-3 text-warning">
              <span *ngFor="let star of [1,2,3,4,5]" class="material-symbols-outlined cursor-pointer"
                (click)="ratingForm.ratingStars = star">
                {{ star <= ratingForm.ratingStars ? 'star' : 'star_border' }}
              </span>
              <span class="fs-6 fw-bold text-dark ms-2">{{ ratingForm.ratingStars }} / 5 Stars</span>
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label small fw-semibold">Punctuality Score</label>
            <select class="form-select" [(ngModel)]="ratingForm.punctualityScore">
              <option [value]="5">5 - Arrived Early / Prompt</option>
              <option [value]="4">4 - On-Time (Within Grace)</option>
              <option [value]="3">3 - Slight Delay (5-10m)</option>
              <option [value]="2">2 - Moderately Late (10-20m)</option>
              <option [value]="1">1 - Severely Late / Poor</option>
            </select>
          </div>

          <div class="mb-3">
            <label class="form-label small fw-semibold">Supervisory Feedback &amp; Notes</label>
            <textarea class="form-control" rows="3" [(ngModel)]="ratingForm.feedbackNotes" placeholder="Provide qualitative feedback..."></textarea>
          </div>

          <div class="d-flex justify-content-end gap-2 mt-4">
            <button class="btn btn-outline-secondary" (click)="showRateModal = false">Cancel</button>
            <button class="btn btn-primary" (click)="saveRating()" [disabled]="isSubmitting">
              {{ isSubmitting ? 'Saving...' : 'Submit Rating' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .analytics-page { background: #f8fafc; min-height: 100vh; font-family: inherit; }
    .page-title { font-size: 24px; font-weight: 700; color: #0f172a; }
    .kpi-card { transition: transform 0.2s; }
    .kpi-card:hover { transform: translateY(-2px); }
    .live-dot { width: 8px; height: 8px; border-radius: 50%; background: #16a34a; display: inline-block; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }
    .avatar-circle { width: 36px; height: 36px; border-radius: 50%; background: #e0e7ff; color: #0050e5; font-weight: 700; display: flex; align-items: center; justify-content: center; font-size: 13px; }
    .cursor-pointer { cursor: pointer; }
    .modal-backdrop-custom { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); display: flex; align-items: center; justify-content: center; z-index: 1050; }
    .modal-box { width: 100%; max-width: 520px; box-sizing: border-box; }
  `]
})
export class WorkforceAnalyticsComponent implements OnInit {
  isLoading = true;
  isSubmitting = false;
  analytics: any = null;
  staffMembers: any[] = [];

  showEnrollModal = false;
  showRateModal = false;
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
    private readonly toast: ToastService
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

