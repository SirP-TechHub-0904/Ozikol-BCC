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
    .sites-page {
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
    .info-icon-btn {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      color: #64748b;
      cursor: pointer;
      padding: 6px;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }
    .info-icon-btn:hover {
      color: #0050e5;
      border-color: #0050e5;
      background: #eff6ff;
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
    .flex-fill { flex: 1 1 auto; }

    /* Layout & Cards */
    .row {
      display: flex;
      flex-wrap: wrap;
      margin: -12px;
    }
    .g-4 > [class*="col"] {
      padding: 12px;
      box-sizing: border-box;
    }
    .col-md-4 { flex: 0 0 33.333333%; max-width: 33.333333%; }
    .col-md-6 { flex: 0 0 50%; max-width: 50%; }
    .col-md-8 { flex: 0 0 66.666667%; max-width: 66.666667%; }
    .col-md-12 { flex: 0 0 100%; max-width: 100%; }
    .col-lg-4 { flex: 0 0 33.333333%; max-width: 33.333333%; }
    @media (max-width: 992px) {
      .col-lg-4 { flex: 0 0 50%; max-width: 50%; }
    }
    @media (max-width: 768px) {
      .col-md-4, .col-md-6, .col-md-8, .col-lg-4 { flex: 0 0 100%; max-width: 100%; }
    }

    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      display: flex;
      flex-direction: column;
    }
    .site-card {
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .site-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.08);
    }
    .card-body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .h-100 { height: 100%; }
    .border-0 { border: none !important; }

    /* Geofence & Details */
    .geofence-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 12px;
    }
    .emergency-contact {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 8px;
      padding: 10px;
      margin-bottom: 12px;
      font-size: 12px;
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
    .bg-primary-subtle { background: #eff6ff; }
    .text-primary { color: #0050e5 !important; }
    .bg-success { background: #16a34a !important; color: #ffffff !important; }
    .bg-info { background: #0284c7 !important; color: #ffffff !important; }
    .bg-light { background: #f1f5f9 !important; color: #475569 !important; }
    .text-secondary { color: #475569; }
    .text-danger { color: #dc2626 !important; }
    .font-monospace { font-family: monospace; }
    .fw-bold { font-weight: 700; }
    .fw-semibold { font-weight: 600; }
    .fw-medium { font-weight: 500; }
    .fs-6 { font-size: 16px; }
    .small { font-size: 12px; }
    .d-flex { display: flex; }
    .justify-content-between { justify-content: space-between; }
    .align-items-center { align-items: center; }
    .align-items-start { align-items: flex-start; }
    .gap-2 { gap: 8px; }
    .mb-1 { margin-bottom: 4px; }
    .mb-3 { margin-bottom: 12px; }
    .mb-4 { margin-bottom: 24px; }
    .m-0 { margin: 0; }
    .mt-1 { margin-top: 4px; }
    .ms-1 { margin-left: 4px; }
    .p-3 { padding: 16px; }
    .p-4 { padding: 20px; }
    .p-5 { padding: 48px; }
    .border { border: 1px solid #e2e8f0; }
    .rounded { border-radius: 8px; }
    .shadow-sm { box-shadow: 0 1px 3px rgba(0,0,0,0.04); }

    /* Form & Inputs */
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
      transition: border-color 0.15s;
      box-sizing: border-box;
    }
    .form-select:focus, .form-control:focus {
      outline: none;
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0,80,229,0.12);
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 60px 20px;
    }
    .empty-state h5 {
      font-size: 17px;
      font-weight: 700;
      margin: 12px 0 6px;
      color: #0f172a;
    }
    .empty-state p {
      font-size: 13.5px;
      color: #64748b;
      margin-bottom: 20px;
    }
    .empty-state .material-symbols-outlined {
      font-size: 54px;
      color: #94a3b8;
    }

    /* Modal Dialogs */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.55);
      z-index: 1040;
      backdrop-filter: blur(2px);
    }
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
      overflow-y: auto;
      padding: 20px;
      box-sizing: border-box;
    }
    .modal-dialog {
      width: 100%;
      max-width: 680px;
      margin: auto;
    }
    .modal-content {
      background: #ffffff;
      border-radius: 14px;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
      border: 1px solid #e2e8f0;
      overflow: hidden;
    }
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 24px;
      border-bottom: 1px solid #e2e8f0;
    }
    .modal-title {
      font-size: 17px;
      font-weight: 700;
      margin: 0;
      color: #0f172a;
    }
    .btn-close {
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      color: #64748b;
      padding: 4px;
      line-height: 1;
    }
    .btn-close:hover { color: #0f172a; }
    .btn-close::before { content: '✕'; font-family: Arial, sans-serif; }
    .modal-body {
      padding: 24px;
      max-height: calc(85vh - 140px);
      overflow-y: auto;
    }
    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
    }

    /* Dark Mode */
    :host-context(.dark-mode) .sites-page { color: #f8fafc; }
    :host-context(.dark-mode) .page-title { color: #f8fafc; }
    :host-context(.dark-mode) .card,
    :host-context(.dark-mode) .empty-state,
    :host-context(.dark-mode) .modal-content {
      background: #1e293b;
      border-color: rgba(255,255,255,0.08);
      color: #f8fafc;
    }
    :host-context(.dark-mode) .geofence-box {
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

