import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SettingsService, TerminologyAliases, FeatureFlags } from '../../../core/services/settings.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside class="sidebar-container bg-dark text-white p-3 border-end border-dark">
      <!-- Mode Toggle Switch (Member Portal vs Admin Console) -->
      <div class="mode-toggle mb-3 p-2 rounded bg-secondary-dark d-flex justify-content-between align-items-center">
        <span class="small font-weight-bold text-uppercase text-muted">{{ isAdminMode ? 'Admin Console' : 'Member Portal' }}</span>
        <button class="btn btn-xs btn-outline-info" (click)="isAdminMode = !isAdminMode">
          Switch to {{ isAdminMode ? 'Member' : 'Admin' }}
        </button>
      </div>

      <!-- MEMBER SIDEBAR MENU -->
      <ul *ngIf="!isAdminMode" class="nav nav-pills flex-column mb-auto">
        <li class="nav-item mb-1">
          <a routerLink="/app/workspace" routerLinkActive="active" class="nav-link text-white d-flex align-items-center gap-2">
            📌 <span>Workspace Dashboard</span>
          </a>
        </li>

        <li *ngIf="features.enableChat" class="nav-item mb-1">
          <a routerLink="/app/groups" routerLinkActive="active" class="nav-link text-white d-flex align-items-center gap-2">
            💬 <span>{{ aliases.groupAlias || 'Group' }} Channels</span>
          </a>
        </li>

        <li *ngIf="features.enableChat" class="nav-item mb-1">
          <a routerLink="/app/direct-messages" routerLinkActive="active" class="nav-link text-white d-flex align-items-center gap-2">
            ✉️ <span>Direct Messages</span>
          </a>
        </li>

        <li class="nav-item mb-1">
          <a routerLink="/app/profile" routerLinkActive="active" class="nav-link text-white d-flex align-items-center gap-2">
            👤 <span>My Account Profile</span>
          </a>
        </li>

        <li class="nav-item mb-1">
          <a routerLink="/app/notifications" routerLinkActive="active" class="nav-link text-white d-flex align-items-center gap-2">
            🔔 <span>Notifications Feed</span>
          </a>
        </li>
      </ul>

      <!-- ADMIN SIDEBAR MENU -->
      <ul *ngIf="isAdminMode" class="nav nav-pills flex-column mb-auto">
        <li class="nav-item mb-1">
          <a routerLink="/app/admin/dashboard" routerLinkActive="active" class="nav-link text-white d-flex align-items-center gap-2">
            📊 <span>Admin Metrics Overview</span>
          </a>
        </li>

        <li class="nav-item mb-1">
          <a routerLink="/app/admin/users" routerLinkActive="active" class="nav-link text-white d-flex align-items-center gap-2">
            👥 <span>{{ aliases.alumniAlias || 'Member' }} Directory</span>
          </a>
        </li>

        <li class="nav-item mb-1">
          <a routerLink="/app/admin/settings" routerLinkActive="active" class="nav-link text-white d-flex align-items-center gap-2">
            ⚙️ <span>System & Brand Settings</span>
          </a>
        </li>

        <li class="nav-item mb-1">
          <a routerLink="/app/admin/roles" routerLinkActive="active" class="nav-link text-white d-flex align-items-center gap-2">
            🔑 <span>Roles & Permissions</span>
          </a>
        </li>

        <li class="nav-item mb-1">
          <a routerLink="/app/admin/payments" routerLinkActive="active" class="nav-link text-white d-flex align-items-center gap-2">
            💳 <span>Payment Gateway Keys</span>
          </a>
        </li>

        <li class="nav-item mb-1">
          <a routerLink="/app/admin/ai-assist" routerLinkActive="active" class="nav-link text-white d-flex align-items-center gap-2">
            🤖 <span>AI Smart Assist Config</span>
          </a>
        </li>
      </ul>
    </aside>
  `,
  styles: [`
    .sidebar-container { width: 260px; min-height: calc(100vh - 60px); background-color: #0f172a !important; border-right: 1px solid #1e293b !important; }
    .bg-secondary-dark { background-color: #1e293b; }
    .nav-link { color: #94a3b8 !important; font-size: 0.9rem; border-radius: 6px; padding: 10px 12px; }
    .nav-link:hover { background-color: #334155; color: #f8fafc !important; }
    .nav-link.active { background-color: #6f42c1 !important; color: #fff !important; font-weight: 600; }
    .btn-xs { padding: 2px 6px; font-size: 0.75rem; }
  `]
})
export class SidebarComponent implements OnInit {
  isAdminMode = false;
  aliases: TerminologyAliases = { groupAlias: 'Group', categoryAlias: 'Category', subCategoryAlias: 'Sub-Category', alumniAlias: 'Member' };
  features: FeatureFlags = { enableChat: true, enableEVoting: true, enableGrants: true, enableAts: true };

  constructor(private settingsService: SettingsService) {}

  ngOnInit(): void {
    this.settingsService.loadSettings();

    this.settingsService.aliases$.subscribe(aliases => {
      this.aliases = aliases;
    });

    this.settingsService.features$.subscribe(features => {
      this.features = features;
    });
  }
}
