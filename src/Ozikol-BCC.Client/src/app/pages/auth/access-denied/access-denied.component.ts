import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { 
  getStoredUserRoles, 
  getUserPrimaryRoleName, 
  isMemberOnly, 
  isGlobalAdmin, 
  hasUserRole, 
  getReturnUrlForRole 
} from '../../../core/utils/user-role.utils';

/**
 * Polished, role-aware Access Denied component (403 Forbidden).
 * Provides clear contextual diagnostics explaining the user's current role authority,
 * the attempted resource boundary, and dynamic one-click return paths.
 */
@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="denied-container">
      <div class="denied-card">
        <!-- Ambient Status Badge & Icon -->
        <div class="denied-icon-wrap">
          <span class="material-symbols-outlined denied-icon">gpp_maybe</span>
        </div>

        <div class="role-chip" [class.chip-member]="isMember" [class.chip-admin]="isAdmin">
          <span class="pulse-indicator"></span>
          <span>Role Profile: <strong>{{ userRoleName }}</strong></span>
        </div>

        <h1 class="denied-title">Access Restricted</h1>

        <!-- Contextual Message Based on User's Current Role -->
        <p class="denied-subtitle" *ngIf="isMember">
          Your account is registered with <strong>Member</strong> privileges for the personal workspace portal.
          Administrative console modules require operational management authority.
        </p>

        <p class="denied-subtitle" *ngIf="!isMember && isUserManager">
          Your account is configured with the <strong>User Manager</strong> role. 
          You do not have administrative permissions to access the 
          <strong *ngIf="attemptedSectionName">{{ attemptedSectionName }}</strong>
          <span *ngIf="!attemptedSectionName">requested security module</span>.
        </p>

        <p class="denied-subtitle" *ngIf="!isMember && isIdentityManager">
          Your account is configured with the <strong>Identity Manager</strong> role. 
          You do not have permissions to access the 
          <strong *ngIf="attemptedSectionName">{{ attemptedSectionName }}</strong>
          <span *ngIf="!attemptedSectionName">requested module</span>.
        </p>

        <p class="denied-subtitle" *ngIf="!isMember && !isUserManager && !isIdentityManager">
          You do not have the required operational permissions to access this administrative resource. 
          Please sign in with an authorized account or contact your platform administrator.
        </p>

        <!-- Attempted Target Diagnostics (Subtle) -->
        <div class="target-indicator" *ngIf="attemptedUrl">
          <span class="material-symbols-outlined lock-tag-icon">lock</span>
          <span class="target-text">Restricted Route: <code>{{ attemptedUrl }}</code></span>
        </div>

        <!-- Dynamic Action Triggers -->
        <div class="action-buttons">
          <button type="button" (click)="returnToPrimaryDashboard()" class="btn-primary">
            <span class="material-symbols-outlined">{{ primaryActionIcon }}</span>
            <span>{{ primaryActionLabel }}</span>
          </button>

          <button type="button" (click)="signOutAndSwitchAccount()" class="btn-secondary">
            <span class="material-symbols-outlined">switch_account</span>
            <span>Sign In with Different Account</span>
          </button>

          <a routerLink="/" class="btn-home-link">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>Return to Public Home</span>
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .denied-container {
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      box-sizing: border-box;
      padding: 10px 0;
    }

    .denied-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 24px;
      padding: 40px 32px;
      width: 100%;
      max-width: 460px;
      text-align: center;
      box-shadow: 0 20px 45px -12px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04);
      color: #0f172a;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .denied-icon-wrap {
      width: 72px;
      height: 72px;
      border-radius: 20px;
      background: #fffbeb;
      border: 1.5px solid #fde68a;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
      box-shadow: 0 8px 20px rgba(245, 158, 11, 0.15);
    }

    .denied-icon {
      font-size: 38px;
      color: #d97706;
    }

    .role-chip {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 5px 14px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #475569;
      margin-bottom: 14px;
    }

    .role-chip strong {
      color: #0f172a;
      font-weight: 700;
    }

    .role-chip.chip-member {
      background: #eff6ff;
      border-color: #bfdbfe;
      color: #1e40af;
    }

    .role-chip.chip-admin {
      background: #fdf4ff;
      border-color: #f0abfc;
      color: #86198f;
    }

    .pulse-indicator {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #0050e5;
      box-shadow: 0 0 6px #0050e5;
    }

    .denied-title {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 10px;
      letter-spacing: -0.02em;
    }

    .denied-subtitle {
      font-size: 13.5px;
      color: #64748b;
      margin: 0 0 20px;
      line-height: 1.6;
      max-width: 400px;
    }

    .denied-subtitle strong {
      color: #0f172a;
      font-weight: 700;
    }

    .target-indicator {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 6px 12px;
      font-size: 11.5px;
      color: #64748b;
      margin-bottom: 22px;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .lock-tag-icon {
      font-size: 14px;
      color: #94a3b8;
    }

    .target-text code {
      color: #0050e5;
      font-weight: 600;
      font-family: inherit;
    }

    .action-buttons {
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 100%;
    }

    .btn-primary {
      background: linear-gradient(135deg, #0050e5, #1f6bff);
      color: #ffffff;
      border: none;
      border-radius: 12px;
      padding: 13px 20px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 4px 14px rgba(0, 80, 229, 0.3);
      transition: all 0.2s ease;
      text-decoration: none;
      width: 100%;
      box-sizing: border-box;
    }

    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(0, 80, 229, 0.4);
    }

    .btn-secondary {
      background: #f8fafc;
      border: 1.5px solid #cbd5e1;
      color: #475569;
      border-radius: 12px;
      padding: 12px 20px;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s ease;
      text-decoration: none;
      width: 100%;
      box-sizing: border-box;
    }

    .btn-secondary:hover {
      background: #eff6ff;
      color: #0050e5;
      border-color: #93c5fd;
    }

    .btn-home-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      color: #64748b;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      padding: 8px;
      transition: color 0.15s;
      margin-top: 4px;
    }

    .btn-home-link:hover {
      color: #0050e5;
    }
  `]
})
export class AccessDeniedComponent implements OnInit {
  userRoleName: string = 'Member';
  attemptedUrl: string = '';
  isMember: boolean = true;
  isAdmin: boolean = false;
  isUserManager: boolean = false;
  isIdentityManager: boolean = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const roles = getStoredUserRoles();
    this.userRoleName = getUserPrimaryRoleName(roles);
    this.isMember = isMemberOnly(roles);
    this.isAdmin = isGlobalAdmin(roles);
    this.isUserManager = hasUserRole('UserManager', roles);
    this.isIdentityManager = hasUserRole('IdentityManager', roles);

    this.attemptedUrl = this.route.snapshot.queryParams['attemptedUrl'] || '';
  }

  get attemptedSectionName(): string {
    if (!this.attemptedUrl) return '';
    const clean = this.attemptedUrl.toLowerCase();
    if (clean.includes('/identity/console')) return 'Identity & RBAC Console';
    if (clean.includes('/users/console')) return 'User Management Console';
    if (clean.includes('/settings/console')) return 'Tenant Settings Console';
    if (clean.includes('/content/console')) return 'CMS Studio Console';
    if (clean.includes('/dashboard/console')) return 'Administrative Executive Dashboard';
    return '';
  }

  get primaryActionLabel(): string {
    if (this.isMember) return 'Return to Member Workspace';
    if (this.isUserManager) return 'Go to User Management';
    if (this.isIdentityManager) return 'Go to Identity Console';
    return 'Return to Dashboard';
  }

  get primaryActionIcon(): string {
    if (this.isMember) return 'dashboard';
    if (this.isUserManager) return 'groups';
    if (this.isIdentityManager) return 'admin_panel_settings';
    return 'space_dashboard';
  }

  returnToPrimaryDashboard(): void {
    const target = getReturnUrlForRole();
    this.router.navigate([target]);
  }

  signOutAndSwitchAccount(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_roles');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_email');
    this.router.navigate(['/auth/login']);
  }
}
