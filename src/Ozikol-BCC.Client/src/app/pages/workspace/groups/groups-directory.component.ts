import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-groups-directory',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="cms-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Group Directory</h1>
          <p class="page-sub">Explore active committees, corporate divisions, and alumni year-groups.</p>
        </div>
      </div>

      <div class="search-bar-wrap">
        <div class="search-box">
          <span class="material-symbols-outlined">search</span>
          <input type="text" [(ngModel)]="searchQuery" (input)="filterGroups()" placeholder="Search groups by title or type..." />
        </div>
        <span class="count-badge">{{ filteredGroups.length }} Groups Available</span>
      </div>

      <!-- Grid Layout for Groups -->
      <div class="groups-grid" *ngIf="filteredGroups.length > 0">
        <div class="group-card" *ngFor="let g of filteredGroups">
          <div class="card-cover">
            <span class="type-badge">{{ g.groupType }}</span>
          </div>
          <div class="card-body">
            <div class="card-avatar">
              <span class="material-symbols-outlined text-primary">diversity_3</span>
            </div>
            <h3 class="card-title">{{ g.title }}</h3>
            <p class="card-desc">{{ g.description || 'No description provided.' }}</p>

            <div class="card-meta">
              <span class="meta-item">
                <span class="material-symbols-outlined">group</span>
                <span>{{ g.memberCount }} members</span>
              </span>
              <span class="meta-item">
                <span class="material-symbols-outlined">chat</span>
                <span>{{ g.messageCount }} messages</span>
              </span>
            </div>
          </div>
          <div class="card-footer">
            <button type="button" class="btn-primary full-width" (click)="joinGroup(g)" [disabled]="g.isJoined || joiningId === g.id">
              <span class="material-symbols-outlined">{{ g.isJoined ? 'check_circle' : 'person_add' }}</span>
              <span>{{ g.isJoined ? 'Joined' : (joiningId === g.id ? 'Joining...' : 'Join Group') }}</span>
            </button>
          </div>
        </div>
      </div>

      <div class="empty-state" *ngIf="filteredGroups.length === 0 && !loading">
        <span class="material-symbols-outlined icon-large">folder_open</span>
        <p>No groups match your search criteria.</p>
      </div>

      <div class="loading-state" *ngIf="loading">
        <p>Loading group directory...</p>
      </div>
    </div>
  `,
  styles: [`
    .cms-container { display: flex; flex-direction: column; gap: 20px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; }
    .page-title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
    .page-sub { font-size: 13px; color: #64748b; margin: 0; }

    .search-bar-wrap {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }
    .search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 8px 14px;
      width: 320px;
    }
    .search-box span { font-size: 20px; color: #64748b; }
    .search-box input { border: none; outline: none; font-size: 13px; width: 100%; color: #0f172a; }
    .count-badge { font-size: 12px; font-weight: 700; color: #64748b; background: #f1f5f9; padding: 4px 10px; border-radius: 12px; }

    /* Groups Cards Grid */
    .groups-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
    }
    .group-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 12px rgba(0,0,0,0.01);
      transition: all 0.2s;
    }
    .group-card:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(0,0,0,0.03); }
    .card-cover {
      height: 60px;
      background: linear-gradient(135deg, #0050e5, #1f6bff);
      position: relative;
      padding: 12px;
    }
    .type-badge {
      background: rgba(255,255,255,0.2);
      backdrop-filter: blur(4px);
      color: #ffffff;
      font-size: 10px;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 10px;
      text-transform: uppercase;
    }
    .card-body {
      padding: 16px;
      position: relative;
      flex: 1;
    }
    .card-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #ffffff;
      border: 2px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      position: absolute;
      top: -24px;
      left: 16px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.05);
    }
    .card-avatar span { font-size: 24px; color: #0050e5; }
    .card-title { font-size: 14.5px; font-weight: 800; color: #0f172a; margin: 16px 0 6px; }
    .card-desc { font-size: 12.5px; color: #64748b; line-height: 1.5; margin: 0 0 16px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    
    .card-meta { display: flex; gap: 12px; }
    .meta-item { display: flex; align-items: center; gap: 4px; font-size: 11.5px; color: #64748b; }
    .meta-item span { font-size: 16px; }

    .card-footer { padding: 12px 16px; border-top: 1px solid #f1f5f9; background: #f8fafc; }
    .btn-primary {
      background: linear-gradient(135deg, #0050e5, #1f6bff);
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 9px 14px;
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .full-width { width: 100%; }

    /* States */
    .empty-state { text-align: center; padding: 40px; color: #94a3b8; }
    .icon-large { font-size: 48px; margin-bottom: 8px; }
    .loading-state { text-align: center; padding: 40px; color: #64748b; }
  `]
})
export class GroupsDirectoryComponent implements OnInit {
  groups: any[] = [];
  filteredGroups: any[] = [];
  searchQuery = '';
  loading = false;
  joiningId = '';

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadGroups();
  }

  loadGroups(): void {
    this.loading = true;
    this.api.get<any[]>('groups/all').subscribe({
      next: (allRes) => {
        // Get user's joined groups to mark "Joined"
        this.api.get<any[]>('groups').subscribe({
          next: (joinedRes) => {
            const joinedIds = new Set(joinedRes.map(j => j.id));
            this.groups = (allRes || []).map(g => ({
              ...g,
              isJoined: joinedIds.has(g.id)
            }));
            this.filteredGroups = [...this.groups];
            this.loading = false;
          },
          error: () => {
            this.groups = (allRes || []).map(g => ({ ...g, isJoined: false }));
            this.filteredGroups = [...this.groups];
            this.loading = false;
          }
        });
      },
      error: () => {
        this.loading = false;
        this.toast.error('Failed to load group directory.');
      }
    });
  }

  filterGroups(): void {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) {
      this.filteredGroups = [...this.groups];
      return;
    }
    this.filteredGroups = this.groups.filter(
      g => g.title.toLowerCase().includes(q) || g.groupType.toLowerCase().includes(q)
    );
  }

  joinGroup(g: any): void {
    this.joiningId = g.id;
    const userId = this.getCurrentUserId();

    this.api.post<any>(`groups/${g.id}/members`, { userId, role: 'Member' }).subscribe({
      next: () => {
        g.isJoined = true;
        this.joiningId = '';
        this.toast.success(`Successfully joined group "${g.title}"!`);
        this.router.navigate(['/users/workspace/chat'], { queryParams: { groupId: g.id } });
      },
      error: () => {
        this.joiningId = '';
        this.toast.error('Failed to join the group.');
      }
    });
  }

  getCurrentUserId(): string {
    const token = localStorage.getItem('access_token');
    if (!token) return '';
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        return payload.sub || payload.nameid || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || '';
      }
    } catch {}
    return '';
  }
}
