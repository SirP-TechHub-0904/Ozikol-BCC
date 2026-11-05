import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { 
  getStoredUserRoles, 
  getUserPrimaryRoleName, 
  isMemberOnly, 
  isGlobalAdmin 
} from '../../../core/utils/user-role.utils';

/**
 * Enterprise Feature Not Available / Subscription Required Component.
 * 
 * Displayed when a user directly navigates to or types a feature URL
 * (e.g., /workspace/stations, /groups/console, etc.) that is NOT
 * actively subscribed or licensed by the tenant workspace.
 */
@Component({
  selector: 'app-feature-unavailable',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe],
  template: `
    <div class="unavailable-container">
      <div class="unavailable-card">
        <!-- Glowing Ambient Icon -->
        <div class="unavailable-icon-wrap">
          <span class="material-symbols-outlined unavailable-icon">extension_off</span>
        </div>

        <!-- Status Chip -->
        <div class="status-chip">
          <span class="pulse-indicator"></span>
          <span>{{ 'feat.not_subscribed_chip' | translate:'SUBSCRIPTION REQUIRED' }}</span>
        </div>

        <!-- Main Title & Subtitle -->
        <h1 class="unavailable-title">{{ 'feat.not_available_title' | translate:'Feature Not Available' }}</h1>
        <p class="unavailable-subtitle">
          {{ 'feat.not_available_desc' | translate:'This feature is not actively subscribed for your organization workspace.' }}
        </p>

        <!-- Feature Diagnostic Card -->
        <div class="feature-spec-box">
          <div class="spec-row">
            <span class="spec-label">{{ 'feat.feature_label' | translate:'Requested Feature:' }}</span>
            <span class="spec-value feature-name-highlight">
              <span class="material-symbols-outlined spec-icon">verified</span>
              {{ featureTitle }}
            </span>
          </div>
          <div class="spec-row" *ngIf="attemptedUrl">
            <span class="spec-label">{{ 'feat.route_label' | translate:'Attempted Route:' }}</span>
            <code class="spec-code">{{ attemptedUrl }}</code>
          </div>
          <div class="spec-row">
            <span class="spec-label">{{ 'feat.status_label' | translate:'License Posture:' }}</span>
            <span class="badge-unsubscribed">NOT ACTIVE &bull; ADD-ON</span>
          </div>
        </div>

        <!-- Contextual Advisory Based on Role Authority -->
        <div class="advisory-box" *ngIf="isAdmin">
          <span class="material-symbols-outlined advisory-icon">info</span>
          <p class="advisory-text">
            <strong>Administrator Access:</strong> As a workspace administrator, you can review this module's features, capabilities, and activate the subscription in one click from the Features &amp; Capabilities catalog.
          </p>
        </div>

        <div class="advisory-box advisory-member" *ngIf="isMember">
          <span class="material-symbols-outlined advisory-icon">lock</span>
          <p class="advisory-text">
            <strong>Member Notice:</strong> This modular suite has not been enabled for your workspace by your organization administrators. Please contact your administrator to request access.
          </p>
        </div>

        <!-- Dynamic Action Buttons -->
        <div class="action-buttons">
          <!-- Administrator Primary Action: Subscribe via Catalog -->
          <button type="button" *ngIf="isAdmin" (click)="goToCatalogSubscribe()" class="btn-primary">
            <span class="material-symbols-outlined">bolt</span>
            <span>{{ 'feat.subscribe_catalog' | translate:'View Details & Subscribe' }}</span>
          </button>

          <!-- Administrator Secondary Action: Return to Admin Dashboard -->
          <button type="button" *ngIf="isAdmin" (click)="returnToConsole()" class="btn-secondary">
            <span class="material-symbols-outlined">dashboard</span>
            <span>{{ 'feat.return_console' | translate:'Return to Console Dashboard' }}</span>
          </button>

          <!-- Member Primary Action: Return to Personal Workspace -->
          <button type="button" *ngIf="isMember" (click)="returnToWorkspace()" class="btn-primary">
            <span class="material-symbols-outlined">space_dashboard</span>
            <span>{{ 'feat.return_workspace' | translate:'Return to Workspace Home' }}</span>
          </button>

          <!-- Return to Public Home Link -->
          <a routerLink="/" class="btn-home-link">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>{{ 'auth.return_public_home' | translate:'Return to Public Home' }}</span>
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .unavailable-container {
      width: 100%;
      min-height: calc(100vh - 120px);
      display: flex;
      justify-content: center;
      align-items: center;
      box-sizing: border-box;
      padding: 30px 16px;
    }

    .unavailable-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 24px;
      padding: 44px 36px;
      width: 100%;
      max-width: 520px;
      text-align: center;
      box-shadow: 0 20px 45px -12px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04);
      color: #0f172a;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .unavailable-icon-wrap {
      width: 76px;
      height: 76px;
      border-radius: 22px;
      background: #fff7ed;
      border: 1.5px solid #fed7aa;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 18px;
      box-shadow: 0 10px 25px rgba(234, 88, 12, 0.15);
    }

    .unavailable-icon {
      font-size: 40px;
      color: #ea580c;
    }

    .status-chip {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 5px 14px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.06em;
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      margin-bottom: 14px;
    }

    .pulse-indicator {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #dc2626;
      box-shadow: 0 0 6px #dc2626;
    }

    .unavailable-title {
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 10px;
      letter-spacing: -0.02em;
    }

    .unavailable-subtitle {
      font-size: 14px;
      color: #64748b;
      margin: 0 0 22px;
      line-height: 1.6;
      max-width: 440px;
    }

    .feature-spec-box {
      width: 100%;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 20px;
      box-sizing: border-box;
      text-align: left;
    }

    .spec-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12.5px;
      gap: 12px;
    }

    .spec-label {
      color: #64748b;
      font-weight: 600;
      flex-shrink: 0;
    }

    .spec-value {
      font-weight: 700;
      color: #0f172a;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .feature-name-highlight {
      color: #0050e5;
    }

    .spec-icon {
      font-size: 15px;
      color: #0050e5;
    }

    .spec-code {
      font-family: 'SF Mono', Consolas, Monaco, monospace;
      font-size: 11.5px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      padding: 3px 8px;
      border-radius: 6px;
      color: #0f172a;
      max-width: 250px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .badge-unsubscribed {
      font-size: 10.5px;
      font-weight: 800;
      letter-spacing: 0.05em;
      padding: 3px 8px;
      border-radius: 6px;
      background: #fef3c7;
      border: 1px solid #fde68a;
      color: #b45309;
    }

    .advisory-box {
      width: 100%;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 12px;
      padding: 12px 14px;
      margin-bottom: 24px;
      box-sizing: border-box;
      text-align: left;
    }

    .advisory-box.advisory-member {
      background: #f8fafc;
      border-color: #cbd5e1;
    }

    .advisory-icon {
      font-size: 18px;
      color: #2563eb;
      margin-top: 2px;
      flex-shrink: 0;
    }

    .advisory-member .advisory-icon {
      color: #64748b;
    }

    .advisory-text {
      font-size: 12px;
      line-height: 1.5;
      color: #1e3a8a;
      margin: 0;
    }

    .advisory-member .advisory-text {
      color: #475569;
    }

    .action-buttons {
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 100%;
    }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 12px 20px;
      border-radius: 12px;
      font-size: 13.5px;
      font-weight: 700;
      background: #0050e5;
      color: #ffffff;
      border: none;
      cursor: pointer;
      transition: background 0.2s ease, transform 0.1s ease;
      box-shadow: 0 4px 14px rgba(0, 80, 229, 0.25);
    }

    .btn-primary:hover {
      background: #003fc4;
      transform: translateY(-1px);
    }

    .btn-secondary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 11px 20px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      background: #f8fafc;
      color: #334155;
      border: 1px solid #cbd5e1;
      cursor: pointer;
      transition: background 0.2s ease, border-color 0.2s ease;
    }

    .btn-secondary:hover {
      background: #f1f5f9;
      border-color: #94a3b8;
    }

    .btn-home-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin-top: 6px;
      font-size: 12px;
      color: #64748b;
      text-decoration: none;
      transition: color 0.15s ease;
    }

    .btn-home-link:hover {
      color: #0f172a;
    }
  `]
})
export class FeatureUnavailableComponent implements OnInit {
  featureCode: string = '';
  featureTitle: string = 'Requested Feature';
  attemptedUrl: string = '';

  isMember: boolean = false;
  isAdmin: boolean = true;
  userRoleName: string = 'Administrator';

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.featureCode = (params['feature'] || '').toLowerCase();
      this.attemptedUrl = params['attemptedUrl'] || '';
      
      const paramName = params['featureName'];
      if (paramName) {
        this.featureTitle = paramName;
      } else if (this.featureCode === 'bcp-workspace') {
        this.featureTitle = 'Workspace (Desktop only)';
      } else if (this.featureCode === 'bcp-committees') {
        this.featureTitle = 'Groups & Committees';
      } else if (this.featureCode === 'bcp-alumni-directory') {
        this.featureTitle = 'Alumni Network & Directory';
      } else if (this.featureCode === 'bcp-community-messenger') {
        this.featureTitle = 'Community Messenger & Chat';
      } else if (this.featureCode) {
        this.featureTitle = this.featureCode;
      }
    });

    const roles = getStoredUserRoles();
    this.isMember = isMemberOnly(roles);
    this.isAdmin = !this.isMember || isGlobalAdmin(roles);
    this.userRoleName = getUserPrimaryRoleName(roles);
  }

  goToCatalogSubscribe(): void {
    if (this.featureCode) {
      this.router.navigate(['/billing/features'], { queryParams: { feature: this.featureCode } });
    } else {
      this.router.navigate(['/billing/features']);
    }
  }

  returnToConsole(): void {
    this.router.navigate(['/dashboard/console']);
  }

  returnToWorkspace(): void {
    this.router.navigate(['/dashboard/workspace']);
  }
}

