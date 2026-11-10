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
    <div class="bcp-page-container">
      <!-- 1. Canonical Page Header -->
      <div class="page-header">
        <div class="header-left">
          <div class="breadcrumb">
            <a routerLink="/admin/dashboard">Command Center</a>
            <span class="sep">/</span>
            <span>Workforce &amp; Shifts</span>
            <span class="sep">/</span>
            <span class="current">Client Sites &amp; Geofences</span>
          </div>
          <div class="title-row">
            <h1>Client Sites &amp; Geofences</h1>
            <button type="button" class="info-trigger-btn" (click)="showInfoModal = true" title="Site &amp; Geofence Guide">
              <span class="material-symbols-outlined">info</span>
            </button>
            <span class="badge-suite">Suite: Workforce &amp; Shifts</span>
          </div>
          <p class="subtitle">Manage operating customer sites, GPS geofence zones, and Site Assignment Instructions (SIs).</p>
        </div>
        <div class="header-actions">
          <a routerLink="/workforce/console/schedule" class="btn btn-outline" title="Back to Rota & Shift Management">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>Back to Rota</span>
          </a>
          <button type="button" class="btn btn-outline" (click)="loadSites()">
            <span class="material-symbols-outlined" [class.spin]="isLoading">refresh</span>
            <span>Refresh</span>
          </button>
          <a routerLink="/workforce/console/sites/create" class="btn btn-primary">
            <span class="material-symbols-outlined">add_location_alt</span>
            <span>Add Client Site</span>
          </a>
        </div>
      </div>

      <!-- 2. Toolbar & View Mode Switcher -->
      <div class="toolbar-card">
        <div class="toolbar-left">
          <div class="search-input-box">
            <span class="material-symbols-outlined">search</span>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              placeholder="Search sites by name, code, or city..."
              class="search-input"
            />
            <button type="button" class="clear-search-btn" *ngIf="searchQuery" (click)="searchQuery = ''">&times;</button>
          </div>
          <select class="filter-dropdown" [(ngModel)]="selectedLicenceFilter">
            <option value="">All Credential Requirements</option>
            <option *ngFor="let cat of documentCategories" [value]="cat.name">{{ cat.name }}</option>
          </select>
        </div>
        <div class="toolbar-right">
          <span class="count-badge">{{ filteredSites.length }} Sites</span>
          <div class="view-mode-toggle">
            <button
              type="button"
              class="view-btn"
              [class.active]="viewMode === 'cards'"
              (click)="viewMode = 'cards'"
              title="Cards View"
            >
              <span class="material-symbols-outlined">grid_view</span>
              <span>Cards</span>
            </button>
            <button
              type="button"
              class="view-btn"
              [class.active]="viewMode === 'table'"
              (click)="viewMode = 'table'"
              title="Table View"
            >
              <span class="material-symbols-outlined">table_rows</span>
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-state-card" *ngIf="isLoading && sites.length === 0">
        <div class="spinner-ring"></div>
        <p>Loading operating sites and geofence perimeters...</p>
      </div>

      <!-- 3. Sites Cards Grid (When viewMode === 'cards') -->
      <div class="sites-grid" *ngIf="!isLoading && viewMode === 'cards' && filteredSites.length > 0">
        <div class="site-card" *ngFor="let s of filteredSites">
          <div class="site-card-header">
            <div class="code-badge">{{ s.siteCode }}</div>
            <span class="status-badge active" *ngIf="s.activeShiftsCount > 0">
              <span class="live-dot"></span> {{ s.activeShiftsCount }} Active Shifts
            </span>
            <span class="status-badge idle" *ngIf="s.activeShiftsCount === 0">0 Active Shifts</span>
          </div>

          <a [routerLink]="['/workforce/console/sites', s.id, 'activity']" class="site-title-link">
            <h3 class="site-title">{{ s.siteName }}</h3>
          </a>
          <div class="org-pill-row" *ngIf="s.clientOrganizationName">
            <span class="org-pill">
              <span class="material-symbols-outlined">corporate_fare</span>
              {{ s.clientOrganizationName }}
            </span>
          </div>
          <p class="site-location">
            <span class="material-symbols-outlined pin-icon">pin_drop</span>
            <span>{{ s.address }}, {{ s.city }}</span>
          </p>

          <!-- Geofence Coordinates & Radius Box -->
          <div class="geofence-box">
            <div class="geofence-row">
              <span class="geofence-label">Geofence Radius:</span>
              <span class="radius-chip">{{ s.geofenceRadiusMeters || 50 }} meters</span>
            </div>
            <div class="gps-coords" *ngIf="s.latitude && s.longitude">
              <span class="material-symbols-outlined coord-icon">my_location</span>
              <span>GPS: {{ s.latitude | number:'1.4-4' }}, {{ s.longitude | number:'1.4-4' }}</span>
            </div>
            <div class="gps-unconfigured" *ngIf="!s.latitude || !s.longitude">
              <span class="material-symbols-outlined">warning</span>
              <span>No GPS coordinates configured</span>
            </div>
          </div>

          <!-- SIA Licensing Tag -->
          <div class="licence-tag-row" *ngIf="s.requiredSiaLicenceType">
            <span class="licence-label">Required Licence:</span>
            <span class="licence-badge">{{ s.requiredSiaLicenceType }}</span>
          </div>

          <!-- Emergency Duty Contact -->
          <div class="emergency-contact-card" *ngIf="s.emergencyContactPhone">
            <div class="contact-header">
              <span class="material-symbols-outlined">call</span>
              <strong>{{ s.emergencyContactName || 'Site Contact' }}</strong>
            </div>
            <div class="contact-phone">{{ s.emergencyContactPhone }}</div>
          </div>

          <div class="site-card-actions">
            <a [routerLink]="['/workforce/console/sites', s.id, 'activity']" class="btn btn-primary full-width">
              <span class="material-symbols-outlined">assignment_ind</span>
              <span>Duty History &amp; Staff</span>
            </a>
            <a [routerLink]="['/workforce/console/sites/edit', s.id]" class="btn btn-outline full-width">
              <span class="material-symbols-outlined">tune</span>
              <span>Edit Geofence &amp; Orders</span>
            </a>
          </div>
        </div>
      </div>

      <!-- 4. Sites Table (When viewMode === 'table') -->
      <div class="cms-card" *ngIf="!isLoading && viewMode === 'table' && filteredSites.length > 0">
        <div class="table-responsive">
          <table class="cms-table">
            <thead>
              <tr>
                <th>SITE CODE</th>
                <th>VENUE NAME &amp; ADDRESS</th>
                <th>CITY</th>
                <th>GEOFENCE RADIUS</th>
                <th>GPS COORDINATES</th>
                <th>REQUIRED CREDENTIAL</th>
                <th>ACTIVE SHIFTS</th>
                <th style="text-align: right;">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let s of filteredSites">
                <td>
                  <span class="code-badge">{{ s.siteCode }}</span>
                </td>
                <td>
                  <div class="site-table-cell">
                    <a [routerLink]="['/workforce/console/sites', s.id, 'activity']" class="site-table-link">
                      <strong>{{ s.siteName }}</strong>
                    </a>
                    <span class="org-pill-sm" *ngIf="s.clientOrganizationName">
                      <span class="material-symbols-outlined">corporate_fare</span>
                      {{ s.clientOrganizationName }}
                    </span>
                    <span class="address-sub">{{ s.address }}</span>
                  </div>
                </td>
                <td>{{ s.city }}</td>
                <td>
                  <span class="radius-chip">{{ s.geofenceRadiusMeters || 50 }}m</span>
                </td>
                <td>
                  <span class="gps-text" *ngIf="s.latitude && s.longitude">
                    {{ s.latitude | number:'1.4-4' }}, {{ s.longitude | number:'1.4-4' }}
                  </span>
                  <span class="text-danger-mini" *ngIf="!s.latitude || !s.longitude">Unconfigured</span>
                </td>
                <td>
                  <span class="licence-badge" *ngIf="s.requiredSiaLicenceType">{{ s.requiredSiaLicenceType }}</span>
                  <span class="text-muted-mini" *ngIf="!s.requiredSiaLicenceType">None</span>
                </td>
                <td>
                  <span class="status-badge active" *ngIf="s.activeShiftsCount > 0">
                    <span class="live-dot"></span> {{ s.activeShiftsCount }} Active
                  </span>
                  <span class="status-badge idle" *ngIf="s.activeShiftsCount === 0">0 Active</span>
                </td>
                <td style="text-align: right;">
                  <div class="table-actions-row">
                    <a [routerLink]="['/workforce/console/sites', s.id, 'activity']" class="btn-action-sm btn-action-primary" title="Duty History &amp; Staff">
                      <span class="material-symbols-outlined">assignment_ind</span>
                      <span>Duty &amp; Staff</span>
                    </a>
                    <a [routerLink]="['/workforce/console/sites/edit', s.id]" class="btn-action-sm" title="Edit Geofence &amp; Orders">
                      <span class="material-symbols-outlined">edit</span>
                      <span>Edit</span>
                    </a>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 5. Empty State Card -->
      <div class="empty-state-card" *ngIf="!isLoading && filteredSites.length === 0">
        <div class="empty-icon-circle">
          <span class="material-symbols-outlined">location_off</span>
        </div>
        <h3>No Operating Sites Found</h3>
        <p *ngIf="searchQuery || selectedLicenceFilter">No client sites match the current search filters. Clear your filters to see all sites.</p>
        <p *ngIf="!searchQuery && !selectedLicenceFilter">Add your customer posts and geofence locations to begin scheduling shifts and enforcing check-in bounds.</p>
        <a routerLink="/workforce/console/sites/create" class="btn btn-primary" *ngIf="!searchQuery && !selectedLicenceFilter">
          <span class="material-symbols-outlined">add_location_alt</span>
          <span>Add Client Site</span>
        </a>
      </div>

      <!-- 6. Info Modal (i) -->
      <div class="modal-backdrop" *ngIf="showInfoModal" (click)="showInfoModal = false">
        <div class="modal-card modal-large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="material-symbols-outlined text-blue">info</span>
              <div>
                <h3>About Client Sites &amp; Geofencing</h3>
                <p class="modal-subtitle">How geofences, arbitrary radius boundaries, and post orders work.</p>
              </div>
            </div>
            <button type="button" class="btn-close" (click)="showInfoModal = false">&times;</button>
          </div>

          <div class="modal-body info-guide-body">
            <div class="info-guide-section">
              <h4><span class="material-symbols-outlined text-blue">radar</span> GPS Geofence Boundaries</h4>
              <p>
                Each operating post has exact latitude and longitude coordinates. Administrators can set an arbitrary meter radius (e.g. <strong>4 meters</strong> for a tight security gatehouse, or <strong>150 meters</strong> for a multi-building logistics park).
              </p>
              <p>
                When guards clock in or out via the mobile or desktop portal, the system calculates their Haversine distance from the center pin. Check-ins outside the geofence perimeter trigger an instant geofence violation alert in the control room.
              </p>
            </div>

            <div class="info-guide-section">
              <h4><span class="material-symbols-outlined text-green">description</span> Site Assignment Instructions (SIs)</h4>
              <p>
                Post orders entered here sync directly to the assigned staff member's shift detail view so they always have access to key access codes, emergency evacuation protocols, and client handover procedures.
              </p>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-primary" (click)="showInfoModal = false">Understood</button>
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
    .full-width {
      width: 100%;
      justify-content: center;
    }
    .spin {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    /* Toolbar Card */
    .toolbar-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 14px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      box-shadow: 0 2px 8px rgba(0,0,0,0.02);
    }
    .toolbar-left, .toolbar-right {
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
      width: 260px;
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
    .count-badge {
      font-size: 12px;
      font-weight: 700;
      background: #eff6ff;
      color: #0050e5;
      padding: 4px 12px;
      border-radius: 12px;
      border: 1px solid #bfdbfe;
    }
    .view-mode-toggle {
      display: inline-flex;
      background: #f1f5f9;
      padding: 3px;
      border-radius: 8px;
      gap: 2px;
    }
    .view-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 12px;
      border-radius: 6px;
      border: none;
      background: none;
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      transition: all 0.15s;
    }
    .view-btn .material-symbols-outlined {
      font-size: 16px;
    }
    .view-btn.active {
      background: #ffffff;
      color: #0050e5;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    /* Sites Cards Grid */
    .sites-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }
    .site-card {
      background: var(--md-sys-color-surface, #ffffff);
      border: 1px solid var(--md-sys-color-outline, #e2e8f0);
      border-radius: 16px;
      padding: 22px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.02);
      display: flex;
      flex-direction: column;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .site-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 24px rgba(0, 80, 229, 0.08);
      border-color: #cbd5e1;
    }
    .site-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .code-badge {
      font-size: 12px;
      font-weight: 800;
      font-family: monospace;
      color: #0050e5;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      padding: 3px 8px;
      border-radius: 6px;
    }
    .org-pill-row {
      margin-bottom: 6px;
    }
    .org-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 700;
      color: #0369a1;
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      padding: 2px 7px;
      border-radius: 9999px;
    }
    .org-pill .material-symbols-outlined {
      font-size: 13px;
    }
    .org-pill-sm {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 11px;
      font-weight: 600;
      color: #0369a1;
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      padding: 1px 6px;
      border-radius: 4px;
      margin-top: 2px;
    }
    .org-pill-sm .material-symbols-outlined {
      font-size: 12px;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
    }
    .status-badge.active {
      background: #f0fdf4;
      color: #166534;
      border: 1px solid #bbf7d0;
    }
    .status-badge.idle {
      background: #f8fafc;
      color: #64748b;
      border: 1px solid #e2e8f0;
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

    .site-title-link {
      text-decoration: none;
      display: block;
    }
    .site-title-link:hover .site-title {
      color: #0050e5;
    }
    .site-table-link {
      color: #0f172a;
      text-decoration: none;
      font-size: 14px;
      transition: color 0.15s ease;
    }
    .site-table-link:hover {
      color: #0050e5;
    }
    .table-actions-row {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-action-primary {
      background: #eff6ff !important;
      border-color: #bfdbfe !important;
      color: #0050e5 !important;
      font-weight: 600;
    }
    .btn-action-primary:hover {
      background: #0050e5 !important;
      color: #ffffff !important;
    }

    .site-title {
      font-size: 17px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 6px 0;
      transition: color 0.15s ease;
    }
    .site-location {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      color: #64748b;
      margin: 0 0 16px 0;
    }
    .pin-icon {
      font-size: 16px;
      color: #94a3b8;
    }

    /* Geofence Box */
    .geofence-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 14px;
      margin-bottom: 14px;
    }
    .geofence-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
      font-size: 12.5px;
    }
    .geofence-label {
      font-weight: 600;
      color: #475569;
    }
    .radius-chip {
      font-size: 11px;
      font-weight: 800;
      font-family: monospace;
      background: #e0f2fe;
      color: #0369a1;
      padding: 2px 8px;
      border-radius: 6px;
      border: 1px solid #bae6fd;
    }
    .gps-coords {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-family: monospace;
      color: #334155;
    }
    .coord-icon {
      font-size: 14px;
      color: #0050e5;
    }
    .gps-unconfigured {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #dc2626;
      font-weight: 600;
    }
    .gps-unconfigured .material-symbols-outlined {
      font-size: 16px;
    }

    .licence-tag-row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      margin-bottom: 12px;
    }
    .licence-label {
      color: #64748b;
    }
    .licence-badge {
      font-size: 11px;
      font-weight: 700;
      background: #f1f5f9;
      color: #0f172a;
      padding: 3px 8px;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
    }

    .emergency-contact-card {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 16px;
      font-size: 12px;
    }
    .contact-header {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #92400e;
      margin-bottom: 2px;
    }
    .contact-header .material-symbols-outlined {
      font-size: 15px;
    }
    .contact-phone {
      font-family: monospace;
      color: #78350f;
      font-weight: 600;
      margin-left: 21px;
    }

    .site-card-actions {
      margin-top: auto;
    }

    /* CMS Table Styles */
    .cms-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0,0,0,0.02);
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
    .site-table-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .address-sub {
      font-size: 12px;
      color: #64748b;
    }
    .gps-text {
      font-family: monospace;
      font-size: 12px;
    }
    .text-danger-mini {
      font-size: 11.5px;
      color: #dc2626;
      font-weight: 600;
    }
    .text-muted-mini {
      font-size: 12px;
      color: #94a3b8;
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

    /* Empty State Card */
    .empty-state-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 64px 24px;
      text-align: center;
      max-width: 560px;
      margin: 20px auto;
      box-shadow: 0 4px 15px rgba(0,0,0,0.02);
    }
    .empty-icon-circle {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #f1f5f9;
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
    }
    .empty-icon-circle .material-symbols-outlined {
      font-size: 28px;
    }
    .empty-state-card h3 {
      font-size: 17px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 6px 0;
    }
    .empty-state-card p {
      font-size: 13.5px;
      color: #64748b;
      margin: 0 0 20px 0;
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
      max-width: 680px;
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
      max-height: 72vh;
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
    .form-row-triple {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
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
    .modal-footer {
      padding: 16px 24px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    /* GPS Config Box in Modal */
    .gps-config-panel {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
    }
    .gps-config-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .gps-config-header strong {
      font-size: 13.5px;
      color: #0f172a;
    }
    .gps-config-header .sub {
      font-size: 12px;
      color: #64748b;
      margin: 2px 0 0 0;
    }
    .btn-detect-gps {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #0050e5;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-detect-gps .material-symbols-outlined {
      font-size: 16px;
    }
    .btn-detect-gps:hover {
      background: #dbeafe;
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
  `]
})
export class WorkforceSitesComponent implements OnInit {
  sites: ClientSite[] = [];
  isLoading = false;
  showInfoModal = false;

  // Search & Filter
  searchQuery = '';
  selectedLicenceFilter = '';
  viewMode: 'cards' | 'table' = 'cards';
  documentCategories: any[] = [];

  constructor(
    private readonly workforceService: WorkforceService,
    private readonly toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadSites();
    this.loadDocumentCategories();
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

  get filteredSites(): ClientSite[] {
    let list = this.sites;
    if (this.selectedLicenceFilter) {
      list = list.filter(s => s.requiredSiaLicenceType === this.selectedLicenceFilter);
    }
    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(s =>
        (s.siteName && s.siteName.toLowerCase().includes(q)) ||
        (s.siteCode && s.siteCode.toLowerCase().includes(q)) ||
        (s.city && s.city.toLowerCase().includes(q)) ||
        (s.address && s.address.toLowerCase().includes(q))
      );
    }
    return list;
  }
}
