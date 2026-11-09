import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { WorkforceService, ClientSite } from '../../../core/services/workforce.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Dedicated Page Component for Creating & Editing Customer Operating Sites and GPS Geofences.
 * Route: `/workforce/console/sites/create` and `/workforce/console/sites/edit/:id`
 * Follows CMS Studio enterprise standards with 2-column responsive layout, live geolocation detection,
 * radius chips, duty contacts, and Site Assignment Instructions (SIs).
 */
@Component({
  selector: 'app-workforce-site-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="bcp-page-container">
      <!-- 1. Breadcrumbs & Page Header -->
      <div class="page-header">
        <div class="header-left">
          <div class="breadcrumb">
            <a routerLink="/admin/dashboard">Command Center</a>
            <span class="sep">/</span>
            <span>Workforce &amp; Shifts</span>
            <span class="sep">/</span>
            <a routerLink="/workforce/console/sites">Client Sites &amp; Geofences</a>
            <span class="sep">/</span>
            <span class="current">{{ isEditMode ? 'Edit Site' : 'New Client Site' }}</span>
          </div>
          <div class="title-row">
            <h1>{{ isEditMode ? ('Edit Client Site: ' + (site.siteName || site.siteCode)) : 'Add Client Site & Geofence' }}</h1>
            <span class="badge-suite">Suite: Workforce &amp; Shifts</span>
          </div>
          <p class="subtitle">
            Configure venue post location, GPS coordinates, geofence radius boundaries, and Site Assignment Instructions (SIs).
          </p>
        </div>
        <div class="header-actions">
          <a routerLink="/workforce/console/sites" class="btn btn-outline">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>Back to Sites</span>
          </a>
          <button type="button" class="btn btn-primary" (click)="saveSite()" [disabled]="isSaving || isLoading">
            <span class="material-symbols-outlined" *ngIf="!isSaving">save</span>
            <span class="material-symbols-outlined spin" *ngIf="isSaving">sync</span>
            <span>{{ isSaving ? 'Saving...' : 'Save Site' }}</span>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div class="cms-loading-card" *ngIf="isLoading">
        <span class="material-symbols-outlined spin">progress_activity</span>
        <p>Loading site profile...</p>
      </div>

      <!-- Main Form Grid (2 Columns Responsive) -->
      <form (ngSubmit)="saveSite()" *ngIf="!isLoading" class="site-form-layout">
        <!-- Left Column: Venue Identity & Operating Contacts -->
        <div class="form-column">
          <!-- Card 1: Venue Identity & Physical Address -->
          <div class="cms-card">
            <div class="card-header">
              <div class="card-title-group">
                <span class="material-symbols-outlined text-blue">business</span>
                <div>
                  <h3>Venue Identity &amp; Address</h3>
                  <p class="card-subtitle">Customer post designation and physical operating location.</p>
                </div>
              </div>
            </div>

            <div class="card-body">
              <div class="form-row-dual">
                <div class="form-group">
                  <label class="form-label">Site Code <span class="required">*</span></label>
                  <input
                    type="text"
                    class="form-control"
                    [(ngModel)]="site.siteCode"
                    name="siteCode"
                    placeholder="e.g. SITE-101"
                    required
                  />
                  <span class="field-hint">Unique alphanumeric identifier for rota allocation.</span>
                </div>

                <div class="form-group">
                  <label class="form-label">Site / Venue Name <span class="required">*</span></label>
                  <input
                    type="text"
                    class="form-control"
                    [(ngModel)]="site.siteName"
                    name="siteName"
                    placeholder="e.g. Venue or Customer Post Name"
                    required
                  />
                  <span class="field-hint">Display title across schedules and mobile shift feeds.</span>
                </div>
              </div>

              <!-- Parent Client Organization -->
              <div class="form-group">
                <div class="field-header-row">
                  <label class="form-label mb-0">Parent Client Organization</label>
                  <button type="button" class="btn-text-action" (click)="openAddOrgModal()">+ Add New Organization</button>
                </div>
                <select class="form-control" [(ngModel)]="site.clientOrganizationId" name="clientOrganizationId" (change)="onOrgChanged()">
                  <option [ngValue]="null">-- Standalone Venue / Unassigned --</option>
                  <option *ngFor="let org of clientOrganizations" [value]="org.id">{{ org.name }} ({{ org.organizationCode }})</option>
                </select>
                <span class="field-hint">Groups multiple customer venue posts under an umbrella corporate client for unified billing.</span>
              </div>

              <div class="form-group">
                <label class="form-label">Street Address <span class="required">*</span></label>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="site.address"
                  name="address"
                  placeholder="e.g. 100 Main Street"
                  required
                />
              </div>

              <div class="form-row-dual">
                <div class="form-group">
                  <label class="form-label">City <span class="required">*</span></label>
                  <input
                    type="text"
                    class="form-control"
                    [(ngModel)]="site.city"
                    name="city"
                    placeholder="e.g. City Name"
                    required
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">Postal Code</label>
                  <input
                    type="text"
                    class="form-control"
                    [(ngModel)]="site.postalCode"
                    name="postalCode"
                    placeholder="e.g. SW1A 1AA"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Card 2: Duty Operations & Regulatory Compliance -->
          <div class="cms-card">
            <div class="card-header">
              <div class="card-title-group">
                <span class="material-symbols-outlined text-purple">badge</span>
                <div>
                  <h3>Operations &amp; Compliance</h3>
                  <p class="card-subtitle">Duty point of contact and mandatory credential/qualification requirements.</p>
                </div>
              </div>
            </div>

            <div class="card-body">
              <div class="form-row-dual">
                <div class="form-group">
                  <label class="form-label">Duty Contact Person</label>
                  <input
                    type="text"
                    class="form-control"
                    [(ngModel)]="site.emergencyContactName"
                    name="emergencyContactName"
                    placeholder="e.g. First Last"
                  />
                  <span class="field-hint">Site supervisor, facility lead, or emergency contact.</span>
                </div>

                <div class="form-group">
                  <label class="form-label">Duty Phone (24/7)</label>
                  <input
                    type="tel"
                    class="form-control"
                    [(ngModel)]="site.emergencyContactPhone"
                    name="emergencyContactPhone"
                    placeholder="e.g. +44 20 7946 0000"
                  />
                  <span class="field-hint">24/7 incident phone line for on-duty guards.</span>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Required Credential / Document Category</label>
                <select class="form-control" [(ngModel)]="site.requiredSiaLicenceType" name="requiredSiaLicenceType">
                  <option value="">No credential required</option>
                  <option *ngFor="let cat of documentCategories" [value]="cat.name">
                    {{ cat.name }} ({{ cat.code }})
                  </option>
                </select>
                <span class="field-hint">Personnel dispatched to this site must hold an active verified document under this category.</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: GPS Geofence & Assignment Instructions -->
        <div class="form-column">
          <!-- Card 3: GPS Geofence Boundary Precision -->
          <div class="cms-card">
            <div class="card-header">
              <div class="card-title-group">
                <span class="material-symbols-outlined text-green">radar</span>
                <div>
                  <h3>GPS Geofence Boundary</h3>
                  <p class="card-subtitle">Precise satellite coordinates and allowable check-in radius.</p>
                </div>
              </div>
              <button type="button" class="btn-detect-gps" (click)="detectAdminGps()" [disabled]="isDetectingGps">
                <span class="material-symbols-outlined" [class.spin]="isDetectingGps">my_location</span>
                <span>{{ isDetectingGps ? 'Locating...' : 'Detect My GPS' }}</span>
              </button>
            </div>

            <div class="card-body">
              <div class="geofence-alert-banner">
                <span class="material-symbols-outlined">verified</span>
                <div>
                  <strong>Automated Proximity Gatekeeper</strong>
                  <p>Guards must clock in within this radius of the post center. Mobile and desktop apps flag attendance violations if an officer checks in outside this zone.</p>
                </div>
              </div>

              <div class="form-row-dual">
                <div class="form-group">
                  <label class="form-label">Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    class="form-control"
                    [(ngModel)]="site.latitude"
                    name="latitude"
                    placeholder="e.g. 51.504900"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    class="form-control"
                    [(ngModel)]="site.longitude"
                    name="longitude"
                    placeholder="e.g. -0.019500"
                  />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Geofence Radius (Meters)</label>
                <div class="radius-input-group">
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    class="form-control radius-input"
                    [(ngModel)]="site.geofenceRadiusMeters"
                    name="geofenceRadiusMeters"
                    placeholder="50"
                  />
                  <span class="radius-unit">meters</span>
                </div>
                <div class="radius-chips">
                  <button type="button" class="chip" [class.active]="site.geofenceRadiusMeters === 25" (click)="setRadius(25)">25m (Gatehouse)</button>
                  <button type="button" class="chip" [class.active]="site.geofenceRadiusMeters === 50" (click)="setRadius(50)">50m (Standard)</button>
                  <button type="button" class="chip" [class.active]="site.geofenceRadiusMeters === 100" (click)="setRadius(100)">100m (Large Building)</button>
                  <button type="button" class="chip" [class.active]="site.geofenceRadiusMeters === 250" (click)="setRadius(250)">250m (Campus / Park)</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Card 4: Site Assignment Instructions (SIs / Post Orders) -->
          <div class="cms-card">
            <div class="card-header">
              <div class="card-title-group">
                <span class="material-symbols-outlined text-blue">description</span>
                <div>
                  <h3>Site Assignment Instructions (SIs)</h3>
                  <p class="card-subtitle">Standard operating procedures, patrol routes, and handover protocols.</p>
                </div>
              </div>
            </div>

            <div class="card-body">
              <div class="form-group">
                <label class="form-label">Post Orders &amp; Security Instructions</label>
                <textarea
                  class="form-control instructions-textarea"
                  rows="6"
                  [(ngModel)]="site.siteAssignmentInstructions"
                  name="siteAssignmentInstructions"
                  placeholder="Post orders, lockup routines, patrol routes, access key locations, and emergency escalation procedures..."
                ></textarea>
                <span class="field-hint">Guards can read these instructions directly inside the mobile app upon accepting and clocking into shifts at this venue.</span>
              </div>
            </div>
          </div>
        </div>
      </form>

      <!-- Bottom Sticky Action Bar -->
      <div class="bottom-action-bar" *ngIf="!isLoading">
        <div class="action-info">
          <span class="material-symbols-outlined text-blue">info</span>
          <span>Ensure GPS coordinates and Site Code are verified before saving.</span>
        </div>
        <div class="action-buttons">
          <a routerLink="/workforce/console/sites" class="btn btn-outline">Cancel</a>
          <button type="button" class="btn btn-primary" (click)="saveSite()" [disabled]="isSaving">
            <span class="material-symbols-outlined" *ngIf="!isSaving">save</span>
            <span class="material-symbols-outlined spin" *ngIf="isSaving">sync</span>
            <span>{{ isSaving ? 'Saving...' : (isEditMode ? 'Update Site' : 'Save Site') }}</span>
          </button>
        </div>
      </div>

      <!-- Quick Create Organization Modal -->
      <div class="modal-backdrop" *ngIf="showAddOrgModal" (click)="showAddOrgModal = false">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="material-symbols-outlined text-blue">corporate_fare</span>
              <div>
                <h3>Add Client Organization</h3>
                <p class="modal-subtitle">Register parent client account for invoicing and site grouping.</p>
              </div>
            </div>
            <button type="button" class="btn-close" (click)="showAddOrgModal = false">&times;</button>
          </div>

          <div class="modal-body">
            <div class="form-row-dual">
              <div class="form-group">
                <label class="form-label">Company Name <span class="required">*</span></label>
                <input type="text" class="form-control" [(ngModel)]="orgForm.name" placeholder="e.g. Commercial Property Group" required />
              </div>
              <div class="form-group">
                <label class="form-label">Client Code</label>
                <input type="text" class="form-control" [(ngModel)]="orgForm.organizationCode" placeholder="e.g. CPG-CORP" />
              </div>
            </div>

            <div class="form-row-dual">
              <div class="form-group">
                <label class="form-label">Billing Email Address <span class="required">*</span></label>
                <input type="email" class="form-control" [(ngModel)]="orgForm.billingEmail" placeholder="name@company.com" required />
              </div>
              <div class="form-group">
                <label class="form-label">Billing Phone Number</label>
                <input type="tel" class="form-control" [(ngModel)]="orgForm.billingPhone" placeholder="e.g. +44 20 7946 0000" />
              </div>
            </div>

            <div class="form-row-dual">
              <div class="form-group">
                <label class="form-label">Account Manager</label>
                <input type="text" class="form-control" [(ngModel)]="orgForm.accountManagerName" placeholder="e.g. First Last" />
              </div>
              <div class="form-group">
                <label class="form-label">Payment Terms (Days)</label>
                <input type="number" class="form-control" [(ngModel)]="orgForm.paymentTermsDays" placeholder="30" />
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="showAddOrgModal = false">Cancel</button>
            <button type="button" class="btn btn-primary" (click)="saveOrganization()" [disabled]="isSavingOrg">
              <span class="material-symbols-outlined" *ngIf="!isSavingOrg">save</span>
              <span class="material-symbols-outlined spin" *ngIf="isSavingOrg">sync</span>
              <span>{{ isSavingOrg ? 'Saving...' : 'Create Organization' }}</span>
            </button>
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
      padding: 0 4px 40px 4px;
      max-width: 1320px;
      margin: 0 auto;
    }

    /* Page Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      flex-wrap: wrap;
    }
    .header-left {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #64748b;
    }
    .breadcrumb a {
      color: #0050e5;
      text-decoration: none;
      font-weight: 500;
    }
    .breadcrumb a:hover {
      text-decoration: underline;
    }
    .breadcrumb .sep {
      color: #cbd5e1;
    }
    .breadcrumb .current {
      color: #0f172a;
      font-weight: 600;
    }
    .title-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .title-row h1 {
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
      letter-spacing: -0.02em;
    }
    .badge-suite {
      font-size: 11px;
      font-weight: 700;
      background: #eff6ff;
      color: #0050e5;
      padding: 3px 10px;
      border-radius: 999px;
      border: 1px solid #bfdbfe;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .subtitle {
      font-size: 14px;
      color: #64748b;
      margin: 0;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    /* CMS Form Layout (2 Columns) */
    .site-form-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      align-items: start;
    }
    .form-column {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* CMS Card */
    .cms-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0,0,0,0.02);
      transition: box-shadow 0.2s ease;
    }
    .cms-card:hover {
      box-shadow: 0 8px 24px rgba(0,0,0,0.04);
    }
    .card-header {
      padding: 18px 22px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
    .card-title-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .card-title-group .material-symbols-outlined {
      font-size: 24px;
    }
    .card-title-group h3 {
      font-size: 15.5px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 2px 0;
    }
    .card-subtitle {
      font-size: 12px;
      color: #64748b;
      margin: 0;
    }
    .card-body {
      padding: 22px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* Form Inputs */
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
      transition: all 0.2s;
      font-family: inherit;
      background: #ffffff;
    }
    .form-control:focus {
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.12);
    }
    .field-hint {
      font-size: 11.5px;
      color: #64748b;
    }
    .instructions-textarea {
      resize: vertical;
      min-height: 120px;
      line-height: 1.5;
    }

    /* GPS Geofence Styles */
    .geofence-alert-banner {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 10px;
      padding: 12px 14px;
    }
    .geofence-alert-banner .material-symbols-outlined {
      color: #16a34a;
      font-size: 20px;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .geofence-alert-banner strong {
      display: block;
      font-size: 12.5px;
      color: #14532d;
      margin-bottom: 2px;
    }
    .geofence-alert-banner p {
      font-size: 12px;
      color: #166534;
      margin: 0;
      line-height: 1.4;
    }

    .btn-detect-gps {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #0050e5;
      padding: 7px 13px;
      border-radius: 8px;
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-detect-gps:hover:not(:disabled) {
      background: #dbeafe;
      border-color: #93c5fd;
    }
    .btn-detect-gps:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .btn-detect-gps .material-symbols-outlined {
      font-size: 16px;
    }

    .radius-input-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .radius-input {
      max-width: 140px;
    }
    .radius-unit {
      font-size: 13px;
      font-weight: 600;
      color: #64748b;
    }

    .radius-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 6px;
    }
    .chip {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 999px;
      padding: 5px 12px;
      font-size: 11.5px;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      transition: all 0.2s;
    }
    .chip:hover {
      background: #e2e8f0;
      color: #0f172a;
    }
    .chip.active {
      background: #eff6ff;
      border-color: #0050e5;
      color: #0050e5;
      font-weight: 700;
    }

    /* Bottom Action Bar */
    .bottom-action-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 16px 22px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.02);
      flex-wrap: wrap;
      gap: 12px;
    }
    .action-info {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #64748b;
    }
    .action-info .material-symbols-outlined {
      font-size: 18px;
    }
    .action-buttons {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 9px 18px;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid transparent;
      text-decoration: none;
    }
    .btn-primary {
      background: #0050e5;
      color: #ffffff;
    }
    .btn-primary:hover:not(:disabled) {
      background: #003ebd;
    }
    .btn-outline {
      background: #ffffff;
      border-color: #cbd5e1;
      color: #334155;
    }
    .btn-outline:hover:not(:disabled) {
      background: #f8fafc;
      border-color: #94a3b8;
    }
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Utility Colors */
    .text-blue { color: #0050e5; }
    .text-purple { color: #7c3aed; }
    .text-green { color: #16a34a; }

    .spin {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .cms-loading-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 48px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: #64748b;
    }

    .field-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }
    .btn-text-action {
      background: none;
      border: none;
      color: #0050e5;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      padding: 0;
    }
    .btn-text-action:hover {
      text-decoration: underline;
    }

    /* Modal Backdrop & Card */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .modal-card {
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
      width: 100%;
      max-width: 520px;
      overflow: hidden;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 18px 24px;
      border-bottom: 1px solid #e2e8f0;
    }
    .modal-title-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .modal-title-group h3 {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .modal-subtitle {
      font-size: 12px;
      color: #64748b;
      margin: 2px 0 0 0;
    }
    .btn-close {
      background: none;
      border: none;
      font-size: 24px;
      color: #94a3b8;
      cursor: pointer;
      line-height: 1;
    }
    .modal-body {
      padding: 20px 24px;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 14px 24px;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
    }

    /* Responsive */
    @media (max-width: 992px) {
      .site-form-layout {
        grid-template-columns: 1fr;
      }
      .page-header {
        flex-direction: column;
      }
      .header-actions {
        width: 100%;
        justify-content: flex-end;
      }
      .bottom-action-bar {
        flex-direction: column;
        align-items: stretch;
      }
      .action-buttons {
        justify-content: flex-end;
      }
    }

    @media (max-width: 640px) {
      .form-row-dual {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class WorkforceSiteEditComponent implements OnInit {
  isEditMode = false;
  isLoading = false;
  isSaving = false;
  isDetectingGps = false;

  clientOrganizations: any[] = [];
  showAddOrgModal = false;
  isSavingOrg = false;
  orgForm: any = {
    name: '',
    organizationCode: '',
    billingEmail: '',
    billingPhone: '',
    accountManagerName: '',
    paymentTermsDays: 30
  };

  site: Partial<ClientSite> = {
    siteCode: '',
    siteName: '',
    address: '',
    city: '',
    postalCode: '',
    geofenceRadiusMeters: 50,
    requiredSiaLicenceType: ''
  };

  documentCategories: any[] = [];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly workforceService: WorkforceService,
    private readonly toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadClientOrganizations();
    this.loadDocumentCategories();
    const siteId = this.route.snapshot.paramMap.get('id');
    if (siteId) {
      this.isEditMode = true;
      this.loadSite(siteId);
    } else {
      this.isEditMode = false;
      this.prepareNewSiteCode();
    }
  }

  loadDocumentCategories(): void {
    this.workforceService.getDocumentCategories().subscribe({
      next: (res: any) => {
        if (res?.data && Array.isArray(res.data)) {
          this.documentCategories = res.data;
        }
      },
      error: () => {}
    });
  }

  loadClientOrganizations(): void {
    this.workforceService.getClientOrganizations().subscribe({
      next: (res: any) => {
        if (res && res.data) {
          this.clientOrganizations = res.data;
        }
      },
      error: () => {}
    });
  }

  openAddOrgModal(): void {
    this.orgForm = {
      name: '',
      organizationCode: '',
      billingEmail: '',
      billingPhone: '',
      accountManagerName: '',
      paymentTermsDays: 30
    };
    this.showAddOrgModal = true;
  }

  saveOrganization(): void {
    if (!this.orgForm.name?.trim() || !this.orgForm.billingEmail?.trim()) {
      this.toast.warning('Company Name and Billing Email are required.');
      return;
    }

    this.isSavingOrg = true;
    this.workforceService.createClientOrganization(this.orgForm).subscribe({
      next: (res: any) => {
        this.isSavingOrg = false;
        this.showAddOrgModal = false;
        this.toast.success(`Client organization '${this.orgForm.name}' created.`);
        this.loadClientOrganizations();
        if (res && res.data) {
          this.site.clientOrganizationId = res.data.id;
          this.site.clientOrganizationName = res.data.name;
        }
      },
      error: (err: any) => {
        this.isSavingOrg = false;
        this.toast.error(err?.error?.message || 'Failed to create organization.');
      }
    });
  }

  onOrgChanged(): void {
    const selected = this.clientOrganizations.find(o => o.id === this.site.clientOrganizationId);
    this.site.clientOrganizationName = selected ? selected.name : undefined;
  }

  private loadSite(id: string): void {
    this.isLoading = true;
    this.workforceService.getSiteById(id).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res && res.data) {
          this.site = { ...res.data };
        } else {
          this.toast.error('Site profile could not be found.');
          this.router.navigate(['/workforce/console/sites']);
        }
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('Failed to load site details.');
        this.router.navigate(['/workforce/console/sites']);
      }
    });
  }

  private prepareNewSiteCode(): void {
    this.workforceService.getSites().subscribe({
      next: (res: any) => {
        const count = res?.data?.length || 0;
        this.site.siteCode = `SITE-${count + 101}`;
      },
      error: () => {
        this.site.siteCode = 'SITE-101';
      }
    });
  }

  setRadius(meters: number): void {
    this.site.geofenceRadiusMeters = meters;
  }

  detectAdminGps(): void {
    if (!('geolocation' in navigator)) {
      this.toast.error('Geolocation is not supported by your browser.');
      return;
    }

    this.isDetectingGps = true;
    this.toast.info('Detecting satellite coordinates...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.isDetectingGps = false;
        this.site.latitude = Number(pos.coords.latitude.toFixed(6));
        this.site.longitude = Number(pos.coords.longitude.toFixed(6));
        this.toast.success(`Coordinates pinned: ${this.site.latitude}, ${this.site.longitude} (±${Math.round(pos.coords.accuracy)}m)`);
      },
      (err) => {
        this.isDetectingGps = false;
        this.toast.error('Unable to detect location: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  saveSite(): void {
    if (!this.site.siteName?.trim() || !this.site.siteCode?.trim()) {
      this.toast.warning('Site Code and Site Name are mandatory.');
      return;
    }

    if (!this.site.address?.trim() || !this.site.city?.trim()) {
      this.toast.warning('Street address and city are mandatory for geocoding.');
      return;
    }

    this.isSaving = true;
    this.workforceService.upsertSite(this.site).subscribe({
      next: () => {
        this.isSaving = false;
        this.toast.success(this.isEditMode ? 'Site profile updated successfully.' : 'New client site created successfully.');
        this.router.navigate(['/workforce/console/sites']);
      },
      error: (err: any) => {
        this.isSaving = false;
        this.toast.error(err?.error?.message || 'Failed to save site.');
      }
    });
  }
}

