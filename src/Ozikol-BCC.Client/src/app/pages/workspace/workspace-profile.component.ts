import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-workspace-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="profile-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">My Profile & Dossier</h1>
          <p class="page-sub">Manage your personal information, security credentials, contact details, and organization dossier.</p>
        </div>
      </div>

      <!-- Global Alert Banner if either Email or Phone is Unverified -->
      <div *ngIf="!model.emailConfirmed || !model.phoneNumberConfirmed" class="global-unverified-alert">
        <div class="alert-icon-col">
          <span class="material-symbols-outlined">warning</span>
        </div>
        <div class="alert-content-col">
          <strong>Security Action Required:</strong>
          <span>
            <ng-container *ngIf="!model.emailConfirmed && !model.phoneNumberConfirmed">
              Both your primary email address and mobile phone number are unverified. Please verify both below to unlock self-service recovery and official workspace notifications.
            </ng-container>
            <ng-container *ngIf="!model.emailConfirmed && model.phoneNumberConfirmed">
              Your primary email address is unverified. Verification is required to receive critical security broadcasts and enable self-service password reset.
            </ng-container>
            <ng-container *ngIf="model.emailConfirmed && !model.phoneNumberConfirmed">
              Your mobile phone number is unverified. Verification enables instant SMS dispatch and 2FA recovery channels.
            </ng-container>
          </span>
        </div>
      </div>

      <div class="profile-layout">
        <!-- Left: Profile Avatar & Organization Dossier Card -->
        <div class="avatar-card">
          <div class="avatar-circle-wrap">
            <div class="avatar-circle">
              <img *ngIf="model.avatarUrl" [src]="model.avatarUrl" alt="Avatar" class="avatar-img" />
              <span *ngIf="!model.avatarUrl" class="avatar-initials">{{ getInitials() }}</span>
            </div>
            <!-- Cloudinary Photo Upload Camera Button -->
            <button type="button" class="avatar-upload-btn" (click)="fileInput.click()" [disabled]="uploadingAvatar" title="Upload Photo to Cloudinary">
              <span class="material-symbols-outlined">{{ uploadingAvatar ? 'hourglass_top' : 'photo_camera' }}</span>
            </button>
            <input type="file" #fileInput (change)="onAvatarFileSelected($event)" accept="image/png, image/jpeg, image/webp" style="display:none" />
          </div>

          <h2 class="user-fullname">{{ model.title ? model.title + ' ' : '' }}{{ model.firstName }} {{ model.lastName }}</h2>
          <p class="user-role-label">{{ model.designation || 'Member of Organization' }}</p>

          <div class="dossier-pills-list">
            <div class="dossier-pill member-id">
              <span class="material-symbols-outlined">badge</span>
              <span>ID: {{ model.memberId || 'CC-2026-0099' }}</span>
            </div>
            <div class="dossier-pill category" [style.border-color]="model.categoryColor">
              <span class="material-symbols-outlined" [style.color]="model.categoryColor">category</span>
              <span>Category: {{ model.categoryName || 'Standard Member' }}</span>
            </div>
            <div class="dossier-pill join-date">
              <span class="material-symbols-outlined">event</span>
              <span>Joined: {{ (model.joinDate | date:'mediumDate') || '2026' }}</span>
            </div>
            <div class="dossier-pill status-active">
              <span class="material-symbols-outlined">verified</span>
              <span>Status: {{ model.userStatus || 'Active Member' }}</span>
            </div>
            <div *ngFor="let role of model.roles" class="dossier-pill role-pill">
              <span class="material-symbols-outlined">shield</span>
              <span>Role: {{ role }}</span>
            </div>
          </div>

          <!-- Security Health Score Box -->
          <div class="security-health-box">
            <div class="health-header">
              <span class="health-title">Security Health</span>
              <span class="health-percent" [class.full]="getSecurityScore() === 100">{{ getSecurityScore() }}%</span>
            </div>
            <div class="health-bar-track">
              <div class="health-bar-fill" [style.width.%]="getSecurityScore()" [class.full]="getSecurityScore() === 100"></div>
            </div>
            <div class="health-checklist">
              <div class="check-item" [class.done]="model.emailConfirmed">
                <span class="material-symbols-outlined">{{ model.emailConfirmed ? 'check_circle' : 'cancel' }}</span>
                <span>Email {{ model.emailConfirmed ? 'Verified' : 'Unverified' }}</span>
              </div>
              <div class="check-item" [class.done]="model.phoneNumberConfirmed">
                <span class="material-symbols-outlined">{{ model.phoneNumberConfirmed ? 'check_circle' : 'cancel' }}</span>
                <span>Phone {{ model.phoneNumberConfirmed ? 'Verified' : 'Unverified' }}</span>
              </div>
            </div>
          </div>

          <!-- Quick Navigation Actions -->
          <div class="dossier-actions-list">
            <a routerLink="/users/workspace/profile/biography" class="dossier-nav-btn">
              <span class="material-symbols-outlined">description</span>
              <span>My CV & Biography</span>
              <span class="material-symbols-outlined arrow">chevron_right</span>
            </a>
            <a routerLink="/identity/console/account" class="dossier-nav-btn">
              <span class="material-symbols-outlined">security</span>
              <span>Manage Security & 2FA</span>
              <span class="material-symbols-outlined arrow">chevron_right</span>
            </a>
          </div>

          <div *ngIf="avatarSuccessMsg" class="avatar-msg success">{{ avatarSuccessMsg }}</div>
          <div *ngIf="avatarErrorMsg" class="avatar-msg error">{{ avatarErrorMsg }}</div>
        </div>

        <!-- Right: Multi-Card Content Area -->
        <div class="cards-column">
          <!-- CARD 1: Personal Details & Identity Form -->
          <div class="form-card">
            <div class="card-header">
              <div class="head-title">
                <span class="material-symbols-outlined text-primary">person</span>
                <h3>Personal Identity & Bio</h3>
              </div>
            </div>

            <form (ngSubmit)="savePersonalDetails()">
              <div class="form-grid">
                <!-- Title / Salutation -->
                <div class="form-group">
                  <label>Title / Salutation</label>
                  <select [(ngModel)]="model.title" name="title" class="form-input">
                    <option value="">-- Select Title --</option>
                    <option value="Mr">Mr</option>
                    <option value="Mrs">Mrs</option>
                    <option value="Ms">Ms</option>
                    <option value="Dr">Dr</option>
                    <option value="Prof">Prof</option>
                    <option value="Engr">Engr</option>
                    <option value="Chief">Chief</option>
                    <option value="Barr">Barr</option>
                    <option value="Rev">Rev</option>
                    <option value="Pastor">Pastor</option>
                  </select>
                </div>

                <!-- First Name -->
                <div class="form-group">
                  <label>First Name <span class="req">*</span></label>
                  <input type="text" [(ngModel)]="model.firstName" name="firstName" required placeholder="e.g. First Name" class="form-input" />
                </div>

                <!-- Middle Name -->
                <div class="form-group">
                  <label>Middle Name</label>
                  <input type="text" [(ngModel)]="model.middleName" name="middleName" placeholder="Optional" class="form-input" />
                </div>

                <!-- Last Name -->
                <div class="form-group">
                  <label>Last Name <span class="req">*</span></label>
                  <input type="text" [(ngModel)]="model.lastName" name="lastName" required placeholder="e.g. Last Name" class="form-input" />
                </div>

                <!-- Date of Birth -->
                <div class="form-group">
                  <label>Date of Birth</label>
                  <input type="date" [(ngModel)]="model.dateOfBirth" name="dateOfBirth" class="form-input" />
                </div>

                <!-- Gender -->
                <div class="form-group">
                  <label>Gender</label>
                  <select [(ngModel)]="model.gender" name="gender" class="form-input">
                    <option value="">-- Select Gender --</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>

                <!-- Professional Designation -->
                <div class="form-group full-width">
                  <label>Professional Designation / Role</label>
                  <input type="text" [(ngModel)]="model.designation" name="designation" placeholder="e.g. Senior Software Engineer" class="form-input" />
                </div>
              </div>

              <div class="form-actions">
                <button type="submit" [disabled]="savingPersonal" class="btn-primary">
                  <span class="material-symbols-outlined">{{ savingPersonal ? 'hourglass_top' : 'save' }}</span>
                  <span>{{ savingPersonal ? 'Saving Changes...' : 'Save Personal Details' }}</span>
                </button>
                <span *ngIf="personalSuccessMsg" class="banner-msg success">{{ personalSuccessMsg }}</span>
                <span *ngIf="personalErrorMsg" class="banner-msg error">{{ personalErrorMsg }}</span>
              </div>
            </form>
          </div>

          <!-- CARD 2: Primary Email Address (Dynamic Verification & Change Engine) -->
          <div class="form-card">
            <div class="card-header">
              <div class="head-title">
                <span class="material-symbols-outlined text-blue">mail</span>
                <h3>Primary Email Address</h3>
              </div>
              <span *ngIf="model.emailConfirmed" class="status-badge verified">
                <span class="material-symbols-outlined">check_circle</span>
                Verified Email
              </span>
              <span *ngIf="!model.emailConfirmed" class="status-badge unverified">
                <span class="material-symbols-outlined">warning</span>
                Unverified Email
              </span>
            </div>

            <div class="contact-card-body">
              <!-- Current Email Display Row -->
              <div class="current-contact-row" *ngIf="!emailChangeMode && !emailVerifyMode">
                <div class="contact-val">
                  <span class="material-symbols-outlined">alternate_email</span>
                  <strong>{{ model.email }}</strong>
                </div>
                <div class="contact-actions-wrap">
                  <button *ngIf="!model.emailConfirmed" type="button" class="btn-verify-highlight" (click)="startEmailVerify()">
                    <span class="material-symbols-outlined">mark_email_read</span>
                    <span>Verify Email Now</span>
                  </button>
                  <button type="button" class="btn-outline" (click)="startEmailChange()">
                    <span class="material-symbols-outlined">edit</span>
                    <span>Change Email</span>
                  </button>
                </div>
              </div>

              <!-- Unverified Warning Banner -->
              <div *ngIf="!model.emailConfirmed && !emailVerifyMode && !emailChangeMode" class="unverified-alert-banner">
                <span class="material-symbols-outlined alert-icon">warning</span>
                <div class="unverified-text">
                  <strong>Verification Required:</strong> Your primary email address is unverified. Confirm your email to receive security alerts and enable self-service password recovery.
                </div>
                <button type="button" class="btn-primary btn-sm" (click)="startEmailVerify()">
                  Verify Email
                </button>
              </div>

              <!-- IN-PLACE VERIFICATION FLOW: For Current Unconfirmed Email -->
              <div class="otp-flow-box" *ngIf="emailVerifyMode">
                <div class="otp-flow-header">
                  <h4>Verify Primary Email</h4>
                  <button type="button" class="btn-close" (click)="emailVerifyMode = false">✕</button>
                </div>
                <p class="otp-desc">
                  A 6-digit verification code will be sent to <strong>{{ model.email }}</strong>. Enter the code below to complete verification.
                </p>

                <div class="otp-inputs-grid" *ngIf="emailVerifyOtpSent">
                  <div class="form-group">
                    <label>Enter 6-Digit Verification Code</label>
                    <input type="text" [(ngModel)]="emailVerifyCode" maxlength="6" placeholder="e.g. 123456" class="form-input code-input" />
                  </div>
                </div>

                <div class="otp-actions-row">
                  <button *ngIf="!emailVerifyOtpSent" type="button" class="btn-primary" [disabled]="sendingVerifyEmailOtp" (click)="requestCurrentEmailOtp()">
                    <span class="material-symbols-outlined">{{ sendingVerifyEmailOtp ? 'hourglass_top' : 'send' }}</span>
                    <span>{{ sendingVerifyEmailOtp ? 'Sending Code...' : 'Send Verification Code' }}</span>
                  </button>

                  <button *ngIf="emailVerifyOtpSent" type="button" class="btn-success" [disabled]="confirmingVerifyEmail || !emailVerifyCode" (click)="confirmCurrentEmailVerification()">
                    <span class="material-symbols-outlined">{{ confirmingVerifyEmail ? 'hourglass_top' : 'verified' }}</span>
                    <span>{{ confirmingVerifyEmail ? 'Verifying...' : 'Confirm & Verify Email' }}</span>
                  </button>

                  <button *ngIf="emailVerifyOtpSent" type="button" class="btn-text" [disabled]="resendEmailCountdown > 0" (click)="requestCurrentEmailOtp()">
                    {{ resendEmailCountdown > 0 ? 'Resend code in ' + resendEmailCountdown + 's' : 'Resend Code' }}
                  </button>
                </div>

                <div *ngIf="emailVerifySuccessMsg" class="banner-msg success">{{ emailVerifySuccessMsg }}</div>
                <div *ngIf="emailVerifyErrorMsg" class="banner-msg error">{{ emailVerifyErrorMsg }}</div>
              </div>

              <!-- CHANGE EMAIL FLOW: For Updating to a New Email Address -->
              <div class="otp-flow-box" *ngIf="emailChangeMode">
                <div class="otp-flow-header">
                  <h4>Change Email Address</h4>
                  <button type="button" class="btn-close" (click)="emailChangeMode = false">✕</button>
                </div>
                <p class="otp-desc">Enter your new email address. A 6-digit verification code will be sent to confirm the change.</p>

                <div class="otp-inputs-grid">
                  <div class="form-group">
                    <label>New Email Address</label>
                    <input type="email" [(ngModel)]="newEmail" [disabled]="emailOtpSent" placeholder="name@company.com" class="form-input" />
                  </div>
                  <div class="form-group" *ngIf="emailOtpSent">
                    <label>Enter 6-Digit Verification Code</label>
                    <input type="text" [(ngModel)]="emailOtpCode" maxlength="6" placeholder="e.g. 123456" class="form-input code-input" />
                  </div>
                </div>

                <div class="otp-actions-row">
                  <button *ngIf="!emailOtpSent" type="button" class="btn-primary" [disabled]="sendingEmailOtp || !newEmail" (click)="requestEmailOtp()">
                    <span class="material-symbols-outlined">{{ sendingEmailOtp ? 'hourglass_top' : 'send' }}</span>
                    <span>{{ sendingEmailOtp ? 'Sending Code...' : 'Send Verification Code' }}</span>
                  </button>

                  <button *ngIf="emailOtpSent" type="button" class="btn-success" [disabled]="confirmingEmail || !emailOtpCode" (click)="confirmEmailChange()">
                    <span class="material-symbols-outlined">{{ confirmingEmail ? 'hourglass_top' : 'verified' }}</span>
                    <span>{{ confirmingEmail ? 'Verifying...' : 'Verify & Update Email' }}</span>
                  </button>

                  <button *ngIf="emailOtpSent" type="button" class="btn-text" [disabled]="sendingEmailOtp" (click)="requestEmailOtp()">
                    Resend Code
                  </button>
                </div>

                <div *ngIf="emailSuccessMsg" class="banner-msg success">{{ emailSuccessMsg }}</div>
                <div *ngIf="emailErrorMsg" class="banner-msg error">{{ emailErrorMsg }}</div>
              </div>
            </div>
          </div>

          <!-- CARD 3: Mobile Phone Number (Dynamic SMS Verification & Change Engine) -->
          <div class="form-card">
            <div class="card-header">
              <div class="head-title">
                <span class="material-symbols-outlined text-green">call</span>
                <h3>Mobile Phone Number</h3>
              </div>
              <span *ngIf="model.phoneNumberConfirmed" class="status-badge verified">
                <span class="material-symbols-outlined">check_circle</span>
                Verified Phone
              </span>
              <span *ngIf="!model.phoneNumberConfirmed" class="status-badge unverified">
                <span class="material-symbols-outlined">warning</span>
                Unverified Phone
              </span>
            </div>

            <div class="contact-card-body">
              <!-- Current Phone Display Row -->
              <div class="current-contact-row" *ngIf="!phoneChangeMode && !phoneVerifyMode">
                <div class="contact-val">
                  <span class="material-symbols-outlined">phone_iphone</span>
                  <strong>{{ model.phoneNumber || 'No phone number provided' }}</strong>
                </div>
                <div class="contact-actions-wrap">
                  <button *ngIf="!model.phoneNumberConfirmed && model.phoneNumber" type="button" class="btn-verify-highlight" (click)="startPhoneVerify()">
                    <span class="material-symbols-outlined">sms</span>
                    <span>Verify Phone via SMS</span>
                  </button>
                  <button type="button" class="btn-outline" (click)="startPhoneChange()">
                    <span class="material-symbols-outlined">edit</span>
                    <span>{{ model.phoneNumber ? 'Update Phone' : 'Add Phone Number' }}</span>
                  </button>
                </div>
              </div>

              <!-- Unverified Phone Warning Banner -->
              <div *ngIf="!model.phoneNumberConfirmed && model.phoneNumber && !phoneVerifyMode && !phoneChangeMode" class="unverified-alert-banner">
                <span class="material-symbols-outlined alert-icon">warning</span>
                <div class="unverified-text">
                  <strong>Verification Required:</strong> Your mobile phone number is unverified. Complete verification to receive urgent SMS security alerts and enable SMS OTP authentication.
                </div>
                <button type="button" class="btn-primary btn-sm" (click)="startPhoneVerify()">
                  Verify Phone
                </button>
              </div>

              <!-- IN-PLACE VERIFICATION FLOW: For Current Unconfirmed Phone -->
              <div class="otp-flow-box" *ngIf="phoneVerifyMode">
                <div class="otp-flow-header">
                  <h4>Verify Mobile Phone</h4>
                  <button type="button" class="btn-close" (click)="phoneVerifyMode = false">✕</button>
                </div>
                <p class="otp-desc">
                  A 6-digit SMS verification code will be sent to <strong>{{ model.phoneNumber }}</strong>. Standard carrier message rates may apply.
                </p>

                <div class="otp-inputs-grid" *ngIf="phoneVerifyOtpSent">
                  <div class="form-group">
                    <label>Enter 6-Digit SMS Code</label>
                    <input type="text" [(ngModel)]="phoneVerifyCode" maxlength="6" placeholder="e.g. 123456" class="form-input code-input" />
                  </div>
                </div>

                <div class="otp-actions-row">
                  <button *ngIf="!phoneVerifyOtpSent" type="button" class="btn-primary" [disabled]="sendingVerifyPhoneOtp" (click)="requestCurrentPhoneOtp()">
                    <span class="material-symbols-outlined">{{ sendingVerifyPhoneOtp ? 'hourglass_top' : 'sms' }}</span>
                    <span>{{ sendingVerifyPhoneOtp ? 'Sending SMS...' : 'Send SMS Verification Code' }}</span>
                  </button>

                  <button *ngIf="phoneVerifyOtpSent" type="button" class="btn-success" [disabled]="confirmingVerifyPhone || !phoneVerifyCode" (click)="confirmCurrentPhoneVerification()">
                    <span class="material-symbols-outlined">{{ confirmingVerifyPhone ? 'hourglass_top' : 'verified' }}</span>
                    <span>{{ confirmingVerifyPhone ? 'Verifying...' : 'Confirm & Verify Phone' }}</span>
                  </button>

                  <button *ngIf="phoneVerifyOtpSent" type="button" class="btn-text" [disabled]="resendPhoneCountdown > 0" (click)="requestCurrentPhoneOtp()">
                    {{ resendPhoneCountdown > 0 ? 'Resend SMS in ' + resendPhoneCountdown + 's' : 'Resend SMS' }}
                  </button>
                </div>

                <div *ngIf="phoneVerifySuccessMsg" class="banner-msg success">{{ phoneVerifySuccessMsg }}</div>
                <div *ngIf="phoneVerifyErrorMsg" class="banner-msg error">{{ phoneVerifyErrorMsg }}</div>
              </div>

              <!-- CHANGE PHONE FLOW: For Updating to a New Phone Number -->
              <div class="otp-flow-box" *ngIf="phoneChangeMode">
                <div class="otp-flow-header">
                  <h4>Update Mobile Phone</h4>
                  <button type="button" class="btn-close" (click)="phoneChangeMode = false">✕</button>
                </div>
                <p class="otp-desc">Enter your international phone number. A 6-digit SMS code will be dispatched to confirm.</p>

                <div class="otp-inputs-grid">
                  <div class="form-group">
                    <label>New Phone Number (e.g. +0 (000) 000-0000)</label>
                    <input type="tel" [(ngModel)]="newPhone" [disabled]="phoneOtpSent" placeholder="e.g. +1 (555) 000-0000" class="form-input" />
                  </div>
                  <div class="form-group" *ngIf="phoneOtpSent">
                    <label>Enter 6-Digit SMS Code</label>
                    <input type="text" [(ngModel)]="phoneOtpCode" maxlength="6" placeholder="e.g. 123456" class="form-input code-input" />
                  </div>
                </div>

                <div class="otp-actions-row">
                  <button *ngIf="!phoneOtpSent" type="button" class="btn-primary" [disabled]="sendingPhoneOtp || !newPhone" (click)="requestPhoneOtp()">
                    <span class="material-symbols-outlined">{{ sendingPhoneOtp ? 'hourglass_top' : 'sms' }}</span>
                    <span>{{ sendingPhoneOtp ? 'Sending SMS...' : 'Send SMS Verification Code' }}</span>
                  </button>

                  <button *ngIf="phoneOtpSent" type="button" class="btn-success" [disabled]="confirmingPhone || !phoneOtpCode" (click)="confirmPhoneChange()">
                    <span class="material-symbols-outlined">{{ confirmingPhone ? 'hourglass_top' : 'verified' }}</span>
                    <span>{{ confirmingPhone ? 'Verifying...' : 'Verify & Update Phone' }}</span>
                  </button>

                  <button *ngIf="phoneOtpSent" type="button" class="btn-text" [disabled]="sendingPhoneOtp" (click)="requestPhoneOtp()">
                    Resend SMS
                  </button>
                </div>

                <div *ngIf="phoneSuccessMsg" class="banner-msg success">{{ phoneSuccessMsg }}</div>
                <div *ngIf="phoneErrorMsg" class="banner-msg error">{{ phoneErrorMsg }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .profile-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .page-header { margin-bottom: 4px; }
    .page-title { font-size: 22px; font-weight: 800; color: var(--md-sys-color-on-surface, #0f172a); margin: 0 0 4px; }
    .page-sub { font-size: 13px; color: #64748b; margin: 0; }

    /* Global Unverified Alert Banner */
    .global-unverified-alert {
      display: flex;
      align-items: center;
      gap: 14px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-left: 4px solid #f59e0b;
      padding: 14px 18px;
      border-radius: 12px;
      color: #92400e;
    }
    .global-unverified-alert .alert-icon-col span {
      font-size: 24px;
      color: #f59e0b;
    }
    .global-unverified-alert .alert-content-col {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 13px;
      line-height: 1.45;
    }

    .profile-layout {
      display: grid;
      grid-template-columns: 310px 1fr;
      gap: 24px;
      align-items: start;
    }
    @media (max-width: 960px) {
      .profile-layout { grid-template-columns: 1fr; }
    }

    /* Left Avatar Card */
    .avatar-card {
      background: var(--md-sys-color-surface, #ffffff);
      border: 1px solid var(--md-sys-color-outline, #e2e8f0);
      border-radius: 16px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }
    .avatar-circle-wrap {
      position: relative;
      margin-bottom: 16px;
    }
    .avatar-circle {
      width: 104px;
      height: 104px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0050e5, #3b82f6);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border: 4px solid #ffffff;
      box-shadow: 0 4px 14px rgba(0, 80, 229, 0.25);
    }
    .avatar-img { width: 100%; height: 100%; object-fit: cover; }
    .avatar-initials { font-size: 32px; font-weight: 800; color: #ffffff; letter-spacing: 1px; }

    .avatar-upload-btn {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: #0050e5;
      color: #ffffff;
      border: 2px solid #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
      transition: transform 0.2s, background 0.2s;
    }
    .avatar-upload-btn:hover:not(:disabled) { transform: scale(1.08); background: #003db3; }
    .avatar-upload-btn span { font-size: 18px; }

    .user-fullname { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
    .user-role-label { font-size: 13px; color: #64748b; margin: 0 0 16px; }

    .dossier-pills-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      margin-bottom: 20px;
    }
    .dossier-pill {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 14px;
      border-radius: 10px;
      font-size: 12.5px;
      font-weight: 600;
      text-align: left;
    }
    .dossier-pill span.material-symbols-outlined { font-size: 18px; }
    .dossier-pill.member-id { background: #eff6ff; color: #0050e5; border: 1px solid #bfdbfe; }
    .dossier-pill.category { background: #f8fafc; color: #334155; border: 1px solid #e2e8f0; }
    .dossier-pill.join-date { background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; }
    .dossier-pill.status-active { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
    .dossier-pill.role-pill { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }

    /* Security Health Box */
    .security-health-box {
      width: 100%;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px;
      margin-bottom: 16px;
      text-align: left;
    }
    .health-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .health-title { font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
    .health-percent { font-size: 13px; font-weight: 800; color: #f59e0b; }
    .health-percent.full { color: #16a34a; }

    .health-bar-track {
      width: 100%;
      height: 6px;
      background: #e2e8f0;
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 12px;
    }
    .health-bar-fill {
      height: 100%;
      background: #f59e0b;
      border-radius: 3px;
      transition: width 0.4s ease;
    }
    .health-bar-fill.full { background: #16a34a; }

    .health-checklist {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .check-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #94a3b8;
    }
    .check-item span.material-symbols-outlined { font-size: 16px; color: #cbd5e1; }
    .check-item.done { color: #16a34a; font-weight: 600; }
    .check-item.done span.material-symbols-outlined { color: #16a34a; }

    /* Quick Dossier Actions */
    .dossier-actions-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
    }
    .dossier-nav-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      color: #334155;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      transition: background 0.15s, border-color 0.15s;
    }
    .dossier-nav-btn:hover { background: #f8fafc; border-color: #cbd5e1; }
    .dossier-nav-btn .arrow { margin-left: auto; font-size: 18px; color: #94a3b8; }

    .avatar-msg {
      margin-top: 10px;
      font-size: 12px;
      padding: 6px 12px;
      border-radius: 6px;
    }
    .avatar-msg.success { background: #f0fdf4; color: #16a34a; }
    .avatar-msg.error { background: #fef2f2; color: #dc2626; }

    /* Right Column Cards */
    .cards-column {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .form-card {
      background: var(--md-sys-color-surface, #ffffff);
      border: 1px solid var(--md-sys-color-outline, #e2e8f0);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 14px;
      border-bottom: 1px solid #f1f5f9;
    }
    .head-title {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .head-title span { font-size: 22px; }
    .head-title h3 { font-size: 16px; font-weight: 800; color: #0f172a; margin: 0; }
    .text-primary { color: #0050e5; }
    .text-blue { color: #0284c7; }
    .text-green { color: #16a34a; }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 700;
      padding: 5px 12px;
      border-radius: 20px;
    }
    .status-badge span { font-size: 16px; }
    .status-badge.verified { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }
    .status-badge.unverified { background: #fffbeb; color: #d97706; border: 1px solid #fde68a; }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 18px;
    }
    @media (max-width: 640px) {
      .form-grid { grid-template-columns: 1fr; }
    }
    .form-group.full-width { grid-column: 1 / -1; }
    .form-group label {
      display: block;
      font-size: 12.5px;
      font-weight: 700;
      color: #334155;
      margin-bottom: 6px;
    }
    .req { color: #ef4444; }

    .form-input {
      width: 100%;
      height: 42px;
      padding: 0 14px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13.5px;
      color: #0f172a;
      background: #ffffff;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
      box-sizing: border-box;
    }
    .form-input:focus { border-color: #0050e5; box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.1); }
    .form-input.code-input {
      font-family: monospace;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 4px;
      text-align: center;
    }

    .gender-radio-group {
      display: flex;
      gap: 8px;
      height: 42px;
    }
    .gender-label {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      transition: all 0.2s;
    }
    .gender-label input { display: none; }
    .gender-label.checked {
      background: #eff6ff;
      border-color: #0050e5;
      color: #0050e5;
    }

    .form-actions {
      margin-top: 22px;
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 42px;
      padding: 0 20px;
      background: #0050e5;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-primary:hover:not(:disabled) { background: #003db3; }
    .btn-primary:disabled { opacity: 0.65; cursor: not-allowed; }
    .btn-primary.btn-sm { height: 34px; padding: 0 14px; font-size: 12.5px; }

    .btn-success {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 42px;
      padding: 0 20px;
      background: #16a34a;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-success:hover:not(:disabled) { background: #15803d; }
    .btn-success:disabled { opacity: 0.65; cursor: not-allowed; }

    .btn-outline {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 36px;
      padding: 0 14px;
      background: #ffffff;
      color: #334155;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-outline:hover { background: #f8fafc; border-color: #94a3b8; }

    .btn-verify-highlight {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 36px;
      padding: 0 14px;
      background: #f59e0b;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(245, 158, 11, 0.3);
      transition: background 0.2s;
    }
    .btn-verify-highlight:hover { background: #d97706; }

    .btn-text {
      background: none;
      border: none;
      color: #0050e5;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: underline;
    }
    .btn-text:disabled { color: #94a3b8; text-decoration: none; cursor: not-allowed; }

    .btn-close {
      background: none;
      border: none;
      font-size: 18px;
      color: #94a3b8;
      cursor: pointer;
      line-height: 1;
    }
    .btn-close:hover { color: #0f172a; }

    .banner-msg {
      font-size: 13px;
      font-weight: 600;
      padding: 8px 14px;
      border-radius: 6px;
    }
    .banner-msg.success { background: #ecfdf5; color: #059669; }
    .banner-msg.error { background: #fef2f2; color: #dc2626; }

    /* Contact Card Styles */
    .contact-card-body {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .current-contact-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 18px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
    }
    .contact-val {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 15px;
      color: #0f172a;
    }
    .contact-val span { font-size: 20px; color: #64748b; }
    .contact-actions-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .unverified-alert-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 10px;
      color: #92400e;
    }
    .alert-icon { font-size: 22px; color: #f59e0b; flex-shrink: 0; }
    .unverified-text { font-size: 13px; line-height: 1.4; flex: 1; }

    /* OTP Flow Box */
    .otp-flow-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 20px;
    }
    .otp-flow-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .otp-flow-header h4 { font-size: 15px; font-weight: 800; color: #0f172a; margin: 0; }
    .otp-desc { font-size: 13px; color: #475569; margin: 0 0 16px; line-height: 1.45; }
    .otp-inputs-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 16px;
    }
    @media (max-width: 600px) {
      .otp-inputs-grid { grid-template-columns: 1fr; }
    }
    .otp-actions-row {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
    }
  `]
})
export class WorkspaceProfileComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInputRef!: ElementRef;

  model: any = {
    title: '',
    firstName: '',
    middleName: '',
    lastName: '',
    email: localStorage.getItem('user_email') || '',
    emailConfirmed: false,
    phoneNumber: '',
    phoneNumberConfirmed: false,
    dateOfBirth: '',
    gender: 'Male',
    designation: '',
    avatarUrl: '',
    memberId: 'CC-2026-0099',
    categoryName: 'Standard Member',
    categoryColor: '#0050e5',
    joinDate: '',
    userStatus: 'Active Member',
    roles: []
  };

  uploadingAvatar = false;
  avatarSuccessMsg = '';
  avatarErrorMsg = '';

  savingPersonal = false;
  personalSuccessMsg = '';
  personalErrorMsg = '';

  // In-Place Email Verification State
  emailVerifyMode = false;
  emailVerifyOtpSent = false;
  emailVerifyCode = '';
  sendingVerifyEmailOtp = false;
  confirmingVerifyEmail = false;
  emailVerifySuccessMsg = '';
  emailVerifyErrorMsg = '';
  resendEmailCountdown = 0;
  private emailTimer: any;

  // In-Place Phone Verification State
  phoneVerifyMode = false;
  phoneVerifyOtpSent = false;
  phoneVerifyCode = '';
  sendingVerifyPhoneOtp = false;
  confirmingVerifyPhone = false;
  phoneVerifySuccessMsg = '';
  phoneVerifyErrorMsg = '';
  resendPhoneCountdown = 0;
  private phoneTimer: any;

  // Email Change State
  emailChangeMode = false;
  newEmail = '';
  emailOtpSent = false;
  emailOtpCode = '';
  sendingEmailOtp = false;
  confirmingEmail = false;
  emailSuccessMsg = '';
  emailErrorMsg = '';

  // Phone Change State
  phoneChangeMode = false;
  newPhone = '';
  phoneOtpSent = false;
  phoneOtpCode = '';
  sendingPhoneOtp = false;
  confirmingPhone = false;
  phoneSuccessMsg = '';
  phoneErrorMsg = '';

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  ngOnDestroy(): void {
    if (this.emailTimer) clearInterval(this.emailTimer);
    if (this.phoneTimer) clearInterval(this.phoneTimer);
  }

  loadProfile(): void {
    this.api.get<any>('PortalUsersApi/me').subscribe({
      next: (res) => {
        if (res?.data) {
          this.model = {
            ...this.model,
            ...res.data,
            emailConfirmed: !!res.data.emailConfirmed,
            phoneNumberConfirmed: !!res.data.phoneNumberConfirmed,
            roles: res.data.roles || [],
            dateOfBirth: res.data.dateOfBirth ? res.data.dateOfBirth.split('T')[0] : ''
          };
        }
      },
      error: () => {
        const cachedName = localStorage.getItem('user_name') || 'Member';
        const parts = cachedName.split(' ');
        this.model.firstName = parts[0] || 'Member';
        this.model.lastName = parts.slice(1).join(' ') || '';
      }
    });
  }

  getInitials(): string {
    const f = this.model.firstName ? this.model.firstName[0] : '';
    const l = this.model.lastName ? this.model.lastName[0] : '';
    return (f + l).toUpperCase() || 'MB';
  }

  getSecurityScore(): number {
    let score = 50;
    if (this.model.emailConfirmed) score += 25;
    if (this.model.phoneNumberConfirmed) score += 25;
    return score;
  }

  // 1. Avatar Upload (Cloudinary)
  onAvatarFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    this.uploadingAvatar = true;
    this.avatarSuccessMsg = '';
    this.avatarErrorMsg = '';

    const formData = new FormData();
    formData.append('file', file);

    this.api.post<any>('PortalUsersApi/upload-avatar', formData).subscribe({
      next: (res) => {
        this.uploadingAvatar = false;
        if (res?.data?.avatarUrl) {
          this.model.avatarUrl = res.data.avatarUrl;
          this.avatarSuccessMsg = 'Photo updated!';
          setTimeout(() => this.avatarSuccessMsg = '', 4000);
        }
      },
      error: (err) => {
        this.uploadingAvatar = false;
        this.avatarErrorMsg = err?.error?.message || 'Failed to upload photo.';
        setTimeout(() => this.avatarErrorMsg = '', 4000);
      }
    });
  }

  // 2. Personal Identity & Bio
  savePersonalDetails(): void {
    this.savingPersonal = true;
    this.personalSuccessMsg = '';
    this.personalErrorMsg = '';

    const payload = {
      title: this.model.title || null,
      firstName: this.model.firstName,
      middleName: this.model.middleName || null,
      lastName: this.model.lastName,
      dateOfBirth: this.model.dateOfBirth ? this.model.dateOfBirth : null,
      gender: this.model.gender || 'Male',
      designation: this.model.designation || null,
      avatarUrl: this.model.avatarUrl || null
    };

    this.api.put<any>('PortalUsersApi/me', payload).subscribe({
      next: () => {
        this.savingPersonal = false;
        this.personalSuccessMsg = 'Personal details saved successfully!';
        setTimeout(() => this.personalSuccessMsg = '', 5000);
      },
      error: (err) => {
        this.savingPersonal = false;
        this.personalErrorMsg = err?.error?.message || err?.error?.title || 'Failed to save changes.';
        setTimeout(() => this.personalErrorMsg = '', 6000);
      }
    });
  }

  // 3. Email In-Place Verification Flow
  startEmailVerify(): void {
    this.emailVerifyMode = true;
    this.emailChangeMode = false;
    this.emailVerifyCode = '';
    this.emailVerifySuccessMsg = '';
    this.emailVerifyErrorMsg = '';
    if (!this.emailVerifyOtpSent) {
      this.requestCurrentEmailOtp();
    }
  }

  requestCurrentEmailOtp(): void {
    this.sendingVerifyEmailOtp = true;
    this.emailVerifySuccessMsg = '';
    this.emailVerifyErrorMsg = '';

    this.api.post<any>('PortalUsersApi/request-email-verification', {}).subscribe({
      next: (res) => {
        this.sendingVerifyEmailOtp = false;
        this.emailVerifyOtpSent = true;
        this.emailVerifySuccessMsg = res?.message || '6-digit verification code sent to your email!';
        this.startEmailCountdown(res?.data?.retryAfterSeconds || 60);
      },
      error: (err) => {
        this.sendingVerifyEmailOtp = false;
        this.emailVerifyErrorMsg = err?.error?.message || 'Failed to send verification code.';
      }
    });
  }

  confirmCurrentEmailVerification(): void {
    if (!this.emailVerifyCode) return;
    this.confirmingVerifyEmail = true;
    this.emailVerifySuccessMsg = '';
    this.emailVerifyErrorMsg = '';

    this.api.post<any>('PortalUsersApi/confirm-email-verification', {
      otpCode: this.emailVerifyCode.trim()
    }).subscribe({
      next: (res) => {
        this.confirmingVerifyEmail = false;
        this.model.emailConfirmed = true;
        this.emailVerifySuccessMsg = 'Email verified successfully!';
        setTimeout(() => {
          this.emailVerifyMode = false;
          this.emailVerifySuccessMsg = '';
        }, 2500);
      },
      error: (err) => {
        this.confirmingVerifyEmail = false;
        this.emailVerifyErrorMsg = err?.error?.message || 'Invalid or expired verification code.';
      }
    });
  }

  private startEmailCountdown(seconds: number): void {
    this.resendEmailCountdown = seconds;
    if (this.emailTimer) clearInterval(this.emailTimer);
    this.emailTimer = setInterval(() => {
      this.resendEmailCountdown--;
      if (this.resendEmailCountdown <= 0) {
        clearInterval(this.emailTimer);
      }
    }, 1000);
  }

  // 4. Phone In-Place Verification Flow
  startPhoneVerify(): void {
    this.phoneVerifyMode = true;
    this.phoneChangeMode = false;
    this.phoneVerifyCode = '';
    this.phoneVerifySuccessMsg = '';
    this.phoneVerifyErrorMsg = '';
    if (!this.phoneVerifyOtpSent) {
      this.requestCurrentPhoneOtp();
    }
  }

  requestCurrentPhoneOtp(): void {
    this.sendingVerifyPhoneOtp = true;
    this.phoneVerifySuccessMsg = '';
    this.phoneVerifyErrorMsg = '';

    this.api.post<any>('PortalUsersApi/request-phone-verification', {}).subscribe({
      next: (res) => {
        this.sendingVerifyPhoneOtp = false;
        this.phoneVerifyOtpSent = true;
        this.phoneVerifySuccessMsg = res?.message || '6-digit SMS verification code sent!';
        this.startPhoneCountdown(res?.data?.retryAfterSeconds || 60);
      },
      error: (err) => {
        this.sendingVerifyPhoneOtp = false;
        this.phoneVerifyErrorMsg = err?.error?.message || 'Failed to send SMS verification code.';
      }
    });
  }

  confirmCurrentPhoneVerification(): void {
    if (!this.phoneVerifyCode) return;
    this.confirmingVerifyPhone = true;
    this.phoneVerifySuccessMsg = '';
    this.phoneVerifyErrorMsg = '';

    this.api.post<any>('PortalUsersApi/confirm-phone-verification', {
      otpCode: this.phoneVerifyCode.trim()
    }).subscribe({
      next: (res) => {
        this.confirmingVerifyPhone = false;
        this.model.phoneNumberConfirmed = true;
        this.phoneVerifySuccessMsg = 'Mobile phone verified successfully!';
        setTimeout(() => {
          this.phoneVerifyMode = false;
          this.phoneVerifySuccessMsg = '';
        }, 2500);
      },
      error: (err) => {
        this.confirmingVerifyPhone = false;
        this.phoneVerifyErrorMsg = err?.error?.message || 'Invalid or expired SMS code.';
      }
    });
  }

  private startPhoneCountdown(seconds: number): void {
    this.resendPhoneCountdown = seconds;
    if (this.phoneTimer) clearInterval(this.phoneTimer);
    this.phoneTimer = setInterval(() => {
      this.resendPhoneCountdown--;
      if (this.resendPhoneCountdown <= 0) {
        clearInterval(this.phoneTimer);
      }
    }, 1000);
  }

  // 5. Change Email Flow (to New Address)
  startEmailChange(): void {
    this.emailChangeMode = true;
    this.emailVerifyMode = false;
    this.newEmail = '';
    this.emailOtpSent = false;
    this.emailOtpCode = '';
    this.emailSuccessMsg = '';
    this.emailErrorMsg = '';
  }

  requestEmailOtp(): void {
    if (!this.newEmail) return;
    this.sendingEmailOtp = true;
    this.emailSuccessMsg = '';
    this.emailErrorMsg = '';

    this.api.post<any>('PortalUsersApi/request-email-change-otp', { newEmail: this.newEmail.trim() }).subscribe({
      next: (res) => {
        this.sendingEmailOtp = false;
        this.emailOtpSent = true;
        this.emailSuccessMsg = res?.message || 'Verification code sent to your new email.';
      },
      error: (err) => {
        this.sendingEmailOtp = false;
        this.emailErrorMsg = err?.error?.message || 'Failed to send verification code.';
      }
    });
  }

  confirmEmailChange(): void {
    if (!this.emailOtpCode || !this.newEmail) return;
    this.confirmingEmail = true;
    this.emailSuccessMsg = '';
    this.emailErrorMsg = '';

    this.api.post<any>('PortalUsersApi/confirm-email-change', {
      newEmail: this.newEmail.trim(),
      otp: this.emailOtpCode.trim()
    }).subscribe({
      next: (res) => {
        this.confirmingEmail = false;
        this.model.email = this.newEmail.trim();
        this.model.emailConfirmed = true;
        this.emailSuccessMsg = 'Email address verified and updated!';
        setTimeout(() => {
          this.emailChangeMode = false;
          this.emailSuccessMsg = '';
        }, 2500);
      },
      error: (err) => {
        this.confirmingEmail = false;
        this.emailErrorMsg = err?.error?.message || 'Invalid verification code.';
      }
    });
  }

  // 6. Change Phone Flow (to New Number)
  startPhoneChange(): void {
    this.phoneChangeMode = true;
    this.phoneVerifyMode = false;
    this.newPhone = '';
    this.phoneOtpSent = false;
    this.phoneOtpCode = '';
    this.phoneSuccessMsg = '';
    this.phoneErrorMsg = '';
  }

  requestPhoneOtp(): void {
    if (!this.newPhone) return;
    this.sendingPhoneOtp = true;
    this.phoneSuccessMsg = '';
    this.phoneErrorMsg = '';

    this.api.post<any>('PortalUsersApi/request-phone-change-otp', { newPhoneNumber: this.newPhone.trim() }).subscribe({
      next: (res) => {
        this.sendingPhoneOtp = false;
        this.phoneOtpSent = true;
        this.phoneSuccessMsg = res?.message || 'SMS verification code sent.';
      },
      error: (err) => {
        this.sendingPhoneOtp = false;
        this.phoneErrorMsg = err?.error?.message || 'Failed to send SMS code.';
      }
    });
  }

  confirmPhoneChange(): void {
    if (!this.phoneOtpCode || !this.newPhone) return;
    this.confirmingPhone = true;
    this.phoneSuccessMsg = '';
    this.phoneErrorMsg = '';

    this.api.post<any>('PortalUsersApi/confirm-phone-change', {
      newPhoneNumber: this.newPhone.trim(),
      otp: this.phoneOtpCode.trim()
    }).subscribe({
      next: (res) => {
        this.confirmingPhone = false;
        this.model.phoneNumber = this.newPhone.trim();
        this.model.phoneNumberConfirmed = true;
        this.phoneSuccessMsg = 'Phone number verified and updated!';
        setTimeout(() => {
          this.phoneChangeMode = false;
          this.phoneSuccessMsg = '';
        }, 2500);
      },
      error: (err) => {
        this.confirmingPhone = false;
        this.phoneErrorMsg = err?.error?.message || 'Invalid SMS verification code.';
      }
    });
  }
}
