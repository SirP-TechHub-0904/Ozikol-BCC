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
        </div>
      </div>
    </div>
  `,
  styles: [`
    .denied-container {
      position: fixed;
      inset: 0;
      width: 100vw;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at 50% 10%, #1e293b 0%, #0f172a 100%);
      padding: 24px;
      box-sizing: border-box;
      font-family: 'Roboto', 'Inter', sans-serif;
      z-index: 100;
    }
    .denied-card {
      background: rgba(30, 41, 59, 0.85);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      padding: 44px 36px;
      width: 100%;
      max-width: 480px;
      text-align: center;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5);
      color: #f8fafc;
      box-sizing: border-box;
    }
    .denied-icon-wrap {
      width: 68px;
      height: 68px;
      border-radius: 18px;
      background: linear-gradient(135deg, #f59e0b, #ef4444);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      box-shadow: 0 8px 25px rgba(239, 68, 68, 0.35);
    }
    .denied-icon-wrap span {
      font-size: 34px;
      color: #ffffff;
    }
    .denied-title {
      font-size: 24px;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 10px;
    }
    .denied-subtitle {
      font-size: 14px;
      color: #94a3b8;
      margin: 0 0 28px;
      line-height: 1.6;
    }
    .denied-subtitle strong {
      color: #cbd5e1;
    }
    .action-buttons {
      display: flex;
      flex-direction: column;
      gap: 12px;
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
      box-shadow: 0 4px 15px rgba(0, 80, 229, 0.35);
      transition: all 0.2s ease;
      text-decoration: none;
    }
    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(0, 80, 229, 0.45);
    }
    .btn-secondary {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #cbd5e1;
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
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
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
