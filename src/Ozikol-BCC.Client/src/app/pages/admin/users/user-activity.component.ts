import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-user-activity',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent],
  template: `
    <div class="activity-page">
      <!-- Standardized Page Header -->
      <app-page-header
        eyebrow="SECURITY & COMPLIANCE"
        icon="history"
        title="Forensic Activity & Security Logs"
        subtitle="Complete audit history of user creation, password changes, OTP requests, and permission modifications."
        [buttons]="headerButtons"
        [loading]="isLoading"
      ></app-page-header>

      <!-- Filter Card -->
      <div class="filter-card">
        <div class="filter-grid">
          <div class="filter-field">
            <label>Search Logs</label>
            <div class="search-input-wrap">
              <span class="material-symbols-outlined search-icon">search</span>
              <input type="text" [(ngModel)]="searchQuery" (ngModelChange)="applyFilters()" placeholder="Filter by action, user name, or description..." />
            </div>
          </div>

          <div class="filter-field">
            <label>Action Category</label>
            <select [(ngModel)]="selectedActionFilter" (change)="applyFilters()">
              <option value="All">All Action Types</option>
              <option value="Create User">Create User</option>
              <option value="Update Profile">Update Profile</option>
              <option value="Status Change">Status Change</option>
              <option value="Generate OTP">Generate OTP</option>
              <option value="Password Reset">Password Reset</option>
              <option value="Delete User">Delete User</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Logs Table -->
      <div class="table-container" *ngIf="!isLoading">
        <table class="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action Type</th>
              <th>Description</th>
              <th>Performed By</th>
              <th>Target Member</th>
              <th>IP Address</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let l of filteredLogs">
              <td class="time-cell">{{ l.date | date:'medium' }}</td>
              <td>
                <span class="action-tag" [class.danger]="l.actionType?.includes('Delete')" [class.success]="l.actionType?.includes('Create')">
                  {{ l.actionType }}
                </span>
              </td>
              <td class="desc-cell">{{ l.description }}</td>
              <td><strong>{{ l.performedByFullName || 'System' }}</strong></td>
              <td>{{ l.targetFullName || '-' }}</td>
              <td class="ip-cell">{{ l.ipAddress || '127.0.0.1' }}</td>
            </tr>

            <tr *ngIf="filteredLogs.length === 0">
              <td colspan="6" class="empty-cell">
                <span class="material-symbols-outlined">receipt_long</span>
                <p>No activity logs found matching filter criteria.</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .activity-page { display: flex; flex-direction: column; gap: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; }

    /* Navigation Bar */
    .feature-nav-bar { display: flex; gap: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; overflow-x: auto; }
    .tab-btn { display: flex; align-items: center; gap: 8px; padding: 10px 18px; border: none; background: transparent; border-radius: 8px; font-size: 13px; font-weight: 600; color: #64748b; cursor: pointer; text-decoration: none; transition: all 0.15s ease; white-space: nowrap; }
    .tab-btn:hover { background: #f1f5f9; color: #0f172a; }
    .tab-btn.active { background: #0050e5; color: #ffffff; }
    .count-pill { font-size: 11px; padding: 2px 8px; border-radius: 9999px; background: #e2e8f0; color: #475569; font-weight: 700; }
    .tab-btn.active .count-pill { background: rgba(255,255,255,0.25); color: #ffffff; }

    .filter-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
    .filter-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 14px; }
    @media (max-width: 640px) { .filter-grid { grid-template-columns: 1fr; } }
    .filter-field { display: flex; flex-direction: column; gap: 6px; }
    .filter-field label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; }
    .filter-field select { height: 40px; padding: 0 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; outline: none; background: #ffffff; }

    .search-input-wrap { position: relative; display: flex; align-items: center; }
    .search-input-wrap input { width: 100%; height: 40px; padding: 0 14px 0 38px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; outline: none; }
    .search-icon { position: absolute; left: 10px; font-size: 20px; color: #94a3b8; pointer-events: none; }

    .table-container { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
    .data-table { width: 100%; border-collapse: collapse; text-align: left; }
    .data-table th { background: #f8fafc; padding: 12px 16px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; }
    .data-table td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; font-size: 13px; vertical-align: middle; }
    .time-cell { font-family: monospace; font-size: 12px; color: #64748b; white-space: nowrap; }
    .action-tag { font-size: 11px; font-weight: 700; color: #0050e5; background: #eff6ff; padding: 3px 8px; border-radius: 4px; white-space: nowrap; }
    .action-tag.danger { color: #dc2626; background: #fee2e2; }
    .action-tag.success { color: #059669; background: #d1fae5; }
    .desc-cell { font-size: 12px; color: #334155; }
    .ip-cell { font-family: monospace; font-size: 11px; color: #94a3b8; }
    .empty-cell { text-align: center; padding: 40px; color: #64748b; }
    .empty-cell span { font-size: 36px; color: #cbd5e1; display: block; margin-bottom: 6px; }
  `]
})
export class UserActivityComponent implements OnInit {
  isLoading = false;
  logs: any[] = [];
  filteredLogs: any[] = [];

  searchQuery = '';
  selectedActionFilter = 'All';

  headerButtons: PageHeaderButton[] = [
    {
      text: 'Refresh Logs',
      icon: 'refresh',
      isPrimary: false,
      action: () => this.loadLogs()
    }
  ];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.isLoading = true;
    this.api.get<any>('UsersApi/audit-logs').subscribe({
      next: (res) => {
        this.isLoading = false;
        this.logs = res.data || [];
        this.applyFilters();
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    let list = [...this.logs];

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(l =>
        l.description?.toLowerCase().includes(q) ||
        l.actionType?.toLowerCase().includes(q) ||
        l.performedByFullName?.toLowerCase().includes(q) ||
        l.targetFullName?.toLowerCase().includes(q)
      );
    }

    if (this.selectedActionFilter !== 'All') {
      list = list.filter(l => l.actionType?.toLowerCase().includes(this.selectedActionFilter.toLowerCase()));
    }

    this.filteredLogs = list;
  }
}
