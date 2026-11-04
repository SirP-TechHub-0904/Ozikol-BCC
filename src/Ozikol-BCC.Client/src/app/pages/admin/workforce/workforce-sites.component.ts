import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { WorkforceService, ClientSite } from '../../../core/services/workforce.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Administrator Client Sites & Posts Directory (`/admin/workforce/sites`).
 * Manages client locations, GPS coordinates, geofence radius boundaries,
 * Site Assignment Instructions (SIs), and SIA licensing requirements.
 */
@Component({
  selector: 'app-workforce-sites',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="sites-page">
      <!-- Header -->
      <div class="page-header d-flex align-items-center justify-content-between mb-4">
        <div>
          <div class="d-flex align-items-center gap-2">
            <h2 class="page-title m-0">Client Sites & Geofences</h2>
            <button class="info-icon-btn" (click)="showInfoModal = true" title="Site & Geofence Guide">
              <span class="material-symbols-outlined">info</span>
            </button>
          </div>
          <p class="text-muted m-0 mt-1">Manage operating customer sites, GPS geofence zones, and Site Assignment Instructions (SIs).</p>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-primary d-flex align-items-center gap-1" (click)="loadSites()">
            <span class="material-symbols-outlined">refresh</span> Refresh
          </button>
          <button class="btn btn-primary d-flex align-items-center gap-1" (click)="openAddModal()">
            <span class="material-symbols-outlined">add_location_alt</span> Add Site
          </button>
        </div>
      </div>

      <!-- Sites Grid -->
      <div class="row g-4" *ngIf="!isLoading && sites.length > 0">
        <div class="col-md-6 col-lg-4" *ngFor="let s of sites">
          <div class="card h-100 shadow-sm border-0 site-card">
            <div class="card-body p-4">
              <div class="d-flex justify-content-between align-items-start mb-3">
                <span class="badge bg-primary-subtle text-primary font-monospace fw-bold">{{ s.siteCode }}</span>
                <span class="badge bg-success" *ngIf="s.activeShiftsCount > 0">{{ s.activeShiftsCount }} Active Shifts</span>
                <span class="badge bg-light text-muted border" *ngIf="s.activeShiftsCount === 0">0 Active</span>
              </div>
              <h5 class="fw-bold mb-1">{{ s.siteName }}</h5>
              <p class="text-muted small mb-3">
                <span class="material-symbols-outlined fs-6 align-middle">pin_drop</span>
                {{ s.address }}, {{ s.city }}
              </p>

              <div class="geofence-box p-3 rounded mb-3 bg-light border">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <span class="small fw-semibold text-secondary">Geofence Radius:</span>
                  <span class="badge bg-info text-dark font-monospace">{{ s.geofenceRadiusMeters }} meters</span>
                </div>
                <div class="small text-muted font-monospace" *ngIf="s.latitude && s.longitude">
                  GPS: {{ s.latitude | number:'1.4-4' }}, {{ s.longitude | number:'1.4-4' }}
                </div>
                <div class="small text-danger" *ngIf="!s.latitude || !s.longitude">
                  ⚠️ No GPS coordinates configured
                </div>
              </div>

              <div class="post-info small mb-3" *ngIf="s.requiredSiaLicenceType">
                <span class="text-muted">Required SIA Licence:</span>
                <span class="fw-medium text-dark ms-1">{{ s.requiredSiaLicenceType }}</span>
              </div>

              <div class="emergency-contact small p-2 rounded bg-warning-subtle text-dark border border-warning-subtle mb-3" *ngIf="s.emergencyContactPhone">
                <div class="fw-bold">Duty Contact: {{ s.emergencyContactName || 'Site Contact' }}</div>
                <div>📞 {{ s.emergencyContactPhone }}</div>
              </div>

              <div class="d-flex gap-2">
                <button class="btn btn-sm btn-outline-primary flex-fill" (click)="editSite(s)">Edit Geofence & Orders</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="empty-state text-center p-5 bg-white rounded shadow-sm" *ngIf="!isLoading && sites.length === 0">
        <span class="material-symbols-outlined display-4 text-muted mb-3">location_off</span>
        <h5>No client sites added</h5>
        <p class="text-muted">Add your customer posts and geofence locations to begin scheduling shifts.</p>
        <button class="btn btn-primary" (click)="openAddModal()">Add Client Site</button>
      </div>

      <div class="text-center p-5" *ngIf="isLoading">
        <div class="spinner-border text-primary" role="status"></div>
      </div>

      <!-- Add/Edit Modal -->
      <div class="modal-backdrop fade show" *ngIf="showModal"></div>
      <div class="modal fade show d-block" *ngIf="showModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">{{ editingSite.id ? 'Edit Client Site' : 'Add Client Site & Geofence' }}</h5>
              <button type="button" class="btn-close" (click)="showModal = false"></button>
            </div>
            <div class="modal-body">
              <div class="row g-3">
                <div class="col-md-4">
                  <label class="form-label">Site Code *</label>
                  <input type="text" class="form-control" [(ngModel)]="editingSite.siteCode" placeholder="e.g. SITE-101" required />
                </div>
                <div class="col-md-8">
                  <label class="form-label">Site Name *</label>
                  <input type="text" class="form-control" [(ngModel)]="editingSite.siteName" placeholder="e.g. Canary Wharf Tower" required />
                </div>
                <div class="col-md-12">
                  <label class="form-label">Street Address *</label>
                  <input type="text" class="form-control" [(ngModel)]="editingSite.address" placeholder="e.g. 1 Canada Square" required />
                </div>
                <div class="col-md-6">
                  <label class="form-label">City *</label>
                  <input type="text" class="form-control" [(ngModel)]="editingSite.city" placeholder="e.g. London" required />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Postal Code</label>
                  <input type="text" class="form-control" [(ngModel)]="editingSite.postalCode" placeholder="e.g. E14 5AA" />
                </div>
                <div class="col-md-4">
                  <label class="form-label">GPS Latitude</label>
                  <input type="number" class="form-control" [(ngModel)]="editingSite.latitude" step="0.0001" placeholder="e.g. 51.5049" />
                </div>
                <div class="col-md-4">
                  <label class="form-label">GPS Longitude</label>
                  <input type="number" class="form-control" [(ngModel)]="editingSite.longitude" step="0.0001" placeholder="e.g. -0.0195" />
                </div>
                <div class="col-md-4">
                  <label class="form-label">Geofence Radius (Meters)</label>
                  <input type="number" class="form-control" [(ngModel)]="editingSite.geofenceRadiusMeters" min="50" max="1000" step="25" />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Emergency Contact Person</label>
                  <input type="text" class="form-control" [(ngModel)]="editingSite.emergencyContactName" placeholder="e.g. First Last" />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Emergency Phone (24/7)</label>
                  <input type="text" class="form-control" [(ngModel)]="editingSite.emergencyContactPhone" placeholder="e.g. +44 20 7946 0000" />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Required SIA Licence</label>
                  <select class="form-select" [(ngModel)]="editingSite.requiredSiaLicenceType">
                    <option value="">No SIA licence required</option>
                    <option value="Door Supervision">Door Supervision</option>
                    <option value="Security Guarding">Security Guarding</option>
                    <option value="CCTV (Public Space Surveillance)">CCTV (Public Space Surveillance)</option>
                    <option value="Close Protection">Close Protection</option>
                  </select>
                </div>
                <div class="col-md-12">
                  <label class="form-label">Site Assignment Instructions (SIs / Orders)</label>
                  <textarea class="form-control" rows="3" [(ngModel)]="editingSite.siteAssignmentInstructions" placeholder="Key orders, lockup routines, patrol routes, and client handover instructions..."></textarea>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" (click)="showModal = false">Cancel</button>
              <button type="button" class="btn btn-primary" (click)="saveSite()" [disabled]="isSaving">
                <span class="spinner-border spinner-border-sm me-1" *ngIf="isSaving"></span> Save Site
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
              <h5 class="modal-title">About Site Geofences & SIs</h5>
              <button type="button" class="btn-close" (click)="showInfoModal = false"></button>
            </div>
            <div class="modal-body small text-muted">
              <p><strong>GPS Geofencing:</strong> Guards must clock in within the configured radius (e.g. 150m) of the site center. Any check-in attempted outside the radius is flagged to the control room in real time.</p>
              <p><strong>Site Assignment Instructions (SIs):</strong> Instructions configured here appear directly on the guard's mobile shift card so they always have site post orders at their fingertips.</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-primary" (click)="showInfoModal = false">Understood</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .sites-page { padding: 1.5rem; }
    .page-title { font-weight: 700; color: #1e293b; }
    .site-card { transition: transform 0.2s; }
    .site-card:hover { transform: translateY(-2px); }
    .info-icon-btn { background: none; border: none; color: #64748b; cursor: pointer; padding: 4px; border-radius: 50%; }
    .btn-primary { background-color: #0050E5; border-color: #0050E5; }
    .btn-primary:hover { background-color: #003db3; border-color: #003db3; }
  `]
})
export class WorkforceSitesComponent implements OnInit {
  sites: ClientSite[] = [];
  isLoading = false;
  isSaving = false;
  showModal = false;
  showInfoModal = false;

  editingSite: Partial<ClientSite> = {
    siteCode: '',
    siteName: '',
    address: '',
    city: '',
    postalCode: '',
    geofenceRadiusMeters: 150,
    requiredSiaLicenceType: 'Door Supervision'
  };

  constructor(
    private readonly workforceService: WorkforceService,
    private readonly toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadSites();
  }

  loadSites(): void {
    this.isLoading = true;
    this.workforceService.getSites().subscribe({
      next: (res: any) => {
        this.sites = res?.data || [];
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('Failed to load sites.');
      }
    });
  }

  openAddModal(): void {
    this.editingSite = {
      siteCode: `SITE-${this.sites.length + 101}`,
      siteName: '',
      address: '',
      city: '',
      postalCode: '',
      geofenceRadiusMeters: 150,
      requiredSiaLicenceType: 'Door Supervision'
    };
    this.showModal = true;
  }

  editSite(site: ClientSite): void {
    this.editingSite = { ...site };
    this.showModal = true;
  }

  saveSite(): void {
    if (!this.editingSite.siteName || !this.editingSite.siteCode) {
      this.toast.warning('Site code and site name are required.');
      return;
    }

    this.isSaving = true;
    this.workforceService.upsertSite(this.editingSite).subscribe({
      next: () => {
        this.isSaving = false;
        this.showModal = false;
        this.toast.success('Site profile saved.');
        this.loadSites();
      },
      error: (err: any) => {
        this.isSaving = false;
        this.toast.error(err?.error?.message || 'Failed to save site.');
      }
    });
  }
}

