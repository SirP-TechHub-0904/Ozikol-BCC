import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BiographyService, UserBiography, WorkExperience, Education, CertificationProject, LanguageSkill } from '../../../core/services/biography.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-biography-edit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bio-editor-container">
      <div class="editor-header">
        <div>
          <h1 class="page-title">My Professional CV Biography</h1>
          <p class="page-sub">Set up your biography to share with the alumni network and download a print-ready CV.</p>
        </div>
        <button type="button" class="btn-primary" (click)="saveBiography()" [disabled]="saving">
          <span class="material-symbols-outlined">save</span>
          <span>{{ saving ? 'Saving Changes...' : 'Save CV Biography' }}</span>
        </button>
      </div>

      <div class="editor-grid">
        <!-- Main Form Pane -->
        <div class="form-pane">
          <!-- 1. Headline & Summary -->
          <div class="section-card">
            <h3 class="section-title">Headline & Summary</h3>
            <div class="form-group">
              <label>Professional Headline</label>
              <input type="text" [(ngModel)]="bio.headline" placeholder="e.g. Senior Dotnet Architect & Tech Lead" />
            </div>
            <div class="form-group">
              <label>Professional Summary</label>
              <textarea rows="4" [(ngModel)]="bio.professionalSummary" placeholder="Briefly describe your career, expertise, and value proposition..."></textarea>
            </div>
          </div>

          <!-- 2. Work Experience -->
          <div class="section-card">
            <div class="section-header-row">
              <h3 class="section-title">Work Experience</h3>
              <button type="button" class="btn-outline btn-sm" (click)="addWorkExperience()">
                <span class="material-symbols-outlined">add</span>
                <span>Add Position</span>
              </button>
            </div>
            <div class="empty-placeholder" *ngIf="bio.workExperience.length === 0">
              No positions added yet. Click "Add Position".
            </div>
            <div class="experience-editor-block" *ngFor="let w of bio.workExperience; let idx = index">
              <div class="block-header">
                <h4>Position #{{ idx + 1 }}</h4>
                <button type="button" class="btn-remove" (click)="removeWorkExperience(idx)">Remove</button>
              </div>
              <div class="form-row-2">
                <div class="form-group">
                  <label>Company / Organization</label>
                  <input type="text" [(ngModel)]="w.company" placeholder="e.g. TechCorp Solutions" />
                </div>
                <div class="form-group">
                  <label>Job Title</label>
                  <input type="text" [(ngModel)]="w.jobTitle" placeholder="e.g. Software Engineer" />
                </div>
              </div>
              <div class="form-row-2">
                <div class="form-group">
                  <label>Start Date</label>
                  <input type="text" [(ngModel)]="w.startDate" placeholder="e.g. Jan 2022" />
                </div>
                <div class="form-group">
                  <label>End Date</label>
                  <input type="text" [(ngModel)]="w.endDate" placeholder="e.g. Present" />
                </div>
              </div>
              <div class="form-group">
                <label>Job Description & Key Achievements</label>
                <textarea rows="3" [(ngModel)]="w.description" placeholder="Summarize your daily responsibilities and major wins..."></textarea>
              </div>
            </div>
          </div>

          <!-- 3. Education -->
          <div class="section-card">
            <div class="section-header-row">
              <h3 class="section-title">Education</h3>
              <button type="button" class="btn-outline btn-sm" (click)="addEducation()">
                <span class="material-symbols-outlined">add</span>
                <span>Add Education</span>
              </button>
            </div>
            <div class="empty-placeholder" *ngIf="bio.education.length === 0">
              No education history added yet. Click "Add Education".
            </div>
            <div class="experience-editor-block" *ngFor="let ed of bio.education; let idx = index">
              <div class="block-header">
                <h4>Education #{{ idx + 1 }}</h4>
                <button type="button" class="btn-remove" (click)="removeEducation(idx)">Remove</button>
              </div>
              <div class="form-row-2">
                <div class="form-group">
                  <label>Institution / University</label>
                  <input type="text" [(ngModel)]="ed.institution" placeholder="e.g. University of Lagos" />
                </div>
                <div class="form-group">
                  <label>Degree</label>
                  <input type="text" [(ngModel)]="ed.degree" placeholder="e.g. Bachelor of Science" />
                </div>
              </div>
              <div class="form-row-2">
                <div class="form-group">
                  <label>Field of Study</label>
                  <input type="text" [(ngModel)]="ed.fieldOfStudy" placeholder="e.g. Computer Science" />
                </div>
                <div class="form-group">
                  <label>Graduation Year</label>
                  <input type="number" [(ngModel)]="ed.graduationYear" placeholder="e.g. 2020" />
                </div>
              </div>
              <div class="form-group">
                <label>Additional details (Optional)</label>
                <textarea rows="2" [(ngModel)]="ed.description" placeholder="e.g. First Class Honours, Thesis details..."></textarea>
              </div>
            </div>
          </div>

          <!-- 4. Skills & Expertise -->
          <div class="section-card">
            <h3 class="section-title">Skills & Core Competencies</h3>
            <div class="skills-input-row">
              <input type="text" [(ngModel)]="newSkill" placeholder="Add a skill tag (e.g. TypeScript, Project Management)" (keydown.enter)="addSkill()" />
              <button type="button" class="btn-outline" (click)="addSkill()">Add</button>
            </div>
            <div class="skills-tags-wrap">
              <span class="skill-badge" *ngFor="let s of bio.skills">
                <span>{{ s }}</span>
                <span class="badge-remove" (click)="removeSkill(s)">✕</span>
              </span>
            </div>
          </div>

          <!-- 5. Certifications & Projects -->
          <div class="section-card">
            <div class="section-header-row">
              <h3 class="section-title">Certifications & Projects</h3>
              <button type="button" class="btn-outline btn-sm" (click)="addCertification()">
                <span class="material-symbols-outlined">add</span>
                <span>Add Entry</span>
              </button>
            </div>
            <div class="empty-placeholder" *ngIf="bio.certifications.length === 0">
              No certifications/projects added yet.
            </div>
            <div class="experience-editor-block" *ngFor="let c of bio.certifications; let idx = index">
              <div class="block-header">
                <h4>Entry #{{ idx + 1 }}</h4>
                <button type="button" class="btn-remove" (click)="removeCertification(idx)">Remove</button>
              </div>
              <div class="form-row-2">
                <div class="form-group">
                  <label>Title</label>
                  <input type="text" [(ngModel)]="c.title" placeholder="e.g. AWS Certified Solutions Architect" />
                </div>
                <div class="form-group">
                  <label>Issuer / Link</label>
                  <input type="text" [(ngModel)]="c.issuerOrLink" placeholder="e.g. Amazon Web Services" />
                </div>
              </div>
              <div class="form-row-2">
                <div class="form-group">
                  <label>Year Obtained</label>
                  <input type="number" [(ngModel)]="c.year" placeholder="e.g. 2023" />
                </div>
              </div>
              <div class="form-group">
                <label>Description</label>
                <textarea rows="2" [(ngModel)]="c.description" placeholder="Brief details about the certificate scope or project outputs..."></textarea>
              </div>
            </div>
          </div>

          <!-- 6. Languages -->
          <div class="section-card">
            <div class="section-header-row">
              <h3 class="section-title">Languages</h3>
              <button type="button" class="btn-outline btn-sm" (click)="addLanguage()">
                <span class="material-symbols-outlined">add</span>
                <span>Add Language</span>
              </button>
            </div>
            <div class="empty-placeholder" *ngIf="bio.languages.length === 0">
              No language proficiencies added.
            </div>
            <div class="experience-editor-block" *ngFor="let l of bio.languages; let idx = index">
              <div class="block-header">
                <h4>Language Entry #{{ idx + 1 }}</h4>
                <button type="button" class="btn-remove" (click)="removeLanguage(idx)">Remove</button>
              </div>
              <div class="form-row-2">
                <div class="form-group">
                  <label>Language</label>
                  <input type="text" [(ngModel)]="l.language" placeholder="e.g. English, French" />
                </div>
                <div class="form-group">
                  <label>Proficiency</label>
                  <select [(ngModel)]="l.proficiency">
                    <option value="Native">Native / Bilingual</option>
                    <option value="Fluent">Fluent / Professional</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Beginner">Beginner</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- Sidebar Preview Pane -->
        <div class="preview-pane">
          <div class="sticky-preview">
            <h3 class="preview-header">Live CV Preview</h3>
            <div class="cv-card">
              <div class="cv-head">
                <div class="cv-initials">P</div>
                <div>
                  <h4 class="cv-name">My Profile</h4>
                  <p class="cv-headline">{{ bio.headline || 'Your Headline Here' }}</p>
                </div>
              </div>
              <p class="cv-summary">{{ bio.professionalSummary || 'Your Professional Summary Preview...' }}</p>
              
              <div class="cv-mini-sec" *ngIf="bio.workExperience.length > 0">
                <h5>Experience</h5>
                <div class="mini-item" *ngFor="let w of bio.workExperience">
                  <strong>{{ w.company }}</strong> - <span>{{ w.jobTitle }}</span>
                </div>
              </div>

              <div class="cv-mini-sec" *ngIf="bio.skills.length > 0">
                <h5>Skills</h5>
                <div class="mini-tags">
                  <span class="mini-tag" *ngFor="let s of bio.skills">{{ s }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bio-editor-container { display: flex; flex-direction: column; gap: 24px; padding: 12px; }
    .editor-header { display: flex; justify-content: space-between; align-items: center; }
    .page-title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
    .page-sub { font-size: 13px; color: #64748b; margin: 0; }

    .editor-grid {
      display: grid;
      grid-template-columns: 1fr 300px;
      gap: 24px;
      align-items: start;
    }

    .form-pane { display: flex; flex-direction: column; gap: 20px; }
    
    .section-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.01);
    }
    .section-title { margin: 0 0 16px; font-size: 14px; font-weight: 800; color: #0f172a; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    .section-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .section-header-row .section-title { margin: 0; border: none; padding: 0; }

    .form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
    .form-group label { font-size: 12px; font-weight: 700; color: #475569; }
    .form-group input, .form-group textarea, .form-group select {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 13px;
      color: #0f172a;
      outline: none;
      background: #ffffff;
      transition: all 0.2s;
    }
    .form-group input:focus, .form-group textarea:focus, .form-group select:focus { border-color: #0050e5; box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.1); }
    
    .form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

    /* Experience Editor Sub-Blocks */
    .experience-editor-block {
      background: #fafafb;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
      position: relative;
    }
    .block-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 6px; }
    .block-header h4 { margin: 0; font-size: 12.5px; color: #0050e5; }
    
    .btn-remove { background: none; border: none; color: #ef4444; font-size: 12px; font-weight: 700; cursor: pointer; }
    .btn-remove:hover { text-decoration: underline; }

    .empty-placeholder { text-align: center; padding: 24px; color: #94a3b8; font-size: 13px; font-style: italic; background: #fafafb; border: 1px dashed #e2e8f0; border-radius: 8px; }

    /* Skills inputs */
    .skills-input-row { display: flex; gap: 12px; margin-bottom: 12px; }
    .skills-input-row input { flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; font-size: 13px; outline: none; }
    .skills-tags-wrap { display: flex; flex-wrap: wrap; gap: 8px; }
    .skill-badge { background: rgba(0,80,229,0.06); border: 1px solid rgba(0,80,229,0.15); color: #0050e5; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 20px; display: inline-flex; align-items: center; gap: 6px; }
    .badge-remove { cursor: pointer; color: #ef4444; font-weight: 800; font-size: 10px; }

    /* Preview Sidebar */
    .sticky-preview { position: sticky; top: 20px; }
    .preview-header { font-size: 12px; font-weight: 800; color: #64748b; text-transform: uppercase; margin: 0 0 12px; }
    .cv-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.015); }
    .cv-head { display: flex; gap: 12px; align-items: center; margin-bottom: 12px; }
    .cv-initials { width: 36px; height: 36px; border-radius: 50%; background: #0050e5; color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 800; }
    .cv-name { font-size: 13.5px; font-weight: 800; color: #0f172a; margin: 0; }
    .cv-headline { font-size: 11px; color: #0050e5; margin: 2px 0 0; }
    .cv-summary { font-size: 12px; color: #64748b; line-height: 1.5; margin: 0 0 14px; }
    
    .cv-mini-sec h5 { font-size: 10.5px; font-weight: 800; color: #475569; margin: 0 0 6px; text-transform: uppercase; }
    .mini-item { font-size: 11px; color: #334155; margin-bottom: 4px; }
    .mini-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
    .mini-tag { background: #f1f5f9; color: #475569; font-size: 10px; padding: 2px 6px; border-radius: 4px; }

    /* Buttons styling */
    .btn-primary {
      background: linear-gradient(135deg, #0050e5, #1f6bff);
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 10px 18px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 12px rgba(0, 80, 229, 0.2);
    }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-outline {
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #334155;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-outline:hover { background: #f8fafc; }
    .btn-sm { padding: 6px 10px; font-size: 11.5px; }

    @media (max-width: 992px) {
      .editor-grid { grid-template-columns: 1fr; }
      .preview-pane { display: none; }
    }
  `]
})
export class BiographyEditComponent implements OnInit {
  bio: UserBiography = {
    headline: '',
    professionalSummary: '',
    workExperience: [],
    education: [],
    skills: [],
    certifications: [],
    languages: []
  };

  newSkill = '';
  saving = false;

  constructor(
    private bioService: BiographyService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadBiography();
  }

  loadBiography(): void {
    this.bioService.getBiography().subscribe({
      next: (res) => {
        if (res) {
          this.bio = {
            headline: res.headline || '',
            professionalSummary: res.professionalSummary || '',
            workExperience: res.workExperience || [],
            education: res.education || [],
            skills: res.skills || [],
            certifications: res.certifications || [],
            languages: res.languages || []
          };
        }
      },
      error: () => this.toast.error('Failed to load biography data.')
    });
  }

  saveBiography(): void {
    this.saving = true;
    this.bioService.updateBiography(this.bio).subscribe({
      next: () => {
        this.saving = false;
        this.toast.success('CV Biography saved successfully!');
      },
      error: () => {
        this.saving = false;
        this.toast.error('Failed to save CV Biography.');
      }
    });
  }

  // Work Experience Helpers
  addWorkExperience(): void {
    const item: WorkExperience = {
      company: '',
      jobTitle: '',
      startDate: '',
      endDate: '',
      description: ''
    };
    this.bio.workExperience.push(item);
  }

  removeWorkExperience(idx: number): void {
    this.bio.workExperience.splice(idx, 1);
  }

  // Education Helpers
  addEducation(): void {
    const item: Education = {
      institution: '',
      degree: '',
      fieldOfStudy: '',
      graduationYear: new Date().getFullYear(),
      description: ''
    };
    this.bio.education.push(item);
  }

  removeEducation(idx: number): void {
    this.bio.education.splice(idx, 1);
  }

  // Skills Helpers
  addSkill(): void {
    const skill = this.newSkill.trim();
    if (skill && !this.bio.skills.includes(skill)) {
      this.bio.skills.push(skill);
      this.newSkill = '';
    }
  }

  removeSkill(skill: string): void {
    this.bio.skills = this.bio.skills.filter(s => s !== skill);
  }

  // Certifications Helpers
  addCertification(): void {
    const item: CertificationProject = {
      title: '',
      issuerOrLink: '',
      year: new Date().getFullYear(),
      description: ''
    };
    this.bio.certifications.push(item);
  }

  removeCertification(idx: number): void {
    this.bio.certifications.splice(idx, 1);
  }

  // Languages Helpers
  addLanguage(): void {
    const item: LanguageSkill = {
      language: '',
      proficiency: 'Native'
    };
    this.bio.languages.push(item);
  }

  removeLanguage(idx: number): void {
    this.bio.languages.splice(idx, 1);
  }
}
