import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-alumni-network',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="alumni-container">
      <!-- Header Banner -->
      <div class="page-header">
        <div>
          <div class="eyebrow-badge">
            <span class="material-symbols-outlined">school</span>
            <span>COMMUNITY & ALUMNI NETWORK</span>
          </div>
          <h1 class="page-title">Alumni & Member Network</h1>
          <p class="page-sub">Connect with verified alumni, explore career biographies, request mentorship, and collaborate.</p>
        </div>
        <div class="header-actions">
          <a routerLink="/users/workspace/profile/biography" class="btn-cv-bio">
            <span class="material-symbols-outlined">badge</span>
            <span>Update My CV Bio</span>
          </a>
        </div>
      </div>

      <!-- Telemetry Dashboard Metrics Row -->
      <div class="telemetry-grid">
        <div class="telemetry-card">
          <div class="card-icon-wrap bg-blue-subtle">
            <span class="material-symbols-outlined text-blue">group</span>
          </div>
          <div class="card-content">
            <span class="card-metric">{{ members.length }}</span>
            <span class="card-label">Total Network Members</span>
          </div>
        </div>

        <div class="telemetry-card">
          <div class="card-icon-wrap bg-green-subtle">
            <span class="material-symbols-outlined text-green">volunteer_activism</span>
          </div>
          <div class="card-content">
            <span class="card-metric">{{ getMentorsCount() }}</span>
            <span class="card-label">Available Mentors</span>
          </div>
        </div>

        <div class="telemetry-card">
          <div class="card-icon-wrap bg-purple-subtle">
            <span class="material-symbols-outlined text-purple">workspace_premium</span>
          </div>
          <div class="card-content">
            <span class="card-metric">{{ getBiographiesCount() }}</span>
            <span class="card-label">Verified CV Dossiers</span>
          </div>
        </div>

        <div class="telemetry-card">
          <div class="card-icon-wrap bg-amber-subtle">
            <span class="material-symbols-outlined text-amber">calendar_month</span>
          </div>
          <div class="card-content">
            <span class="card-metric">2018 – 2021</span>
            <span class="card-label">Alumni Exit Cohorts</span>
          </div>
        </div>
      </div>

      <!-- Filter Chips & Search Bar Row -->
      <div class="toolbar-wrap">
        <div class="filter-chips">
          <button type="button" class="chip-btn" [class.active]="activeFilter === 'all'" (click)="setFilter('all')">
            <span>All Members ({{ members.length }})</span>
          </button>
          <button type="button" class="chip-btn" [class.active]="activeFilter === 'mentors'" (click)="setFilter('mentors')">
            <span class="material-symbols-outlined icon-sm">volunteer_activism</span>
            <span>Mentors Only ({{ getMentorsCount() }})</span>
          </button>
          <button type="button" class="chip-btn" [class.active]="activeFilter === 'bio'" (click)="setFilter('bio')">
            <span class="material-symbols-outlined icon-sm">assignment_ind</span>
            <span>With CV Bio ({{ getBiographiesCount() }})</span>
          </button>
        </div>

        <div class="search-box">
          <span class="material-symbols-outlined">search</span>
          <input type="text" [(ngModel)]="searchQuery" (input)="onSearchInput()" placeholder="Search by name, company, or title..." />
          <button *ngIf="searchQuery" type="button" class="btn-clear" (click)="clearSearch()">✕</button>
        </div>
      </div>

      <!-- Member Cards Grid -->
      <div class="members-grid" *ngIf="filteredMembers.length > 0">
        <div class="member-card" *ngFor="let m of filteredMembers">
          <div class="card-top-bar">
            <span class="exit-year-badge" *ngIf="m.exitYear">
              <span class="material-symbols-outlined icon-xs">school</span> Class of {{ m.exitYear }}
            </span>
            <span class="mentor-badge" *ngIf="m.isAvailableForMentorship">
              <span class="material-symbols-outlined icon-xs">check_circle</span> Mentor
            </span>
          </div>

          <div class="member-top">
            <div class="member-avatar">
              {{ m.fullName ? m.fullName.charAt(0).toUpperCase() : 'M' }}
            </div>
            <div class="member-main-info">
              <h3 class="member-name">{{ m.fullName }}</h3>
              <p class="member-email">{{ m.email }}</p>
              <p class="member-title">{{ m.designation || 'Member of Organization' }}</p>
              <p class="member-company" *ngIf="m.company">
                <span class="material-symbols-outlined icon-xs">business</span>
                <span>{{ m.company }}</span>
              </p>
            </div>
          </div>

          <div class="member-actions">
            <a *ngIf="m.linkedInUrl" [href]="m.linkedInUrl" target="_blank" rel="noopener noreferrer" class="btn-linkedin" title="LinkedIn Profile">
              <span class="material-symbols-outlined">link</span>
            </a>
            <button type="button" class="btn-outline btn-sm" (click)="viewBiography(m)">
              <span class="material-symbols-outlined">assignment_ind</span>
              <span>View CV Bio</span>
            </button>
            <button type="button" class="btn-primary btn-sm" (click)="startPrivateChat(m)">
              <span class="material-symbols-outlined">chat</span>
              <span>Chat</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Biography Modal -->
      <div class="cv-modal-backdrop" *ngIf="selectedMemberBio">
        <div class="cv-modal-card">
          <div class="cv-modal-header no-print">
            <div class="modal-title-wrap">
              <span class="material-symbols-outlined text-blue">badge</span>
              <h3>Professional Biography Dossier</h3>
            </div>
            <div class="header-buttons">
              <button type="button" class="btn-print" (click)="printCv()">
                <span class="material-symbols-outlined">print</span>
                <span>Print/PDF</span>
              </button>
              <button type="button" class="btn-close" (click)="closeModal()">✕</button>
            </div>
          </div>

          <div class="cv-document" id="printable-cv">
            <!-- Header Section -->
            <div class="cv-header">
              <div class="cv-avatar-large">
                {{ selectedMemberBio.fullName ? selectedMemberBio.fullName.charAt(0).toUpperCase() : 'M' }}
              </div>
              <div class="cv-header-text">
                <h1 class="cv-name">{{ selectedMemberBio.fullName }}</h1>
                <p class="cv-headline">{{ selectedMemberBio.headline || 'Professional Alumni Member' }}</p>
                <div class="cv-contact-row">
                  <span class="cv-contact-item">
                    <span class="material-symbols-outlined">mail</span>
                    <span>{{ selectedMemberBio.email }}</span>
                  </span>
                </div>
              </div>
            </div>

            <!-- Professional Summary -->
            <div class="cv-section" *ngIf="selectedMemberBio.professionalSummary">
              <h2 class="cv-section-title">Professional Summary</h2>
              <p class="cv-summary-text">{{ selectedMemberBio.professionalSummary }}</p>
            </div>

            <!-- Work Experience -->
            <div class="cv-section" *ngIf="selectedMemberBio.workExperience?.length > 0">
              <h2 class="cv-section-title">Work Experience</h2>
              <div class="cv-experience-timeline">
                <div class="cv-timeline-item" *ngFor="let w of selectedMemberBio.workExperience">
                  <div class="timeline-meta">
                    <strong class="timeline-company">{{ w.company }}</strong>
                    <span class="timeline-dates">{{ w.startDate }} – {{ w.endDate || 'Present' }}</span>
                  </div>
                  <h4 class="timeline-title">{{ w.jobTitle }}</h4>
                  <p class="timeline-desc">{{ w.description }}</p>
                </div>
              </div>
            </div>

            <!-- Education -->
            <div class="cv-section" *ngIf="selectedMemberBio.education?.length > 0">
              <h2 class="cv-section-title">Education</h2>
              <div class="cv-education-list">
                <div class="cv-education-item" *ngFor="let ed of selectedMemberBio.education">
                  <div class="education-meta">
                    <strong class="education-institution">{{ ed.institution }}</strong>
                    <span class="education-year">Graduated: {{ ed.graduationYear }}</span>
                  </div>
                  <h4 class="education-degree">{{ ed.degree }} in {{ ed.fieldOfStudy }}</h4>
                  <p class="education-desc" *ngIf="ed.description">{{ ed.description }}</p>
                </div>
              </div>
            </div>

            <!-- Skills -->
            <div class="cv-section" *ngIf="selectedMemberBio.skills?.length > 0">
              <h2 class="cv-section-title">Skills & Core Expertise</h2>
              <div class="cv-skills-tags">
                <span class="cv-skill-tag" *ngFor="let s of selectedMemberBio.skills">{{ s }}</span>
              </div>
            </div>

            <!-- Certifications -->
            <div class="cv-section" *ngIf="selectedMemberBio.certifications?.length > 0">
              <h2 class="cv-section-title">Certifications & Accreditations</h2>
              <div class="cv-cert-list">
                <div class="cv-cert-item" *ngFor="let c of selectedMemberBio.certifications">
                  <div class="cert-header">
                    <strong class="cert-title">{{ c.title }}</strong>
                    <span class="cert-year">{{ c.year }}</span>
                  </div>
                  <p class="cert-issuer">Issued by/Organization: {{ c.issuerOrLink }}</p>
                  <p class="cert-desc" *ngIf="c.description">{{ c.description }}</p>
                </div>
              </div>
            </div>

            <!-- Languages -->
            <div class="cv-section" *ngIf="selectedMemberBio.languages?.length > 0">
              <h2 class="cv-section-title">Languages</h2>
              <div class="cv-languages-list">
                <div class="cv-lang-item" *ngFor="let l of selectedMemberBio.languages">
                  <strong>{{ l.language }}</strong> — <span class="lang-proficiency">{{ l.proficiency }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="empty-state" *ngIf="filteredMembers.length === 0 && !loading">
        <span class="material-symbols-outlined icon-large">group_off</span>
        <p>No members matched your search criteria.</p>
      </div>

      <div class="loading-state" *ngIf="loading">
        <p>Searching network directory...</p>
      </div>
    </div>
  `,
  styles: [`
    .alumni-container { display: flex; flex-direction: column; gap: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; }
    
    .page-header { display: flex; justify-content: space-between; align-items: center; }
    .eyebrow-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #0050e5; background: rgba(0, 80, 229, 0.08); padding: 4px 10px; border-radius: 20px; margin-bottom: 8px; }
    .eyebrow-badge span.material-symbols-outlined { font-size: 14px; }
    .page-title { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
    .page-sub { font-size: 13px; color: #64748b; margin: 0; }
    .btn-cv-bio { display: inline-flex; align-items: center; gap: 6px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 16px; font-size: 12.5px; font-weight: 700; color: #0f172a; text-decoration: none; transition: all 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .btn-cv-bio:hover { background: #f8fafc; border-color: #94a3b8; }

    /* Telemetry Grid */
    .telemetry-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    @media (max-width: 900px) { .telemetry-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 500px) { .telemetry-grid { grid-template-columns: 1fr; } }
    .telemetry-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 16px; box-shadow: 0 2px 6px rgba(0,0,0,0.02); }
    .card-icon-wrap { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .bg-blue-subtle { background: rgba(0, 80, 229, 0.08); }
    .bg-green-subtle { background: rgba(16, 185, 129, 0.08); }
    .bg-purple-subtle { background: rgba(139, 92, 246, 0.08); }
    .bg-amber-subtle { background: rgba(245, 158, 11, 0.08); }
    .text-blue { color: #0050e5; }
    .text-green { color: #10b981; }
    .text-purple { color: #8b5cf6; }
    .text-amber { color: #f59e0b; }
    .card-content { display: flex; flex-direction: column; }
    .card-metric { font-size: 20px; font-weight: 800; color: #0f172a; }
    .card-label { font-size: 11.5px; color: #64748b; font-weight: 600; }

    /* Toolbar Row */
    .toolbar-wrap { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
    .filter-chips { display: flex; gap: 8px; flex-wrap: wrap; }
    .chip-btn { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 20px; padding: 6px 14px; font-size: 12px; font-weight: 700; color: #475569; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s; }
    .chip-btn.active { background: #0050e5; border-color: #0050e5; color: #ffffff; }
    .chip-btn .icon-sm { font-size: 16px; }
    
    .search-box { display: flex; align-items: center; gap: 8px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 14px; width: 320px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); }
    .search-box span { font-size: 20px; color: #64748b; }
    .search-box input { border: none; outline: none; font-size: 13px; width: 100%; color: #0f172a; }
    .btn-clear { background: none; border: none; font-size: 12px; color: #94a3b8; cursor: pointer; }

    /* Members Grid */
    .members-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
    .member-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; gap: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); transition: all 0.2s; position: relative; }
    .member-card:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(0,0,0,0.05); border-color: #cbd5e1; }
    
    .card-top-bar { display: flex; justify-content: space-between; align-items: center; min-height: 22px; }
    .exit-year-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; background: rgba(0, 80, 229, 0.08); color: #0050e5; padding: 2px 8px; border-radius: 10px; }
    .mentor-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; background: rgba(16, 185, 129, 0.1); color: #10b981; padding: 2px 8px; border-radius: 10px; }
    .icon-xs { font-size: 13px; }

    .member-top { display: flex; gap: 14px; align-items: flex-start; }
    .member-avatar { width: 46px; height: 46px; border-radius: 50%; background: rgba(0, 80, 229, 0.1); color: #0050e5; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 800; flex-shrink: 0; }
    .member-main-info { min-width: 0; flex: 1; }
    .member-name { font-size: 15px; font-weight: 800; color: #0f172a; margin: 0 0 2px; }
    .member-email { font-size: 12px; color: #64748b; margin: 0 0 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .member-title { font-size: 12px; color: #0050e5; font-weight: 700; margin: 0 0 4px; }
    .member-company { font-size: 11.5px; color: #475569; margin: 0; display: flex; align-items: center; gap: 4px; font-weight: 600; }

    .member-actions { display: flex; gap: 8px; border-top: 1px solid #f1f5f9; padding-top: 12px; align-items: center; }
    .btn-linkedin { width: 34px; height: 34px; border-radius: 8px; border: 1px solid #cbd5e1; background: #ffffff; color: #0a66c2; display: flex; align-items: center; justify-content: center; text-decoration: none; transition: all 0.2s; }
    .btn-linkedin:hover { background: #f0f7ff; border-color: #0a66c2; }
    .btn-linkedin span { font-size: 18px; }
    .btn-outline { border: 1px solid #cbd5e1; background: #ffffff; color: #334155; border-radius: 8px; padding: 8px 12px; font-size: 12px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; flex: 1; justify-content: center; transition: all 0.2s; }
    .btn-outline:hover { background: #f8fafc; border-color: #94a3b8; }
    .btn-primary { background: linear-gradient(135deg, #0050e5, #1f6bff); color: #ffffff; border: none; border-radius: 8px; padding: 8px 12px; font-size: 12px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; flex: 1; justify-content: center; transition: all 0.2s; }
    .btn-primary:hover { opacity: 0.95; box-shadow: 0 4px 12px rgba(0,80,229,0.25); }

    /* CV Biography Modal */
    .cv-modal-backdrop { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); z-index: 1100; display: flex; align-items: center; justify-content: center; padding: 40px; }
    .cv-modal-card { width: 800px; max-width: 100%; height: 90vh; background: #ffffff; border-radius: 16px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.15); }
    .cv-modal-header { padding: 16px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; }
    .modal-title-wrap { display: flex; align-items: center; gap: 8px; }
    .modal-title-wrap h3 { margin: 0; font-size: 14px; font-weight: 800; color: #0f172a; }
    .header-buttons { display: flex; gap: 10px; align-items: center; }
    .btn-print { border: 1px solid #0050e5; background: rgba(0, 80, 229, 0.04); color: #0050e5; border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; }
    .btn-print:hover { background: rgba(0, 80, 229, 0.08); }
    .btn-close { background: none; border: none; cursor: pointer; color: #64748b; font-size: 18px; }

    /* Printable CV Area */
    .cv-document { flex: 1; overflow-y: auto; padding: 40px; color: #1e293b; }
    .cv-header { display: flex; gap: 24px; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 24px; margin-bottom: 24px; }
    .cv-avatar-large { width: 80px; height: 80px; border-radius: 50%; background: rgba(0, 80, 229, 0.1); color: #0050e5; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 800; }
    .cv-header-text { flex: 1; }
    .cv-name { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
    .cv-headline { font-size: 14.5px; color: #0050e5; font-weight: 700; margin: 0 0 12px; }
    .cv-contact-row { display: flex; gap: 16px; font-size: 13px; color: #64748b; }
    .cv-contact-item { display: flex; align-items: center; gap: 4px; }
    .cv-contact-item span { font-size: 16px; }

    .cv-section { margin-bottom: 24px; }
    .cv-section-title { font-size: 14px; font-weight: 800; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    .cv-summary-text { font-size: 13px; color: #334155; line-height: 1.6; margin: 0; }

    .cv-experience-timeline, .cv-education-list, .cv-cert-list { display: flex; flex-direction: column; gap: 16px; }
    .cv-timeline-item, .cv-education-item, .cv-cert-item { display: flex; flex-direction: column; }
    .timeline-meta, .education-meta, .cert-header { display: flex; justify-content: space-between; margin-bottom: 2px; }
    .timeline-company, .education-institution, .cert-title { font-size: 13.5px; font-weight: 700; color: #0f172a; }
    .timeline-dates, .education-year, .cert-year { font-size: 12px; color: #64748b; }
    .timeline-title, .education-degree { font-size: 12.5px; color: #0050e5; font-weight: 700; margin: 0 0 6px; }
    .timeline-desc, .education-desc, .cert-desc { font-size: 12.5px; color: #334155; line-height: 1.5; margin: 0; }
    .cert-issuer { font-size: 12px; font-style: italic; color: #64748b; margin: 0 0 4px; }

    .cv-skills-tags { display: flex; flex-wrap: wrap; gap: 8px; }
    .cv-skill-tag { background: #f1f5f9; color: #334155; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 6px; }
    .cv-languages-list { display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
    .lang-proficiency { color: #64748b; }

    /* Print styling rules */
    @media print {
      body * { visibility: hidden; }
      .cv-modal-backdrop { position: absolute; left: 0; top: 0; background: none; padding: 0; width: 100%; height: auto; }
      .cv-modal-card { width: 100%; height: auto; box-shadow: none; border-radius: 0; }
      #printable-cv, #printable-cv * { visibility: visible; }
      #printable-cv { position: absolute; left: 0; top: 0; width: 100%; padding: 0; }
      .no-print { display: none !important; }
    }

    /* States */
    .empty-state { text-align: center; padding: 40px; color: #94a3b8; }
    .icon-large { font-size: 48px; margin-bottom: 8px; }
    .loading-state { text-align: center; padding: 40px; color: #64748b; }
  `]
})
export class AlumniNetworkComponent implements OnInit {
  members: any[] = [];
  searchQuery = '';
  loading = false;
  activeFilter = 'all';
  selectedMemberBio: any | null = null;

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadMembers();
  }

  loadMembers(): void {
    this.loading = true;
    this.api.get<any[]>(`profile/biography/members?search=${encodeURIComponent(this.searchQuery)}`).subscribe({
      next: (res) => {
        this.members = res || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toast.error('Failed to load member directory.');
      }
    });
  }

  get filteredMembers(): any[] {
    if (this.activeFilter === 'mentors') {
      return this.members.filter(m => m.isAvailableForMentorship);
    }
    if (this.activeFilter === 'bio') {
      return this.members.filter(m => m.hasBiography);
    }
    return this.members;
  }

  setFilter(filter: string): void {
    this.activeFilter = filter;
  }

  getMentorsCount(): number {
    return this.members.filter(m => m.isAvailableForMentorship).length;
  }

  getBiographiesCount(): number {
    return this.members.filter(m => m.hasBiography).length;
  }

  onSearchInput(): void {
    this.loadMembers();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.loadMembers();
  }

  viewBiography(m: any): void {
    this.router.navigate(['/users/workspace/alumni/bio', m.id]);
  }

  startPrivateChat(m: any): void {
    this.router.navigate(['/users/workspace/chat'], { queryParams: { dmUserId: m.id } });
  }

  closeModal(): void {
    this.selectedMemberBio = null;
  }

  printCv(): void {
    window.print();
  }
}
