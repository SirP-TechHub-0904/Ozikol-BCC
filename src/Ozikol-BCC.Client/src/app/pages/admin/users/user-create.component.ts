import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-user-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, TranslatePipe],
  template: `
    <div class="user-form-page">
      <!-- Standardized Page Header -->
      <app-page-header
        [eyebrow]="'user_create.header_eyebrow' | translate:'MEMBERSHIP DIRECTORY'"
        icon="person_add"
        [title]="'user_create.header_title' | translate:'Create New Workspace Member'"
        [subtitle]="'user_create.header_desc' | translate:'Directly provision a new member profile with credentials, department category, and assigned system role.'"
        [buttons]="headerButtons"
        [loading]="isSaving"
      ></app-page-header>

      <!-- Form Grid (Full Width Widget) -->
      <form (ngSubmit)="saveUser()" class="form-container">
        <div class="cards-grid-2">
          <!-- Card 1: Identity & Contact Details -->
          <div class="form-card">
            <div class="card-header">
              <span class="material-symbols-outlined header-icon">badge</span>
              <div>
                <h3>{{ 'user_create.card1_title' | translate:'Personal Information & Contact' }}</h3>
                <p>{{ 'user_create.card1_subtitle' | translate:'Member legal identity, salutation, gender, and contact line' }}</p>
              </div>
            </div>

            <div class="card-body">
              <div class="name-row-flex">
                <div class="form-group title-col" *ngIf="userSettings.enableTitle">
                  <label>{{ 'user_create.field_title' | translate:'Title' }}</label>
                  <select [(ngModel)]="model.title" name="title">
                    <option value="">{{ 'user_create.title_none' | translate:'None' }}</option>
                    <option *ngFor="let t of titleOptions" [value]="t">{{ t }}</option>
                  </select>
                </div>
                <div class="form-group first-name-col">
                  <label>{{ 'user_create.field_first_name' | translate:'First Name *' }}</label>
                  <input type="text" [(ngModel)]="model.firstName" name="firstName" [placeholder]="'user_create.field_first_name_ph' | translate:'e.g. First Name'" required />
                </div>
                <div class="form-group last-name-col">
                  <label>{{ 'user_create.field_last_name' | translate:'Last Name *' }}</label>
                  <input type="text" [(ngModel)]="model.lastName" name="lastName" [placeholder]="'user_create.field_last_name_ph' | translate:'e.g. Last Name'" required />
                </div>
                <div class="form-group suffix-col" *ngIf="userSettings.enableSuffix">
                  <label>{{ 'user_create.field_suffix' | translate:'Suffix' }}</label>
                  <input type="text" [(ngModel)]="model.suffix" name="suffix" [placeholder]="'user_create.field_suffix_ph' | translate:'e.g. mni'" />
                </div>
              </div>

              <div class="form-grid-2">
                <div class="form-group">
                  <label>{{ 'user_create.field_gender' | translate:'Gender *' }}</label>
                  <select [(ngModel)]="model.gender" name="gender">
                    <option [ngValue]="0">{{ 'user_create.gender_male' | translate:'Male' }}</option>
                    <option [ngValue]="1">{{ 'user_create.gender_female' | translate:'Female' }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>{{ 'user_create.field_email' | translate:'Work Email Address *' }}</label>
                  <input type="email" [(ngModel)]="model.email" name="email" [placeholder]="'user_create.field_email_ph' | translate:'name@company.com'" required />
                </div>
              </div>

              <div class="form-group">
                <label>{{ 'user_create.field_phone' | translate:'Phone Number' }}</label>
                <input type="text" [(ngModel)]="model.phoneNumber" name="phoneNumber" [placeholder]="'user_create.field_phone_ph' | translate:'e.g. +0 (000) 000-0000'" />
              </div>
            </div>
          </div>

          <!-- Card 2: Organizational Placement & Role -->
          <div class="form-card">
            <div class="card-header">
              <span class="material-symbols-outlined header-icon">corporate_fare</span>
              <div>
                <h3>{{ 'user_create.card2_title' | translate:'Organizational Hierarchy & System Role' }}</h3>
                <p>{{ 'user_create.card2_subtitle' | translate:'Category tier, designation, and member ID assignment' }}</p>
              </div>
            </div>

            <div class="card-body">
              <div class="form-group">
                <label>{{ 'user_create.field_category' | translate:'Category Tier' }}</label>
                <select [(ngModel)]="model.bcpUserCategoryId" name="bcpUserCategoryId">
                  <option [ngValue]="null">{{ 'user_create.category_unassigned' | translate:'Select Category Tier (Unassigned)' }}</option>
                  <option *ngFor="let cat of categories" [value]="cat.id">{{ cat.name }}</option>
                </select>
                <div class="field-hint">{{ 'user_create.category_hint' | translate:'Assign to an organizational unit or department tier.' }}</div>
              </div>

              <div class="form-grid-2">
                <div class="form-group">
                  <label>{{ 'user_create.field_designation' | translate:'Designation / Job Title' }}</label>
                  <input type="text" [(ngModel)]="model.designation" name="designation" [placeholder]="'user_create.field_designation_ph' | translate:'e.g. Senior Analyst'" />
                </div>
                <div class="form-group">
                  <label>{{ 'user_create.field_role' | translate:'System Role' }}</label>
                  <select [(ngModel)]="model.role" name="role">
                    <option value="Member">{{ 'user_create.role_member' | translate:'Member' }}</option>
                    <option value="Admin">{{ 'user_create.role_admin' | translate:'Admin' }}</option>
                    <option value="Global Editor">{{ 'user_create.role_global_editor' | translate:'Global Editor' }}</option>
                    <option value="Feature Editor">{{ 'user_create.role_feature_editor' | translate:'Feature Editor' }}</option>
                    <option value="Read Only">{{ 'user_create.role_read_only' | translate:'Read Only' }}</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label style="display:flex; justify-content:space-between; align-items:center;">
                  <span>{{ 'user_create.field_member_id' | translate:'Custom Member ID / Code (Optional)' }}</span>
                  <span class="locked-indicator">
                    <span class="material-symbols-outlined" style="font-size:13px;">auto_awesome</span>
                    <span>{{ 'user_create.auto_generated' | translate:'System Auto-Generated' }}</span>
                  </span>
                </label>
                <div class="locked-input-wrapper">
                  <input type="text" [value]="(activeIdPreview || '').replace('--', '-') || ('user_create.auto_generated' | translate:'System Auto-Generated')" disabled readonly class="locked-input" />
                  <span class="material-symbols-outlined locked-icon">tag</span>
                </div>
                <span class="input-hint-locked">{{ 'user_create.auto_generated_desc' | translate:'Member ID will be uniquely generated and permanently assigned using your workspace\'s configured coding rules.' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Card 3: Security & Password Setup -->
        <div class="form-card" style="margin-top: 16px;">
          <div class="card-header">
            <span class="material-symbols-outlined header-icon">lock_open</span>
            <div>
              <h3>{{ 'user_create.card3_title' | translate:'Security Setup & Credentials' }}</h3>
              <p>{{ 'user_create.card3_subtitle' | translate:'Authentication password, invitation email dispatch, and email verification' }}</p>
            </div>
          </div>

          <div class="card-body">
            <div class="form-grid-2">
              <div class="form-group">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                  <label style="margin:0;">{{ 'user_create.field_password' | translate:'Initial Password *' }}</label>
                  <button type="button" class="btn-generate-link" (click)="generatePassword()">
                    <span class="material-symbols-outlined">autorenew</span>
                    <span>{{ 'user_create.generate_password' | translate:'Generate Strong Password' }}</span>
                  </button>
                </div>
                <input type="text" [(ngModel)]="model.password" name="password" [placeholder]="'user_create.field_password_ph' | translate:'Enter strong initial password'" required />
              </div>

              <div class="form-group" style="justify-content:center;">
                <label class="checkbox-container">
                  <input type="checkbox" [(ngModel)]="model.mustChangePassword" name="mustChangePassword" />
                  <span class="checkbox-custom"></span>
                  <div class="checkbox-text">
                    <strong>{{ 'user_create.require_pwd_change' | translate:'Require Password Change on First Sign-in' }}</strong>
                    <p>{{ 'user_create.require_pwd_change_desc' | translate:'Forces the member to set their own permanent password immediately upon signing in.' }}</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div class="card-footer">
            <a routerLink="/users/console/list" class="btn btn-outline">{{ 'user_create.btn_cancel' | translate:'Cancel' }}</a>
            <button type="submit" class="btn btn-primary" [disabled]="isSaving || !model.email || !model.firstName || !model.lastName">
              <span *ngIf="!isSaving" class="material-symbols-outlined">person_add</span>
              <span>{{ isSaving ? ('user_create.btn_creating' | translate:'Creating Member Account...') : ('user_create.btn_create' | translate:'Create Member Account') }}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .user-form-page { display: flex; flex-direction: column; gap: 18px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; width: 100%; }

    .cards-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; width: 100%; }
    @media (max-width: 900px) { .cards-grid-2 { grid-template-columns: 1fr; } }

    .form-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden; display: flex; flex-direction: column; width: 100%; }
    .card-header { display: flex; align-items: center; gap: 12px; padding: 18px 22px; border-bottom: 1px solid #f1f5f9; background: #fafbfc; }
    .header-icon { font-size: 24px; color: #0050e5; }
    .card-header h3 { margin: 0; font-size: 15px; font-weight: 700; color: #0f172a; }
    .card-header p { margin: 2px 0 0; font-size: 12px; color: #64748b; }
    .card-body { padding: 22px; display: flex; flex-direction: column; gap: 16px; }

    .form-grid-3 { display: grid; grid-template-columns: 120px 1fr 1fr; gap: 14px; }
    @media (max-width: 600px) { .form-grid-3 { grid-template-columns: 1fr; } }

    .name-row-flex { display: flex; gap: 12px; flex-wrap: wrap; }
    .name-row-flex .title-col { flex: 0 0 110px; }
    .name-row-flex .first-name-col { flex: 1 1 160px; }
    .name-row-flex .last-name-col { flex: 1 1 160px; }
    .name-row-flex .suffix-col { flex: 0 0 130px; }
    @media (max-width: 600px) {
      .name-row-flex .title-col, .name-row-flex .first-name-col, .name-row-flex .last-name-col, .name-row-flex .suffix-col { flex: 1 1 100%; }
    }

    .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    @media (max-width: 600px) { .form-grid-2 { grid-template-columns: 1fr; } }

    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.05em; }
    .form-group input, .form-group select { height: 42px; padding: 0 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; outline: none; background: #ffffff; color: #0f172a; transition: all 0.15s ease; }
    .form-group input:focus, .form-group select:focus { border-color: #0050e5; box-shadow: 0 0 0 3px rgba(0,80,229,0.1); }
    .field-hint { font-size: 11px; color: #64748b; margin-top: 2px; }

    .btn-generate-link { background: none; border: none; color: #0050e5; font-size: 11px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; padding: 0; }
    .btn-generate-link:hover { text-decoration: underline; }
    .btn-generate-link span { font-size: 14px; }

    .checkbox-container { display: flex; align-items: flex-start; gap: 10px; cursor: pointer; user-select: none; margin-top: 10px; }
    .checkbox-container input { width: 18px; height: 18px; margin-top: 2px; cursor: pointer; }
    .checkbox-text strong { font-size: 13px; color: #1e293b; display: block; }
    .checkbox-text p { font-size: 11px; color: #64748b; margin: 2px 0 0; line-height: 1.4; }

    .card-footer { padding: 16px 22px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px; background: #f8fafc; }
    .btn { height: 40px; padding: 0 18px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; text-decoration: none; border: 1px solid transparent; }
    .btn-outline { background: #ffffff; border-color: #cbd5e1; color: #334155; }
    .btn-outline:hover { background: #f1f5f9; color: #0f172a; }
    .btn-primary { background: #0050e5 !important; color: #ffffff !important; }
    .btn-primary span, .btn-primary .material-symbols-outlined { color: #ffffff !important; }
    .btn-primary:hover:not(:disabled) { background: #0040b8 !important; color: #ffffff !important; }
    .btn-primary:hover:not(:disabled) span, .btn-primary:hover:not(:disabled) .material-symbols-outlined { color: #ffffff !important; }
    .btn-primary:disabled { opacity: 0.65; cursor: not-allowed; color: #ffffff !important; }
    .btn-primary:disabled span, .btn-primary:disabled .material-symbols-outlined { color: #ffffff !important; }
  `]
})
export class UserCreateComponent implements OnInit {
  isSaving = false;
  categories: any[] = [];

  userSettings: any = {
    enableTitle: true,
    preFilledTitles: 'Mr., Mrs., Ms., Dr., Prof., Engr., Chief, Rev., Pastor',
    enableSuffix: false
  };
  titleOptions: string[] = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', 'Engr.', 'Chief', 'Rev.', 'Pastor'];

  model: any = {
    title: '',
    firstName: '',
    lastName: '',
    suffix: '',
    gender: 0, // 0 = Male, 1 = Female
    email: '',
    phoneNumber: '',
    designation: '',
    role: 'Member',
    bcpUserCategoryId: null,
    memberId: '',
    password: '',
    mustChangePassword: true
  };

  activeIdPreview = '';
  activeFormatName = '';

  get headerButtons(): PageHeaderButton[] {
    return [
      {
        text: this.translationService.translate('user_details.btn_back', 'Back to Directory'),
        icon: 'arrow_back',
        isPrimary: false,
        routerLink: '/users/console/list'
      }
    ];
  }

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private router: Router,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.generatePassword();
    this.loadUserSettings();
    this.loadCategories();
    this.loadMemberIdConfig();
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

  loadMemberIdConfig(): void {
    this.api.get<any>('UsersApi/member-id-config').subscribe({
      next: (res) => {
        if (res.data) {
          const activeKey = res.data.activeFormat;
          const previews: any[] = res.data.previews || [];
          const activePreview = previews.find(p => p.key === activeKey);
          if (activePreview) {
            this.activeFormatName = activePreview.name;
            let preview = activePreview.previewExample || '';
            preview = preview.replace(/[-]{2,}/g, '-').replace(/[/]{2,}/g, '/').replace(/[_]{2,}/g, '_');
            this.activeIdPreview = preview;
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

  generatePassword(): void {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = 'Pass@';
    for (let i = 0; i < 5; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.model.password = pass;
  }

  saveUser(): void {
    if (!this.model.firstName || !this.model.lastName || !this.model.email || !this.model.password) {
      this.toast.warning('First name, last name, email, and password are required.');
      return;
    }

    this.isSaving = true;
    this.api.post<any>('UsersApi', this.model).subscribe({
      next: () => {
        this.isSaving = false;
        this.toast.success(`Account for ${this.model.firstName} ${this.model.lastName} created successfully!`);
        this.router.navigate(['/users/console/list']);
      },
      error: (err) => {
        this.isSaving = false;
        this.toast.error(err?.error?.message || 'Failed to create member account.');
      }
    });
  }
}
