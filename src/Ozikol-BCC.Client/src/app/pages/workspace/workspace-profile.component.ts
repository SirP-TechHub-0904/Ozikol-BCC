import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
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
              <span>{{ model.memberId || 'CC-2026-0099' }}</span>
            </div>
            <div class="dossier-pill category">
              <span class="material-symbols-outlined">category</span>
              <span>{{ model.categoryName || 'Standard Member' }}</span>
            </div>
            <div class="dossier-pill join-date">
              <span class="material-symbols-outlined">event</span>
              <span>Joined: {{ (model.joinDate | date:'mediumDate') || '2026' }}</span>
            </div>
            <div class="dossier-pill status-active">
              <span class="material-symbols-outlined">verified</span>
              <span>{{ model.userStatus || 'Active Member' }}</span>
            </div>
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
                  </select>
                </div>

                <!-- First Name -->
                <div class="form-group">
                  <label>First Name <span class="req">*</span></label>
                  <input type="text" [(ngModel)]="model.firstName" name="firstName" required class="form-input" />
                </div>

                <!-- Middle Name -->
                <div class="form-group">
                  <label>Middle Name</label>
                  <input type="text" [(ngModel)]="model.middleName" name="middleName" placeholder="Optional" class="form-input" />
                </div>

                <!-- Last Name -->
                <div class="form-group">
                  <label>Last Name <span class="req">*</span></label>
                  <input type="text" [(ngModel)]="model.lastName" name="lastName" required class="form-input" />
                </div>

                <!-- Date of Birth -->
                <div class="form-group">
                  <label>Date of Birth</label>
                  <input type="date" [(ngModel)]="model.dateOfBirth" name="dateOfBirth" class="form-input" />
                </div>

                <!-- Gender -->
                <div class="form-group">
                  <label>Gender</label>
                  <div class="gender-radio-group">
                    <label class="gender-label" [class.checked]="model.gender === 'Male' || model.gender === '1'">
                      <input type="radio" [(ngModel)]="model.gender" name="gender" value="Male" />
                      <span>Male</span>
                    </label>
                    <label class="gender-label" [class.checked]="model.gender === 'Female' || model.gender === '2'">
                      <input type="radio" [(ngModel)]="model.gender" name="gender" value="Female" />
                      <span>Female</span>
                    </label>
                    <label class="gender-label" [class.checked]="model.gender === 'Other' || model.gender === '0'">
                      <input type="radio" [(ngModel)]="model.gender" name="gender" value="Other" />
                      <span>Other</span>
                    </label>
                  </div>
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

          <!-- CARD 2: Verified Email Address Management (With OTP Flow) -->
          <div class="form-card">
            <div class="card-header">
              <div class="head-title">
                <span class="material-symbols-outlined text-blue">mail</span>
                <h3>Primary Email Address</h3>
              </div>
              <span class="status-badge verified">
                <span class="material-symbols-outlined">check_circle</span>
                Verified Email
              </span>
            </div>

            <div class="contact-card-body">
              <div class="current-contact-row" *ngIf="!emailChangeMode">
                <div class="contact-val">
                  <span class="material-symbols-outlined">alternate_email</span>
                  <strong>{{ model.email }}</strong>
                </div>
                <button type="button" class="btn-outline" (click)="startEmailChange()">
                  <span class="material-symbols-outlined">edit</span>
                  <span>Change Email</span>
                </button>
              </div>

              <!-- OTP Verification Flow for Email -->
              <div class="otp-flow-box" *ngIf="emailChangeMode">
                <div class="otp-flow-header">
                  <h4>Change Email Address</h4>
                  <button type="button" class="btn-close" (click)="emailChangeMode = false">✕</button>
                </div>
                <p class="otp-desc">Enter your new email address. A 6-digit verification code will be sent to complete the change.</p>

                <div class="otp-inputs-grid">
                  <div class="form-group">
                    <label>New Email Address</label>
                    <input type="email" [(ngModel)]="newEmail" [disabled]="emailOtpSent" placeholder="new.email@example.com" class="form-input" />
                  </div>
                  <div class="form-group" *ngIf="emailOtpSent">
                    <label>Enter 6-Digit Verification Code</label>
                    <input type="text" [(ngModel)]="emailOtpCode" maxlength="6" placeholder="123456" class="form-input code-input" />
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

          <!-- CARD 3: Verified Phone Number Management (With SMS OTP Flow) -->
          <div class="form-card">
            <div class="card-header">
              <div class="head-title">
                <span class="material-symbols-outlined text-green">call</span>
                <h3>Verified Phone Number</h3>
              </div>
              <span class="status-badge verified">
                <span class="material-symbols-outlined">check_circle</span>
                Verified Phone
              </span>
            </div>

            <div class="contact-card-body">
              <div class="current-contact-row" *ngIf="!phoneChangeMode">
                <div class="contact-val">
                  <span class="material-symbols-outlined">phone_iphone</span>
                  <strong>{{ model.phoneNumber || '+234-801-234-5678' }}</strong>
                </div>
                <button type="button" class="btn-outline" (click)="startPhoneChange()">
                  <span class="material-symbols-outlined">edit</span>
                  <span>Update Phone</span>
                </button>
              </div>

              <!-- SMS OTP Verification Flow for Phone -->
              <div class="otp-flow-box" *ngIf="phoneChangeMode">
                <div class="otp-flow-header">
                  <h4>Update Verified Phone Number</h4>
                  <button type="button" class="btn-close" (click)="phoneChangeMode = false">✕</button>
                </div>
                <p class="otp-desc">Enter your international phone number. A 6-digit SMS verification code will be dispatched to confirm.</p>

                <div class="otp-inputs-grid">
                  <div class="form-group">
                    <label>New Phone Number (e.g. +234...)</label>
                    <input type="tel" [(ngModel)]="newPhone" [disabled]="phoneOtpSent" placeholder="+2348012345678" class="form-input" />
                  </div>
                  <div class="form-group" *ngIf="phoneOtpSent">
                    <label>Enter 6-Digit SMS Code</label>
                    <input type="text" [(ngModel)]="phoneOtpCode" maxlength="6" placeholder="123456" class="form-input code-input" />
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

    .profile-layout {
      display: grid;
      grid-template-columns: 290px 1fr;
      gap: 24px;
      align-items: start;
    }
    @media (max-width: 900px) {
      .profile-layout { grid-template-columns: 1fr; }
    }

    /* Avatar Card */
    .avatar-card {
      background: var(--md-sys-color-surface, #ffffff);
      border: 1px solid var(--md-sys-color-outline, #e2e8f0);
      border-radius: 16px;
      padding: 30px 20px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
    }
    .avatar-circle-wrap {
      position: relative;
      margin-bottom: 16px;
    }
    .avatar-circle {
      width: 100px;
      height: 100px;
      border-radius: 30px;
      background: linear-gradient(135deg, #0050e5, #38bdf8);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 24px rgba(0, 80, 229, 0.35);
      overflow: hidden;
    }
    .avatar-img { width: 100%; height: 100%; object-fit: cover; }
    .avatar-initials { font-size: 34px; font-weight: 800; color: #ffffff; }
    .avatar-upload-btn {
      position: absolute;
      bottom: -4px;
      right: -4px;
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
      box-shadow: 0 4px 10px rgba(0, 80, 229, 0.4);
      transition: all 0.2s;
    }
    .avatar-upload-btn:hover { background: #003dbb; transform: scale(1.1); }
    .avatar-upload-btn span { font-size: 18px; }

    .user-fullname { font-size: 17px; font-weight: 800; color: var(--md-sys-color-on-surface, #0f172a); margin: 0 0 4px; }
    .user-role-label { font-size: 12px; color: #64748b; margin: 0 0 16px; }

    .dossier-pills-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
    }
    .dossier-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 12px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 700;
      text-align: left;
    }
    .dossier-pill span.material-symbols-outlined { font-size: 16px; }
    .dossier-pill.member-id { background: rgba(0, 80, 229, 0.1); color: #0050e5; }
    .dossier-pill.category { background: rgba(168, 85, 247, 0.1); color: #9333ea; }
    .dossier-pill.join-date { background: #f1f5f9; color: #475569; }
    .dossier-pill.status-active { background: rgba(34, 197, 94, 0.1); color: #16a34a; }

    .avatar-msg { font-size: 12px; font-weight: 700; margin-top: 10px; }
    .avatar-msg.success { color: #16a34a; }
    .avatar-msg.error { color: #ef4444; }

    /* Cards Column */
    .cards-column {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .form-card {
      background: var(--md-sys-color-surface, #ffffff);
      border: 1px solid var(--md-sys-color-outline, #e2e8f0);
      border-radius: 16px;
      padding: 24px 28px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      border-bottom: 1px solid var(--md-sys-color-outline, #e2e8f0);
      padding-bottom: 14px;
    }
    .head-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .head-title h3 { font-size: 16px; font-weight: 800; color: #0f172a; margin: 0; }
    .head-title span.material-symbols-outlined { font-size: 22px; }

    .status-badge.verified {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: rgba(34, 197, 94, 0.12);
      color: #16a34a;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11.5px;
      font-weight: 700;
    }
    .status-badge.verified span { font-size: 14px; }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 20px;
    }
    @media (max-width: 640px) { .form-grid { grid-template-columns: 1fr; } }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group.full-width { grid-column: 1 / -1; }
    .form-group label {
      font-size: 12px;
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .form-group label .req { color: #ef4444; }
    .form-input {
      padding: 10px 14px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13.5px;
      color: #0f172a;
      background: #f8fafc;
      outline: none;
      transition: all 0.2s;
    }
    .form-input:focus {
      border-color: #0050e5;
      background: #ffffff;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.15);
    }
    .code-input {
      letter-spacing: 4px;
      font-size: 18px;
      font-weight: 800;
      text-align: center;
    }

    /* Gender Radio */
    .gender-radio-group {
      display: flex;
      gap: 8px;
    }
    .gender-label {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 9px;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }
    .gender-label input { display: none; }
    .gender-label.checked {
      border-color: #0050e5;
      background: rgba(0, 80, 229, 0.08);
      color: #0050e5;
    }

    /* Contact Details Rows */
    .current-contact-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
    }
    .contact-val {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
      color: #0f172a;
    }
    .contact-val span.material-symbols-outlined { color: #64748b; font-size: 20px; }

    /* OTP Flow Box */
    .otp-flow-box {
      background: #f8fafc;
      border: 1px solid #0050e5;
      border-radius: 12px;
      padding: 18px 20px;
      position: relative;
    }
    .otp-flow-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .otp-flow-header h4 { margin: 0; font-size: 14px; font-weight: 800; color: #0050e5; }
    .btn-close {
      background: none;
      border: none;
      font-size: 16px;
      color: #64748b;
      cursor: pointer;
    }
    .otp-desc { font-size: 12px; color: #64748b; margin: 0 0 14px; }
    .otp-inputs-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 14px;
    }
    @media (max-width: 640px) { .otp-inputs-grid { grid-template-columns: 1fr; } }
    .otp-actions-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    /* Buttons & Banners */
    .form-actions {
      display: flex;
      align-items: center;
      gap: 16px;
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
    }
    .btn-primary {
      background: linear-gradient(135deg, #0050e5, #1f6bff);
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 10px 20px;
      font-size: 13.5px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 4px 12px rgba(0, 80, 229, 0.35);
      transition: all 0.2s;
    }
    .btn-primary:hover:not(:disabled) { transform: translateY(-1px); }
    .btn-success {
      background: linear-gradient(135deg, #16a34a, #22c55e);
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 10px 20px;
      font-size: 13.5px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-outline {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 8px 14px;
      font-size: 12.5px;
      font-weight: 700;
      color: #0f172a;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .btn-outline:hover { border-color: #0050e5; color: #0050e5; }
    .btn-text {
      background: none;
      border: none;
      color: #0050e5;
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
      text-decoration: underline;
    }
    .banner-msg { font-size: 13px; font-weight: 700; margin-top: 6px; }
    .banner-msg.success { color: #16a34a; }
    .banner-msg.error { color: #ef4444; }
    .text-primary { color: #0050e5; }
    .text-blue { color: #0284c7; }
    .text-green { color: #16a34a; }
  `]
})
export class WorkspaceProfileComponent implements OnInit {
  @ViewChild('fileInput') fileInputRef!: ElementRef;

  model: any = {
    title: '',
    firstName: '',
    middleName: '',
    lastName: '',
    email: localStorage.getItem('user_email') || '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: 'Male',
    designation: '',
    avatarUrl: '',
    memberId: 'CC-2026-0099',
    categoryName: 'Standard Member',
    joinDate: '',
    userStatus: 'Active Member'
  };

  uploadingAvatar = false;
  avatarSuccessMsg = '';
  avatarErrorMsg = '';

  savingPersonal = false;
  personalSuccessMsg = '';
  personalErrorMsg = '';

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

  loadProfile(): void {
    this.api.get<any>('PortalUsersApi/me').subscribe({
      next: (res) => {
        if (res?.data) {
          this.model = {
            ...this.model,
            ...res.data,
            dateOfBirth: res.data.dateOfBirth ? res.data.dateOfBirth.split('T')[0] : ''
          };
        }
      },
      error: () => {
        const cachedName = localStorage.getItem('user_name') || 'Peter Onwuka';
        const parts = cachedName.split(' ');
        this.model.firstName = parts[0] || 'Peter';
        this.model.lastName = parts.slice(1).join(' ') || 'Onwuka';
      }
    });
  }

  getInitials(): string {
    const f = this.model.firstName ? this.model.firstName[0] : '';
    const l = this.model.lastName ? this.model.lastName[0] : '';
    return (f + l).toUpperCase() || 'MB';
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

  // 3. Email Change Flow
  startEmailChange(): void {
    this.emailChangeMode = true;
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

    this.api.post<any>('PortalUsersApi/request-email-change-otp', { newEmail: this.newEmail }).subscribe({
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
      newEmail: this.newEmail,
      otp: this.emailOtpCode
    }).subscribe({
      next: (res) => {
        this.confirmingEmail = false;
        this.model.email = this.newEmail;
        this.emailSuccessMsg = 'Email address verified and updated!';
        setTimeout(() => {
          this.emailChangeMode = false;
          this.emailSuccessMsg = '';
        }, 3000);
      },
      error: (err) => {
        this.confirmingEmail = false;
        this.emailErrorMsg = err?.error?.message || 'Invalid verification code.';
      }
    });
  }

  // 4. Phone Number Change Flow
  startPhoneChange(): void {
    this.phoneChangeMode = true;
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

    this.api.post<any>('PortalUsersApi/request-phone-change-otp', { newPhoneNumber: this.newPhone }).subscribe({
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
      newPhoneNumber: this.newPhone,
      otp: this.phoneOtpCode
    }).subscribe({
      next: (res) => {
        this.confirmingPhone = false;
        this.model.phoneNumber = this.newPhone;
        this.phoneSuccessMsg = 'Phone number verified and updated!';
        setTimeout(() => {
          this.phoneChangeMode = false;
          this.phoneSuccessMsg = '';
        }, 3000);
      },
      error: (err) => {
        this.confirmingPhone = false;
        this.phoneErrorMsg = err?.error?.message || 'Invalid SMS verification code.';
      }
    });
  }
}
