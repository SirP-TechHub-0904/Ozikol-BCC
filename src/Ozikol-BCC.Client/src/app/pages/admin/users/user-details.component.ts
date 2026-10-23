import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-user-details',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent],
  template: `
    <div class="user-details-page" *ngIf="user">
      <!-- Standardized Page Header -->
      <app-page-header
        eyebrow="360° MEMBER COMMAND CENTER"
        icon="account_circle"
        [title]="user.fullName || 'Member Details'"
        [subtitle]="'Member ID: ' + sanitizeId(user.memberId || 'N/A') + ' • ' + (user.designation || 'Member') + ' • ' + (user.categoryName || 'Unassigned Category')"
        [buttons]="headerButtons"
        [loading]="isLoading"
      ></app-page-header>

      <!-- Main 360 Grid -->
      <div class="dossier-grid">
        <!-- LEFT COLUMN: Profile Summary, Role & Permissions, Notes, Danger Zone -->
        <div class="dossier-col-left">
          <!-- 1. Profile Summary Card -->
          <div class="dossier-card">
            <div class="profile-hero">
              <div class="avatar-large" [style.background]="getGradient(user.fullName)">
                <img *ngIf="user.avatarUrl" [src]="user.avatarUrl" [alt]="user.fullName" onerror="this.style.display='none'" />
                <span *ngIf="!user.avatarUrl">{{ getInitials(user.fullName) }}</span>
              </div>
              <div class="hero-text">
                <h2>{{ user.fullName }}</h2>
                <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">
                  <span class="user-email-text" style="margin-bottom: 0;">{{ user.email }}</span>
                  <span class="verify-badge" [class.badge-confirmed]="user.emailConfirmed" [class.badge-unconfirmed]="!user.emailConfirmed">
                    <span class="material-symbols-outlined">{{ user.emailConfirmed ? 'verified' : 'mark_email_unread' }}</span>
                    <span>{{ user.emailConfirmed ? 'Email Verified' : 'Email Unverified' }}</span>
                  </span>
                  <button *ngIf="!user.emailConfirmed" type="button" class="btn-verify-chip" (click)="openOtpModal('email')">
                    <span class="material-symbols-outlined">key</span>
                    <span>Verify via OTP</span>
                  </button>
                </div>

                <div class="hero-badges">
                  <span class="cat-pill" [style.background]="(user.categoryColor || '#0050e5') + '15'" [style.color]="user.categoryColor || '#0050e5'">
                    <span class="material-symbols-outlined">{{ user.categoryIcon || 'category' }}</span>
                    <span>{{ user.categoryName || 'Unassigned' }}</span>
                  </span>
                  <span class="role-pill">{{ user.roles?.join(', ') || 'Member' }}</span>
                  <span class="status-pill" [class.active]="user.userStatus === 'Active'">{{ user.userStatus }}</span>
                </div>
              </div>
            </div>

            <div class="details-list">
              <div class="detail-item">
                <span class="item-label">Phone Number</span>
                <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; justify-content: flex-end;">
                  <span class="item-value">{{ user.phoneNumber || 'Not provided' }}</span>
                  <span *ngIf="user.phoneNumber" class="verify-badge" [class.badge-confirmed]="user.phoneNumberConfirmed" [class.badge-unconfirmed]="!user.phoneNumberConfirmed">
                    <span class="material-symbols-outlined">{{ user.phoneNumberConfirmed ? 'verified' : 'sms_failed' }}</span>
                    <span>{{ user.phoneNumberConfirmed ? 'Verified' : 'Unverified' }}</span>
                  </span>
                  <button *ngIf="user.phoneNumber && !user.phoneNumberConfirmed" type="button" class="btn-verify-chip" (click)="openOtpModal('phone')">
                    <span class="material-symbols-outlined">sms</span>
                    <span>Verify</span>
                  </button>
                </div>
              </div>
              <div class="detail-item">
                <span class="item-label">Designation / Title</span>
                <span class="item-value">{{ user.designation || 'Member' }}</span>
              </div>
              <div class="detail-item">
                <span class="item-label">Join Date</span>
                <span class="item-value">{{ user.joinDate ? (user.joinDate | date:'mediumDate') : 'N/A' }}</span>
              </div>
              <div class="detail-item">
                <span class="item-label">Registration Source</span>
                <span class="item-value">{{ user.registrationSource || 'System' }}</span>
              </div>
              <div class="detail-item">
                <span class="item-label">Must Change Password</span>
                <span class="item-value" [style.color]="user.mustChangePassword ? '#f59e0b' : '#10b981'">
                  <strong>{{ user.mustChangePassword ? 'Yes (Temporary Active)' : 'No (Permanent Set)' }}</strong>
                </span>
              </div>
            </div>

            <div class="card-action-footer">
              <a [routerLink]="['/users/console/edit', userId]" class="btn btn-outline btn-full">
                <span class="material-symbols-outlined">edit</span>
                <span>Edit Profile Information</span>
              </a>
            </div>
          </div>

          <!-- 1.4 Role & Workspace Permissions Card -->
          <div class="dossier-card">
            <div class="card-header" style="justify-content: space-between;">
              <div style="display:flex; align-items:center; gap:12px;">
                <span class="material-symbols-outlined header-icon">admin_panel_settings</span>
                <div>
                  <h3>Role & Workspace Permissions</h3>
                  <p>Platform access tier, security scope & administrative capabilities</p>
                </div>
              </div>
              <a
                *ngIf="!isRootSuperAdmin"
                [routerLink]="['/users/console/permissions', userId]"
                class="btn-permission-action"
                title="Configure user system roles, feature authorizations, and action scopes"
              >
                <span class="material-symbols-outlined icon-shield">admin_panel_settings</span>
                <span class="btn-text">Update Permission</span>
                <span class="material-symbols-outlined icon-arrow">arrow_forward</span>
              </a>
            </div>

            <div class="card-body">
              <!-- View Mode -->
              <div *ngIf="!isEditingRole" class="permission-view-mode">
                <div class="role-display-row">
                  <div class="role-badge-large" [class.badge-admin]="isCurrentRoleAdmin" [class.badge-super]="isRootSuperAdmin">
                    <span class="material-symbols-outlined">{{ getRoleIcon(currentRole) }}</span>
                    <span>{{ currentRole }}</span>
                  </div>
                  <span *ngIf="isRootSuperAdmin" class="locked-root-pill">
                    <span class="material-symbols-outlined">lock</span>
                    Locked Root Role
                  </span>
                </div>

                <p class="role-desc-text">{{ getRoleDescription(currentRole) }}</p>

                <!-- Scoped Feature Badges if Feature Editor -->
                <div *ngIf="currentRole === 'Feature Editor'" class="feature-scope-box">
                  <span class="feature-scope-label">Assigned Modular Capability Scope:</span>
                  <div class="scope-badges-list">
                    <span class="scope-pill">
                      <span class="material-symbols-outlined">tune</span>
                      {{ user.assignedFeatureArea || 'User Directory (Default)' }}
                    </span>
                  </div>
                </div>

                <div *ngIf="isRootSuperAdmin" class="root-notice-box">
                  <span class="material-symbols-outlined">shield</span>
                  <span>SuperAdmin is strictly reserved for the root workspace account and cannot be modified.</span>
                </div>
              </div>

              <!-- Edit Mode Form -->
              <div *ngIf="isEditingRole" class="permission-edit-form">
                <div class="form-group-role">
                  <label class="role-input-label">System Access Role *</label>
                  <select [(ngModel)]="selectedRole" (change)="onRoleSelectionChange()" class="role-select-box">
                    <option value="Member">Member (Standard Portal Access)</option>
                    <option value="Admin">Admin (Full Administrative Access)</option>
                    <option value="Global Editor">Global Editor (Tenant-Wide Content & Entities)</option>
                    <option value="Feature Editor">Feature Editor (Scoped Modular Capability)</option>
                    <option value="Read Only">Read Only (Inspection & Audit Telemetry)</option>
                  </select>
                </div>

                <!-- Feature Area Scope (Visible only when Feature Editor is selected) -->
                <div *ngIf="selectedRole === 'Feature Editor'" class="form-group-role" style="margin-top: 12px;">
                  <label class="role-input-label">Assigned Capability Scope *</label>
                  <select [(ngModel)]="selectedFeatureArea" class="role-select-box">
                    <option value="UserManager">User Directory & Categories</option>
                    <option value="ContentManager">Website Pages & Blog Management</option>
                    <option value="CrmManager">CRM & Member Relationship Center</option>
                    <option value="BillingManager">Invoicing & Plan Subscriptions</option>
                    <option value="StoreManager">Product Catalog & Orders</option>
                    <option value="EventsManager">Event Schedules & Registrations</option>
                    <option value="FormsManager">Custom Intake & Survey Forms</option>
                  </select>
                </div>

                <div class="role-action-buttons" style="margin-top: 14px; display: flex; justify-content: flex-end; gap: 8px;">
                  <button type="button" class="btn btn-outline btn-sm" (click)="cancelRoleEditor()" [disabled]="isSavingRole">
                    Cancel
                  </button>
                  <button type="button" class="btn btn-primary btn-sm" (click)="saveRolePermission()" [disabled]="isSavingRole">
                    <span class="material-symbols-outlined" *ngIf="!isSavingRole">check_circle</span>
                    <span class="material-symbols-outlined spinner" *ngIf="isSavingRole">progress_activity</span>
                    <span>{{ isSavingRole ? 'Updating...' : 'Save Permission' }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. Confidential Admin Notes Card -->
          <div class="dossier-card">
            <div class="card-header">
              <span class="material-symbols-outlined header-icon">sticky_note_2</span>
              <div>
                <h3>Confidential Admin Notes</h3>
                <p>Private administrative records & logs</p>
              </div>
            </div>

            <div class="card-body">
              <!-- Add Note Form -->
              <div class="add-note-box">
                <textarea rows="3" [(ngModel)]="newNoteText" placeholder="Add a confidential administrative note..."></textarea>
                <button type="button" class="btn btn-primary btn-sm" (click)="addAdminNote()" [disabled]="isPostingNote || !newNoteText.trim()">
                  <span class="material-symbols-outlined">add_comment</span>
                  <span>Post Note</span>
                </button>
              </div>

              <!-- Notes Timeline -->
              <div class="notes-timeline">
                <div class="note-bubble" *ngFor="let n of user.notes">
                  <div class="note-header">
                    <span class="note-author">{{ isGuid(n.authorFullName) ? 'Administrator' : (n.authorFullName || 'Administrator') }}</span>
                    <span class="note-date">{{ n.date | date:'short' }}</span>
                  </div>
                  <div class="note-body">{{ n.note }}</div>
                </div>
                <div class="empty-note" *ngIf="!user.notes?.length">
                  No administrative notes posted yet.
                </div>
              </div>
            </div>
          </div>

          <!-- 3. Danger Zone -->
          <div class="dossier-card border-danger">
            <div class="card-header bg-danger-light">
              <span class="material-symbols-outlined text-danger">warning</span>
              <div>
                <h3 class="text-danger">Account Access & Danger Zone</h3>
                <p>Restrict or permanently remove member account</p>
              </div>
            </div>
            <div class="card-body danger-actions">
              <div class="danger-row">
                <div>
                  <strong>{{ user.userStatus === 'Active' ? 'Suspend Account' : 'Reactivate Account' }}</strong>
                  <p>{{ user.userStatus === 'Active' ? 'Temporarily revoke workspace access' : 'Restore full access to member portal' }}</p>
                </div>
                <button type="button" class="btn btn-outline btn-sm" (click)="toggleAccountStatus()">
                  {{ user.userStatus === 'Active' ? 'Suspend' : 'Reactivate' }}
                </button>
              </div>

              <div class="danger-row" style="border-top:1px solid #fee2e2; padding-top:14px;">
                <div>
                  <strong class="text-danger">Delete Member Account</strong>
                  <p>Permanently remove profile, roles, and records</p>
                </div>
                <a [routerLink]="['/users/console/delete', user.id]" class="btn btn-danger btn-sm">
                  Delete User
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: KPI Scorecards, Audit Trail, 6-Digit OTP Security -->
        <div class="dossier-col-right">
          <!-- 1. KPI Performance Scorecards Card -->
          <div class="dossier-card">
            <div class="card-header" style="justify-content:space-between;">
              <div style="display:flex; align-items:center; gap:12px;">
                <span class="material-symbols-outlined header-icon">monitoring</span>
                <div>
                  <h3>Performance Scorecards & KPI History</h3>
                  <p>Evaluation records, period metrics, and feedback</p>
                </div>
              </div>
              <a [routerLink]="['/users/console/kpi/grade', userId]" class="btn btn-primary btn-sm">
                <span class="material-symbols-outlined">assignment_turned_in</span>
                <span>Grade Member</span>
              </a>
            </div>

            <div class="card-body">
              <div class="table-responsive">
                <table class="mini-table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>Period</th>
                      <th>Score</th>
                      <th>Remarks</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let k of user.kpiScores">
                      <td><strong>{{ k.indicatorTitle }}</strong></td>
                      <td>{{ k.period }}</td>
                      <td><span class="score-pill">{{ k.score }} / {{ k.maxScore }}</span></td>
                      <td class="remarks-cell">{{ k.remarks || '-' }}</td>
                      <td class="date-cell">{{ k.recordedDate | date:'shortDate' }}</td>
                    </tr>
                    <tr *ngIf="!user.kpiScores?.length">
                      <td colspan="5" class="empty-cell">No KPI evaluations recorded yet for this member.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- 2. Forensic Security Audit Logs -->
          <div class="dossier-card">
            <div class="card-header">
              <span class="material-symbols-outlined header-icon">security</span>
              <div>
                <h3>Forensic Audit Trail & Security Logs</h3>
                <p>Immutable log of authentication, password changes, and admin updates</p>
              </div>
            </div>

            <div class="card-body">
              <div class="logs-stream">
                <div class="log-stream-item" *ngFor="let l of user.logs">
                  <div class="log-dot"></div>
                  <div class="log-content">
                    <div class="log-title-row">
                      <span class="log-action-tag">{{ l.actionType }}</span>
                      <span class="log-time">{{ l.date | date:'short' }}</span>
                    </div>
                    <div class="log-description">{{ l.description }}</div>
                    <div class="log-meta" *ngIf="l.ipAddress">IP: {{ l.ipAddress }} • By: {{ l.performedByFullName || 'System' }}</div>
                  </div>
                </div>
                <div *ngIf="!user.logs?.length" class="empty-cell">No activity logs recorded.</div>
              </div>
            </div>
          </div>

          <!-- 3. 6-Digit OTP Security & Credentials Card (Moved to Bottom) -->
          <div class="dossier-card">
            <div class="card-header">
              <span class="material-symbols-outlined header-icon">key</span>
              <div>
                <h3>6-Digit OTP Security & Credentials</h3>
                <p>Generate one-time passcodes or reset passwords directly</p>
              </div>
            </div>

            <div class="card-body">
              <!-- OTP Generation Section -->
              <div class="otp-action-panel">
                <div class="otp-desc">
                  <strong>6-Digit One-Time Activation Passcode (OTP)</strong>
                  <p>Generate a secure 6-digit code valid for 15 minutes. Automatically queues to the member's email & SMS, or share directly.</p>
                </div>

                <button type="button" class="btn btn-primary" (click)="generateOtp()" [disabled]="isGeneratingOtp">
                  <span class="material-symbols-outlined">pin</span>
                  <span>{{ isGeneratingOtp ? 'Generating Code...' : 'Generate 6-Digit Reset OTP' }}</span>
                </button>
              </div>

              <!-- Active Generated OTP Display -->
              <div class="generated-otp-display" *ngIf="activeOtp">
                <div class="otp-badge-title">ACTIVE 6-DIGIT RECOVERY CODE (EXPIRES IN {{ activeOtpExpiry }} MIN)</div>
                <div class="otp-code-box">
                  <span class="otp-number">{{ activeOtp }}</span>
                  <button type="button" class="btn-copy-otp" (click)="copyOtp(activeOtp)">
                    <span class="material-symbols-outlined">content_copy</span>
                    <span>Copy OTP</span>
                  </button>
                </div>
                <div class="otp-sub-hint">Dispatched to <strong>{{ user.email }}</strong> {{ user.phoneNumber ? 'and ' + user.phoneNumber : '' }}</div>
              </div>

              <!-- Direct Temporary Password Setter -->
              <div class="direct-reset-box" style="margin-top: 18px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                <label style="font-size:12px; font-weight:700; color:#334155; display:block; margin-bottom:8px;">Set New Password Directly (Admin Override)</label>
                <div style="display:flex; gap:8px;">
                  <input type="text" [(ngModel)]="directNewPassword" placeholder="e.g. TempPass@2026" style="flex:1;" />
                  <button type="button" class="btn btn-outline btn-sm" (click)="generateDirectRandomPassword()">Generate</button>
                  <button type="button" class="btn btn-primary btn-sm" (click)="applyDirectPassword()" [disabled]="!directNewPassword.trim()">Apply</button>
                </div>
                <label style="font-size:11.5px; color:#64748b; display:flex; align-items:center; gap:6px; margin-top:8px; cursor:pointer;">
                  <input type="checkbox" [(ngModel)]="sendEmailOnPasswordReset" />
                  <span>Email temporary password & first-time sign in instructions to <strong>{{ user.email }}</strong></span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- INTERACTIVE 6-DIGIT OTP VERIFICATION MODAL -->
      <div class="otp-modal-overlay" *ngIf="showOtpModal" (click)="closeOtpModal()">
        <div class="otp-modal-container" (click)="$event.stopPropagation()">
          <div class="otp-modal-header">
            <div class="otp-header-title">
              <span class="material-symbols-outlined modal-icon">{{ otpModalType === 'email' ? 'mark_email_read' : 'sms' }}</span>
              <div>
                <h3>{{ otpModalType === 'email' ? 'Verify Email Address' : 'Verify Mobile Phone' }}</h3>
                <p>{{ otpModalType === 'email' ? user.email : user.phoneNumber }}</p>
              </div>
            </div>
            <button type="button" class="btn-close-modal" (click)="closeOtpModal()">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div class="otp-modal-body">
            <p class="otp-instruction">
              Enter the 6-digit verification code sent to <strong>{{ otpModalType === 'email' ? user.email : user.phoneNumber }}</strong> to confirm identity.
            </p>

            <!-- 6 PIN Boxes -->
            <div class="otp-digits-row">
              <input
                *ngFor="let digit of otpDigits; let i = index"
                [id]="'otp-input-' + i"
                type="text"
                maxlength="1"
                class="otp-digit-box"
                [(ngModel)]="otpDigits[i]"
                (input)="onDigitInput(i, $event)"
                (keydown)="onDigitKeyDown(i, $event)"
                (paste)="onOtpPaste($event)"
                autocomplete="off"
                inputmode="numeric"
              />
            </div>

            <!-- Expiry Countdown & Resend Option -->
            <div class="otp-status-row">
              <div class="otp-timer">
                <span class="material-symbols-outlined">schedule</span>
                <span>Code expires in <strong>{{ formatCountdown(modalCountdownSeconds) }}</strong></span>
              </div>
              <button
                type="button"
                class="btn-resend"
                [disabled]="resendCooldown > 0 || isSendingOtp"
                (click)="resendCurrentOtp()"
              >
                {{ resendCooldown > 0 ? 'Resend in ' + resendCooldown + 's' : (isSendingOtp ? 'Sending...' : 'Resend Code') }}
              </button>
            </div>

            <!-- Admin Bypass Toggle Option -->
            <div class="admin-bypass-bar">
              <span>Admin Override:</span>
              <button type="button" class="btn-bypass-verify" (click)="quickAdminVerify(otpModalType, true)">
                <span class="material-symbols-outlined">verified</span>
                <span>Mark Verified Directly</span>
              </button>
            </div>
          </div>

          <div class="otp-modal-footer">
            <button type="button" class="btn btn-outline" (click)="closeOtpModal()">Cancel</button>
            <button
              type="button"
              class="btn btn-primary"
              (click)="submitOtpCode()"
              [disabled]="isVerifyingOtp || getEnteredOtp().length !== 6"
            >
              <span class="material-symbols-outlined" *ngIf="!isVerifyingOtp">check_circle</span>
              <span>{{ isVerifyingOtp ? 'Verifying...' : 'Confirm & Verify' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .user-details-page { display: flex; flex-direction: column; gap: 18px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; }
    .dossier-grid { display: grid; grid-template-columns: 380px 1fr; gap: 20px; }
    @media (max-width: 1000px) { .dossier-grid { grid-template-columns: 1fr; } }

    .dossier-col-left, .dossier-col-right { display: flex; flex-direction: column; gap: 20px; }

    .dossier-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden; display: flex; flex-direction: column; }
    .card-header { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-bottom: 1px solid #f1f5f9; background: #fafbfc; }
    .header-icon { font-size: 22px; color: #0050e5; }
    .card-header h3 { margin: 0; font-size: 14px; font-weight: 700; color: #0f172a; }
    .card-header p { margin: 2px 0 0; font-size: 11px; color: #64748b; }
    .card-body { padding: 20px; display: flex; flex-direction: column; gap: 14px; }

    /* Profile Hero */
    .profile-hero { padding: 24px 20px; text-align: center; display: flex; flex-direction: column; align-items: center; border-bottom: 1px solid #f1f5f9; background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%); }
    .avatar-large { width: 72px; height: 72px; border-radius: 18px; display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 24px; font-weight: 800; overflow: hidden; margin-bottom: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .avatar-large img { width: 100%; height: 100%; object-fit: cover; }
    .hero-text h2 { margin: 0 0 4px; font-size: 18px; font-weight: 800; color: #0f172a; }
    .user-email-text { font-size: 13px; color: #64748b; }
    .hero-badges { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
    .cat-pill { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px; }
    .cat-pill span { font-size: 14px; }
    .role-pill { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 9999px; background: #eff6ff; color: #0050e5; }
    .status-pill { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 9999px; background: #fef3c7; color: #d97706; }
    .status-pill.active { background: #d1fae5; color: #059669; }

    /* Verification Badges */
    .verify-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; }
    .verify-badge .material-symbols-outlined { font-size: 13px; }
    .badge-confirmed { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
    .badge-unconfirmed { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
    .btn-verify-chip { display: inline-flex; align-items: center; gap: 3px; background: #0050e5; color: #ffffff; border: none; font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: 6px; cursor: pointer; transition: background 0.15s; }
    .btn-verify-chip:hover { background: #0040b8; }
    .btn-verify-chip .material-symbols-outlined { font-size: 12px; }

    /* Details List */
    .details-list { padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; }
    .detail-item { display: flex; justify-content: space-between; align-items: center; font-size: 12px; }
    .item-label { color: #64748b; font-weight: 600; }
    .item-value { font-weight: 700; color: #1e293b; text-align: right; }
    .card-action-footer { padding: 12px 20px; border-top: 1px solid #f1f5f9; }
    .btn-full { width: 100%; justify-content: center; }

    /* Notes */
    .add-note-box { display: flex; flex-direction: column; gap: 8px; }
    .add-note-box textarea { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 12px; outline: none; resize: vertical; }
    .add-note-box textarea:focus { border-color: #0050e5; }
    .notes-timeline { display: flex; flex-direction: column; gap: 10px; max-height: 260px; overflow-y: auto; margin-top: 10px; }
    .note-bubble { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px; }
    .note-header { display: flex; justify-content: space-between; font-size: 11px; }
    .note-author { font-weight: 700; color: #0f172a; }
    .note-date { color: #94a3b8; }
    .note-body { font-size: 12px; color: #334155; line-height: 1.4; }
    .empty-note { font-size: 12px; color: #94a3b8; text-align: center; padding: 10px; }

    /* OTP Box */
    .otp-action-panel { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
    .otp-desc strong { font-size: 13px; color: #0f172a; display: block; margin-bottom: 2px; }
    .otp-desc p { font-size: 12px; color: #64748b; margin: 0; }
    .generated-otp-display { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 16px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px; margin-top: 10px; }
    .otp-badge-title { font-size: 11px; font-weight: 800; color: #0050e5; letter-spacing: 0.05em; }
    .otp-code-box { display: flex; align-items: center; gap: 12px; }
    .otp-number { font-family: monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #0050e5; }
    .btn-copy-otp { display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; background: #ffffff; border: 1px solid #0050e5; color: #0050e5; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; }
    .btn-copy-otp:hover { background: #0050e5; color: #ffffff; }
    .otp-sub-hint { font-size: 11px; color: #64748b; }

    /* OTP Modal Dialog */
    .otp-modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
    .otp-modal-container { background: #ffffff; border-radius: 16px; max-width: 480px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04); overflow: hidden; animation: popIn 0.2s ease-out; }
    @keyframes popIn { 0% { transform: scale(0.95); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
    .otp-modal-header { padding: 18px 24px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
    .otp-header-title { display: flex; align-items: center; gap: 12px; }
    .modal-icon { font-size: 26px; color: #0050e5; }
    .otp-header-title h3 { margin: 0; font-size: 16px; font-weight: 800; color: #0f172a; }
    .otp-header-title p { margin: 2px 0 0; font-size: 12px; color: #64748b; }
    .btn-close-modal { background: none; border: none; font-size: 20px; color: #94a3b8; cursor: pointer; border-radius: 6px; padding: 4px; display: flex; align-items: center; justify-content: center; }
    .btn-close-modal:hover { color: #0f172a; background: #f1f5f9; }
    .otp-modal-body { padding: 24px; display: flex; flex-direction: column; gap: 18px; }
    .otp-instruction { margin: 0; font-size: 13px; color: #334155; line-height: 1.5; text-align: center; }
    .otp-digits-row { display: flex; gap: 10px; justify-content: center; }
    .otp-digit-box { width: 48px; height: 56px; border: 2px solid #cbd5e1; border-radius: 10px; text-align: center; font-size: 24px; font-weight: 800; font-family: monospace; color: #0050e5; background: #f8fafc; outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
    .otp-digit-box:focus { border-color: #0050e5; background: #ffffff; box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.15); }
    .otp-status-row { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #64748b; }
    .otp-timer { display: flex; align-items: center; gap: 4px; }
    .otp-timer .material-symbols-outlined { font-size: 16px; color: #f59e0b; }
    .btn-resend { background: none; border: none; color: #0050e5; font-size: 12px; font-weight: 700; cursor: pointer; padding: 0; text-decoration: underline; }
    .btn-resend:disabled { color: #94a3b8; cursor: not-allowed; text-decoration: none; }
    .admin-bypass-bar { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; font-size: 11.5px; color: #64748b; }
    .btn-bypass-verify { display: inline-flex; align-items: center; gap: 4px; background: #ffffff; border: 1px solid #cbd5e1; color: #15803d; font-weight: 700; font-size: 11px; padding: 4px 10px; border-radius: 6px; cursor: pointer; }
    .btn-bypass-verify:hover { background: #dcfce7; border-color: #86efac; }
    .btn-bypass-verify .material-symbols-outlined { font-size: 14px; }
    .otp-modal-footer { padding: 16px 24px; border-top: 1px solid #f1f5f9; background: #fafbfc; display: flex; justify-content: flex-end; gap: 10px; }

    /* Danger */
    .border-danger { border-color: #fecaca; }
    .bg-danger-light { background: #fff5f5; }
    .text-danger { color: #dc2626; }
    .danger-actions { display: flex; flex-direction: column; gap: 12px; }
    .danger-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
    .danger-row strong { font-size: 13px; display: block; }
    .danger-row p { font-size: 11px; color: #64748b; margin: 2px 0 0; }

    /* Mini Table */
    .table-responsive { overflow-x: auto; }
    .mini-table { width: 100%; border-collapse: collapse; text-align: left; }
    .mini-table th { padding: 8px 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; }
    .mini-table td { padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 12px; vertical-align: middle; }
    .score-pill { font-weight: 700; color: #0050e5; background: #eff6ff; padding: 2px 8px; border-radius: 4px; }
    .remarks-cell { font-size: 11px; color: #64748b; }
    .date-cell { font-size: 11px; color: #94a3b8; font-family: monospace; }

    /* Logs Stream */
    .logs-stream { display: flex; flex-direction: column; gap: 12px; }
    .log-stream-item { display: flex; gap: 10px; align-items: flex-start; }
    .log-dot { width: 8px; height: 8px; border-radius: 50%; background: #0050e5; margin-top: 6px; flex-shrink: 0; }
    .log-content { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .log-title-row { display: flex; justify-content: space-between; align-items: center; }
    .log-action-tag { font-size: 11px; font-weight: 700; color: #0050e5; background: #eff6ff; padding: 1px 6px; border-radius: 4px; }
    .log-time { font-size: 11px; color: #94a3b8; font-family: monospace; }
    .log-description { font-size: 12px; color: #334155; }
    .log-meta { font-size: 11px; color: #94a3b8; }
    .empty-cell { text-align: center; color: #94a3b8; font-size: 12px; padding: 16px; }

    .btn { height: 38px; padding: 0 16px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; text-decoration: none; border: 1px solid transparent; }
    .btn-sm { height: 32px; padding: 0 12px; font-size: 11px; }
    .btn-outline { background: #ffffff; border-color: #cbd5e1; color: #334155; }
    .btn-outline:hover { background: #f1f5f9; color: #0f172a; }
    .btn-primary { background: #0050e5 !important; color: #ffffff !important; }
    .btn-primary span, .btn-primary .material-symbols-outlined { color: #ffffff !important; }
    .btn-primary:hover:not(:disabled) { background: #0040b8 !important; color: #ffffff !important; }
    .btn-primary:hover:not(:disabled) span, .btn-primary:hover:not(:disabled) .material-symbols-outlined { color: #ffffff !important; }
    .btn-primary:disabled { background: #0050e5 !important; color: #ffffff !important; opacity: 0.65; cursor: not-allowed; }
    .btn-primary:disabled span, .btn-primary:disabled .material-symbols-outlined { color: #ffffff !important; }
    .btn-danger { background: #dc2626; color: #ffffff; }
    .btn-danger:hover { background: #b91c1c; }

    /* Role & Permissions Card */
    .btn-permission-action {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 6px 14px;
      background: linear-gradient(135deg, #fffbeb 0%, #fef2f2 100%);
      border: 1.5px solid #f87171;
      border-radius: 9999px;
      color: #991b1b;
      font-size: 12px;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(239, 68, 68, 0.12);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .btn-permission-action:hover {
      background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
      border-color: #ef4444;
      color: #7f1d1d;
      box-shadow: 0 4px 14px rgba(239, 68, 68, 0.22);
      transform: translateY(-1px);
    }
    .btn-permission-action .icon-shield {
      font-size: 17px;
      color: #dc2626;
    }
    .btn-permission-action .btn-text {
      letter-spacing: 0.01em;
    }
    .btn-permission-action .icon-arrow {
      font-size: 15px;
      color: #dc2626;
      transition: transform 0.15s ease;
    }
    .btn-permission-action:hover .icon-arrow {
      transform: translateX(3px);
    }
    .permission-view-mode { display: flex; flex-direction: column; gap: 10px; }
    .role-display-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .role-badge-large { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 8px; font-size: 13px; font-weight: 700; background: #eff6ff; color: #0050e5; border: 1px solid #bfdbfe; }
    .role-badge-large .material-symbols-outlined { font-size: 18px; }
    .role-badge-large.badge-admin { background: #eff6ff; color: #0050e5; border-color: #93c5fd; }
    .role-badge-large.badge-super { background: #fef3c7; color: #92400e; border-color: #fde68a; }
    .locked-root-pill { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; color: #b45309; background: #fffbeb; padding: 4px 8px; border-radius: 6px; border: 1px solid #fde68a; }
    .locked-root-pill .material-symbols-outlined { font-size: 13px; }
    .role-desc-text { font-size: 12.5px; color: #475569; margin: 0; line-height: 1.5; }
    .feature-scope-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; }
    .feature-scope-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; }
    .scope-badges-list { display: flex; gap: 6px; flex-wrap: wrap; }
    .scope-pill { display: inline-flex; align-items: center; gap: 4px; background: #eff6ff; color: #0050e5; font-size: 11.5px; font-weight: 700; padding: 2px 10px; border-radius: 9999px; border: 1px solid #dbeafe; }
    .scope-pill .material-symbols-outlined { font-size: 13px; }
    .root-notice-box { display: flex; align-items: center; gap: 8px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 8px 12px; font-size: 11.5px; color: #92400e; }
    .root-notice-box .material-symbols-outlined { font-size: 16px; flex-shrink: 0; }
    .form-group-role { display: flex; flex-direction: column; gap: 6px; }
    .role-input-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.05em; }
    .role-select-box { height: 40px; padding: 0 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; outline: none; background: #ffffff; color: #0f172a; width: 100%; transition: border-color 0.15s; }
    .role-select-box:focus { border-color: #0050e5; box-shadow: 0 0 0 3px rgba(0,80,229,0.1); }
    .spinner { animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
  `]
})
export class UserDetailsComponent implements OnInit {
  userId = '';
  isLoading = false;
  user: any = null;

  // 6-Digit OTP State
  isGeneratingOtp = false;
  activeOtp: string | null = null;
  activeOtpExpiry = 15;

  // Interactive OTP Verification Modal State
  showOtpModal = false;
  otpModalType: 'email' | 'phone' = 'email';
  otpDigits: string[] = ['', '', '', '', '', ''];
  isVerifyingOtp = false;
  isSendingOtp = false;
  resendCooldown = 0;
  resendInterval: any = null;
  modalCountdownSeconds = 600;
  countdownInterval: any = null;

  // Direct Password Setter
  directNewPassword = '';
  sendEmailOnPasswordReset = true;

  // Notes
  newNoteText = '';
  isPostingNote = false;

  // Role & Permissions Management State
  isEditingRole = false;
  selectedRole = 'Member';
  selectedFeatureArea = 'UserManager';
  isSavingRole = false;

  headerButtons: PageHeaderButton[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private toast: ToastService
  ) {}

  get currentRole(): string {
    if (!this.user?.roles || this.user.roles.length === 0) return 'Member';
    return this.user.roles[0];
  }

  get isCurrentRoleAdmin(): boolean {
    return this.currentRole === 'Admin' || this.currentRole === 'SuperAdmin';
  }

  get isRootSuperAdmin(): boolean {
    return this.currentRole === 'SuperAdmin';
  }

  getRoleIcon(role: string): string {
    switch (role) {
      case 'SuperAdmin': return 'military_tech';
      case 'Admin': return 'admin_panel_settings';
      case 'Global Editor': return 'edit_document';
      case 'Feature Editor': return 'auto_stories';
      case 'Read Only': return 'visibility';
      default: return 'person';
    }
  }

  getRoleDescription(role: string): string {
    switch (role) {
      case 'SuperAdmin':
        return 'Highest level root authority with permanent, unrestricted control over master tenant configurations, key pools, and licensing.';
      case 'Admin':
        return 'Full workspace administrative access across user accounts, organization settings, templates, communications, and audit telemetry.';
      case 'Global Editor':
        return 'Broad content and operational privileges to create, edit, and publish tenant entities, website content, forms, and categories.';
      case 'Feature Editor':
        return 'Specialized management access restricted strictly to your workspace assigned modular capability scope.';
      case 'Read Only':
        return 'Inspection and audit view privileges across directory listings and reports without permission to modify system records.';
      default:
        return 'Standard membership access for directory self-service, workspace dashboard, personal profile, and designated portal modules.';
    }
  }

  openRoleEditor(): void {
    this.selectedRole = this.currentRole === 'SuperAdmin' ? 'Admin' : this.currentRole;
    this.selectedFeatureArea = this.user?.assignedFeatureArea || 'UserManager';
    this.isEditingRole = true;
  }

  cancelRoleEditor(): void {
    this.isEditingRole = false;
  }

  onRoleSelectionChange(): void {
    if (this.selectedRole === 'Feature Editor' && !this.selectedFeatureArea) {
      this.selectedFeatureArea = 'UserManager';
    }
  }

  saveRolePermission(): void {
    if (!this.userId) return;
    if (this.selectedRole === 'SuperAdmin') {
      this.toast.error('The SuperAdmin role cannot be assigned.');
      return;
    }

    this.isSavingRole = true;
    const payload = {
      userId: this.userId,
      roleName: this.selectedRole,
      featureArea: this.selectedRole === 'Feature Editor' ? this.selectedFeatureArea : null
    };

    this.api.post<any>('IdentityApi/roles/assign', payload).subscribe({
      next: () => {
        this.isSavingRole = false;
        this.isEditingRole = false;
        this.toast.success(`Role & permissions updated to '${this.selectedRole}' successfully!`);
        if (this.user) {
          this.user.roles = [this.selectedRole];
          if (this.selectedRole === 'Feature Editor') {
            this.user.assignedFeatureArea = this.selectedFeatureArea;
          }
        }
      },
      error: (err) => {
        this.isSavingRole = false;
        this.toast.error(err?.error?.message || 'Failed to update user role & permissions.');
      }
    });
  }

  sanitizeId(id: string): string {
    if (!id) return '';
    return id.replace(/[-]{2,}/g, '-').replace(/[/]{2,}/g, '/').replace(/[_]{2,}/g, '_');
  }

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.userId) {
      this.router.navigate(['/users/console/list']);
      return;
    }

    this.headerButtons = [
      {
        text: 'Edit Profile',
        icon: 'edit',
        isPrimary: true,
        routerLink: `/users/console/edit/${this.userId}`
      },
      {
        text: 'Back to List',
        icon: 'arrow_back',
        isPrimary: false,
        routerLink: '/users/console/list'
      }
    ];

    this.loadDossier();
  }

  loadDossier(): void {
    this.isLoading = true;
    this.api.get<any>(`UsersApi/${this.userId}/dossier`).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.user = res.data;
        if (this.user) {
          // Ensure suffix is attached to the full name if present and not already suffixed
          const suffix = this.user.suffix;
          if (suffix && !this.user.fullName?.toLowerCase().includes(suffix.toLowerCase())) {
            this.user.fullName = `${this.user.fullName}, ${suffix}`.trim();
          }
        }
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('Failed to load member dossier.');
        this.router.navigate(['/users/console/list']);
      }
    });
  }

  generateOtp(): void {
    this.isGeneratingOtp = true;
    this.api.post<any>(`UsersApi/${this.userId}/generate-otp`, {}).subscribe({
      next: (res) => {
        this.isGeneratingOtp = false;
        this.activeOtp = res.data?.otp;
        this.activeOtpExpiry = res.data?.expiresInMinutes || 15;
        this.toast.success('6-Digit OTP generated & dispatched to email/SMS.');
      },
      error: (err) => {
        this.isGeneratingOtp = false;
        this.toast.error(err?.error?.message || 'Failed to generate OTP.');
      }
    });
  }

  copyOtp(otp: string): void {
    navigator.clipboard.writeText(otp).then(() => {
      this.toast.success(`OTP ${otp} copied to clipboard!`);
    });
  }

  // =========================================================================
  // OTP VERIFICATION MODAL METHODS
  // =========================================================================

  openOtpModal(type: 'email' | 'phone'): void {
    this.otpModalType = type;
    this.otpDigits = ['', '', '', '', '', ''];
    this.showOtpModal = true;
    this.modalCountdownSeconds = 600;

    this.startModalCountdown();
    this.resendCurrentOtp();

    // Auto-focus first digit box
    setTimeout(() => {
      const firstInput = document.getElementById('otp-input-0');
      if (firstInput) (firstInput as HTMLInputElement).focus();
    }, 100);
  }

  closeOtpModal(): void {
    this.showOtpModal = false;
    this.stopModalCountdown();
    this.stopResendTimer();
  }

  startModalCountdown(): void {
    this.stopModalCountdown();
    this.countdownInterval = setInterval(() => {
      if (this.modalCountdownSeconds > 0) {
        this.modalCountdownSeconds--;
      } else {
        this.stopModalCountdown();
      }
    }, 1000);
  }

  stopModalCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  formatCountdown(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  startResendCooldown(seconds: number = 60): void {
    this.resendCooldown = seconds;
    this.stopResendTimer();
    this.resendInterval = setInterval(() => {
      if (this.resendCooldown > 0) {
        this.resendCooldown--;
      } else {
        this.stopResendTimer();
      }
    }, 1000);
  }

  stopResendTimer(): void {
    if (this.resendInterval) {
      clearInterval(this.resendInterval);
      this.resendInterval = null;
    }
  }

  resendCurrentOtp(): void {
    if (this.isSendingOtp || this.resendCooldown > 0) return;

    this.isSendingOtp = true;
    const endpoint = this.otpModalType === 'email'
      ? `UsersApi/${this.userId}/send-email-otp`
      : `UsersApi/${this.userId}/send-phone-otp`;

    this.api.post<any>(endpoint, {}).subscribe({
      next: (res) => {
        this.isSendingOtp = false;
        const cooldown = res?.data?.retryAfterSeconds || 60;
        this.startResendCooldown(cooldown);
        this.toast.success(res?.message || 'Verification OTP code dispatched!');
      },
      error: (err) => {
        this.isSendingOtp = false;
        this.toast.error(err?.error?.message || 'Failed to dispatch verification code.');
      }
    });
  }

  onDigitInput(index: number, event: any): void {
    const val = event.target.value;
    if (val && val.length > 0) {
      this.otpDigits[index] = val.slice(-1);
      if (index < 5) {
        const nextInput = document.getElementById(`otp-input-${index + 1}`);
        if (nextInput) (nextInput as HTMLInputElement).focus();
      }
    }
  }

  onDigitKeyDown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      if (prevInput) {
        (prevInput as HTMLInputElement).focus();
        this.otpDigits[index - 1] = '';
      }
    }
  }

  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasteData = event.clipboardData?.getData('text') || '';
    const digitsOnly = pasteData.replace(/\D/g, '').slice(0, 6);
    if (digitsOnly.length > 0) {
      for (let i = 0; i < 6; i++) {
        this.otpDigits[i] = digitsOnly[i] || '';
      }
      const focusIndex = Math.min(digitsOnly.length, 5);
      const targetInput = document.getElementById(`otp-input-${focusIndex}`);
      if (targetInput) (targetInput as HTMLInputElement).focus();
    }
  }

  getEnteredOtp(): string {
    return this.otpDigits.join('').trim();
  }

  submitOtpCode(): void {
    const code = this.getEnteredOtp();
    if (code.length !== 6) {
      this.toast.warning('Please enter all 6 digits of the verification code.');
      return;
    }

    this.isVerifyingOtp = true;
    const endpoint = this.otpModalType === 'email'
      ? `UsersApi/${this.userId}/verify-email-otp`
      : `UsersApi/${this.userId}/verify-phone-otp`;

    this.api.post<any>(endpoint, { otpCode: code }).subscribe({
      next: (res) => {
        this.isVerifyingOtp = false;
        this.toast.success(res?.message || 'Identity confirmed successfully!');
        if (this.otpModalType === 'email') {
          this.user.emailConfirmed = true;
        } else {
          this.user.phoneNumberConfirmed = true;
        }
        this.closeOtpModal();
        this.loadDossier();
      },
      error: (err) => {
        this.isVerifyingOtp = false;
        this.toast.error(err?.error?.message || 'Invalid or expired verification code.');
      }
    });
  }

  quickAdminVerify(target: 'email' | 'phone', isVerified: boolean): void {
    this.api.post<any>(`UsersApi/${this.userId}/toggle-verification`, {
      target,
      isVerified
    }).subscribe({
      next: (res) => {
        this.toast.success(res?.message || 'Verification status updated.');
        if (target === 'email') {
          this.user.emailConfirmed = isVerified;
        } else {
          this.user.phoneNumberConfirmed = isVerified;
        }
        this.closeOtpModal();
        this.loadDossier();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to update verification status.');
      }
    });
  }

  generateDirectRandomPassword(): void {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = 'Pass@';
    for (let i = 0; i < 5; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.directNewPassword = pass;
  }

  applyDirectPassword(): void {
    if (!this.directNewPassword.trim()) return;

    this.api.put<any>(`UsersApi/${this.userId}/reset-password`, {
      newPassword: this.directNewPassword,
      mustChangePassword: true,
      sendEmailNotification: this.sendEmailOnPasswordReset
    }).subscribe({
      next: (res) => {
        this.toast.success(res?.message || 'Temporary password applied! Instructions dispatched.');
        this.directNewPassword = '';
        this.loadDossier();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to set temporary password.');
      }
    });
  }

  addAdminNote(): void {
    if (!this.newNoteText.trim()) return;

    this.isPostingNote = true;
    this.api.post<any>(`UsersApi/${this.userId}/notes`, { note: this.newNoteText }).subscribe({
      next: () => {
        this.isPostingNote = false;
        this.newNoteText = '';
        this.toast.success('Confidential note posted.');
        this.loadDossier();
      },
      error: (err) => {
        this.isPostingNote = false;
        this.toast.error(err?.error?.message || 'Failed to post note.');
      }
    });
  }

  async toggleAccountStatus(): Promise<void> {
    const isSuspending = this.user.userStatus === 'Active';
    const title = isSuspending ? 'Suspend Member Account' : 'Reactivate Member Account';
    const message = isSuspending
      ? `Are you sure you want to temporarily suspend access for '${this.user.fullName}'?`
      : `Are you sure you want to restore full workspace access for '${this.user.fullName}'?`;

    const confirmed = await this.toast.confirm(title, message, isSuspending ? 'Suspend Account' : 'Reactivate Account', 'Cancel', isSuspending ? 'warning' : 'info');
    if (!confirmed) return;

    const newStatus = !isSuspending;
    this.api.put<any>(`UsersApi/${this.userId}/status`, { isActive: newStatus }).subscribe({
      next: () => {
        this.toast.success(`Account status updated to ${newStatus ? 'Active' : 'Suspended'}.`);
        this.loadDossier();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to update status.');
      }
    });
  }

  async confirmDeleteUser(): Promise<void> {
    const confirmed = await this.toast.confirm(
      'Delete Member Account',
      `You are about to permanently destroy the member account for '${this.user.fullName}' (${this.user.email}).`,
      'Permanently Delete User',
      'Cancel',
      'danger',
      this.user.fullName,
      [
        'All login credentials, OAuth tokens, and sessions will be revoked.',
        'All KPI performance ratings, user notes, and role assignments will be deleted.',
        'This account cannot be restored.'
      ]
    );
    if (!confirmed) return;

    this.api.delete<any>(`UsersApi/${this.userId}`).subscribe({
      next: () => {
        this.toast.success('Member account deleted permanently.');
        this.router.navigate(['/users/console/list']);
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to delete member.');
      }
    });
  }

  getInitials(name: string): string {
    if (!name) return 'U';
    // Clean out comma and suffix if present (e.g. "Dr. First Last, mni" -> "Dr. First Last")
    const cleanName = name.split(',')[0].trim();
    const parts = cleanName.split(/\s+/).filter(p => p.length > 0);
    if (parts.length >= 2) {
      const titles = ['mr', 'mr.', 'mrs', 'mrs.', 'ms', 'ms.', 'dr', 'dr.', 'prof', 'prof.', 'chief', 'engr', 'engr.', 'barr', 'barr.', 'rev', 'rev.', 'pastor', 'hon', 'hon.'];
      let firstIndex = 0;
      if (titles.includes(parts[0].toLowerCase()) && parts.length >= 3) {
        firstIndex = 1;
      }
      return (parts[firstIndex][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return cleanName.substring(0, 2).toUpperCase();
  }

  getGradient(name: string): string {
    const gradients = [
      'linear-gradient(135deg, #0050e5, #38bdf8)',
      'linear-gradient(135deg, #10b981, #06b6d4)',
      'linear-gradient(135deg, #8b5cf6, #ec4899)',
      'linear-gradient(135deg, #f59e0b, #ef4444)'
    ];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return gradients[Math.abs(hash) % gradients.length];
  }

  isGuid(val: string): boolean {
    if (!val) return false;
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val.trim());
  }
}
