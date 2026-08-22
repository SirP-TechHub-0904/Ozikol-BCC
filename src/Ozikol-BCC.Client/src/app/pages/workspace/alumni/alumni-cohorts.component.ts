import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

interface CohortGroup {
  year: number;
  members: any[];
  mentorsCount: number;
  topCompanies: string[];
}

@Component({
  selector: 'app-alumni-cohorts',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="cohorts-page-container">
      <!-- Header Banner -->
      <div class="page-header">
        <div>
          <div class="eyebrow-badge">
            <span class="material-symbols-outlined">school</span>
            <span>GRADUATION COHORTS & SETS</span>
          </div>
          <h1 class="page-title">Alumni Sets & Graduation Cohorts</h1>
          <p class="page-sub">Browse alumni sets by graduation year, connect with classmates, and collaborate in set channels.</p>
        </div>
        <div class="header-actions">
          <a routerLink="/users/workspace/alumni" class="btn-secondary-link">
            <span class="material-symbols-outlined">group</span>
            <span>All Alumni Network</span>
          </a>
        </div>
      </div>

      <!-- Cohort Summary Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-num">{{ cohorts.length }}</span>
          <span class="stat-lbl">Active Cohort Sets</span>
        </div>
        <div class="stat-card">
          <span class="stat-num">{{ totalAlumni }}</span>
          <span class="stat-lbl">Total Set Members</span>
        </div>
        <div class="stat-card">
          <span class="stat-num">{{ totalMentors }}</span>
          <span class="stat-lbl">Mentors in Network</span>
        </div>
        <div class="stat-card">
          <span class="stat-num">100%</span>
          <span class="stat-lbl">Class Verified</span>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="loading">
        <p>Loading alumni cohorts...</p>
      </div>

      <!-- Cohorts Stack -->
      <div class="cohorts-stack" *ngIf="!loading">
        <div class="cohort-block" *ngFor="let c of cohorts">
          <!-- Cohort Card Header -->
          <div class="cohort-header-card">
            <div class="cohort-title-wrap">
              <div class="cohort-icon-box">
                <span class="material-symbols-outlined">school</span>
              </div>
              <div>
                <h2 class="cohort-class-title">Class of {{ c.year }}</h2>
                <p class="cohort-meta-sub">
                  {{ c.members.length }} registered alumni • {{ c.mentorsCount }} mentors available
                </p>
              </div>
            </div>

            <div class="cohort-header-actions">
              <button type="button" class="btn-cohort-chat" (click)="openCohortChat(c)">
                <span class="material-symbols-outlined">forum</span>
                <span>Open Set Channel</span>
              </button>
            </div>
          </div>

          <!-- Member Cards within this Cohort -->
          <div class="cohort-members-grid">
            <div class="cohort-member-card" *ngFor="let m of c.members">
              <div class="cm-top">
                <div class="cm-avatar">
                  {{ m.fullName ? m.fullName.charAt(0).toUpperCase() : 'A' }}
                </div>
                <div class="cm-info">
                  <h4 class="cm-name">{{ m.fullName }}</h4>
                  <p class="cm-role">{{ m.designation || 'Alumni Member' }}</p>
                  <p class="cm-company" *ngIf="m.company">
                    <span class="material-symbols-outlined icon-mini">business</span>
                    <span>{{ m.company }}</span>
                  </p>
                </div>
              </div>

              <div class="cm-actions">
                <a [routerLink]="['/users/workspace/alumni/bio', m.id]" class="btn-bio-link">
                  <span class="material-symbols-outlined">assignment_ind</span>
                  <span>View CV Bio</span>
                </a>
                <button type="button" class="btn-dm-direct" (click)="startPrivateChat(m)">
                  <span class="material-symbols-outlined">chat</span>
                  <span>Message</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cohorts-page-container {
      display: flex; flex-direction: column; gap: 24px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
    }

    .page-header { display: flex; justify-content: space-between; align-items: center; }
    .eyebrow-badge {
      display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800;
      text-transform: uppercase; letter-spacing: 0.8px; color: #0050e5; background: rgba(0, 80, 229, 0.08);
      padding: 4px 10px; border-radius: 20px; margin-bottom: 8px;
    }
    .eyebrow-badge span { font-size: 14px; }
    .page-title { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
    .page-sub { font-size: 13px; color: #64748b; margin: 0; }
    .btn-secondary-link {
      display: inline-flex; align-items: center; gap: 6px; background: #ffffff; border: 1px solid #cbd5e1;
      border-radius: 8px; padding: 8px 16px; font-size: 12.5px; font-weight: 700; color: #0f172a; text-decoration: none;
    }
    .btn-secondary-link:hover { background: #f8fafc; }

    /* Summary Stats Grid */
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    @media (max-width: 800px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
    .stat-card {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px;
      display: flex; flex-direction: column; align-items: center; text-align: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.02);
    }
    .stat-num { font-size: 22px; font-weight: 800; color: #0050e5; }
    .stat-lbl { font-size: 11.5px; font-weight: 600; color: #64748b; }

    /* Cohorts Stack */
    .cohorts-stack { display: flex; flex-direction: column; gap: 32px; }
    .cohort-block { display: flex; flex-direction: column; gap: 16px; }
    
    .cohort-header-card {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 24px;
      display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 8px rgba(0,0,0,0.02);
    }
    .cohort-title-wrap { display: flex; align-items: center; gap: 16px; }
    .cohort-icon-box {
      width: 48px; height: 48px; border-radius: 12px; background: rgba(0, 80, 229, 0.1); color: #0050e5;
      display: flex; align-items: center; justify-content: center; font-size: 24px;
    }
    .cohort-class-title { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 2px; }
    .cohort-meta-sub { font-size: 12.5px; color: #64748b; margin: 0; }

    .btn-cohort-chat {
      display: inline-flex; align-items: center; gap: 6px; background: #0050e5; color: #ffffff;
      border: none; border-radius: 8px; padding: 8px 16px; font-size: 12.5px; font-weight: 700; cursor: pointer;
    }
    .btn-cohort-chat:hover { opacity: 0.95; }

    /* Cohort Members Grid */
    .cohort-members-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .cohort-member-card {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px;
      display: flex; flex-direction: column; gap: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.02);
    }
    .cohort-member-card:hover { border-color: #cbd5e1; box-shadow: 0 8px 16px rgba(0,0,0,0.04); }

    .cm-top { display: flex; gap: 12px; align-items: flex-start; }
    .cm-avatar {
      width: 42px; height: 42px; border-radius: 50%; background: rgba(0,80,229,0.1); color: #0050e5;
      display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 800; flex-shrink: 0;
    }
    .cm-info { min-width: 0; flex: 1; }
    .cm-name { font-size: 14px; font-weight: 800; color: #0f172a; margin: 0 0 2px; }
    .cm-role { font-size: 12px; color: #0050e5; font-weight: 700; margin: 0 0 2px; }
    .cm-company { font-size: 11.5px; color: #64748b; margin: 0; display: flex; align-items: center; gap: 4px; }
    .icon-mini { font-size: 13px; }

    .cm-actions { display: flex; gap: 8px; border-top: 1px solid #f1f5f9; padding-top: 10px; }
    .btn-bio-link {
      display: inline-flex; align-items: center; justify-content: center; gap: 4px; flex: 1;
      border: 1px solid #cbd5e1; background: #ffffff; border-radius: 6px; padding: 6px 10px;
      font-size: 11.5px; font-weight: 700; color: #334155; text-decoration: none;
    }
    .btn-bio-link:hover { background: #f8fafc; }
    .btn-dm-direct {
      display: inline-flex; align-items: center; justify-content: center; gap: 4px; flex: 1;
      background: linear-gradient(135deg, #0050e5, #1f6bff); color: #ffffff; border: none;
      border-radius: 6px; padding: 6px 10px; font-size: 11.5px; font-weight: 700; cursor: pointer;
    }

    .loading-state { text-align: center; padding: 40px; color: #64748b; }
  `]
})
export class AlumniCohortsComponent implements OnInit {
  cohorts: CohortGroup[] = [];
  loading = true;
  totalAlumni = 0;
  totalMentors = 0;

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCohorts();
  }

  loadCohorts(): void {
    this.loading = true;
    this.api.get<any[]>('profile/biography/members?search=').subscribe({
      next: (res) => {
        const members = res || [];
        this.totalAlumni = members.length;
        this.totalMentors = members.filter(m => m.isAvailableForMentorship).length;

        // Group members by Exit Year
        const grouped: { [year: number]: any[] } = {};
        members.forEach(m => {
          const yr = m.exitYear || 2020;
          if (!grouped[yr]) grouped[yr] = [];
          grouped[yr].push(m);
        });

        // Convert to sorted CohortGroup array (descending years)
        const years = Object.keys(grouped).map(y => parseInt(y, 10)).sort((a, b) => b - a);
        this.cohorts = years.map(yr => {
          const mList = grouped[yr];
          return {
            year: yr,
            members: mList,
            mentorsCount: mList.filter(m => m.isAvailableForMentorship).length,
            topCompanies: Array.from(new Set(mList.map(m => m.company).filter(Boolean))) as string[]
          };
        });

        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toast.error('Failed to load cohorts.');
      }
    });
  }

  startPrivateChat(m: any): void {
    this.router.navigate(['/users/workspace/chat'], { queryParams: { dmUserId: m.id } });
  }

  openCohortChat(c: CohortGroup): void {
    this.router.navigate(['/users/workspace/chat']);
  }
}
