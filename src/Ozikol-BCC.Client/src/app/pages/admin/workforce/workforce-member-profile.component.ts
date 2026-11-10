import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { WorkforceService } from '../../../core/services/workforce.service';
import { ToastService } from '../../../core/services/toast.service';

interface StaffMemberDetail {
  userId: string;
  profileId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  memberId: string;
  jobTitle: string;
  staffTypeId?: string;
  staffTypeName: string;
  defaultHourlyRate?: number;
  contractedWeeklyHours: number;
  averageRating: number;
  totalRatingsCount: number;
  totalShiftsCompleted: number;
  punctualityScorePercent: number;
  noShowCount: number;
  isActive: boolean;
  enrolledUtc: string;
  currencyCode: string;
  currencySymbol: string;

  // Emergency Contact
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;

  // Payroll & Banking
  bankName: string;
  accountHolderName: string;
  sortCode: string;
  accountNumber: string;
  nationalInsuranceNumber: string;

  // Custom Form Submissions
  uniformSizes: string;
  drivingLicenseStatus: string;
  medicalDisclosures: string;
  dbsDisclosure: string;
  optOut48Hours: boolean;

  documents: any[];
  recentShifts: any[];
}

@Component({
  selector: 'app-workforce-member-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="profile-page">
      <!-- Breadcrumb Header -->
      <nav class="breadcrumb-nav">
        <a routerLink="/admin/dashboard" class="crumb-link">Command Center</a>
        <span class="crumb-sep">/</span>
        <a routerLink="/workforce/console/analytics" class="crumb-link">Workforce &amp; Shifts</a>
        <span class="crumb-sep">/</span>
        <span class="crumb-active">{{ member?.fullName || 'Staff Member Profile' }}</span>
      </nav>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="isLoading">
        <span class="material-symbols-outlined spin">progress_activity</span>
        <p>Loading member profile &amp; compliance history...</p>
      </div>

      <!-- Main Container -->
      <div *ngIf="!isLoading && member" class="profile-container">
        <!-- Top Navigation Bar -->
        <div class="profile-top-nav">
          <a routerLink="/workforce/console/enroll" class="btn btn-outline" title="Back to Staff Directory &amp; Roster">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>Back to Staff Directory</span>
          </a>
        </div>

        <!-- Profile Hero Header Card -->
        <div class="profile-hero-card">
          <div class="hero-left">
            <div class="avatar-circle">
              {{ getInitials(member.fullName) }}
            </div>
            <div class="hero-info">
              <div class="title-row">
                <h1 class="member-name">{{ member.fullName }}</h1>
                <span class="status-badge" [class.active]="member.isActive" [class.inactive]="!member.isActive">
                  {{ member.isActive ? 'Active Duty' : 'Deactivated' }}
                </span>
                <span class="staff-type-badge">{{ member.staffTypeName || 'Permanent' }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-item">
                  <span class="material-symbols-outlined">badge</span>
                  <strong>ID:</strong> {{ member.memberId || 'N/A' }}
                </span>
                <span class="meta-item">
                  <span class="material-symbols-outlined">work</span>
                  {{ member.jobTitle || 'Security Guard' }}
                </span>
                <span class="meta-item">
                  <span class="material-symbols-outlined">mail</span>
                  {{ member.email }}
                </span>
                <span class="meta-item" *ngIf="member.phoneNumber">
                  <span class="material-symbols-outlined">phone</span>
                  {{ member.phoneNumber }}
                </span>
              </div>
            </div>
          </div>

          <div class="hero-stats">
            <div class="stat-box">
              <div class="stat-val rating">
                <span class="material-symbols-outlined star-icon">star</span>
                {{ member.averageRating | number:'1.2-2' }}
              </div>
              <div class="stat-label">{{ member.totalRatingsCount }} shift reviews</div>
            </div>

            <div class="stat-box">
              <div class="stat-val punctuality">
                {{ member.punctualityScorePercent | number:'1.0-0' }}%
              </div>
              <div class="stat-label">Punctuality Score</div>
            </div>

            <div class="stat-box">
              <div class="stat-val">
                {{ member.totalShiftsCompleted }}
              </div>
              <div class="stat-label">Completed Shifts</div>
            </div>
          </div>
        </div>

        <!-- Navigation Tabs Bar -->
        <div class="profile-tabs-bar">
          <button
            type="button"
            class="tab-btn"
            [class.active]="activeTab === 'personal'"
            (click)="activeTab = 'personal'"
          >
            <span class="material-symbols-outlined">person</span>
            <span>Overview &amp; Personal</span>
          </button>

          <button
            type="button"
            class="tab-btn"
            [class.active]="activeTab === 'employment'"
            (click)="activeTab = 'employment'"
          >
            <span class="material-symbols-outlined">work_history</span>
            <span>Employment &amp; Hours</span>
          </button>

          <button
            type="button"
            class="tab-btn"
            [class.active]="activeTab === 'documents'"
            (click)="activeTab = 'documents'"
          >
            <span class="material-symbols-outlined">verified_user</span>
            <span>Document Vault &amp; Credentials</span>
            <span class="tab-count">{{ member.documents.length || 0 }}</span>
          </button>

          <button
            type="button"
            class="tab-btn"
            [class.active]="activeTab === 'custom-forms'"
            (click)="activeTab = 'custom-forms'"
          >
            <span class="material-symbols-outlined">fact_check</span>
            <span>Custom Onboarding Responses</span>
          </button>

          <button
            type="button"
            class="tab-btn"
            [class.active]="activeTab === 'shifts'"
            (click)="activeTab = 'shifts'"
          >
            <span class="material-symbols-outlined">history</span>
            <span>Shift History &amp; Timesheets</span>
            <span class="tab-count">{{ member.recentShifts.length || 0 }}</span>
          </button>
        </div>

        <!-- ========================================================================= -->
        <!-- TAB 1: OVERVIEW & PERSONAL INFORMATION -->
        <!-- ========================================================================= -->
        <div class="tab-pane" *ngIf="activeTab === 'personal'">
          <div class="form-grid-2col">
            <!-- Identity & Personal Information -->
            <div class="profile-card">
              <div class="card-header">
                <span class="material-symbols-outlined text-blue">badge</span>
                <h3>Personal Identity &amp; Contact</h3>
              </div>
              <div class="card-body">
                <div class="form-row-dual">
                  <div class="form-group">
                    <label class="form-label">First Name</label>
                    <input type="text" class="form-control" [(ngModel)]="member.firstName" placeholder="e.g. First Name" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Last Name</label>
                    <input type="text" class="form-control" [(ngModel)]="member.lastName" placeholder="e.g. Last Name" />
                  </div>
                </div>

                <div class="form-row-dual">
                  <div class="form-group">
                    <label class="form-label">Email Address</label>
                    <input type="email" class="form-control" [(ngModel)]="member.email" disabled />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Phone Number</label>
                    <input type="tel" class="form-control" [(ngModel)]="member.phoneNumber" placeholder="e.g. +44 20 7946 0000" />
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">National Insurance / Tax ID</label>
                  <input type="text" class="form-control" [(ngModel)]="member.nationalInsuranceNumber" placeholder="e.g. QQ 12 34 56 A" />
                </div>
              </div>
            </div>

            <!-- Emergency Contact / Next of Kin -->
            <div class="profile-card">
              <div class="card-header">
                <span class="material-symbols-outlined text-blue">emergency</span>
                <h3>Emergency Contact / Next of Kin</h3>
              </div>
              <div class="card-body">
                <div class="form-group">
                  <label class="form-label">Full Name of Emergency Contact</label>
                  <input type="text" class="form-control" [(ngModel)]="member.emergencyContactName" placeholder="e.g. First Last" />
                </div>

                <div class="form-row-dual">
                  <div class="form-group">
                    <label class="form-label">Relationship</label>
                    <input type="text" class="form-control" [(ngModel)]="member.emergencyContactRelationship" placeholder="e.g. Spouse / Parent / Sibling" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">24/7 Emergency Phone Number</label>
                    <input type="tel" class="form-control" [(ngModel)]="member.emergencyContactPhone" placeholder="e.g. +44 20 7946 0000" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Payroll & Remittance Banking -->
            <div class="profile-card full-width">
              <div class="card-header">
                <span class="material-symbols-outlined text-blue">account_balance</span>
                <h3>Direct Payroll &amp; Banking Remittance</h3>
              </div>
              <div class="card-body">
                <div class="form-row-4col">
                  <div class="form-group">
                    <label class="form-label">Bank Name</label>
                    <input type="text" class="form-control" [(ngModel)]="member.bankName" placeholder="e.g. Bank Name" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Account Holder Name</label>
                    <input type="text" class="form-control" [(ngModel)]="member.accountHolderName" placeholder="e.g. First Last" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Sort Code / Bank Code</label>
                    <input type="text" class="form-control" [(ngModel)]="member.sortCode" placeholder="e.g. 00-00-00" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Account Number</label>
                    <input type="text" class="form-control" [(ngModel)]="member.accountNumber" placeholder="e.g. 12345678" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="save-bar">
            <button type="button" class="btn btn-primary" (click)="saveMemberDetail()" [disabled]="isSaving">
              <span class="material-symbols-outlined" *ngIf="!isSaving">save</span>
              <span class="material-symbols-outlined spin" *ngIf="isSaving">sync</span>
              {{ isSaving ? 'Saving...' : 'Save Personal Details' }}
            </button>
          </div>
        </div>

        <!-- ========================================================================= -->
        <!-- TAB 2: EMPLOYMENT & WORKING HOURS -->
        <!-- ========================================================================= -->
        <div class="tab-pane" *ngIf="activeTab === 'employment'">
          <div class="form-grid-2col">
            <div class="profile-card">
              <div class="card-header">
                <span class="material-symbols-outlined text-blue">badge</span>
                <h3>Designated Job Role &amp; Classification</h3>
              </div>
              <div class="card-body">
                <div class="form-group">
                  <label class="form-label">Designated Job Title</label>
                  <select class="form-control" [(ngModel)]="member.jobTitle">
                    <option *ngFor="let r of jobRoles" [value]="r.title">{{ r.title }}</option>
                    <option *ngIf="!jobRoleTitles.includes(member.jobTitle)" [value]="member.jobTitle">{{ member.jobTitle }}</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Employment Classification</label>
                  <select class="form-control" [(ngModel)]="member.staffTypeId" (change)="onStaffTypeChange()">
                    <option *ngFor="let t of staffTypes" [value]="t.id">{{ t.name }} ({{ t.code }})</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Account Status</label>
                  <div class="toggle-card">
                    <label class="switch">
                      <input type="checkbox" [(ngModel)]="member.isActive" />
                      <span class="slider round"></span>
                    </label>
                    <div class="toggle-info">
                      <strong>{{ member.isActive ? 'Active Duty Profile' : 'Deactivated Profile' }}</strong>
                      <span>{{ member.isActive ? 'Eligible for rota scheduling and check-in.' : 'Excluded from scheduling.' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="profile-card">
              <div class="card-header">
                <span class="material-symbols-outlined text-blue">schedule</span>
                <h3>Contracted Hours &amp; Wage Overrides</h3>
              </div>
              <div class="card-body">
                <div class="form-group">
                  <label class="form-label">Contracted Weekly Target (Hours)</label>
                  <input
                    type="number"
                    class="form-control"
                    [(ngModel)]="member.contractedWeeklyHours"
                    placeholder="e.g. 40"
                  />
                  <span class="field-hint">Overrides general company standard hours for this staff member.</span>
                </div>

                <div class="form-group">
                  <label class="form-label">Individual Base Hourly Wage ({{ member.currencySymbol }}/hr)</label>
                  <input
                    type="number"
                    step="0.25"
                    class="form-control"
                    [(ngModel)]="member.defaultHourlyRate"
                    placeholder="e.g. 15.00"
                  />
                  <span class="field-hint">Overrides default role wage rate if negotiated individually.</span>
                </div>

                <div class="form-group">
                  <label class="form-label">48-Hour Working Time Regulations Agreement</label>
                  <div class="toggle-card">
                    <label class="switch">
                      <input type="checkbox" [(ngModel)]="member.optOut48Hours" />
                      <span class="slider round"></span>
                    </label>
                    <div class="toggle-info">
                      <strong>48-Hour Opt-Out Agreement Signed</strong>
                      <span>Allows staff member to voluntarily work beyond 48 hours weekly.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="save-bar">
            <button type="button" class="btn btn-primary" (click)="saveMemberDetail()" [disabled]="isSaving">
              <span class="material-symbols-outlined" *ngIf="!isSaving">save</span>
              <span class="material-symbols-outlined spin" *ngIf="isSaving">sync</span>
              {{ isSaving ? 'Saving...' : 'Save Employment Settings' }}
            </button>
          </div>
        </div>

        <!-- ========================================================================= -->
        <!-- TAB 3: DOCUMENT VAULT & CREDENTIALS -->
        <!-- ========================================================================= -->
        <div class="tab-pane" *ngIf="activeTab === 'documents'">
          <div class="content-card">
            <div class="card-header-bar">
              <div class="header-bar-left">
                <span class="material-symbols-outlined text-blue">verified_user</span>
                <div>
                  <h3 class="card-heading">Compliance Documents &amp; Credentials</h3>
                  <p class="card-sub">Right to work documents, statutory licenses, and training certificates.</p>
                </div>
              </div>
              <button type="button" class="btn btn-primary btn-sm" (click)="openUploadModal()">
                <span class="material-symbols-outlined">upload_file</span> + Upload Document
              </button>
            </div>

            <div class="table-responsive">
              <table class="settings-table">
                <thead>
                  <tr>
                    <th>Document Type</th>
                    <th>Document Name</th>
                    <th>Reference / Sector</th>
                    <th>Uploaded Date</th>
                    <th>Expiry Date</th>
                    <th>Status</th>
                    <th style="text-align: right;">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let doc of member.documents">
                    <td>
                      <span class="doc-type-badge">{{ doc.documentType }}</span>
                    </td>
                    <td>
                      <strong>{{ doc.documentName }}</strong>
                      <span class="desc-muted" *ngIf="doc.description">{{ doc.description }}</span>
                    </td>
                    <td>{{ doc.referenceNumber || 'N/A' }}</td>
                    <td>{{ doc.createdUtc | date:'mediumDate' }}</td>
                    <td>
                      <span *ngIf="doc.expiryDateUtc">{{ doc.expiryDateUtc | date:'mediumDate' }}</span>
                      <span *ngIf="!doc.expiryDateUtc" class="text-muted">No Expiry</span>
                    </td>
                    <td>
                      <span class="status-pill active" *ngIf="doc.isVerified">Verified</span>
                      <span class="status-pill pending" *ngIf="!doc.isVerified">Pending Review</span>
                    </td>
                    <td style="text-align: right;">
                      <a [href]="doc.fileUrl" target="_blank" class="btn-action-sm" *ngIf="doc.fileUrl">
                        <span class="material-symbols-outlined">visibility</span>
                        <span>View</span>
                      </a>
                    </td>
                  </tr>
                  <tr *ngIf="!member.documents || member.documents.length === 0">
                    <td colspan="7" class="empty-state">
                      No compliance documents uploaded yet for this staff member.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ========================================================================= -->
        <!-- TAB 4: CUSTOM ONBOARDING RESPONSES -->
        <!-- ========================================================================= -->
        <div class="tab-pane" *ngIf="activeTab === 'custom-forms'">
          <div class="form-grid-2col">
            <div class="profile-card">
              <div class="card-header">
                <span class="material-symbols-outlined text-blue">apparel</span>
                <h3>Uniform &amp; PPE Sizing</h3>
              </div>
              <div class="card-body">
                <div class="form-group">
                  <label class="form-label">Uniform &amp; Boot Sizing Details</label>
                  <textarea
                    class="form-control"
                    rows="3"
                    [(ngModel)]="member.uniformSizes"
                    placeholder="e.g. Jacket: L, Trousers: 34W/32L, Boots: UK 10"
                  ></textarea>
                  <span class="field-hint">Sizes provided by guard during registration.</span>
                </div>
              </div>
            </div>

            <div class="profile-card">
              <div class="card-header">
                <span class="material-symbols-outlined text-blue">directions_car</span>
                <h3>Driving License &amp; Transport</h3>
              </div>
              <div class="card-body">
                <div class="form-group">
                  <label class="form-label">Driving Status &amp; Vehicle Access</label>
                  <textarea
                    class="form-control"
                    rows="3"
                    [(ngModel)]="member.drivingLicenseStatus"
                    placeholder="e.g. Full UK Driving License (Clean), Owns vehicle for patrol deployments"
                  ></textarea>
                </div>
              </div>
            </div>

            <div class="profile-card">
              <div class="card-header">
                <span class="material-symbols-outlined text-blue">medical_information</span>
                <h3>Medical Conditions &amp; Allergies</h3>
              </div>
              <div class="card-body">
                <div class="form-group">
                  <label class="form-label">Emergency Medical Disclosures</label>
                  <textarea
                    class="form-control"
                    rows="3"
                    [(ngModel)]="member.medicalDisclosures"
                    placeholder="e.g. Asthmatic (inhaler carried), Penicillin allergy"
                  ></textarea>
                </div>
              </div>
            </div>

            <div class="profile-card">
              <div class="card-header">
                <span class="material-symbols-outlined text-blue">shield_person</span>
                <h3>DBS Criminal Record &amp; Vetting Disclosure</h3>
              </div>
              <div class="card-body">
                <div class="form-group">
                  <label class="form-label">BS 7858 Vetting &amp; DBS Status</label>
                  <textarea
                    class="form-control"
                    rows="3"
                    [(ngModel)]="member.dbsDisclosure"
                    placeholder="e.g. Enhanced DBS Certificate #001482910 issued Jan 2026, No convictions"
                  ></textarea>
                </div>
              </div>
            </div>
          </div>

          <div class="save-bar">
            <button type="button" class="btn btn-primary" (click)="saveMemberDetail()" [disabled]="isSaving">
              <span class="material-symbols-outlined" *ngIf="!isSaving">save</span>
              <span class="material-symbols-outlined spin" *ngIf="isSaving">sync</span>
              {{ isSaving ? 'Saving...' : 'Save Onboarding Responses' }}
            </button>
          </div>
        </div>

        <!-- ========================================================================= -->
        <!-- TAB 5: SHIFT HISTORY & TIMESHEETS -->
        <!-- ========================================================================= -->
        <div class="tab-pane" *ngIf="activeTab === 'shifts'">
          <div class="content-card">
            <div class="card-header-bar">
              <div class="header-bar-left">
                <span class="material-symbols-outlined text-blue">history</span>
                <div>
                  <h3 class="card-heading">Shift History &amp; GPS Attendance Audit</h3>
                  <p class="card-sub">Recent rosters, geofence compliance distance, supervisor ratings, and gross pay.</p>
                </div>
              </div>
            </div>

            <div class="table-responsive">
              <table class="settings-table">
                <thead>
                  <tr>
                    <th>Site / Post</th>
                    <th>Date &amp; Time Window</th>
                    <th>Hours</th>
                    <th>Status</th>
                    <th>GPS Geofence Adherence</th>
                    <th>Hourly Rate</th>
                    <th>Total Pay</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let s of member.recentShifts">
                    <td>
                      <strong>{{ s.siteName || s.siteCode }}</strong>
                    </td>
                    <td>
                      <div>{{ s.startUtc | date:'mediumDate' }}</div>
                      <span class="desc-muted">{{ s.startUtc | date:'shortTime' }} &ndash; {{ s.endUtc | date:'shortTime' }}</span>
                    </td>
                    <td>{{ s.totalHours | number:'1.1-1' }} hrs</td>
                    <td>
                      <span class="status-pill active" *ngIf="s.status === 'Completed'">Completed</span>
                      <span class="status-pill pending" *ngIf="s.status === 'Scheduled'">Scheduled</span>
                      <span class="status-pill disabled" *ngIf="s.status === 'Cancelled'">Cancelled</span>
                    </td>
                    <td>
                      <span class="gps-chip success" *ngIf="s.checkInDistanceMeters !== undefined && s.checkInDistanceMeters <= 50">
                        <span class="material-symbols-outlined">radar</span> {{ s.checkInDistanceMeters }}m (Verified)
                      </span>
                      <span class="gps-chip warning" *ngIf="s.checkInDistanceMeters !== undefined && s.checkInDistanceMeters > 50">
                        <span class="material-symbols-outlined">warning</span> {{ s.checkInDistanceMeters }}m (Out of bounds)
                      </span>
                      <span class="text-muted" *ngIf="s.checkInDistanceMeters === undefined">Not Checked In</span>
                    </td>
                    <td>{{ member.currencySymbol }}{{ s.hourlyRate | number:'1.2-2' }}/hr</td>
                    <td>
                      <strong>{{ member.currencySymbol }}{{ s.grossPay | number:'1.2-2' }}</strong>
                    </td>
                  </tr>
                  <tr *ngIf="!member.recentShifts || member.recentShifts.length === 0">
                    <td colspan="7" class="empty-state">
                      No past shift records logged yet for this staff member.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Upload Document Modal -->
      <div class="modal-backdrop" *ngIf="showUploadModal" (click)="showUploadModal = false">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="material-symbols-outlined text-blue">upload_file</span>
              <div>
                <h3>Upload Compliance Document</h3>
                <p class="modal-subtitle">Add official credential, proof of address, or certification to member's vault.</p>
              </div>
            </div>
            <button type="button" class="btn-close" (click)="showUploadModal = false">&times;</button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Document Category <span class="required">*</span></label>
              <select class="form-control" [(ngModel)]="uploadForm.documentType">
                <option *ngFor="let cat of availableCategories" [value]="cat.name">
                  {{ cat.name }} ({{ cat.code }})
                </option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Document Name / Title <span class="required">*</span></label>
              <input type="text" class="form-control" [(ngModel)]="uploadForm.documentName" placeholder="e.g. Identity Document / License (Front & Back)" />
            </div>

            <div class="form-group">
              <label class="form-label">Reference / License Number</label>
              <input type="text" class="form-control" [(ngModel)]="uploadForm.referenceNumber" placeholder="e.g. License #, Certificate ID, or Registration code" />
            </div>

            <div class="form-group">
              <label class="form-label">File URL or Cloud Storage Link <span class="required">*</span></label>
              <input type="text" class="form-control" [(ngModel)]="uploadForm.fileUrl" placeholder="https://..." />
            </div>

            <div class="form-group">
              <label class="form-label">Expiry Date</label>
              <input type="date" class="form-control" [(ngModel)]="uploadForm.expiryDateUtc" />
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="showUploadModal = false">Cancel</button>
            <button type="button" class="btn btn-primary" (click)="submitUpload()" [disabled]="isUploading">
              <span class="material-symbols-outlined" *ngIf="!isUploading">upload</span>
              <span class="material-symbols-outlined spin" *ngIf="isUploading">sync</span>
              {{ isUploading ? 'Uploading...' : 'Save Document' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .profile-page {
      padding: 1.5rem 2rem;
      background: #f8fafc;
      min-height: calc(100vh - 70px);
    }

    .breadcrumb-nav {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      color: #64748b;
      margin-bottom: 1rem;
    }

    .crumb-link {
      color: #64748b;
      text-decoration: none;
    }

    .crumb-link:hover {
      color: #0050e5;
    }

    .crumb-sep {
      color: #cbd5e1;
    }

    .crumb-active {
      color: #0f172a;
      font-weight: 600;
    }

    .loading-state {
      padding: 4rem;
      text-align: center;
      color: #64748b;
    }

    .profile-top-nav {
      margin-bottom: 1.25rem;
      display: flex;
      align-items: center;
    }

    /* Hero Card */
    .profile-hero-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .hero-left {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }

    .avatar-circle {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: #eff6ff;
      color: #0050e5;
      font-size: 1.25rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #bfdbfe;
    }

    .title-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.35rem;
    }

    .member-name {
      font-size: 1.35rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }

    .status-badge {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.2rem 0.55rem;
      border-radius: 9999px;
    }

    .status-badge.active {
      background: #dcfce7;
      color: #15803d;
    }

    .status-badge.inactive {
      background: #fee2e2;
      color: #b91c1c;
    }

    .staff-type-badge {
      font-size: 0.75rem;
      font-weight: 600;
      background: #f1f5f9;
      color: #475569;
      padding: 0.2rem 0.55rem;
      border-radius: 9999px;
    }

    .meta-row {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      font-size: 0.8125rem;
      color: #64748b;
      flex-wrap: wrap;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .meta-item .material-symbols-outlined {
      font-size: 15px;
      color: #94a3b8;
    }

    .hero-stats {
      display: flex;
      gap: 1.5rem;
    }

    .stat-box {
      text-align: center;
      padding: 0 1rem;
      border-left: 1px solid #f1f5f9;
    }

    .stat-box:first-child {
      border-left: none;
    }

    .stat-val {
      font-size: 1.35rem;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.2;
    }

    .stat-val.rating {
      color: #d97706;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.25rem;
    }

    .star-icon {
      font-size: 18px;
    }

    .stat-val.punctuality {
      color: #059669;
    }

    .stat-label {
      font-size: 0.75rem;
      color: #64748b;
      margin-top: 0.15rem;
    }

    /* Tabs Bar */
    .profile-tabs-bar {
      display: flex;
      gap: 0.5rem;
      border-bottom: 2px solid #e2e8f0;
      margin-bottom: 1.5rem;
      overflow-x: auto;
    }

    .tab-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.25rem;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      font-size: 0.875rem;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
    }

    .tab-btn:hover {
      color: #0f172a;
    }

    .tab-btn.active {
      color: #0050e5;
      border-bottom-color: #0050e5;
    }

    .tab-count {
      font-size: 0.6875rem;
      background: #e2e8f0;
      color: #475569;
      padding: 0.1rem 0.45rem;
      border-radius: 9999px;
      font-weight: 700;
    }

    .tab-btn.active .tab-count {
      background: #eff6ff;
      color: #0050e5;
    }

    /* Form Grid */
    .form-grid-2col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }

    @media (max-width: 1024px) {
      .form-grid-2col {
        grid-template-columns: 1fr;
      }
      .profile-hero-card {
        flex-direction: column;
        align-items: flex-start;
      }
      .hero-stats {
        width: 100%;
        justify-content: space-around;
        border-top: 1px solid #f1f5f9;
        padding-top: 1rem;
      }
    }

    .profile-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      overflow: hidden;
      margin-bottom: 1.5rem;
    }

    .profile-card.full-width {
      grid-column: 1 / -1;
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #f1f5f9;
    }

    .card-header h3 {
      font-size: 0.95rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }

    .card-body {
      padding: 1.5rem;
    }

    .form-group {
      margin-bottom: 1.25rem;
    }

    .form-label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 600;
      color: #334155;
      margin-bottom: 0.4rem;
    }

    .form-control {
      width: 100%;
      padding: 0.55rem 0.85rem;
      font-size: 0.875rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
      background: #ffffff;
      color: #0f172a;
    }

    .form-control:focus {
      outline: none;
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.1);
    }

    .form-control:disabled {
      background: #f8fafc;
      color: #94a3b8;
    }

    .field-hint {
      font-size: 0.75rem;
      color: #64748b;
      margin-top: 0.3rem;
      display: block;
    }

    .form-row-dual {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .form-row-4col {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
    }

    @media (max-width: 900px) {
      .form-row-4col {
        grid-template-columns: 1fr 1fr;
      }
    }

    .save-bar {
      display: flex;
      justify-content: flex-end;
      padding: 1rem 0;
    }

    /* Content Card */
    .content-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      overflow: hidden;
      margin-bottom: 1.5rem;
    }

    .card-header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #f1f5f9;
    }

    .header-bar-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .card-heading {
      font-size: 1rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }

    .card-sub {
      font-size: 0.8125rem;
      color: #64748b;
      margin: 0.15rem 0 0 0;
    }

    /* Table Styles */
    .table-responsive {
      overflow-x: auto;
    }

    .settings-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    .settings-table th {
      background: #f8fafc;
      padding: 0.75rem 1.25rem;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      border-bottom: 1px solid #e2e8f0;
      text-align: left;
    }

    .settings-table td {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
      vertical-align: middle;
    }

    .doc-type-badge {
      display: inline-flex;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.2rem 0.5rem;
      border-radius: 0.35rem;
      background: #eff6ff;
      color: #0050e5;
    }

    .status-pill {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.15rem 0.45rem;
      border-radius: 9999px;
    }

    .status-pill.active { background: #dcfce7; color: #15803d; }
    .status-pill.pending { background: #fef9c3; color: #a16207; }
    .status-pill.disabled { background: #fee2e2; color: #b91c1c; }

    .gps-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.2rem 0.5rem;
      border-radius: 0.35rem;
    }

    .gps-chip.success {
      background: #dcfce7;
      color: #15803d;
    }

    .gps-chip.warning {
      background: #fef3c7;
      color: #b45309;
    }

    .gps-chip .material-symbols-outlined {
      font-size: 14px;
    }

    .btn-action-sm {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.8125rem;
      color: #0050e5;
      text-decoration: none;
      font-weight: 600;
    }

    .btn-action-sm:hover {
      text-decoration: underline;
    }

    .empty-state {
      text-align: center;
      padding: 2.5rem;
      color: #64748b;
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.55rem 1rem;
      font-size: 0.875rem;
      font-weight: 600;
      border-radius: 0.5rem;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-primary { background: #0050e5; color: #ffffff; }
    .btn-primary:hover { background: #003ebd; }
    .btn-outline { background: #ffffff; border-color: #cbd5e1; color: #334155; }
    .btn-sm { padding: 0.4rem 0.75rem; font-size: 0.8125rem; }

    /* Switch */
    .toggle-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem 1rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
    }

    .toggle-info strong {
      display: block;
      font-size: 0.875rem;
      color: #0f172a;
    }

    .toggle-info span {
      font-size: 0.75rem;
      color: #64748b;
    }

    .switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
      flex-shrink: 0;
    }

    .switch input { opacity: 0; width: 0; height: 0; }
    .slider {
      position: absolute;
      cursor: pointer;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: #cbd5e1;
      transition: 0.2s;
      border-radius: 34px;
    }
    .slider:before {
      position: absolute;
      content: "";
      height: 18px; width: 18px;
      left: 3px; bottom: 3px;
      background-color: white;
      transition: 0.2s;
      border-radius: 50%;
    }
    input:checked + .slider { background-color: #0050e5; }
    input:checked + .slider:before { transform: translateX(20px); }

    /* Modal */
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
      border-radius: 0.75rem;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      width: 100%;
      max-width: 520px;
      overflow: hidden;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #e2e8f0;
    }

    .modal-title-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .modal-title-group h3 {
      font-size: 1.1rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }

    .modal-subtitle {
      font-size: 0.75rem;
      color: #64748b;
      margin: 0.1rem 0 0 0;
    }

    .btn-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      color: #94a3b8;
      cursor: pointer;
    }

    .modal-body {
      padding: 1.5rem;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
    }

    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
  `]
})
export class WorkforceMemberProfileComponent implements OnInit {
  userId = '';
  member: StaffMemberDetail | null = null;
  isLoading = true;
  isSaving = false;
  activeTab: 'personal' | 'employment' | 'documents' | 'custom-forms' | 'shifts' = 'personal';

  jobRoles: any[] = [];
  staffTypes: any[] = [];
  documentCategories: any[] = [];
  fallbackCategories = [
    { name: 'Right to Work / Passport', code: 'RTW' },
    { name: 'Proof of Address', code: 'POA' },
    { name: 'Professional License / Registration', code: 'LIC' },
    { name: 'Background Check / DBS', code: 'DBS' },
    { name: 'Training & Certifications', code: 'TRN' }
  ];

  showUploadModal = false;
  isUploading = false;
  uploadForm = {
    userId: '',
    documentType: 'Right to Work / Passport',
    documentName: '',
    referenceNumber: '',
    fileUrl: '',
    expiryDateUtc: ''
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private workforceService: WorkforceService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.userId) {
      this.toast.error('Invalid member ID.');
      this.router.navigate(['/workforce/console/analytics']);
      return;
    }

    this.loadMemberDetail();
    this.loadMetadata();
  }

  get jobRoleTitles(): string[] {
    return this.jobRoles.map(r => r.title);
  }

  get availableCategories(): any[] {
    return this.documentCategories && this.documentCategories.length > 0
      ? this.documentCategories
      : this.fallbackCategories;
  }

  getInitials(name: string): string {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  loadMemberDetail(): void {
    this.isLoading = true;
    this.workforceService.getMemberDetail(this.userId).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res && res.data) {
          this.member = res.data;
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.toast.error(err?.error?.message || 'Failed to load member profile.');
      }
    });
  }

  loadMetadata(): void {
    this.workforceService.getJobRoles().subscribe({
      next: (res: any) => {
        if (res && res.data) {
          this.jobRoles = res.data;
        }
      },
      error: () => {}
    });

    this.workforceService.getStaffTypes().subscribe({
      next: (res: any) => {
        if (res && res.data) {
          this.staffTypes = res.data;
        }
      },
      error: () => {}
    });

    this.workforceService.getDocumentCategories().subscribe({
      next: (res: any) => {
        if (res && res.data && Array.isArray(res.data)) {
          this.documentCategories = res.data;
        }
      },
      error: () => {}
    });
  }

  onStaffTypeChange(): void {
    if (!this.member) return;
    const matched = this.staffTypes.find(t => t.id === this.member?.staffTypeId);
    if (matched) {
      this.member.staffTypeName = matched.name;
    }
  }

  saveMemberDetail(): void {
    if (!this.member) return;
    this.isSaving = true;

    const payload = {
      firstName: this.member.firstName,
      lastName: this.member.lastName,
      phoneNumber: this.member.phoneNumber,
      jobTitle: this.member.jobTitle,
      staffTypeId: this.member.staffTypeId,
      staffTypeName: this.member.staffTypeName,
      defaultHourlyRate: this.member.defaultHourlyRate,
      contractedWeeklyHours: this.member.contractedWeeklyHours,
      isActive: this.member.isActive,
      emergencyContactName: this.member.emergencyContactName,
      emergencyContactRelationship: this.member.emergencyContactRelationship,
      emergencyContactPhone: this.member.emergencyContactPhone,
      bankName: this.member.bankName,
      accountHolderName: this.member.accountHolderName,
      sortCode: this.member.sortCode,
      accountNumber: this.member.accountNumber,
      nationalInsuranceNumber: this.member.nationalInsuranceNumber,
      uniformSizes: this.member.uniformSizes,
      drivingLicenseStatus: this.member.drivingLicenseStatus,
      medicalDisclosures: this.member.medicalDisclosures,
      dbsDisclosure: this.member.dbsDisclosure,
      optOut48Hours: this.member.optOut48Hours
    };

    this.workforceService.updateMemberDetail(this.userId, payload).subscribe({
      next: (res: any) => {
        this.isSaving = false;
        this.toast.success('Staff member profile updated successfully.');
        if (res && res.data) {
          this.member = res.data;
        }
      },
      error: (err) => {
        this.isSaving = false;
        this.toast.error(err?.error?.message || 'Failed to update member profile.');
      }
    });
  }

  openUploadModal(): void {
    const defaultCategory = this.documentCategories.length > 0
      ? this.documentCategories[0].name
      : this.fallbackCategories[0].name;

    this.uploadForm = {
      userId: this.userId,
      documentType: defaultCategory,
      documentName: '',
      referenceNumber: '',
      fileUrl: '',
      expiryDateUtc: ''
    };
    this.showUploadModal = true;
  }

  submitUpload(): void {
    if (!this.uploadForm.documentName || !this.uploadForm.fileUrl) {
      this.toast.error('Please specify both document title and file link.');
      return;
    }

    this.uploadForm.userId = this.userId;
    this.isUploading = true;
    this.workforceService.uploadDocument(this.uploadForm).subscribe({
      next: () => {
        this.isUploading = false;
        this.showUploadModal = false;
        this.toast.success('Compliance document saved to vault.');
        this.loadMemberDetail();
      },
      error: (err) => {
        this.isUploading = false;
        this.toast.error(err?.error?.message || 'Failed to upload document.');
      }
    });
  }
}

