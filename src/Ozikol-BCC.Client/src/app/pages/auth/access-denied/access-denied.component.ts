import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="denied-container">
      <div class="denied-card">
        <div class="denied-icon-wrap">
          <span class="material-symbols-outlined">lock_clock</span>
        </div>
        <h1 class="denied-title">Access Denied</h1>
        <p class="denied-subtitle">
          You do not have administrative privileges to access the <strong>Console Area</strong>.
          Your account is registered with <strong>Member</strong> privileges.
        </p>

        <div class="action-buttons">
          <button (click)="goToWorkspace()" class="btn-primary">
            <span class="material-symbols-outlined">dashboard</span>
            <span>Return to Member Workspace</span>
          </button>
          <a routerLink="/auth/login" class="btn-secondary">
            <span class="material-symbols-outlined">switch_account</span>
            <span>Sign In with Another Account</span>
          </a>
          <a routerLink="/" class="btn-home-link">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>Return to Home</span>
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
      box-sizing: border-box;
      padding: 0;
    }
    .denied-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 44px 36px;
      width: 100%;
      max-width: 480px;
      text-align: center;
      box-shadow: 0 20px 45px -12px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04);
      color: #0f172a;
      box-sizing: border-box;
    }
    .denied-icon-wrap {
      width: 68px;
      height: 68px;
      border-radius: 18px;
      background: #fef3c7;
      border: 1.5px solid #fde68a;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      box-shadow: 0 4px 14px rgba(245, 158, 11, 0.15);
    }
    .denied-icon-wrap span {
      font-size: 34px;
      color: #d97706;
    }
    .denied-title {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 10px;
    }
    .denied-subtitle {
      font-size: 14px;
      color: #64748b;
      margin: 0 0 28px;
      line-height: 1.6;
    }
    .denied-subtitle strong {
      color: #0f172a;
    }
    .action-buttons {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .btn-primary {
      background: linear-gradient(135deg, #0050e5, #1f6bff);
      color: #ffffff;
      border: none;
      border-radius: 10px;
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
    }
    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(0, 80, 229, 0.4);
    }
    .btn-secondary {
      background: #f8fafc;
      border: 1.5px solid #cbd5e1;
      color: #475569;
      border-radius: 10px;
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
    }
    .btn-secondary:hover {
      background: #f1f5f9;
      color: #0f172a;
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
    }
    .btn-home-link:hover {
      color: #0050e5;
    }
  `]
})
export class AccessDeniedComponent implements OnInit {
  constructor(private router: Router) {}

  ngOnInit(): void {}

  goToWorkspace(): void {
    this.router.navigate(['/dashboard/workspace']);
  }
}
