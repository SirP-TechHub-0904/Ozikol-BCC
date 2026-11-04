import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { WorkforceService, Shift, ClockInResult, ClockOutResult } from '../../../core/services/workforce.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Member GPS Clock In & Out screen (`/attendance/workspace/clock`).
 * Captures live browser geolocation, submits it against the active shift for
 * server-side Haversine geofence verification, and supports lone-worker welfare check-calls.
 */
@Component({
  selector: 'app-workforce-clock',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="clock-page p-4">
      <div class="page-header mb-4">
        <h2 class="page-title m-0">Duty Clock & Geofence</h2>
        <p class="text-muted m-0 mt-1">Your live location is verified against the site geofence when you clock in or out.</p>
      </div>

      <div class="text-center p-5" *ngIf="isLoading">
        <div class="spinner-border text-primary" role="status"></div>
      </div>

      <div class="card border-0 shadow-sm p-5 text-center" *ngIf="!isLoading && !currentShift">
        <span class="material-symbols-outlined display-4 text-muted mb-3">event_busy</span>
        <h5>No active shift ready to clock into</h5>
        <p class="text-muted">You can clock in up to 30 minutes before a scheduled shift starts.</p>
        <div>
          <a class="btn btn-outline-primary" routerLink="/workforce/workspace/my-shifts">View My Roster</a>
        </div>
      </div>

      <div class="row justify-content-center" *ngIf="!isLoading && currentShift">
        <div class="col-lg-6">
          <div class="card border-0 shadow-sm p-4">
            <div class="d-flex justify-content-between mb-2">
              <span class="font-monospace small text-primary fw-semibold">{{ currentShift.shiftCode }}</span>
              <span class="badge" [ngClass]="currentShift.isClockedIn ? 'bg-primary' : 'bg-warning text-dark'">
                {{ currentShift.isClockedIn ? 'ON DUTY' : 'NOT CLOCKED IN' }}
              </span>
            </div>

            <h4 class="mb-1">{{ currentShift.siteName }}</h4>
            <p class="text-muted small mb-3"><span class="material-symbols-outlined align-middle fs-6">place</span> {{ currentShift.siteAddress }}</p>

            <div class="bg-light p-3 rounded mb-4">
              <div class="d-flex justify-content-between small">
                <span class="text-muted">Post:</span>
                <span class="fw-semibold">{{ currentShift.postName }}</span>
              </div>
              <div class="d-flex justify-content-between small mt-1">
                <span class="text-muted">Scheduled Shift:</span>
                <span class="fw-semibold">{{ currentShift.startsAtUtc | date:'shortTime' }} – {{ currentShift.endsAtUtc | date:'shortTime' }}</span>
              </div>
              <div class="d-flex justify-content-between small mt-1" *ngIf="currentShift.requiredWorkspaceStationName">
                <span class="text-muted">Workstation:</span>
                <span class="badge bg-info text-dark">{{ currentShift.requiredWorkspaceStationName }}</span>
              </div>
            </div>

            <div class="gps-status-card p-3 rounded mb-4 text-center" [class.gps-acquired]="currentPosition !== null">
              <span class="material-symbols-outlined fs-2 text-primary mb-1">my_location</span>
              <div class="fw-semibold">{{ currentPosition ? 'GPS Location Acquired' : 'Acquiring GPS Signal...' }}</div>
              <div class="small text-muted font-monospace mt-1" *ngIf="currentPosition">
                Lat: {{ currentPosition.coords.latitude | number:'1.5-5' }}, Lng: {{ currentPosition.coords.longitude | number:'1.5-5' }}
                (±{{ currentPosition.coords.accuracy | number:'1.0-0' }}m)
              </div>
            </div>

            <!-- Action buttons -->
            <div class="d-grid gap-3">
              <button
                class="btn btn-primary btn-lg d-flex align-items-center justify-content-center gap-2"
                *ngIf="!currentShift.isClockedIn"
                [disabled]="isActionLoading"
                (click)="performClockIn()">
                <span class="material-symbols-outlined">login</span> Clock In Now
              </button>

              <div *ngIf="currentShift.isClockedIn">
                <div class="d-grid gap-2">
                  <button
                    class="btn btn-outline-warning d-flex align-items-center justify-content-center gap-2"
                    [disabled]="isActionLoading"
                    (click)="submitCheckCall()">
                    <span class="material-symbols-outlined">health_and_safety</span> Lone Worker Welfare Check-In
                  </button>
                  <button
                    class="btn btn-danger btn-lg d-flex align-items-center justify-content-center gap-2 mt-2"
                    [disabled]="isActionLoading"
                    (click)="performClockOut()">
                    <span class="material-symbols-outlined">logout</span> Clock Out & End Shift
                  </button>
                </div>
              </div>
            </div>

            <!-- Handshake alert -->
            <div class="alert alert-success mt-4 mb-0 small d-flex align-items-center gap-2" *ngIf="currentShift.isClockedIn && currentShift.requiredWorkspaceStationName">
              <span class="material-symbols-outlined text-success">desktop_windows</span>
              <div>
                <strong>Workstation Access Unlocked:</strong> You are actively authorized to sign in to <strong>{{ currentShift.requiredWorkspaceStationName }}</strong>.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .gps-status-card {
      background: #f8f9fa;
      border: 1px dashed #ced4da;
    }
    .gps-status-card.gps-acquired {
      background: #e8f5e9;
      border-color: #a5d6a7;
    }
  `]
})
export class WorkforceClockComponent implements OnInit {
  currentShift: Shift | null = null;
  isLoading = false;
  isActionLoading = false;
  currentPosition: GeolocationPosition | null = null;

  constructor(
    private readonly workforceService: WorkforceService,
    private readonly toast: ToastService
  ) { }

  ngOnInit(): void {
    this.acquireGps();
    this.loadTodayActiveShift();
  }

  acquireGps(): void {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { this.currentPosition = pos; },
        (err) => { this.toast.error('Unable to retrieve device GPS coordinates: ' + err.message); },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }

  loadTodayActiveShift(): void {
    this.isLoading = true;
    this.workforceService.getMyShifts().subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res.isSuccess && res.data) {
          const now = new Date().getTime();
          // Find first shift starting within the next 4 hours or currently active
          this.currentShift = (res.data as Shift[]).find((s: Shift) => {
            const start = new Date(s.startsAtUtc).getTime();
            const end = new Date(s.endsAtUtc).getTime();
            return (now >= start - 3600000 && now <= end) || (s.isClockedIn && !s.isClockedOut);
          }) || res.data[0] || null;
        }
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('Failed to load active shifts.');
      }
    });
  }

  performClockIn(): void {
    if (!this.currentShift) return;
    this.isActionLoading = true;

    const lat = this.currentPosition?.coords.latitude;
    const lng = this.currentPosition?.coords.longitude;

    this.workforceService.clockIn({
      shiftId: this.currentShift.id,
      latitude: lat,
      longitude: lng
    }).subscribe({
      next: (res: any) => {
        this.isActionLoading = false;
        if (res.isSuccess && res.data) {
          this.toast.success(res.message || 'Clocked in successfully.');
          if (this.currentShift) {
            this.currentShift.isClockedIn = true;
            this.currentShift.status = 'ClockedIn';
          }
        } else {
          this.toast.error(res.message || 'Clock-in failed.');
        }
      },
      error: (err: any) => {
        this.isActionLoading = false;
        this.toast.error(err?.error?.message || 'Clock-in failed.');
      }
    });
  }

  performClockOut(): void {
    if (!this.currentShift) return;
    this.isActionLoading = true;

    const lat = this.currentPosition?.coords.latitude;
    const lng = this.currentPosition?.coords.longitude;

    this.workforceService.clockOut({
      shiftId: this.currentShift.id,
      latitude: lat,
      longitude: lng
    }).subscribe({
      next: (res: any) => {
        this.isActionLoading = false;
        if (res.isSuccess && res.data) {
          this.toast.success('Clocked out successfully. Duration: ' + res.data.durationHours + ' hrs.');
          if (this.currentShift) {
            this.currentShift.isClockedOut = true;
            this.currentShift.status = 'Completed';
          }
        } else {
          this.toast.error(res.message || 'Clock-out failed.');
        }
      },
      error: (err: any) => {
        this.isActionLoading = false;
        this.toast.error(err?.error?.message || 'Clock-out failed.');
      }
    });
  }

  submitCheckCall(): void {
    if (!this.currentShift) return;
    this.isActionLoading = true;

    this.workforceService.confirmWelfareCheck(this.currentShift.id).subscribe({
      next: (res: any) => {
        this.isActionLoading = false;
        if (res.isSuccess) {
          this.toast.success('Welfare check-call logged with central control.');
        } else {
          this.toast.error(res.message || 'Check-call failed.');
        }
      },
      error: () => {
        this.isActionLoading = false;
        this.toast.error('Check-call failed.');
      }
    });
  }
}
