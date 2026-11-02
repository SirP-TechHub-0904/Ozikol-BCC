import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="register-container">
      <div class="register-card">
        <!-- Logo & Header -->
        <div class="card-header">
          <div class="brand-avatar">
            <span class="material-symbols-outlined">how_to_reg</span>
          </div>
          <h2 class="title">Create Your Account</h2>
          <p class="subtitle">Join our member directory and workspace portal.</p>
        </div>

        <!-- Alert Error Banner -->
        <div *ngIf="errorMessage" class="error-banner">
          <span class="material-symbols-outlined">error</span>
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Form -->
        <form (ngSubmit)="onRegister()" class="register-form">
          <div class="form-grid-2">
            <div class="form-group">
              <label for="firstName">First Name *</label>
              <div class="input-wrapper">
                <span class="material-symbols-outlined input-icon">person</span>
                <input id="firstName" type="text" [(ngModel)]="model.firstName" name="firstName" placeholder="Ada" required />
              </div>
            </div>
            <div class="form-group">
              <label for="lastName">Last Name *</label>
              <div class="input-wrapper">
                <span class="material-symbols-outlined input-icon">person</span>
                <input id="lastName" type="text" [(ngModel)]="model.lastName" name="lastName" placeholder="Lovelace" required />
              </div>
            </div>
          </div>

          <div class="form-group">
            <label for="email">Email Address *</label>
            <div class="input-wrapper">
              <span class="material-symbols-outlined input-icon">mail</span>
              <input id="email" type="email" [(ngModel)]="model.email" name="email" placeholder="ada@domain.com" required autocomplete="email" />
            </div>
          </div>

          <div class="form-grid-2">
            <div class="form-group">
              <label for="phoneNumber">Phone Number</label>
              <div class="input-wrapper">
                <span class="material-symbols-outlined input-icon">phone</span>
                <input id="phoneNumber" type="text" [(ngModel)]="model.phoneNumber" name="phoneNumber" placeholder="+123456789" />
              </div>
            </div>
            <div class="form-group">
              <label for="category">Category Tier (Optional)</label>
              <div class="input-wrapper">
                <span class="material-symbols-outlined input-icon">category</span>
                <select id="category" [(ngModel)]="model.bcpUserCategoryId" name="bcpUserCategoryId" class="select-input">
                  <option [ngValue]="null">Select Category (Optional)</option>
                  <option *ngFor="let c of categories" [value]="c.id">{{ c.name }}</option>
                </select>
              </div>
            </div>
          </div>

          <div class="form-grid-2">
            <div class="form-group">
              <label for="password">Create Password *</label>
              <div class="input-wrapper">
                <span class="material-symbols-outlined input-icon">key</span>
                <input id="password" [type]="showPassword ? 'text' : 'password'" [(ngModel)]="model.password" name="password" placeholder="••••••••••••" required />
                <button type="button" class="toggle-pwd-btn" (click)="showPassword = !showPassword">
                  <span class="material-symbols-outlined">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
                </button>
              </div>
            </div>
            <div class="form-group">
              <label for="confirmPassword">Confirm Password *</label>
              <div class="input-wrapper">
                <span class="material-symbols-outlined input-icon">check_circle</span>
                <input id="confirmPassword" [type]="showPassword ? 'text' : 'password'" [(ngModel)]="model.confirmPassword" name="confirmPassword" placeholder="••••••••••••" required />
              </div>
            </div>
          </div>

          <button type="submit" [disabled]="loading" class="btn-submit">
            <span *ngIf="loading" class="spinner"></span>
            <span *ngIf="!loading" class="material-symbols-outlined">person_add</span>
            <span>{{ loading ? 'Creating Account...' : 'Register & Join Portal' }}</span>
          </button>
        </form>

        <div class="card-footer">
          <p class="signin-prompt">Already have an account? <a routerLink="/auth/login" class="login-link">Sign In</a></p>
          <a routerLink="/" class="back-link">
            <span class="material-symbols-outlined">arrow_back</span>
            Return to Home
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .register-container {
      width: 100%;
      display: flex;
      justify-content: center;
      box-sizing: border-box;
      padding: 0;
    }
    .register-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 36px 32px;
      width: 100%;
      max-width: 500px;
      box-shadow: 0 20px 45px -12px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04);
      color: #0f172a;
      box-sizing: border-box;
    }
    .card-header {
      text-align: center;
      margin-bottom: 24px;
    }
    .brand-avatar {
      width: 58px;
      height: 58px;
      border-radius: 16px;
      background: #eff6ff;
      border: 1.5px solid #dbeafe;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 14px;
      box-shadow: 0 4px 14px rgba(0, 80, 229, 0.08);
    }
    .brand-avatar span { font-size: 28px; color: #0050e5; }
    .title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 6px; }
    .subtitle { font-size: 13.5px; color: #64748b; margin: 0; }
    .error-banner {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }
    .register-form { display: flex; flex-direction: column; gap: 14px; }
    .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    @media (max-width: 480px) { .form-grid-2 { grid-template-columns: 1fr; } }
    .form-group { display: flex; flex-direction: column; gap: 4px; }
    .form-group label {
      font-size: 11.5px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .input-wrapper { position: relative; display: flex; align-items: center; }
    .input-icon {
      position: absolute;
      left: 12px;
      color: #94a3b8;
      font-size: 18px;
      pointer-events: none;
    }
    .input-wrapper input, .select-input {
      width: 100%;
      background: #f8fafc;
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px 12px 10px 38px;
      color: #0f172a;
      font-size: 13px;
      outline: none;
      transition: all 0.2s ease;
    }
    .select-input {
      cursor: pointer;
      appearance: none;
    }
    .select-input option {
      background: #ffffff;
      color: #0f172a;
    }
    .input-wrapper input:focus, .select-input:focus {
      background: #ffffff;
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.15);
    }
    .toggle-pwd-btn {
      position: absolute;
      right: 10px;
      background: none;
      border: none;
      color: #64748b;
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 4px;
    }
    .btn-submit {
      margin-top: 10px;
      background: linear-gradient(135deg, #10b981, #059669);
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
      box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
    }
    .btn-submit:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(16, 185, 129, 0.45);
    }
    .btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .card-footer { margin-top: 20px; text-align: center; display: flex; flex-direction: column; gap: 8px; }
    .signin-prompt { font-size: 13px; color: #94a3b8; margin: 0; }
    .login-link { color: #38bdf8; text-decoration: none; font-weight: 600; }
    .login-link:hover { text-decoration: underline; }
    .back-link {
      color: #64748b;
      font-size: 12px;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .back-link:hover { color: #cbd5e1; }
  `]
})
export class RegisterComponent implements OnInit {
  model: any = {
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    bcpUserCategoryId: null,
    password: '',
    confirmPassword: ''
  };

  categories: any[] = [];
  showPassword = false;
  loading = false;
  errorMessage = '';

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Load available active categories for the public selector
    this.api.get<any>('PortalUsersApi/categories').subscribe({
      next: (res) => {
        this.categories = res.data || [];
      },
      error: () => {}
    });
  }

  onRegister(): void {
    if (!this.model.firstName || !this.model.lastName || !this.model.email || !this.model.password) {
      this.errorMessage = 'Please fill out all required fields.';
      return;
    }

    if (this.model.password !== this.model.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.api.post<any>('auth/register', this.model).subscribe({
      next: (res) => {
        this.loading = false;
        this.toast.success('Registration successful! Welcome to the portal.');
        if (res?.data?.token) {
          localStorage.setItem('access_token', res.data.token);
          if (res.data.fullName) localStorage.setItem('user_name', res.data.fullName);
          if (res.data.email) localStorage.setItem('user_email', res.data.email);
          this.router.navigate(['/admin/dashboard']);
        } else {
          this.router.navigate(['/auth/login']);
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || 'Failed to complete registration. Please try again.';
      }
    });
  }
}
