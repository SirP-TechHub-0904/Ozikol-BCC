import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { WorkforceService, Shift, ClientSite } from '../../../core/services/workforce.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Administrator Master Rota & Scheduling Grid (`/admin/workforce/schedule`).
 * Supports weekly duty rosters, 24/7 cross-midnight overnight shifts, break deductions,
 * post assignment, workstation links, and conflict detection.
 */
@Component({
  selector: 'app-workforce-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="schedule-page">
      <!-- Header -->
      <div class="page-header d-flex align-items-center justify-content-between mb-4">
        <div>
          <div class="d-flex align-items-center gap-2">
            <h2 class="page-title m-0">Staff Rota & Shift Management</h2>
            <button class="info-icon-btn" (click)="showInfoModal = true" title="Rota & Scheduling Info">
              <span class="material-symbols-outlined">info</span>
            </button>
            <button class="tour-btn" (click)="startTour()" title="Replay Walkthrough Tour">
              <span class="material-symbols-outlined">help</span>
            </button>
          </div>
          <p class="text-muted m-0 mt-1">Multi-site shift scheduling, 24/7 overnight rosters, and conflict protection.</p>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-primary d-flex align-items-center gap-1" (click)="loadData()">
            <span class="material-symbols-outlined">refresh</span> Refresh
          </button>
          <button class="btn btn-primary d-flex align-items-center gap-1" (click)="openCreateModal()">
            <span class="material-symbols-outlined">add</span> Create Shift
          </button>
        </div>
      </div>

      <!-- Filters Bar -->
      <div class="filters-card mb-4 p-3 rounded shadow-sm bg-white">
        <div class="row g-3 align-items-center">
          <div class="col-md-3">
            <label class="form-label small text-muted">Filter by Site</label>
            <select class="form-select" [(ngModel)]="selectedSiteId" (change)="applyFilters()">
              <option value="">All Operating Sites</option>
              <option *ngFor="let site of sites" [value]="site.id">{{ site.siteName }} ({{ site.siteCode }})</option>
            </select>
          </div>
          <div class="col-md-3">
            <label class="form-label small text-muted">Filter by Status</label>
            <select class="form-select" [(ngModel)]="selectedStatus" (change)="applyFilters()">
              <option value="">All Statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Confirmed">Confirmed</option>
              <option value="InProgress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          <div class="col-md-6 text-end">
            <span class="badge bg-light text-dark border p-2">
              Showing <strong>{{ shifts.length }}</strong> planned shifts
            </span>
          </div>
        </div>
      </div>

      <!-- Shifts Roster Grid -->
      <div class="shifts-table-card rounded shadow-sm bg-white p-3">
        <div class="table-responsive" *ngIf="!isLoading && shifts.length > 0">
          <table class="table table-hover align-middle m-0">
            <thead class="table-light">
              <tr>
                <th>Shift Ref</th>
                <th>Operating Site & Post</th>
                <th>Assigned Officer</th>
                <th>Date & Hours</th>
                <th>Break / Net</th>
                <th>Workstation</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let s of shifts">
                <td>
                  <span class="fw-semibold text-primary font-monospace">{{ s.shiftCode }}</span>
                </td>
                <td>
                  <div class="fw-bold">{{ s.siteName }}</div>
                  <small class="text-muted"><span class="material-symbols-outlined fs-6 align-middle">location_on</span> {{ s.postName }}</small>
                </td>
                <td>
                  <div class="d-flex align-items-center gap-2">
                    <span class="avatar-circle">{{ getInitials(s.assignedUserName) }}</span>
                    <div>
                      <div class="fw-medium">{{ s.assignedUserName || 'Open / Unassigned' }}</div>
                      <small class="badge bg-light text-muted" *ngIf="s.isConfirmedByGuard">✓ Confirmed</small>
                    </div>
                  </div>
                </td>
                <td>
                  <div>{{ s.startsAtUtc | date:'shortDate' }}</div>
                  <div class="d-flex align-items-center gap-1">
                    <span class="fw-medium">{{ s.startsAtUtc | date:'HH:mm' }} - {{ s.endsAtUtc | date:'HH:mm' }}</span>
                    <span class="badge bg-purple-subtle text-purple" *ngIf="s.isOvernight" title="24/7 Overnight shift crossing midnight">
                      🌙 Overnight
                    </span>
                  </div>
                </td>
                <td>
                  <div>{{ s.plannedDurationHours }} hrs</div>
                  <small class="text-muted" *ngIf="s.breakMinutes > 0">{{ s.breakMinutes }}m break</small>
                </td>
                <td>
                  <span class="badge bg-info-subtle text-info d-inline-flex align-items-center gap-1" *ngIf="s.requiredWorkspaceStationId">
                    <span class="material-symbols-outlined fs-6">desktop_windows</span>
                    {{ s.requiredWorkspaceStationName || 'Station Locked' }}
                  </span>
                  <span class="text-muted small" *ngIf="!s.requiredWorkspaceStationId">None</span>
                </td>
                <td>
                  <span class="badge" [ngClass]="getStatusBadge(s.status)">{{ s.status }}</span>
                </td>
                <td>
                  <button class="btn btn-sm btn-outline-secondary" (click)="viewShiftDetails(s)">
                    <span class="material-symbols-outlined fs-6">visibility</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="empty-state text-center p-5" *ngIf="!isLoading && shifts.length === 0">
          <span class="material-symbols-outlined display-4 text-muted mb-3">calendar_month</span>
          <h5>No shifts scheduled yet</h5>
          <p class="text-muted">Create your first 24/7 or day shift by tapping "Create Shift".</p>
          <button class="btn btn-primary" (click)="openCreateModal()">Create Shift</button>
        </div>

        <div class="text-center p-5" *ngIf="isLoading">
          <div class="spinner-border text-primary" role="status"></div>
          <div class="mt-2 text-muted">Loading schedule...</div>
        </div>
      </div>

      <!-- Create Shift Modal -->
      <div class="modal-backdrop fade show" *ngIf="showCreateModal"></div>
      <div class="modal fade show d-block" *ngIf="showCreateModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Create Scheduled Shift</h5>
              <button type="button" class="btn-close" (click)="showCreateModal = false"></button>
            </div>
            <div class="modal-body">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Client Site *</label>
                  <select class="form-select" [(ngModel)]="newShift.clientSiteId" required>
                    <option value="">Select operating site...</option>
                    <option *ngFor="let site of sites" [value]="site.id">{{ site.siteName }} ({{ site.siteCode }})</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Post Name *</label>
                  <input type="text" class="form-control" [(ngModel)]="newShift.postName" placeholder="e.g. Main Gatehouse, Reception" />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Assigned Staff Name</label>
                  <input type="text" class="form-control" [(ngModel)]="newShift.assignedUserName" placeholder="e.g. First Last" />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Assigned Staff User ID</label>
                  <input type="text" class="form-control" [(ngModel)]="newShift.assignedUserId" placeholder="e.g. user-id-code" />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Shift Starts At (Local) *</label>
                  <input type="datetime-local" class="form-control" [(ngModel)]="newShiftStart" (change)="calculateDuration()" required />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Shift Ends At (Local) *</label>
                  <input type="datetime-local" class="form-control" [(ngModel)]="newShiftEnd" (change)="calculateDuration()" required />
                </div>
                <div class="col-md-4">
                  <label class="form-label">Unpaid Break (Minutes)</label>
                  <input type="number" class="form-control" [(ngModel)]="newShift.breakMinutes" (change)="calculateDuration()" min="0" step="15" />
                </div>
                <div class="col-md-4">
                  <label class="form-label">Planned Net Hours</label>
                  <input type="text" class="form-control" [value]="calculatedDuration + ' hrs'" readonly />
                </div>
                <div class="col-md-4 d-flex align-items-center mt-4">
                  <span class="badge bg-purple-subtle text-purple p-2" *ngIf="isOvernightShift">
                    🌙 24/7 Overnight Shift
                  </span>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Required Workstation / Laptop (Optional Hardware Lock)</label>
                  <input type="text" class="form-control" [(ngModel)]="newShift.requiredWorkspaceStationName" placeholder="e.g. Gatehouse Control PC #1" />
                  <small class="text-muted">When set, the desktop app locks this workstation until the guard clocks in on site.</small>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Post Instructions / Briefing Notes</label>
                  <textarea class="form-control" rows="3" [(ngModel)]="newShift.notes" placeholder="Enter special site instructions or orders for this shift..."></textarea>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" (click)="showCreateModal = false">Cancel</button>
              <button type="button" class="btn btn-primary" (click)="submitCreateShift()" [disabled]="isSubmitting">
                <span class="spinner-border spinner-border-sm me-1" *ngIf="isSubmitting"></span> Save Shift
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Info Modal -->
      <div class="modal-backdrop fade show" *ngIf="showInfoModal"></div>
      <div class="modal fade show d-block" *ngIf="showInfoModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title d-flex align-items-center gap-2">
                <span class="material-symbols-outlined text-primary">info</span>
                About Staff Rota & Scheduling
              </h5>
              <button type="button" class="btn-close" (click)="showInfoModal = false"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3">
                <h6 class="fw-bold">Purpose:</h6>
                <p class="text-muted small">Central command center for scheduling multi-department shifts, managing 24/7 cross-midnight rosters, and preventing guard overlap.</p>
              </div>
              <div class="mb-3">
                <h6 class="fw-bold">24/7 Overnight Logic:</h6>
                <p class="text-muted small">Shifts ending on a subsequent calendar day (e.g., 20:00 to 06:00) automatically calculate duration across midnight without date truncation.</p>
              </div>
              <div class="mb-3">
                <h6 class="fw-bold">Workstation Gatekeeper:</h6>
                <p class="text-muted small">Assigning a required workstation ensures staff cannot unlock the designated machine or desktop app until they actively clock in on site.</p>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-primary" (click)="showInfoModal = false">Got it</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .schedule-page { padding: 1.5rem; }
    .page-title { font-weight: 700; color: #1e293b; }
    .info-icon-btn, .tour-btn {
      background: none; border: none; color: #64748b; cursor: pointer; padding: 4px; border-radius: 50%;
    }
    .info-icon-btn:hover, .tour-btn:hover { color: #0050E5; background: #f1f5f9; }
    .btn-primary { background-color: #0050E5; border-color: #0050E5; }
    .btn-primary:hover { background-color: #003db3; border-color: #003db3; }
    .text-purple { color: #7c3aed; }
    .bg-purple-subtle { background-color: #f3e8ff; }
    .avatar-circle {
      width: 32px; height: 32px; border-radius: 50%; background: #e2e8f0;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 600; color: #475569;
    }
  `]
})
export class WorkforceScheduleComponent implements OnInit {
  shifts: Shift[] = [];
  sites: ClientSite[] = [];
  isLoading = false;
  isSubmitting = false;
  showCreateModal = false;
  showInfoModal = false;

  selectedSiteId = '';
  selectedStatus = '';

  newShift: any = {
    clientSiteId: '',
    postName: 'Main Gatehouse',
    assignedUserName: '',
    assignedUserId: '',
    breakMinutes: 30,
    requiredWorkspaceStationName: '',
    notes: ''
  };

  newShiftStart = '';
  newShiftEnd = '';
  calculatedDuration = '0';
  isOvernightShift = false;

  constructor(
    private readonly workforceService: WorkforceService,
    private readonly toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.workforceService.getSites().subscribe({
      next: (res: any) => {
        this.sites = res?.data || [];
      }
    });

    this.workforceService.getShifts({
      siteId: this.selectedSiteId || undefined,
      status: this.selectedStatus || undefined
    }).subscribe({
      next: (res: any) => {
        this.shifts = res?.data || [];
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('Failed to load roster.');
      }
    });
  }

  applyFilters(): void {
    this.loadData();
  }

  openCreateModal(): void {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 6, 0);

    this.newShiftStart = this.formatDateForInput(start);
    this.newShiftEnd = this.formatDateForInput(end);
    this.calculateDuration();
    this.showCreateModal = true;
  }

  calculateDuration(): void {
    if (!this.newShiftStart || !this.newShiftEnd) return;
    const start = new Date(this.newShiftStart);
    const end = new Date(this.newShiftEnd);

    this.isOvernightShift = end.getDate() !== start.getDate();
    const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const net = Math.max(0, diffHours - ((this.newShift.breakMinutes || 0) / 60));
    this.calculatedDuration = net.toFixed(1);
  }

  submitCreateShift(): void {
    if (!this.newShift.clientSiteId) {
      this.toast.warning('Please select a client site.');
      return;
    }

    this.isSubmitting = true;
    const payload = {
      ...this.newShift,
      startsAtUtc: new Date(this.newShiftStart).toISOString(),
      endsAtUtc: new Date(this.newShiftEnd).toISOString()
    };

    this.workforceService.createShift(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.showCreateModal = false;
        this.toast.success('Shift created and roster updated.');
        this.loadData();
      },
      error: (err: any) => {
        this.isSubmitting = false;
        this.toast.error(err?.error?.message || 'Failed to create shift. Check for overlapping conflicts.');
      }
    });
  }

  viewShiftDetails(shift: Shift): void {
    this.toast.info(`Shift: ${shift.shiftCode} at ${shift.siteName}`);
  }

  startTour(): void {
    this.showInfoModal = true;
  }

  getStatusBadge(status: string): string {
    switch (status) {
      case 'Confirmed': return 'bg-success';
      case 'InProgress': return 'bg-primary';
      case 'Completed': return 'bg-secondary';
      case 'Cancelled': return 'bg-danger';
      default: return 'bg-warning text-dark';
    }
  }

  getInitials(name?: string): string {
    if (!name) return 'OP';
    const parts = name.trim().split(' ');
    return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  }

  private formatDateForInput(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}

