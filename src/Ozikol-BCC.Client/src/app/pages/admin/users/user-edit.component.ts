import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-user-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent],
  template: `
    <div class="user-form-page">
      <!-- Standardized Page Header -->
      <app-page-header
        eyebrow="PROFILE MANAGEMENT"
        icon="manage_accounts"
        [title]="'Edit Profile: ' + (model.fullName || 'Member')"
        subtitle="Update member identity, change organizational category tier, and reassign system security roles."
        [buttons]="headerButtons"
        [loading]="isLoading || isSaving"
      ></app-page-header>

      <!-- Form Grid (Full Width Widget) -->
      <form (ngSubmit)="saveUser()" class="form-container" *ngIf="!isLoading">
        <div class="cards-grid-2">
          <!-- Card 1: Identity & Contact Details -->
          <div class="form-card">
            <div class="card-header">
              <span class="material-symbols-outlined header-icon">badge</span>
              <div>
                <h3>Personal & Contact Details</h3>
                <p>Member name, gender, salutation, and direct contact line</p>
              </div>
            </div>

            <div class="card-body">
              <div class="name-row-flex">
                <div class="form-group title-col" *ngIf="userSettings.enableTitle">
                  <label>Title</label>
                  <select [(ngModel)]="model.title" name="title">
                    <option value="">None</option>
                    <option *ngFor="let t of titleOptions" [value]="t">{{ t }}</option>
                  </select>
                </div>
                <div class="form-group first-name-col">
                  <label>First Name *</label>
                  <input type="text" [(ngModel)]="model.firstName" name="firstName" placeholder="e.g. First Name" required />
                </div>
                <div class="form-group last-name-col">
                  <label>Last Name *</label>
                  <input type="text" [(ngModel)]="model.lastName" name="lastName" placeholder="e.g. Last Name" required />
                </div>
                <div class="form-group suffix-col" *ngIf="userSettings.enableSuffix">
                  <label>Suffix</label>
                  <input type="text" [(ngModel)]="model.suffix" name="suffix" placeholder="e.g. mni, PhD, Esq" />
                </div>
              </div>

              <div class="form-grid-2">
                <div class="form-group">
                  <label>Gender *</label>
                  <select [(ngModel)]="model.gender" name="gender">
                    <option [ngValue]="0">Male</option>
                    <option [ngValue]="1">Female</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Email Address</label>
                  <input type="email" [value]="model.email" readonly style="background:#f8fafc; color:#64748b;" />
                  <div class="field-hint">Email address is permanently bound to the identity record.</div>
                </div>
              </div>

              <div class="form-group">
                <label>Phone Number</label>
                <input type="text" [(ngModel)]="model.phoneNumber" name="phoneNumber" placeholder="e.g. +0 (000) 000-0000" />
              </div>
            </div>
          </div>

          <!-- Card 2: Organizational Placement & Security -->
          <div class="form-card">
            <div class="card-header">
              <span class="material-symbols-outlined header-icon">corporate_fare</span>
              <div>
                <h3>Organizational Hierarchy & System Role</h3>
                <p>Category tier, designation, and member ID</p>
              </div>
            </div>

            <div class="card-body">
              <div class="form-group">
                <label>Category Tier</label>
                <select [(ngModel)]="model.bcpUserCategoryId" name="bcpUserCategoryId">
                  <option [ngValue]="null">Select Category (Unassigned)</option>
                  <option *ngFor="let cat of categories" [value]="cat.id">{{ cat.name }}</option>
                </select>
              </div>

              <div class="form-grid-2">
                <div class="form-group">
                  <label>Designation / Title</label>
                  <input type="text" [(ngModel)]="model.designation" name="designation" placeholder="e.g. Director" />
                </div>
                <div class="form-group">
                  <label>System Role</label>
                  <select [(ngModel)]="model.role" name="role">
                    <option value="Member">Member</option>
                    <option value="Admin">Admin</option>
                    <option value="Global Editor">Global Editor</option>
                    <option value="Feature Editor">Feature Editor</option>
                    <option value="Read Only">Read Only</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label style="display:flex; justify-content:space-between; align-items:center;">
                  <span>Member ID / Code</span>
                  <span class="locked-indicator">
                    <span class="material-symbols-outlined" style="font-size:13px;">lock</span>
                    <span>Permanent / Immutable</span>
                  </span>
                </label>
                <div class="locked-input-wrapper">
                  <input type="text" [value]="model.memberId || 'Pending Assignment'" disabled readonly class="locked-input" />
                  <span class="material-symbols-outlined locked-icon">lock</span>
                </div>
                <span class="input-hint-locked">Member ID is permanently bound to this profile upon creation and cannot be modified.</span>
              </div>
            </div>
          </div>
        </div>

        <div class="card-footer" style="margin-top: 16px; background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:16px 20px; display:flex; justify-content:space-between; align-items:center;">
          <a [routerLink]="['/admin/users/details', userId]" class="btn btn-outline">Cancel</a>
          <button type="submit" class="btn btn-primary" [disabled]="isSaving || !model.firstName || !model.lastName">
            <span *ngIf="!isSaving" class="material-symbols-outlined">save</span>
            <span>{{ isSaving ? 'Saving Changes...' : 'Save Profile Changes' }}</span>
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .user-form-page { display: flex; flex-direction: column; gap: 18px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; width: 100%; }

    .cards-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; width: 100%; }
    @media (max-width: 900px) { .cards-grid-2 { grid-template-columns: 1fr; } }

    .form-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden; display: flex; flex-direction: column; width: 100%; }
    .card-header { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-bottom: 1px solid #f1f5f9; background: #fafbfc; }
    .header-icon { font-size: 22px; color: #0050e5; }
    .card-header h3 { margin: 0; font-size: 14px; font-weight: 700; color: #0f172a; }
    .card-header p { margin: 2px 0 0; font-size: 11px; color: #64748b; }
    .card-body { padding: 20px; display: flex; flex-direction: column; gap: 14px; }

    .form-grid-3 { display: grid; grid-template-columns: 140px 1fr 1fr; gap: 12px; }
    .name-row-flex { display: flex; gap: 12px; flex-wrap: wrap; }
    .name-row-flex .title-col { flex: 0 0 110px; }
    .name-row-flex .first-name-col { flex: 1 1 160px; }
    .name-row-flex .last-name-col { flex: 1 1 160px; }
    .name-row-flex .suffix-col { flex: 0 0 130px; }
    @media (max-width: 600px) {
      .name-row-flex .title-col, .name-row-flex .first-name-col, .name-row-flex .last-name-col, .name-row-flex .suffix-col { flex: 1 1 100%; }
    }
    .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    @media (max-width: 600px) { .form-grid-3, .form-grid-2 { grid-template-columns: 1fr; } }

    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; }
    .form-group input, .form-group select { height: 42px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0 14px; font-size: 13px; color: #0f172a; background: #ffffff; outline: none; transition: border-color 0.15s ease; box-sizing: border-box; width: 100%; }
    .form-group input:focus, .form-group select:focus { border-color: #0050e5; box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.1); }
    .form-group input:disabled { background: #f8fafc; color: #64748b; cursor: not-allowed; border-color: #e2e8f0; }

    .locked-indicator { font-size: 10.5px; font-weight: 700; color: #64748b; background: #f1f5f9; padding: 2px 8px; border-radius: 9999px; display: inline-flex; align-items: center; gap: 4px; text-transform: uppercase; letter-spacing: 0.04em; }
    .locked-input-wrapper { position: relative; display: flex; align-items: center; }
    .locked-input { background: #f8fafc !important; font-family: monospace; font-weight: 700; color: #334155 !important; padding-right: 38px !important; letter-spacing: 0.05em; }
    .locked-icon { position: absolute; right: 12px; font-size: 18px; color: #94a3b8; pointer-events: none; }
    .input-hint-locked { font-size: 11.5px; color: #64748b; font-style: italic; margin-top: 2px; }
    .field-hint { font-size: 11px; color: #64748b; margin-top: 2px; }

    .btn { height: 40px; padding: 0 18px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; text-decoration: none; border: 1px solid transparent; }
    .btn-outline { background: #ffffff; border-color: #cbd5e1; color: #334155; }
    .btn-outline:hover { background: #f1f5f9; color: #0f172a; }
    .btn-primary { background: #0050e5; color: #ffffff; }
    .btn-primary:hover:not(:disabled) { background: #0040b8; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
  `]
})
export class UserEditComponent implements OnInit {
  userId = '';
  isLoading = false;
  isSaving = false;
  categories: any[] = [];

  userSettings: any = {
    enableTitle: true,
    preFilledTitles: 'Mr., Mrs., Ms., Dr., Prof., Engr., Chief, Rev., Pastor',
    enableSuffix: false
  };
  titleOptions: string[] = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', 'Engr.', 'Chief', 'Rev.', 'Pastor'];

  model: any = {
    firstName: '',
    lastName: '',
    title: '',
    suffix: '',
    gender: 0,
    email: '',
    phoneNumber: '',
    designation: '',
    role: 'Member',
    bcpUserCategoryId: null,
    memberId: ''
  };

  headerButtons: PageHeaderButton[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.userId) {
      this.router.navigate(['/admin/users/list']);
      return;
    }

    this.headerButtons = [
      {
        text: 'View Details',
        icon: 'visibility',
        isPrimary: false,
        routerLink: `/admin/users/details/${this.userId}`
      },
      {
        text: 'Back to List',
        icon: 'arrow_back',
        isPrimary: false,
        routerLink: '/admin/users/list'
      }
    ];

    this.loadUserSettings();
    this.loadCategories();
    this.loadUserData();
  }

  loadUserSettings(): void {
    this.api.get<any>('UsersApi/settings').subscribe({
      next: (res) => {
        if (res.data) {
          this.userSettings.enableTitle = res.data.enableTitle ?? true;
          this.userSettings.enableSuffix = res.data.enableSuffix ?? false;
          if (res.data.preFilledTitles) {
            const raw = res.data.preFilledTitles;
            if (Array.isArray(raw)) {
              this.titleOptions = raw;
            } else if (typeof raw === 'string') {
              this.titleOptions = raw.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
            }
          }
        }
      },
      error: () => {}
    });
  }

  loadCategories(): void {
    this.api.get<any>('UsersApi/categories').subscribe({
      next: (res) => {
        this.categories = res.data || [];
      },
      error: () => {}
    });
  }

  loadUserData(): void {
    this.isLoading = true;
    this.api.get<any>(`UsersApi/${this.userId}`).subscribe({
      next: (res) => {
        this.isLoading = false;
        const u = res.data;
        if (u) {
          this.model = {
            firstName: u.firstName,
            lastName: u.lastName,
            title: u.title,
            suffix: u.suffix || '',
            fullName: u.fullName,
            gender: u.gender === 'Female' || u.gender === 1 ? 1 : 0,
            email: u.email,
            phoneNumber: u.phoneNumber,
            designation: u.designation,
            role: u.roles && u.roles.length > 0 ? u.roles[0] : 'Member',
            bcpUserCategoryId: u.bcpUserCategoryId,
            memberId: u.memberId
          };
        }
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('Failed to load member profile.');
        this.router.navigate(['/admin/users/list']);
      }
    });
  }

  saveUser(): void {
    if (!this.model.firstName || !this.model.lastName) {
      this.toast.warning('First name and last name are required.');
      return;
    }

    this.isSaving = true;
    this.api.put<any>(`UsersApi/${this.userId}`, this.model).subscribe({
      next: () => {
        this.isSaving = false;
        this.toast.success('Member profile updated successfully!');
        this.router.navigate(['/admin/users/details', this.userId]);
      },
      error: (err) => {
        this.isSaving = false;
        this.toast.error(err?.error?.message || 'Failed to update member.');
      }
    });
  }
}
