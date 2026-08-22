import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-alumni-bio-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="dossier-page-container">
      <!-- Breadcrumb & Top Action Toolbar -->
      <div class="top-nav-toolbar no-print">
        <button type="button" class="btn-back" (click)="goBack()">
          <span class="material-symbols-outlined">arrow_back</span>
          <span>Back to Alumni Network</span>
        </button>

        <div class="toolbar-actions">
          <button type="button" class="btn-tool" (click)="printCv()">
            <span class="material-symbols-outlined">print</span>
            <span>Print / Save PDF</span>
          </button>
          <button type="button" class="btn-chat-primary" (click)="startChat()">
            <span class="material-symbols-outlined">chat</span>
            <span>Message {{ bio?.fullName?.split(' ')[0] || 'Member' }}</span>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-box" *ngIf="loading">
        <div class="spinner"></div>
        <p>Loading professional career dossier...</p>
      </div>

      <!-- Error / Not Found State -->
      <div class="error-box" *ngIf="!loading && !bio">
        <span class="material-symbols-outlined icon-warn">warning</span>
        <h3>Career Biography Dossier Not Found</h3>
        <p>This member has not yet published an interactive curriculum vitae.</p>
        <button type="button" class="btn-back" (click)="goBack()">Return to Directory</button>
      </div>

      <!-- Main Dossier Sheet (Full Page & Print Ready) -->
      <div class="dossier-paper" id="printable-cv-page" *ngIf="!loading && bio">
        <!-- Verification Security Banner -->
        <div class="verified-seal-banner">
          <div class="seal-left">
            <span class="material-symbols-outlined">verified</span>
            <span>VERIFIED OFFICIAL CAREER DOSSIER • OZIKOL-BCC PROFESSIONAL REGISTRY</span>
          </div>
          <span class="dossier-id">MEMBER RECORD: {{ bio.userId }}</span>
        </div>

        <!-- 1. Header Profile & Contact -->
        <header class="dossier-header">
          <div class="avatar-col">
            <div class="avatar-hero">
              {{ bio.fullName ? bio.fullName.charAt(0).toUpperCase() : 'U' }}
            </div>
          </div>
          <div class="header-main-col">
            <div class="name-status-row">
              <h1 class="candidate-name">{{ bio.fullName }}</h1>
              <span class="mentor-badge" *ngIf="alumniMeta?.isAvailableForMentorship">
                <span class="material-symbols-outlined">volunteer_activism</span> Available for Mentorship
              </span>
            </div>
            <p class="candidate-headline">{{ bio.headline || alumniMeta?.currentProfession || 'Corporate Alumni Member' }}</p>
            
            <div class="contact-meta-row">
              <span class="meta-chip" *ngIf="bio.email">
                <span class="material-symbols-outlined">mail</span>
                <span>{{ bio.email }}</span>
              </span>
              <span class="meta-chip" *ngIf="alumniMeta?.company">
                <span class="material-symbols-outlined">business</span>
                <span>{{ alumniMeta.company }}</span>
              </span>
              <span class="meta-chip" *ngIf="alumniMeta?.exitYear">
                <span class="material-symbols-outlined">school</span>
                <span>Cohort Class of {{ alumniMeta.exitYear }}</span>
              </span>
              <a *ngIf="alumniMeta?.linkedInUrl" [href]="alumniMeta.linkedInUrl" target="_blank" rel="noopener noreferrer" class="meta-chip linkedin-chip">
                <span class="material-symbols-outlined">link</span>
                <span>LinkedIn Profile</span>
              </a>
            </div>
          </div>
        </header>

        <!-- 2. Executive Professional Summary -->
        <section class="dossier-section" *ngIf="bio.professionalSummary">
          <div class="section-heading">
            <span class="material-symbols-outlined heading-icon">badge</span>
            <h2>Executive Professional Summary</h2>
          </div>
          <p class="summary-text">{{ bio.professionalSummary }}</p>
        </section>

        <!-- 3. Work Experience Timeline -->
        <section class="dossier-section" *ngIf="bio.workExperience?.length > 0">
          <div class="section-heading">
            <span class="material-symbols-outlined heading-icon">work</span>
            <h2>Work Experience & Career Timeline</h2>
          </div>
          <div class="experience-timeline">
            <div class="timeline-entry" *ngFor="let w of bio.workExperience">
              <div class="timeline-marker"></div>
              <div class="entry-content">
                <div class="entry-header-row">
                  <h3 class="entry-title">{{ w.jobTitle }}</h3>
                  <span class="entry-dates">{{ w.startDate }} — {{ w.endDate || 'Present' }}</span>
                </div>
                <h4 class="entry-company">{{ w.company }}</h4>
                <p class="entry-desc" *ngIf="w.description">{{ w.description }}</p>
              </div>
            </div>
          </div>
        </section>

        <!-- 4. Education & Academic Background -->
        <section class="dossier-section" *ngIf="bio.education?.length > 0">
          <div class="section-heading">
            <span class="material-symbols-outlined heading-icon">school</span>
            <h2>Academic Credentials & Education</h2>
          </div>
          <div class="education-grid">
            <div class="edu-card" *ngFor="let ed of bio.education">
              <div class="edu-top">
                <strong class="edu-degree">{{ ed.degree }} in {{ ed.fieldOfStudy }}</strong>
                <span class="edu-year">{{ ed.graduationYear }}</span>
              </div>
              <p class="edu-institution">{{ ed.institution }}</p>
              <p class="edu-desc" *ngIf="ed.description">{{ ed.description }}</p>
            </div>
          </div>
        </section>

        <!-- 5. Core Competencies & Skills -->
        <section class="dossier-section" *ngIf="bio.skills?.length > 0">
          <div class="section-heading">
            <span class="material-symbols-outlined heading-icon">psychology</span>
            <h2>Core Competencies & Skills</h2>
          </div>
          <div class="skills-tag-cloud">
            <span class="skill-tag" *ngFor="let s of bio.skills">{{ s }}</span>
          </div>
        </section>

        <!-- 6. Professional Certifications -->
        <section class="dossier-section" *ngIf="bio.certifications?.length > 0">
          <div class="section-heading">
            <span class="material-symbols-outlined heading-icon">workspace_premium</span>
            <h2>Professional Certifications & Accreditations</h2>
          </div>
          <div class="cert-grid">
            <div class="cert-card" *ngFor="let c of bio.certifications">
              <div class="cert-top">
                <strong class="cert-title">{{ c.title }}</strong>
                <span class="cert-year">{{ c.year }}</span>
              </div>
              <p class="cert-issuer">Issued by: {{ c.issuerOrLink }}</p>
              <p class="cert-desc" *ngIf="c.description">{{ c.description }}</p>
            </div>
          </div>
        </section>

        <!-- 7. Spoken Languages -->
        <section class="dossier-section" *ngIf="bio.languages?.length > 0">
          <div class="section-heading">
            <span class="material-symbols-outlined heading-icon">translate</span>
            <h2>Languages</h2>
          </div>
          <div class="languages-row">
            <div class="lang-card" *ngFor="let l of bio.languages">
              <strong>{{ l.language }}</strong>
              <span class="lang-level">{{ l.proficiency }}</span>
            </div>
          </div>
        </section>

        <!-- Dossier Footer Note -->
        <footer class="dossier-footer">
          <p>Official Curriculum Vitae • Verified via Ozikol-BCC Alumni & Talent Network</p>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    .dossier-page-container {
      max-width: 960px;
      margin: 0 auto;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
    }

    /* Top Action Bar */
    .top-nav-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      gap: 16px;
    }
    .btn-back {
      display: inline-flex; align-items: center; gap: 8px;
      background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px;
      padding: 8px 16px; font-size: 13px; font-weight: 700; color: #475569;
      cursor: pointer; transition: all 0.15s;
    }
    .btn-back:hover { background: #f8fafc; border-color: #94a3b8; color: #0f172a; }

    .toolbar-actions { display: flex; gap: 10px; }
    .btn-tool {
      display: inline-flex; align-items: center; gap: 6px;
      background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px;
      padding: 8px 14px; font-size: 13px; font-weight: 700; color: #0f172a;
      cursor: pointer; transition: all 0.15s;
    }
    .btn-tool:hover { background: #f8fafc; }
    .btn-chat-primary {
      display: inline-flex; align-items: center; gap: 6px;
      background: linear-gradient(135deg, #0050e5, #1f6bff);
      color: #ffffff; border: none; border-radius: 8px; padding: 8px 18px;
      font-size: 13px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(0,80,229,0.25);
    }
    .btn-chat-primary:hover { opacity: 0.95; }

    /* Dossier Paper (Print & Screen) */
    .dossier-paper {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.04);
      padding: 48px;
      position: relative;
    }

    .verified-seal-banner {
      display: flex; justify-content: space-between; align-items: center;
      background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;
      padding: 8px 16px; margin-bottom: 32px; font-size: 11.5px; font-weight: 800; color: #166534;
    }
    .seal-left { display: flex; align-items: center; gap: 6px; }
    .seal-left span.material-symbols-outlined { font-size: 18px; color: #16a34a; }
    .dossier-id { color: #64748b; font-weight: 600; font-family: monospace; font-size: 11px; }

    /* 1. Header Profile */
    .dossier-header {
      display: flex; gap: 28px; align-items: flex-start;
      border-bottom: 2px solid #e2e8f0; padding-bottom: 32px; margin-bottom: 32px;
    }
    .avatar-hero {
      width: 90px; height: 90px; border-radius: 50%;
      background: linear-gradient(135deg, #0050e5, #3b82f6);
      color: #ffffff; font-size: 38px; font-weight: 800;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 8px 16px rgba(0,80,229,0.2);
    }
    .header-main-col { flex: 1; }
    .name-status-row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 4px; }
    .candidate-name { font-size: 28px; font-weight: 800; color: #0f172a; margin: 0; }
    .mentor-badge {
      display: inline-flex; align-items: center; gap: 4px;
      background: rgba(16, 185, 129, 0.12); color: #10b981;
      padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 800;
    }
    .candidate-headline { font-size: 16px; font-weight: 700; color: #0050e5; margin: 0 0 16px; }
    
    .contact-meta-row { display: flex; gap: 12px; flex-wrap: wrap; }
    .meta-chip {
      display: inline-flex; align-items: center; gap: 6px;
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
      padding: 6px 12px; font-size: 12.5px; font-weight: 600; color: #475569;
    }
    .meta-chip span.material-symbols-outlined { font-size: 16px; color: #64748b; }
    .linkedin-chip { color: #0a66c2; text-decoration: none; border-color: #bfdbfe; background: #eff6ff; }
    .linkedin-chip span.material-symbols-outlined { color: #0a66c2; }

    /* Sections */
    .dossier-section { margin-bottom: 36px; }
    .section-heading {
      display: flex; align-items: center; gap: 8px;
      border-bottom: 1.5px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 16px;
    }
    .heading-icon { color: #0050e5; font-size: 22px; }
    .section-heading h2 { font-size: 16px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }

    .summary-text { font-size: 14.5px; line-height: 1.7; color: #334155; margin: 0; }

    /* Experience Timeline */
    .experience-timeline { display: flex; flex-direction: column; gap: 20px; position: relative; padding-left: 20px; border-left: 2px solid #e2e8f0; }
    .timeline-entry { position: relative; }
    .timeline-marker {
      position: absolute; left: -27px; top: 4px; width: 12px; height: 12px;
      border-radius: 50%; background: #0050e5; border: 3px solid #ffffff; box-shadow: 0 0 0 2px #0050e5;
    }
    .entry-header-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px; }
    .entry-title { font-size: 15px; font-weight: 800; color: #0f172a; margin: 0; }
    .entry-dates { font-size: 12.5px; font-weight: 700; color: #64748b; }
    .entry-company { font-size: 13.5px; font-weight: 700; color: #0050e5; margin: 0 0 8px; }
    .entry-desc { font-size: 13.5px; color: #475569; line-height: 1.6; margin: 0; }

    /* Education Grid */
    .education-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    @media (max-width: 700px) { .education-grid { grid-template-columns: 1fr; } }
    .edu-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; }
    .edu-top { display: flex; justify-content: space-between; margin-bottom: 4px; }
    .edu-degree { font-size: 14px; font-weight: 800; color: #0f172a; }
    .edu-year { font-size: 12px; font-weight: 700; color: #64748b; }
    .edu-institution { font-size: 13px; font-weight: 700; color: #0050e5; margin: 0 0 6px; }
    .edu-desc { font-size: 12.5px; color: #64748b; margin: 0; }

    /* Skills Tags */
    .skills-tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
    .skill-tag { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 14px; font-size: 13px; font-weight: 700; color: #334155; }

    /* Certifications Grid */
    .cert-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    @media (max-width: 700px) { .cert-grid { grid-template-columns: 1fr; } }
    .cert-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; }
    .cert-top { display: flex; justify-content: space-between; margin-bottom: 4px; }
    .cert-title { font-size: 13.5px; font-weight: 800; color: #0f172a; }
    .cert-year { font-size: 12px; font-weight: 700; color: #64748b; }
    .cert-issuer { font-size: 12.5px; font-style: italic; color: #0050e5; margin: 0 0 6px; }
    .cert-desc { font-size: 12px; color: #64748b; margin: 0; }

    /* Languages */
    .languages-row { display: flex; gap: 12px; flex-wrap: wrap; }
    .lang-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 16px; display: flex; gap: 8px; font-size: 13px; }
    .lang-level { color: #64748b; }

    .dossier-footer { text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; color: #94a3b8; }

    /* States */
    .loading-box, .error-box { text-align: center; padding: 60px 20px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; }
    .spinner { width: 36px; height: 36px; border: 3px solid #e2e8f0; border-top-color: #0050e5; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .icon-warn { font-size: 48px; color: #f59e0b; margin-bottom: 12px; }

    /* Print Styles */
    @media print {
      body * { visibility: hidden; }
      .dossier-paper, .dossier-paper * { visibility: visible; }
      .dossier-paper { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; border: none; padding: 0; }
      .no-print { display: none !important; }
    }
  `]
})
export class AlumniBioPageComponent implements OnInit {
  userId = '';
  bio: any = null;
  alumniMeta: any = null;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.userId = params['id'] || params['userId'] || '';
      if (this.userId) {
        this.loadBiography(this.userId);
      }
    });
  }

  loadBiography(id: string): void {
    this.loading = true;
    this.api.get<any>(`profile/biography/${id}`).subscribe({
      next: (res) => {
        this.bio = res;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toast.error('Could not load member career dossier.');
      }
    });

    // Also load alumni metadata
    this.api.get<any[]>(`profile/biography/members?search=`).subscribe({
      next: (res) => {
        const found = (res || []).find(m => m.id === id);
        if (found) this.alumniMeta = found;
      },
      error: () => {}
    });
  }

  startChat(): void {
    this.router.navigate(['/users/workspace/chat'], { queryParams: { dmUserId: this.userId } });
  }

  goBack(): void {
    this.router.navigate(['/users/workspace/alumni']);
  }

  printCv(): void {
    window.print();
  }
}
