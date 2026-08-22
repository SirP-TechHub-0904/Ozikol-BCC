import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LogoComponent } from '../../../shared/components/logo/logo.component';
import { ApiService } from '../../../core/services/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, LogoComponent],
  template: `
    <header class="topbar-header d-flex align-items-center justify-content-between px-3 py-2 border-bottom border-dark bg-dark text-white">
      <div class="d-flex align-items-center gap-3">
        <button class="btn btn-outline-light btn-sm d-md-none" (click)="toggleSidebar.emit()">
          <i class="bi bi-list fs-5"></i> ☰
        </button>
        <app-logo></app-logo>
      </div>

      <div class="d-flex align-items-center gap-3">
        <!-- Notification Bell Dropdown -->
        <div class="dropdown position-relative">
          <button class="btn btn-link text-light position-relative p-1 border-0" (click)="showNotifications = !showNotifications">
            🔔
            <span *ngIf="unreadNotifications > 0" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
              {{ unreadNotifications }}
            </span>
          </button>
        </div>

        <!-- User Profile Avatar Menu -->
        <div class="user-menu d-flex align-items-center gap-2" (click)="showUserMenu = !showUserMenu">
          <div class="avatar-circle bg-primary text-white d-flex align-items-center justify-content-center rounded-circle font-weight-bold">
            {{ userInitials }}
          </div>
          <span class="user-name d-none d-sm-inline font-weight-medium">{{ fullName }}</span>
          <button class="btn btn-sm btn-outline-secondary ms-2" (click)="logout()">Logout</button>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .topbar-header { height: 60px; background-color: #0f172a !important; border-bottom: 1px solid #1e293b !important; }
    .avatar-circle { width: 34px; height: 34px; font-size: 0.85rem; background-color: #6f42c1 !important; }
    .user-name { font-size: 0.9rem; color: #f8fafc; }
  `]
})
export class TopbarComponent implements OnInit {
  @Output() toggleSidebar = new EventEmitter<void>();

  fullName = 'User';
  userInitials = 'U';
  unreadNotifications = 2;
  showNotifications = false;
  showUserMenu = false;

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.api.get<any>('UsersApi/profile').subscribe({
      next: (res) => {
        if (res && res.isSuccess && res.data) {
          this.fullName = `${res.data.firstName || ''} ${res.data.lastName || ''}`.trim() || 'Member';
          const fn = res.data.firstName ? res.data.firstName[0] : '';
          const ln = res.data.lastName ? res.data.lastName[0] : '';
          this.userInitials = (fn + ln).toUpperCase() || 'U';
        }
      },
      error: () => {
        this.fullName = 'Member';
        this.userInitials = 'M';
      }
    });

    this.api.get<any>('WorkspaceApi/notifications').subscribe({
      next: (res) => {
        if (res && res.isSuccess && Array.isArray(res.data)) {
          this.unreadNotifications = res.data.length;
        }
      }
    });
  }

  logout(): void {
    this.api.post('auth/logout', {}).subscribe(() => {
      localStorage.removeItem('access_token');
      this.router.navigate(['/auth/login']);
    });
  }
}
