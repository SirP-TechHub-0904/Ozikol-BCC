import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml, Title } from '@angular/platform-browser';
import { CommitteesService } from '../../core/services/committees.service';
import { ApiService } from '../../core/services/api.service';
import { TemplateHydrationService } from '../admin/content/templates/services/template-hydration.service';
import { ContentHydrationService } from '../admin/content/templates/services/content-hydration.service';
import { HtmlAssemblerService, SectionTemplateUnit, CodeInjectionTag } from '../admin/content/templates/services/html-assembler.service';

/**
 * Public Committee & Sub-Group External Registration Portal
 * Routes: /join-committee, /join-committee/:tenantSlug, /join-committee/:tenantSlug/:groupSlug
 * Integrates directly with the Live CMS Studio Website Layout Architecture:
 * - Top: Live CMS Studio Navbar template from 'my-templates' (hydrated via ContentHydrationService & HtmlAssemblerService).
 * - Breadcrumb: Live CMS Studio Breadcrumb template from 'my-templates'.
 * - Body: Centered single registration card containing committee context and form fields (or standard 404 Signal Lost when uninstalled/not found).
 * - Bottom: Live CMS Studio Footer template from 'my-templates' (with enforced compliance credit).
 * - Scoped Styles: Dynamic injection of theme CSS and fonts synthesized via HtmlAssemblerService.
 */
@Component({
  selector: 'app-public-committee-register',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="pub-site-shell public-dynamic-site-wrapper">
      <!-- 1. FULL-WIDTH WEBSITE NAVBAR / HEADER (LIVE CMS ACTIVE TEMPLATE) -->
      <header class="dynamic-rendered-content pub-cms-header" *ngIf="safeHeaderHtml" [innerHTML]="safeHeaderHtml"></header>

      <!-- 2. LIVE CMS STUDIO BREADCRUMB TEMPLATE (ACTIVE SITES ONLY) -->
      <div class="dynamic-rendered-content pub-cms-breadcrumb" *ngIf="safeBreadcrumbHtml && !isNotFound" [innerHTML]="safeBreadcrumbHtml"></div>

      <!-- 3. MAIN WEBSITE BODY (404 SIGNAL LOST OR REGISTRATION FORM) -->
      <main class="dynamic-rendered-content pub-site-main">

        <!-- Loading State -->
        <div class="pub-card-state" *ngIf="loading">
          <span class="material-symbols-outlined spin">progress_activity</span>
          <p>Loading portal...</p>
        </div>

        <!-- 404 SIGNAL LOST STATE (WHEN MODULE UNINSTALLED, SUSPENDED, OR LINK NOT FOUND) -->
        <section class="oz-404-section" *ngIf="!loading && isNotFound">
          <div class="oz-404-wrapper">
            <!-- Status Badge -->
            <div class="oz-404-badge">
              <span class="oz-404-badge-dot"></span>
              <span class="oz-404-badge-text">ERROR 404 &bull; SIGNAL LOST</span>
            </div>

            <!-- Animated SVG Illustration: Floating Explorer & Planetary Beacon -->
            <div class="oz-404-graphic">
              <svg viewBox="0 0 500 340" fill="none" xmlns="http://www.w3.org/2000/svg" class="oz-404-svg" aria-label="Page Not Found Illustration">
                <defs>
                  <linearGradient id="ozGlobeGrad" x1="130" y1="100" x2="290" y2="260" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stop-color="#38bdf8"/>
                    <stop offset="50%" stop-color="#2563eb"/>
                    <stop offset="100%" stop-color="#1e40af"/>
                  </linearGradient>
                  <radialGradient id="ozGlobeHalo" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.35"/>
                    <stop offset="100%" stop-color="#38bdf8" stop-opacity="0"/>
                  </radialGradient>
                  <linearGradient id="ozVisorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#38bdf8"/>
                    <stop offset="100%" stop-color="#0284c7"/>
                  </linearGradient>
                  <linearGradient id="ozSuitGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#ffffff"/>
                    <stop offset="100%" stop-color="#e2e8f0"/>
                  </linearGradient>
                </defs>

                <!-- Distant Twinkling Stars -->
                <g class="oz-stars-group">
                  <polygon points="70,60 72,66 78,68 72,70 70,76 68,70 62,68 68,66" fill="#38bdf8" class="oz-star oz-anim-star-1"/>
                  <polygon points="430,75 432,79 436,80 432,81 430,85 428,81 424,80 428,79" fill="#818cf8" class="oz-star oz-anim-star-2"/>
                  <polygon points="100,240 101,244 105,245 101,246 100,250 99,246 95,245 99,244" fill="#60a5fa" class="oz-star oz-anim-star-3"/>
                  <circle cx="55" cy="160" r="2.5" fill="#cbd5e1" class="oz-star oz-anim-star-2"/>
                  <circle cx="445" cy="190" r="3" fill="#38bdf8" class="oz-star oz-anim-star-1"/>
                  <circle cx="150" cy="50" r="2" fill="#94a3b8" class="oz-star oz-anim-star-3"/>
                  <circle cx="365" cy="270" r="2.5" fill="#60a5fa" class="oz-star oz-anim-star-2"/>
                  <circle cx="270" cy="45" r="2" fill="#38bdf8" class="oz-star oz-anim-star-1"/>
                </g>

                <!-- Globe Ambient Glow -->
                <circle cx="210" cy="175" r="115" fill="url(#ozGlobeHalo)" class="oz-anim-pulse"/>

                <!-- Pulsing Radar Signal Waves -->
                <circle cx="210" cy="175" r="110" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="5 7" opacity="0.4" class="oz-anim-radar-1" fill="none"/>
                <circle cx="210" cy="175" r="135" stroke="#60a5fa" stroke-width="1" stroke-dasharray="3 5" opacity="0.25" class="oz-anim-radar-2" fill="none"/>

                <!-- Central Global Sphere -->
                <circle cx="210" cy="175" r="82" fill="url(#ozGlobeGrad)"/>

                <!-- Latitude Grid Lines -->
                <ellipse cx="210" cy="175" rx="82" ry="28" stroke="#bae6fd" stroke-width="1.5" stroke-opacity="0.55" fill="none"/>
                <ellipse cx="210" cy="175" rx="82" ry="58" stroke="#bae6fd" stroke-width="1.5" stroke-opacity="0.55" fill="none"/>

                <!-- Longitude Grid Lines -->
                <ellipse cx="210" cy="175" rx="40" ry="82" stroke="#bae6fd" stroke-width="1.5" stroke-opacity="0.55" fill="none"/>
                <line x1="210" y1="93" x2="210" y2="257" stroke="#bae6fd" stroke-width="1.5" stroke-opacity="0.55"/>

                <!-- Angled Planetary Orbital Track & Satellite -->
                <g transform="rotate(-18 210 175)">
                  <ellipse cx="210" cy="175" rx="120" ry="42" stroke="#38bdf8" stroke-width="1.75" stroke-dasharray="6 6" fill="none" opacity="0.6"/>
                  <!-- Orbiting Beacon / Satellite -->
                  <g transform="translate(328, 175)">
                    <circle cx="0" cy="0" r="5" fill="#38bdf8"/>
                    <circle cx="0" cy="0" r="8" stroke="#38bdf8" stroke-width="1.5" opacity="0.5" class="oz-anim-pulse"/>
                  </g>
                </g>

                <!-- Floating Astronaut / Navigator -->
                <g class="oz-anim-man">
                  <rect x="300" y="112" width="28" height="64" rx="8" fill="#64748b"/>
                  <rect x="302" y="118" width="10" height="18" rx="3" fill="#94a3b8"/>
                  <path d="M312 128 C298 138 298 162 312 172" stroke="#38bdf8" stroke-width="3" fill="none" stroke-linecap="round"/>

                  <rect x="318" y="122" width="48" height="62" rx="16" fill="url(#ozSuitGrad)" stroke="#cbd5e1" stroke-width="2"/>
                  <rect x="330" y="136" width="24" height="18" rx="4" fill="#0f172a"/>
                  <circle cx="336" cy="145" r="2" fill="#ef4444"/>
                  <circle cx="342" cy="145" r="2" fill="#10b981"/>
                  <circle cx="348" cy="145" r="2" fill="#38bdf8"/>

                  <path d="M318 135 L288 146 L274 140" stroke="#f1f5f9" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
                  <rect x="260" y="130" width="16" height="22" rx="4" fill="#1e293b" transform="rotate(-12 260 130)"/>
                  <rect x="263" y="133" width="11" height="13" rx="2" fill="#38bdf8" transform="rotate(-12 260 130)"/>
                  <path d="M251 134 C247 137 247 143 251 146" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" fill="none" class="oz-anim-pulse"/>

                  <rect x="332" y="176" width="16" height="42" rx="8" fill="url(#ozSuitGrad)" stroke="#cbd5e1" stroke-width="2"/>
                  <rect x="328" y="212" width="22" height="12" rx="4" fill="#334155"/>
                  <rect x="350" y="176" width="16" height="40" rx="8" fill="url(#ozSuitGrad)" stroke="#cbd5e1" stroke-width="2" transform="rotate(-10 350 176)"/>
                  <rect x="352" y="210" width="22" height="12" rx="4" fill="#334155" transform="rotate(-10 352 210)"/>

                  <circle cx="342" cy="100" r="26" fill="url(#ozSuitGrad)" stroke="#cbd5e1" stroke-width="2"/>
                  <rect x="324" y="88" width="36" height="22" rx="10" fill="url(#ozVisorGrad)" stroke="#0284c7" stroke-width="1.5"/>
                  <ellipse cx="334" cy="94" rx="6" ry="3" fill="#ffffff" opacity="0.6"/>
                </g>
              </svg>
            </div>

            <!-- Message & Guidance -->
            <h1 class="oz-404-title">Coordinates Uncharted</h1>
            <p class="oz-404-description">The page or module you are attempting to access does not exist, is not active on this workspace, or has been relocated within the workspace grid.</p>

            <!-- Action Buttons -->
            <div class="oz-404-actions">
              <a href="/" class="oz-404-btn oz-404-btn-primary">
                <span class="material-symbols-outlined">home</span>
                <span>Return to Home</span>
              </a>
              <a href="javascript:history.back()" class="oz-404-btn oz-404-btn-secondary">
                <span class="material-symbols-outlined">arrow_back</span>
                <span>Go Back</span>
              </a>
            </div>

            <!-- Quick Help Link -->
            <div class="oz-404-footer-hint">
              <span>Need navigation assistance?</span>
              <a href="/contact" class="oz-404-link">Contact Support &rarr;</a>
            </div>
          </div>
        </section>

        <!-- ACTIVE REGISTRATION FORM (WHEN MODULE IS ACTIVE & COMMITTEE FOUND) -->
        <div class="pub-main-centered-wrap" *ngIf="!loading && !isNotFound">

          <!-- Success State -->
          <div class="pub-card-state success" *ngIf="submittedSuccess">
            <div class="pub-success-icon-wrap">
              <span class="material-symbols-outlined">verified</span>
            </div>
            <h2>{{ submissionStatus === 'Approved' ? 'You Are Enrolled!' : 'Application Submitted' }}</h2>
            <p>{{ submissionMessage }}</p>
            <div class="pub-success-actions">
              <a *ngIf="signedInMember" routerLink="/committees/workspace/my" class="pub-btn-primary">
                Open My {{ aliases.aliasPlural }}
              </a>
              <button *ngIf="!signedInMember && directoryMode" type="button" class="pub-btn-secondary" (click)="resetForAnother()">
                Register for Another {{ aliases.aliasSingular }}
              </button>
              <a *ngIf="!signedInMember && !directoryMode" routerLink="/" class="pub-btn-secondary">
                Return to Website
              </a>
            </div>
          </div>

          <!-- Active Centered Registration Card -->
          <div class="pub-card-form" *ngIf="!submittedSuccess && activeCommittee">

            <!-- Directory Selector Dropdown if multiple committees are open -->
            <div class="pub-dir-select-bar" *ngIf="directoryMode && openCommittees.length > 1">
              <label>Select {{ aliases.aliasSingular }} / {{ aliases.subGroupAliasSingular }} to Join:</label>
              <select [ngModel]="activeCommittee?.id" (ngModelChange)="onDirectoryChange($event)" class="pub-dir-dropdown">
                <option *ngFor="let c of openCommittees" [value]="c.id">
                  {{ c.name }} ({{ c.parentCommitteeName ? ('Under ' + c.parentCommitteeName) : (c.categoryTag || aliases.aliasSingular) }})
                </option>
              </select>
            </div>

            <!-- Card Header: Badge, Title, Description, Meeting Schedule (Zero Member Count!) -->
            <div class="pub-card-header">
              <div class="pub-badge-schedule-row">
                <span class="pub-category-badge">{{ activeCommittee.parentCommitteeId ? aliases.subGroupAliasSingular : aliases.aliasSingular }}</span>
                <span class="pub-schedule-badge" *ngIf="activeCommittee.meetingSchedule">
                  <span class="material-symbols-outlined">event_repeat</span>
                  <span>{{ activeCommittee.meetingSchedule }}</span>
                </span>
              </div>
              <h1 class="pub-form-title">{{ activeCommittee.name }}</h1>
              <p class="pub-form-desc">{{ activeCommittee.description || activeCommittee.missionStatement || 'Complete the registration form below to join.' }}</p>
            </div>

            <!-- Form Validation Alert -->
            <div class="pub-alert error" *ngIf="formError">
              <span class="material-symbols-outlined">error</span>
              <span>{{ formError }}</span>
            </div>

            <!-- Form Body Fields -->
            <form (ngSubmit)="submitRegistration()" class="pub-form-body">

              <!-- Personal Identity Grid (First Name & Last Name) -->
              <div class="pub-form-row two-cols">
                <div class="pub-field">
                  <label>First Name <span class="req">*</span></label>
                  <input
                    type="text"
                    [(ngModel)]="firstName"
                    name="firstName"
                    placeholder="e.g. First Name"
                    required
                    autocomplete="given-name"
                  />
                </div>
                <div class="pub-field">
                  <label>Last Name <span class="req">*</span></label>
                  <input
                    type="text"
                    [(ngModel)]="lastName"
                    name="lastName"
                    placeholder="e.g. Last Name"
                    required
                    autocomplete="family-name"
                  />
                </div>
              </div>

              <!-- Contact Grid (Email & Phone Number) -->
              <div class="pub-form-row two-cols">
                <div class="pub-field">
                  <label>Email Address <span class="req">*</span></label>
                  <input
                    type="email"
                    [(ngModel)]="email"
                    name="email"
                    placeholder="name@company.com"
                    required
                    autocomplete="email"
                  />
                </div>
                <div class="pub-field">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    [(ngModel)]="phoneNumber"
                    name="phoneNumber"
                    placeholder="e.g. +0 (000) 000-0000"
                    autocomplete="tel"
                  />
                </div>
              </div>

              <!-- Extra-Info Supplemental Form Section (if configured on committee or global default) -->
              <div class="pub-extra-form-section" *ngIf="activeCommittee.extraInfoForm?.fields?.length">
                <div class="pub-section-divider">
                  <h4>{{ activeCommittee.extraInfoForm.title || 'Supplemental Information' }}</h4>
                  <p *ngIf="activeCommittee.extraInfoForm.description">{{ activeCommittee.extraInfoForm.description }}</p>
                </div>

                <div class="pub-field" *ngFor="let f of activeCommittee.extraInfoForm.fields">
                  <label>
                    {{ f.label }}
                    <span class="req" *ngIf="f.isRequired">*</span>
                  </label>

                  <!-- Single Line Text -->
                  <input
                    *ngIf="f.fieldType === 'text'"
                    type="text"
                    [name]="f.fieldName"
                    [(ngModel)]="extraAnswers[f.fieldName]"
                    [placeholder]="f.placeholder || 'e.g. Your response'"
                    [required]="f.isRequired"
                  />

                  <!-- Multi-line Textarea -->
                  <textarea
                    *ngIf="f.fieldType === 'textarea'"
                    [name]="f.fieldName"
                    rows="3"
                    [(ngModel)]="extraAnswers[f.fieldName]"
                    [placeholder]="f.placeholder || 'e.g. Provide details here'"
                    [required]="f.isRequired"
                  ></textarea>

                  <!-- Numeric Input -->
                  <input
                    *ngIf="f.fieldType === 'number'"
                    type="number"
                    [name]="f.fieldName"
                    [(ngModel)]="extraAnswers[f.fieldName]"
                    placeholder="e.g. 0"
                    [required]="f.isRequired"
                  />

                  <!-- Date Picker -->
                  <input
                    *ngIf="f.fieldType === 'date'"
                    type="date"
                    [name]="f.fieldName"
                    [(ngModel)]="extraAnswers[f.fieldName]"
                    [required]="f.isRequired"
                  />

                  <!-- Select Dropdown -->
                  <select
                    *ngIf="f.fieldType === 'select'"
                    [name]="f.fieldName"
                    [(ngModel)]="extraAnswers[f.fieldName]"
                    [required]="f.isRequired"
                  >
                    <option value="">-- Select an option --</option>
                    <option *ngFor="let opt of f.options" [value]="opt">{{ opt }}</option>
                  </select>

                  <!-- Multi-select Checkboxes -->
                  <div class="pub-checkbox-group" *ngIf="f.fieldType === 'multiselect'">
                    <label class="pub-check-item" *ngFor="let opt of f.options">
                      <input
                        type="checkbox"
                        [checked]="hasMulti(f.fieldName, opt)"
                        (change)="toggleMulti(f.fieldName, opt, $event)"
                      />
                      <span>{{ opt }}</span>
                    </label>
                  </div>

                  <!-- Radio Buttons -->
                  <div class="pub-radio-group" *ngIf="f.fieldType === 'radio'">
                    <label class="pub-radio-item" *ngFor="let opt of f.options">
                      <input
                        type="radio"
                        [name]="f.fieldName"
                        [value]="opt"
                        [(ngModel)]="extraAnswers[f.fieldName]"
                        [required]="f.isRequired"
                      />
                      <span>{{ opt }}</span>
                    </label>
                  </div>

                  <!-- Single Boolean Toggle -->
                  <div class="pub-boolean-group" *ngIf="f.fieldType === 'boolean'">
                    <label class="pub-check-item">
                      <input
                        type="checkbox"
                        [name]="f.fieldName"
                        [(ngModel)]="extraAnswers[f.fieldName]"
                        [required]="f.isRequired"
                      />
                      <span>Yes / I confirm</span>
                    </label>
                  </div>

                  <!-- File / Document Upload -->
                  <div class="pub-file-wrap" *ngIf="f.fieldType === 'file'">
                    <input
                      type="file"
                      [id]="'file-' + f.fieldName"
                      (change)="onFileUpload($event, f.fieldName)"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                      style="display: none;"
                    />
                    <button
                      type="button"
                      class="pub-btn-upload"
                      (click)="triggerFileInput('file-' + f.fieldName)"
                      [disabled]="uploadingFile"
                    >
                      <span class="material-symbols-outlined">upload_file</span>
                      <span>{{ extraAnswers[f.fieldName] ? 'Replace Attached File' : (f.placeholder || 'Upload Document (PDF, Word, Image)') }}</span>
                    </button>
                    <div class="pub-uploaded-preview" *ngIf="extraAnswers[f.fieldName]">
                      <span class="material-symbols-outlined">attachment</span>
                      <a [href]="extraAnswers[f.fieldName]" target="_blank" rel="noopener">View Uploaded Document</a>
                    </div>
                  </div>

                  <small class="pub-hint" *ngIf="f.helpText">{{ f.helpText }}</small>
                </div>
              </div>

              <!-- Submit Action Button -->
              <div class="pub-form-actions">
                <button type="submit" class="pub-btn-primary" [disabled]="submitting || uploadingFile">
                  <span class="material-symbols-outlined" *ngIf="!submitting">how_to_reg</span>
                  <span class="material-symbols-outlined spin" *ngIf="submitting">progress_activity</span>
                  <span>{{ submitting ? 'Submitting Registration...' : ('Complete ' + aliases.aliasSingular + ' Registration') }}</span>
                </button>
              </div>

              <!-- Footer CTA to Sign In if already a member -->
              <div class="pub-form-footer">
                <span>Already a member of this workspace?</span>
                <a routerLink="/login">Sign in to your member portal</a>
              </div>
            </form>
          </div>
        </div>
      </main>

      <!-- 4. FULL-WIDTH WEBSITE FOOTER (LIVE CMS ACTIVE TEMPLATE) -->
      <footer class="dynamic-rendered-content pub-cms-footer" *ngIf="safeFooterHtml" [innerHTML]="safeFooterHtml"></footer>
    </div>
  `,
  styles: [`
    .pub-site-shell {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: #f8fafc;
      color: #0f172a;
      font-family: inherit;
    }
    .pub-cms-header, .pub-cms-breadcrumb, .pub-cms-footer {
      width: 100%;
    }
    .pub-site-main {
      flex: 1 0 auto;
      display: flex;
      flex-direction: column;
      width: 100%;
    }
    .pub-main-centered-wrap {
      max-width: 680px;
      width: 100%;
      margin: 40px auto 60px auto;
      padding: 0 20px;
      box-sizing: border-box;
    }
    .pub-card-form {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 36px 32px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
    }
    .pub-dir-select-bar {
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 1px dashed #e2e8f0;
    }
    .pub-dir-select-bar label {
      display: block;
      font-size: 13px;
      font-weight: 700;
      color: #475569;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .pub-dir-dropdown {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 15px;
      background: #ffffff;
      color: #0f172a;
      outline: none;
      transition: border-color 0.15s ease;
    }
    .pub-dir-dropdown:focus {
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.12);
    }
    .pub-card-header {
      margin-bottom: 28px;
    }
    .pub-badge-schedule-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }
    .pub-category-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 800;
      color: #0050e5;
      background: rgba(0, 80, 229, 0.08);
      padding: 4px 10px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .pub-schedule-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      font-weight: 600;
      color: #475569;
      background: #f1f5f9;
      padding: 4px 10px;
      border-radius: 6px;
    }
    .pub-schedule-badge .material-symbols-outlined {
      font-size: 15px;
      color: #0050e5;
    }
    .pub-form-title {
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 8px 0;
      line-height: 1.25;
    }
    .pub-form-desc {
      font-size: 14px;
      color: #64748b;
      margin: 0;
      line-height: 1.6;
    }
    .pub-alert.error {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      color: #991b1b;
      font-size: 13px;
      margin-bottom: 20px;
    }
    .pub-form-body {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .pub-form-row.two-cols {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    @media (max-width: 600px) {
      .pub-form-row.two-cols {
        grid-template-columns: 1fr;
      }
    }
    .pub-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .pub-field label {
      font-size: 13px;
      font-weight: 700;
      color: #334155;
    }
    .pub-field label .req {
      color: #ef4444;
      margin-left: 2px;
    }
    .pub-field input[type="text"],
    .pub-field input[type="email"],
    .pub-field input[type="tel"],
    .pub-field input[type="number"],
    .pub-field input[type="date"],
    .pub-field select,
    .pub-field textarea {
      padding: 11px 14px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 14px;
      color: #0f172a;
      background: #ffffff;
      outline: none;
      transition: all 0.15s ease;
      font-family: inherit;
      box-sizing: border-box;
      width: 100%;
    }
    .pub-field input:focus,
    .pub-field select:focus,
    .pub-field textarea:focus {
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.12);
    }
    .pub-extra-form-section {
      margin-top: 10px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .pub-section-divider h4 {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 4px 0;
    }
    .pub-section-divider p {
      font-size: 13px;
      color: #64748b;
      margin: 0;
    }
    .pub-checkbox-group, .pub-radio-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 4px;
    }
    .pub-check-item, .pub-radio-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #334155;
      cursor: pointer;
    }
    .pub-btn-upload {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      border: 1px dashed #cbd5e1;
      background: #f8fafc;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .pub-btn-upload:hover {
      background: #f1f5f9;
      border-color: #0050e5;
      color: #0050e5;
    }
    .pub-uploaded-preview {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #0050e5;
      margin-top: 4px;
    }
    .pub-uploaded-preview a {
      color: #0050e5;
      font-weight: 600;
      text-decoration: underline;
    }
    .pub-hint {
      font-size: 12px;
      color: #94a3b8;
    }
    .pub-form-actions {
      margin-top: 14px;
    }
    .pub-btn-primary {
      width: 100%;
      padding: 13px 24px;
      background: #0050e5;
      color: #ffffff;
      border: none;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(0, 80, 229, 0.25);
    }
    .pub-btn-primary:hover:not(:disabled) {
      background: #003ebd;
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(0, 80, 229, 0.35);
    }
    .pub-btn-primary:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }
    .pub-form-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 13px;
      color: #64748b;
      margin-top: 14px;
      text-align: center;
    }
    .pub-form-footer a {
      color: #0050e5;
      font-weight: 700;
      text-decoration: none;
    }
    .pub-form-footer a:hover {
      text-decoration: underline;
    }
    .pub-card-state {
      text-align: center;
      padding: 60px 20px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
    }
    .pub-card-state.success {
      padding: 48px 24px;
    }
    .pub-success-icon-wrap {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: #dcfce7;
      color: #16a34a;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 18px auto;
    }
    .pub-success-icon-wrap .material-symbols-outlined {
      font-size: 36px;
    }
    .pub-card-state h2 {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 10px 0;
    }
    .pub-card-state p {
      font-size: 15px;
      color: #64748b;
      margin: 0 auto 24px auto;
      max-width: 460px;
      line-height: 1.6;
    }
    .pub-success-actions {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .pub-btn-secondary {
      padding: 11px 20px;
      background: #ffffff;
      color: #334155;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s ease;
    }
    .pub-btn-secondary:hover {
      background: #f8fafc;
      border-color: #94a3b8;
    }
    .spin {
      animation: pubSpin 1s linear infinite;
    }
    @keyframes pubSpin {
      100% { transform: rotate(360deg); }
    }

    /* ========================================================= */
    /* STANDARDIZED 404 SIGNAL LOST SECTION (LANDING COMPONENT) */
    /* ========================================================= */
    .oz-404-section {
      min-height: calc(80vh - 120px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 60px 24px;
      background: radial-gradient(circle at 50% 25%, rgba(56, 189, 248, 0.08) 0%, rgba(255, 255, 255, 0) 70%), #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      box-sizing: border-box;
      width: 100%;
    }
    .oz-404-wrapper {
      max-width: 600px;
      width: 100%;
      margin: 0 auto;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .oz-404-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      border-radius: 9999px;
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.22);
      margin-bottom: 20px;
    }
    .oz-404-badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: #ef4444;
      box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
      animation: ozDotPulse 1.8s infinite ease-in-out;
    }
    .oz-404-badge-text {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: #dc2626;
      text-transform: uppercase;
    }
    .oz-404-graphic {
      width: 100%;
      max-width: 440px;
      margin: 0 auto 24px auto;
      position: relative;
    }
    .oz-404-svg {
      width: 100%;
      height: auto;
      display: block;
      overflow: visible;
    }
    .oz-404-title {
      font-size: 32px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 12px 0;
      line-height: 1.25;
      letter-spacing: -0.02em;
    }
    @media (min-width: 640px) {
      .oz-404-title {
        font-size: 40px;
      }
    }
    .oz-404-description {
      font-size: 16px;
      color: #64748b;
      margin: 0 0 32px 0;
      line-height: 1.6;
      max-width: 480px;
    }
    .oz-404-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 14px;
      margin-bottom: 28px;
    }
    .oz-404-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 26px;
      font-size: 15px;
      font-weight: 600;
      border-radius: 10px;
      text-decoration: none;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      cursor: pointer;
      box-sizing: border-box;
    }
    .oz-404-btn-primary {
      background: linear-gradient(135deg, #0050e5 0%, #003ebd 100%);
      color: #ffffff !important;
      border: 1px solid transparent;
      box-shadow: 0 4px 14px rgba(0, 80, 229, 0.3);
    }
    .oz-404-btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 22px rgba(0, 80, 229, 0.42);
      background: linear-gradient(135deg, #003ebd 0%, #002d8f 100%);
      color: #ffffff !important;
    }
    .oz-404-btn-secondary {
      background: #ffffff;
      color: #334155 !important;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    .oz-404-btn-secondary:hover {
      transform: translateY(-2px);
      background: #f8fafc;
      border-color: #cbd5e1;
      color: #0f172a !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }
    .oz-404-footer-hint {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 14px;
      color: #94a3b8;
    }
    .oz-404-link {
      color: #0050e5;
      font-weight: 600;
      text-decoration: none;
      transition: color 0.15s ease;
    }
    .oz-404-link:hover {
      color: #003ebd;
      text-decoration: underline;
    }
    .oz-anim-man {
      animation: ozFloat 5s ease-in-out infinite;
      transform-origin: 340px 170px;
    }
    .oz-anim-pulse {
      animation: ozPulse 3s ease-in-out infinite;
      transform-origin: 210px 175px;
    }
    .oz-anim-radar-1 {
      animation: ozRadar 3.5s ease-out infinite;
      transform-origin: 210px 175px;
    }
    .oz-anim-radar-2 {
      animation: ozRadar 3.5s ease-out infinite 1.2s;
      transform-origin: 210px 175px;
    }
    .oz-anim-star-1 {
      animation: ozTwinkle 2.5s ease-in-out infinite;
    }
    .oz-anim-star-2 {
      animation: ozTwinkle 3.2s ease-in-out infinite 0.8s;
    }
    .oz-anim-star-3 {
      animation: ozTwinkle 2.8s ease-in-out infinite 1.5s;
    }
    @keyframes ozFloat {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-12px) rotate(2deg); }
    }
    @keyframes ozPulse {
      0%, 100% { transform: scale(0.96); opacity: 0.25; }
      50% { transform: scale(1.05); opacity: 0.55; }
    }
    @keyframes ozRadar {
      0% { transform: scale(0.85); opacity: 0.8; }
      100% { transform: scale(1.25); opacity: 0; }
    }
    @keyframes ozTwinkle {
      0%, 100% { opacity: 0.25; transform: scale(0.8); }
      50% { opacity: 1; transform: scale(1.2); }
    }
    @keyframes ozDotPulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.3); opacity: 0.6; }
    }
  `]
})
export class PublicCommitteeRegisterComponent implements OnInit, OnDestroy {
  tenantSlug = '';
  groupSlug = '';
  inviteToken = '';

  loading = true;
  isNotFound = false;
  loadError = '';
  directoryMode = true;
  currentYear = new Date().getFullYear();

  brand: any = null;
  brandInfo: any = null;
  brandName = 'Organization Workspace';
  brandLogoUrl = '';

  aliases: any = {
    aliasSingular: 'Committee',
    aliasPlural: 'Committees',
    subGroupAliasSingular: 'Sub-Group',
    subGroupAliasPlural: 'Sub-Groups'
  };
  signedInMember: any = null;
  openCommittees: any[] = [];
  activeCommittee: any = null;

  // Live CMS Studio Rendered Layout Units (from 'my-templates')
  safeHeaderHtml: SafeHtml | null = null;
  safeBreadcrumbHtml: SafeHtml | null = null;
  safeFooterHtml: SafeHtml | null = null;
  private rawActiveTemplates: any[] = [];
  private publishedPages: any[] = [];
  private navigationCategories: any[] = [];
  private rawCodeInjections: CodeInjectionTag[] = [];

  firstName = '';
  lastName = '';
  email = '';
  phoneNumber = '';
  extraAnswers: Record<string, any> = {};
  attachmentUrls: string[] = [];

  uploadingFile = false;
  submitting = false;
  formError = '';
  submittedSuccess = false;
  submissionStatus = '';
  submissionMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private committeesService: CommitteesService,
    private apiService: ApiService,
    private templateHydration: TemplateHydrationService,
    private contentHydration: ContentHydrationService,
    private htmlAssembler: HtmlAssemblerService,
    private sanitizer: DomSanitizer,
    private titleService: Title,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.tenantSlug = this.route.snapshot.paramMap.get('tenantSlug') || '';
    this.groupSlug = this.route.snapshot.paramMap.get('groupSlug') || '';
    this.inviteToken = this.route.snapshot.queryParamMap.get('token') || '';

    // 1. Fetch live CMS runtime theme data concurrently
    this.loadSiteThemeData();

    // 2. Fetch public registration data
    if (this.groupSlug) {
      this.directoryMode = false;
      this.loadSingleGroup();
    } else {
      this.directoryMode = true;
      this.loadDirectory();
    }
  }

  ngOnDestroy(): void {
    document.getElementById('tenant-dynamic-theme-styles')?.remove();
  }

  /**
   * Intercepts navigation clicks inside hydrated CMS HTML templates
   * to ensure single-page client routing via Angular Router.
   */
  @HostListener('click', ['$event'])
  onGlobalClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    if (!target) return;

    const anchor = target.closest('a') as HTMLAnchorElement;
    if (anchor && !anchor.classList.contains('dropdown-toggle') && !anchor.classList.contains('oz-dropdown-toggle')) {
      const isThemeToggle = anchor.getAttribute('data-bs-toggle') !== null ||
                            anchor.getAttribute('data-toggle') !== null ||
                            anchor.hasAttribute('data-bs-target') ||
                            anchor.hasAttribute('data-target') ||
                            anchor.classList.contains('toggle-btn') ||
                            anchor.classList.contains('menu-toggle');

      const href = (anchor.getAttribute('href') || '').trim();
      if (isThemeToggle || href === '#' || href === '' || href.startsWith('javascript:')) {
        return;
      }

      if (href && !href.startsWith('http') && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('javascript:')) {
        if (href.startsWith('#')) {
          e.preventDefault();
          const element = document.querySelector(href);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
          return;
        }

        e.preventDefault();
        document.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show'));
        this.router.navigateByUrl(href);
      }
    }
  }

  /**
   * Fetches UI settings, active templates, published pages, categories, and code injections
   * from the live CMS delivery API.
   */
  private loadSiteThemeData(): void {
    Promise.all([
      this.fetchBrandSettings(),
      this.fetchActiveTemplates(),
      this.fetchPublishedPages(),
      this.fetchCategories(),
      this.fetchCodeInjections()
    ]).then(() => {
      this.assembleAndFinalizeLayout(this.isNotFound);
    }).catch(() => {
      this.assembleAndFinalizeLayout(this.isNotFound);
    });
  }

  private fetchBrandSettings(): Promise<void> {
    return new Promise((resolve) => {
      this.apiService.get('WebsiteContentApi/ui-settings').subscribe({
        next: (uiRes: any) => {
          if (uiRes?.data) {
            const data = uiRes.data;
            this.brandInfo = data;
            this.brandName = data.brandName || data.companyName || data.siteTitle || this.brandName;
            this.brandLogoUrl = data.logoUrl || data.companyLogoUrl || data.whiteLogoUrl || this.brandLogoUrl;
          }
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  private fetchActiveTemplates(): Promise<void> {
    return new Promise((resolve) => {
      this.apiService.get('WebsiteContentApi/theme/active-templates').subscribe({
        next: (res: any) => {
          this.rawActiveTemplates = res?.data || [];
          resolve();
        },
        error: () => {
          this.apiService.get('ContentApi/templates/installed').subscribe({
            next: (adminRes: any) => {
              const all = adminRes?.data || [];
              this.rawActiveTemplates = all.filter((t: any) => t.isActive);
              resolve();
            },
            error: () => resolve()
          });
        }
      });
    });
  }

  private fetchPublishedPages(): Promise<void> {
    return new Promise((resolve) => {
      this.apiService.get('WebsiteContentApi/pages').subscribe({
        next: (res: any) => {
          this.publishedPages = res?.data || [];
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  private fetchCategories(): Promise<void> {
    return new Promise((resolve) => {
      this.apiService.get('WebsiteContentApi/categories').subscribe({
        next: (res: any) => {
          this.navigationCategories = res?.data || [];
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  private fetchCodeInjections(): Promise<void> {
    return new Promise((resolve) => {
      this.apiService.get('WebsiteContentApi/code-injections').subscribe({
        next: (res: any) => {
          const list: CodeInjectionTag[] = [];
          if (res?.data) {
            const data = res.data;
            (data.head || []).forEach((t: any) => list.push({ ...t, zone: 'head', isActive: t.isActive !== false }));
            (data.bodyOpen || []).forEach((t: any) => list.push({ ...t, zone: 'body_open', isActive: t.isActive !== false }));
            (data.footer || []).forEach((t: any) => list.push({ ...t, zone: 'footer', isActive: t.isActive !== false }));
          }
          this.rawCodeInjections = list;
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  /**
   * Synthesizes and compiles the full CMS layout bundle using HtmlAssemblerService,
   * injecting scoped styles into document head and updating title/breadcrumbs.
   * If is404 is true, breadcrumbs are omitted and the standard 404 Signal Lost body is engaged.
   */
  private assembleAndFinalizeLayout(is404: boolean): void {
    if (!this.rawActiveTemplates || this.rawActiveTemplates.length === 0) return;

    const brandName = this.brandName || this.brand?.brandName || 'Organization Workspace';
    const committeeName = this.activeCommittee?.name || 'Registration';

    // 1. Locate menu, breadcrumb, footer templates
    const menuTpl = this.rawActiveTemplates.find((t: any) => (t.category || t.categoryKey || '').toLowerCase() === 'menu');
    const breadcrumbTpl = this.rawActiveTemplates.find((t: any) => (t.category || t.categoryKey || '').toLowerCase() === 'breadcrumb');
    const footerTpl = this.rawActiveTemplates.find((t: any) => (t.category || t.categoryKey || '').toLowerCase() === 'footer');

    // 2. Hydrate Navigation Header using standard live hydrator
    let headerSection: SectionTemplateUnit | undefined;
    if (menuTpl?.htmlTemplate) {
      const hydratedNav = this.hydrateMenu(menuTpl.htmlTemplate);
      this.safeHeaderHtml = this.sanitizer.bypassSecurityTrustHtml(hydratedNav);
      headerSection = {
        id: menuTpl.id,
        name: menuTpl.name,
        category: 'menu',
        html: hydratedNav,
        css: menuTpl.cssStyles,
        js: menuTpl.jsScript
      };
    }

    // 3. Hydrate Breadcrumb Banner (strictly for active found groups)
    let breadcrumbSection: SectionTemplateUnit | undefined;
    if (!is404 && breadcrumbTpl?.htmlTemplate) {
      const breadcrumbContext = this.buildBreadcrumbContext();
      const hydratedBreadcrumb = this.contentHydration.hydrate(breadcrumbTpl.htmlTemplate, breadcrumbContext, 'breadcrumb');
      this.safeBreadcrumbHtml = this.sanitizer.bypassSecurityTrustHtml(hydratedBreadcrumb);
      breadcrumbSection = {
        id: breadcrumbTpl.id,
        name: breadcrumbTpl.name,
        category: 'breadcrumb',
        html: hydratedBreadcrumb,
        css: breadcrumbTpl.cssStyles,
        js: breadcrumbTpl.jsScript
      };
    } else {
      this.safeBreadcrumbHtml = null;
    }

    // 4. Hydrate Footer using standard live hydrator
    let footerSection: SectionTemplateUnit | undefined;
    if (footerTpl?.htmlTemplate) {
      const finalFooter = this.hydrateFooter(footerTpl.htmlTemplate);
      this.safeFooterHtml = this.sanitizer.bypassSecurityTrustHtml(finalFooter);
      footerSection = {
        id: footerTpl.id,
        name: footerTpl.name,
        category: 'footer',
        html: finalFooter,
        css: footerTpl.cssStyles,
        js: footerTpl.jsScript
      };
    }

    // 5. Delegate full page synthesis to HtmlAssemblerService
    const pageBundle = this.htmlAssembler.assemblePageBundle({
      pageTitle: is404 ? `Page Not Found | ${brandName}` : `${committeeName} | ${brandName}`,
      pageSlug: is404 ? '404' : 'join-committee',
      metaDescription: is404 ? 'Page Not Found' : (this.activeCommittee?.description || this.brandInfo?.companyDescription),
      faviconUrl: this.brandInfo?.faviconUrl,
      codeInjections: this.rawCodeInjections,
      headerSection,
      breadcrumbSection,
      footerSection
    });

    // 6. Inject Scoped Theme CSS into head
    let styleTag = document.getElementById('tenant-dynamic-theme-styles') as HTMLStyleElement;
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'tenant-dynamic-theme-styles';
      document.head.appendChild(styleTag);
    }
    const cleanStyles = (pageBundle.combinedStyles || '').replace(/<\/?style[^>]*>/gi, '').trim();
    styleTag.textContent = cleanStyles;

    this.titleService.setTitle(is404 ? `Page Not Found | ${brandName}` : `${committeeName} | ${brandName}`);
    this.cdr.detectChanges();
  }

  /**
   * Canonical menu hydrator replicating LandingComponent's full token resolution.
   */
  private hydrateMenu(rawHtml: string): string {
    const isLoginActive = this.brandInfo?.activateLogin !== false;
    const isLoginInMenu = this.brandInfo?.activateLoginInMenu !== false;
    const authed = !!this.signedInMember || !!localStorage.getItem('token') || !!sessionStorage.getItem('token');
    const isAdmin = authed && (localStorage.getItem('user_role')?.includes('Admin') || this.signedInMember?.role === 'Admin');

    const loginText = !authed 
      ? (this.brandInfo?.loginButtonText || 'Sign In') 
      : (isAdmin ? 'Console' : 'My Workspace');
    const loginUrl = !authed 
      ? '/login' 
      : (isAdmin ? '/billing/features' : '/committees/workspace/my');

    const normalizeZone = (val: any): string => {
      if (!val) return 'first';
      const s = String(val).toLowerCase();
      if (s.includes('mid') || s === '2') return 'middle';
      if (s.includes('last') || s === '3' || s.includes('right')) return 'last';
      if (s.includes('top') || s === '4') return 'top';
      return 'first';
    };

    const dropdownItems: any[] = [];
    const usedUrls = new Set<string>();

    (this.navigationCategories || [])
      .filter((c: any) => c.publish !== false && c.Publish !== false && c.showInMenu !== false && c.ShowInMenu !== false)
      .forEach((c: any) => {
        const catTitle = c.title || c.categoryName || c.name || c.Title || c.CategoryName || 'Menu';
        const rawWebPages = c.webPages || c.WebPages || [];
        const childPages = (rawWebPages && rawWebPages.length > 0)
          ? rawWebPages.filter((p: any) => p.publish !== false && p.Publish !== false && p.showInMenuDropDown !== false && p.ShowInMenuDropDown !== false)
          : (this.publishedPages || []).filter((p: any) => (p.publish !== false && p.Publish !== false) && 
              (p.showInMenuDropDown !== false && p.ShowInMenuDropDown !== false) && 
              (p.pageCategoryId === c.id || p.pageCategoryId === c.Id));

        if (!childPages || childPages.length === 0) return;

        const pagesList = childPages.map((p: any) => {
          const pUrl = `/${(p.directUrl || p.slug || p.DirectUrl || p.Slug || '').replace(/^\/+/, '')}`;
          usedUrls.add(pUrl.toLowerCase());
          return {
            title: p.title || p.Title || p.pageTitle || p.PageTitle || '',
            url: pUrl,
            customClass: p.customClass || p.CustomClass || '',
            sortOrder: p.dropdownSortOrder || p.DropdownSortOrder || p.sortOrder || p.SortOrder || 0
          };
        });

        dropdownItems.push({
          title: catTitle,
          url: '#',
          isDropdown: true,
          publish: true,
          showInMainMenu: true,
          pages: pagesList,
          zone: normalizeZone(c.menuPosition ?? c.MenuPosition ?? 1),
          sortOrder: c.menuSortOrder !== undefined ? c.menuSortOrder : (c.MenuSortOrder !== undefined ? c.MenuSortOrder : (c.sortOrder || 0)),
          customClass: c.customClass || c.CustomClass || ''
        });
      });

    const standaloneItems: any[] = [];
    (this.publishedPages || [])
      .filter((p: any) => (p.publish !== false && p.Publish !== false) && 
                   (p.showInMainMenu === true || p.ShowInMainMenu === true || p.showInMenu === true || p.ShowInMenu === true) && 
                   !p.isLegal && !p.pageCategoryId && !p.isMenuCTA)
      .forEach((p: any) => {
        const rawUrl = (p.directUrl || p.slug || p.DirectUrl || p.Slug || '').replace(/^\/+/, '');
        const pUrl = (rawUrl === '' || rawUrl.toLowerCase() === 'home') ? '/' : `/${rawUrl}`;
        const pLower = pUrl.toLowerCase();

        if (pLower !== '/' && usedUrls.has(pLower)) return;
        if (usedUrls.has(pLower)) return;
        usedUrls.add(pLower);

        const pTitle = p.title || p.Title || p.pageTitle || p.PageTitle || '';
        standaloneItems.push({
          title: pTitle,
          url: pUrl,
          isDropdown: false,
          publish: true,
          showInMainMenu: true,
          pages: [],
          zone: normalizeZone(p.menuPosition ?? p.MenuPosition ?? 1),
          sortOrder: (p.mainMenuSortOrder !== undefined && p.mainMenuSortOrder !== 0) ? p.mainMenuSortOrder : ((p.MainMenuSortOrder !== undefined && p.MainMenuSortOrder !== 0) ? p.MainMenuSortOrder : (p.sortOrder !== undefined ? p.sortOrder : (p.SortOrder !== undefined ? p.SortOrder : 0))),
          customClass: p.customClass || p.CustomClass || ''
        });
      });

    const navigationMenu = [...standaloneItems, ...dropdownItems].sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    const topBarPages = (this.publishedPages || [])
      .filter((p: any) => (p.publish !== false && p.Publish !== false) && (normalizeZone(p.menuPosition) === 'top' || p.showInMenuTopBar === true || p.showInTopBar === true))
      .sort((a: any, b: any) => (a.topBarSortOrder || a.TopBarSortOrder || a.sortOrder || 0) - (b.topBarSortOrder || b.TopBarSortOrder || b.sortOrder || 0))
      .map((p: any) => ({
        title: p.title || p.Title || '',
        url: `/${(p.directUrl || p.slug || '').replace(/^\/+/, '')}`,
        customClass: p.customClass || ''
      }));

    const menuCtaButtons = (this.publishedPages || [])
      .filter((p: any) => (p.isMenuCTA || p.IsMenuCTA) && p.publish !== false && p.Publish !== false)
      .sort((a: any, b: any) => (a.sortOrder || a.SortOrder || 0) - (b.sortOrder || b.SortOrder || 0))
      .map((p: any) => {
        const isAuthDirect = (p.directUrl || p.slug || '').toLowerCase().includes('login') || (p.title || '').toLowerCase().includes('sign in');
        const ctaTitle = isAuthDirect && authed ? (isAdmin ? 'Admin Console' : 'Member Portal') : (p.menuCtaText || p.MenuCtaText || p.title || p.Title || '');
        const ctaUrl = isAuthDirect && authed ? (isAdmin ? '/billing/features' : '/committees/workspace/my') : (p.menuCtaUrl || p.MenuCtaUrl || `/${(p.directUrl || p.slug || '').replace(/^\/+/, '')}`);
        const ctaStyle = p.menuCtaStyle || p.MenuCtaStyle || p.buttonClass || (isAuthDirect ? 'oz-btn-ghost' : 'oz-btn-primary');
        return {
          title: ctaTitle,
          url: ctaUrl,
          buttonClass: ctaStyle.startsWith('oz-btn-') ? ctaStyle : `oz-btn-${ctaStyle}`,
          customClass: p.customClass || p.CustomClass || (isAuthDirect ? 'oz-login-cta' : '')
        };
      });

    const channels: any[] = this.brandInfo?.contactChannels || [];
    const defaultEmailChannel = channels.find((c: any) => c.channelType?.toLowerCase() === 'email' && c.isDefault) || channels.find((c: any) => c.channelType?.toLowerCase() === 'email');
    const defaultPhoneChannel = channels.find((c: any) => c.channelType?.toLowerCase() === 'phone' && c.isDefault) || channels.find((c: any) => c.channelType?.toLowerCase() === 'phone');
    const defaultAddressChannel = channels.find((c: any) => c.channelType?.toLowerCase() === 'address' && c.isDefault) || channels.find((c: any) => c.channelType?.toLowerCase() === 'address');
    const defaultHoursChannel = channels.find((c: any) => (c.channelType?.toLowerCase() === 'hours' || c.channelType?.toLowerCase() === 'workinghours') && c.isDefault) || channels.find((c: any) => c.channelType?.toLowerCase() === 'hours' || c.channelType?.toLowerCase() === 'workinghours');
    const socialLinks = channels.filter((c: any) => c.channelType?.toLowerCase() === 'socialmedia');

    const contactEmail = defaultEmailChannel?.value || this.brandInfo?.contactEmail || '';
    const contactPhone = defaultPhoneChannel?.value || this.brandInfo?.primaryPhone || '';
    const contactAddress = defaultAddressChannel?.value || this.brandInfo?.address || '';
    const workingHours = defaultHoursChannel?.value || this.brandInfo?.workingHours || '';
    const hasContactInfo = Boolean(contactEmail || contactPhone || contactAddress || channels.length > 0);
    const hasBrandLogo = Boolean(this.brandLogoUrl && this.brandLogoUrl.trim().length > 0);

    const menuContext: any = {
      navigationMenu,
      NavigationMenu: navigationMenu,
      PageCategories: navigationMenu,
      categories: navigationMenu,
      topBarPages,
      TopBarPages: topBarPages,
      menuCtaButtons,
      MenuCtaButtons: menuCtaButtons,
      cartCount: 0,
      BrandName: this.brandName,
      brandName: this.brandName,
      CompanyName: this.brandName,
      LogoUrl: this.brandLogoUrl,
      logoUrl: this.brandLogoUrl,
      BrandLogo: this.brandLogoUrl,
      brandLogo: this.brandLogoUrl,
      WhiteLogoUrl: this.brandLogoUrl,
      HasBrandLogo: hasBrandLogo,
      hasBrandLogo: hasBrandLogo,
      HomeUrl: '/',
      WebsiteUrl: '/',
      email: contactEmail,
      Email: contactEmail,
      phone: contactPhone,
      Phone: contactPhone,
      address: contactAddress,
      Address: contactAddress,
      workingHours: workingHours,
      WorkingHours: workingHours,
      socialLinks: socialLinks,
      SocialLinks: socialLinks,
      hasContactInfo: hasContactInfo,
      HasContactInfo: hasContactInfo,
      activateLogin: isLoginActive,
      ActivateLogin: isLoginActive,
      activateLoginInMenu: isLoginInMenu,
      ActivateLoginInMenu: isLoginInMenu,
      loginText: loginText,
      LoginText: loginText,
      loginUrl: loginUrl,
      LoginUrl: loginUrl,
      isUserAuthenticated: authed,
      IsAuthenticated: authed,
      isUserAdmin: isAdmin,
      IsAdmin: isAdmin
    };

    return this.contentHydration.hydrate(rawHtml, menuContext, 'menu');
  }

  /**
   * Canonical footer hydrator replicating LandingComponent's full token resolution.
   */
  private hydrateFooter(rawHtml: string): string {
    const isLoginActive = this.brandInfo?.activateLogin !== false;
    const isLoginInFooter = this.brandInfo?.activateLoginInFooter !== false;
    const authed = !!this.signedInMember || !!localStorage.getItem('token') || !!sessionStorage.getItem('token');
    const isAdmin = authed && (localStorage.getItem('user_role')?.includes('Admin') || this.signedInMember?.role === 'Admin');

    const loginText = !authed 
      ? (this.brandInfo?.loginButtonText || 'Sign In') 
      : (isAdmin ? 'Console' : 'My Workspace');
    const loginUrl = !authed 
      ? '/login' 
      : (isAdmin ? '/billing/features' : '/committees/workspace/my');

    const footerCategories = (this.navigationCategories || [])
      .filter((c: any) => c.publish !== false && c.showInFooter !== false)
      .map((c: any) => {
        const catTitle = c.title || c.categoryName || c.name || 'Category';
        const displayTitle = c.footerDisplayTitle || catTitle;
        const childPages = (c.webPages && c.webPages.length > 0)
          ? c.webPages.filter((p: any) => p.publish !== false && p.showInFooter !== false)
          : (this.publishedPages || []).filter((p: any) => (p.publish !== false && p.showInFooter !== false) && (p.pageCategoryId === c.id || p.pageCategory?.id === c.id || p.pageCategory?.title === catTitle));

        return {
          name: catTitle,
          title: catTitle,
          displayTitle: displayTitle,
          pages: childPages.map((p: any) => ({
            title: p.title || p.Title || '',
            url: `/${(p.directUrl || p.slug || '').replace(/^\/+/, '')}`
          }))
        };
      });

    const footerBottomPages = (this.publishedPages || [])
      .filter((p: any) => (p.showInFooterBottom || p.ShowInFooterBottom || p.isLegal || p.IsLegal) && p.publish !== false && p.Publish !== false)
      .sort((a: any, b: any) => (a.footerBottomSortOrder || a.FooterBottomSortOrder || a.sortOrder || a.SortOrder || 0) - (b.footerBottomSortOrder || b.FooterBottomSortOrder || b.sortOrder || b.SortOrder || 0))
      .map((p: any) => {
        const isAuthDirect = (p.directUrl || p.slug || '').toLowerCase().includes('login') || (p.title || '').toLowerCase().includes('sign in');
        const itemTitle = isAuthDirect && authed ? (isAdmin ? 'Admin Console' : 'Member Portal') : (p.title || p.Title || '');
        const itemUrl = isAuthDirect && authed ? (isAdmin ? '/billing/features' : '/committees/workspace/my') : `/${(p.directUrl || p.slug || '').replace(/^\/+/, '')}`;
        return {
          title: itemTitle,
          url: itemUrl,
          customClass: p.customClass || p.CustomClass || ''
        };
      });

    const currentYear = new Date().getFullYear().toString();
    const footerChannels: any[] = this.brandInfo?.contactChannels || [];
    const footerEmailChannel = footerChannels.find((c: any) => c.channelType?.toLowerCase() === 'email' && c.isDefault) || footerChannels.find((c: any) => c.channelType?.toLowerCase() === 'email');
    const footerPhoneChannel = footerChannels.find((c: any) => c.channelType?.toLowerCase() === 'phone' && c.isDefault) || footerChannels.find((c: any) => c.channelType?.toLowerCase() === 'phone');
    const footerAddressChannel = footerChannels.find((c: any) => c.channelType?.toLowerCase() === 'address' && c.isDefault) || footerChannels.find((c: any) => c.channelType?.toLowerCase() === 'address');
    const footerSocialLinks = footerChannels.filter((c: any) => c.channelType?.toLowerCase() === 'socialmedia');

    const contactEmail = footerEmailChannel?.value || this.brandInfo?.contactEmail || '';
    const contactPhone = footerPhoneChannel?.value || this.brandInfo?.primaryPhone || '';
    const contactAddress = footerAddressChannel?.value || this.brandInfo?.address || '';

    const contactItems: any[] = [];
    if (contactAddress) {
      contactItems.push({
        title: 'Address',
        content: contactAddress,
        value: contactAddress,
        type: 'address',
        iconClass: 'fa-solid fa-location-dot',
        url: '#'
      });
    }
    if (contactPhone) {
      contactItems.push({
        title: 'Phone',
        content: contactPhone,
        value: contactPhone,
        type: 'phone',
        iconClass: 'fa-solid fa-phone',
        url: `tel:${contactPhone.replace(/[^0-9+]/g, '')}`
      });
    }
    if (contactEmail) {
      contactItems.push({
        title: 'Email',
        content: contactEmail,
        value: contactEmail,
        type: 'email',
        iconClass: 'fa-solid fa-envelope',
        url: `mailto:${contactEmail}`
      });
    }

    const quickLinkPages = (this.publishedPages || [])
      .filter((p: any) => p.publish !== false && (
        (p.tags && p.tags.toLowerCase().includes('quicklink')) ||
        p.showInFooter === true ||
        p.ShowInFooter === true
      ))
      .slice(0, 8)
      .map((p: any) => ({
        title: p.title || p.Title || '',
        url: `/${(p.directUrl || p.slug || '').replace(/^\/+/, '')}`
      }));

    const footerContext: any = {
      brandName: this.brandName,
      BrandName: this.brandName,
      companyName: this.brandName,
      CompanyName: this.brandName,
      logoUrl: this.brandLogoUrl,
      LogoUrl: this.brandLogoUrl,
      BrandLogo: this.brandLogoUrl,
      brandLogo: this.brandLogoUrl,
      WhiteLogoUrl: this.brandLogoUrl,
      hasBrandLogo: Boolean(this.brandLogoUrl && this.brandLogoUrl.trim().length > 0),
      HasBrandLogo: Boolean(this.brandLogoUrl && this.brandLogoUrl.trim().length > 0),
      footerCategories: footerCategories,
      FooterCategories: footerCategories,
      categories: footerCategories,
      Categories: footerCategories,
      footerBottomPages: footerBottomPages,
      FooterBottomPages: footerBottomPages,
      legalPages: footerBottomPages,
      LegalPages: footerBottomPages,
      quickLinks: quickLinkPages,
      QuickLinks: quickLinkPages,
      contactItems: contactItems,
      ContactItems: contactItems,
      socialLinks: footerSocialLinks,
      SocialLinks: footerSocialLinks,
      channels: footerChannels,
      Channels: footerChannels,
      address: contactAddress,
      Address: contactAddress,
      phone: contactPhone,
      Phone: contactPhone,
      email: contactEmail,
      Email: contactEmail,
      year: currentYear,
      Year: currentYear,
      currentYear: currentYear,
      CurrentYear: currentYear,
      companyDescription: this.brandInfo?.companyDescription || '',
      CompanyDescription: this.brandInfo?.companyDescription || '',
      activateLogin: isLoginActive,
      ActivateLogin: isLoginActive,
      activateLoginInFooter: isLoginInFooter,
      ActivateLoginInFooter: isLoginInFooter,
      loginText: loginText,
      LoginText: loginText,
      loginUrl: loginUrl,
      LoginUrl: loginUrl,
      isUserAuthenticated: authed,
      IsAuthenticated: authed,
      isUserAdmin: isAdmin,
      IsAdmin: isAdmin
    };

    const hydrated = this.contentHydration.hydrate(rawHtml, footerContext, 'footer');
    return this.templateHydration.enforceOzikolCredit(hydrated);
  }

  private buildBreadcrumbContext(): any {
    const committeeName = this.activeCommittee?.name || 'Registration';
    const parentName = this.activeCommittee?.parentCommitteeName;
    const trails = [
      { label: 'Home', url: '/', isActive: false },
      { label: this.aliases.aliasPlural, url: '/join-committee', isActive: false }
    ];
    if (parentName) {
      trails.push({ label: parentName, url: '#', isActive: false });
    }
    trails.push({ label: committeeName, url: '#', isActive: true });

    const effectiveBg = this.activeCommittee?.imageUrl ||
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1600&q=80';

    return {
      title: committeeName,
      Title: committeeName,
      pageTitle: committeeName,
      miniTitle: this.activeCommittee?.parentCommitteeId ? this.aliases.subGroupAliasSingular : this.aliases.aliasSingular,
      description: this.activeCommittee?.description || this.activeCommittee?.missionStatement || 'Complete the registration form to enroll.',
      backgroundImageUrl: effectiveBg,
      imageUrl: effectiveBg,
      breadcrumbTrail: trails,
      breadcrumbs: trails
    };
  }

  onDirectoryChange(committeeId: string): void {
    const found = this.openCommittees.find(c => c.id === committeeId);
    if (found) {
      this.selectCommittee(found);
    }
  }

  private loadDirectory(): void {
    this.loading = true;
    this.committeesService.getPublicDirectory(this.tenantSlug || undefined).subscribe({
      next: (res: any) => {
        if (res?.isSuccess && res.data) {
          this.isNotFound = false;
          this.brand = res.data.brand;
          this.aliases = { ...this.aliases, ...(res.data.aliases || {}) };
          this.signedInMember = res.data.signedInMember;
          this.openCommittees = res.data.committees || [];
          if (this.openCommittees.length > 0) {
            this.selectCommittee(this.openCommittees[0]);
          } else {
            this.isNotFound = true;
            this.loadError = `No ${this.aliases.aliasPlural.toLowerCase()} are currently open for external registration.`;
          }
          this.assembleAndFinalizeLayout(this.isNotFound);
        } else {
          this.isNotFound = true;
          this.loadError = res?.message || 'Page not found.';
          this.assembleAndFinalizeLayout(true);
        }
        this.loading = false;
      },
      error: (err: any) => {
        this.loading = false;
        this.isNotFound = true;
        this.loadError = err?.error?.message || 'Page not found.';
        this.assembleAndFinalizeLayout(true);
      }
    });
  }

  private loadSingleGroup(): void {
    this.loading = true;
    // Calling getPublicCommitteeBySlug(groupSlug, token?, tenantKey?)
    this.committeesService
      .getPublicCommitteeBySlug(this.groupSlug, this.inviteToken || undefined, this.tenantSlug || undefined)
      .subscribe({
        next: (res: any) => {
          if (res?.isSuccess && res.data) {
            this.isNotFound = false;
            this.brand = res.data.brand;
            this.aliases = { ...this.aliases, ...(res.data.aliases || {}) };
            this.signedInMember = res.data.signedInMember;
            this.activeCommittee = res.data.committee;
            this.assembleAndFinalizeLayout(false);
          } else {
            this.isNotFound = true;
            this.loadError = res?.message || 'Page not found.';
            this.assembleAndFinalizeLayout(true);
          }
          this.loading = false;
        },
        error: (err: any) => {
          this.loading = false;
          this.isNotFound = true;
          this.loadError = err?.error?.message || 'Page not found.';
          this.assembleAndFinalizeLayout(true);
        }
      });
  }

  selectCommittee(c: any): void {
    this.activeCommittee = c;
    this.extraAnswers = {};
    this.attachmentUrls = [];
    this.formError = '';
    // Refresh breadcrumbs and metadata for the selected committee
    this.assembleAndFinalizeLayout(false);
  }

  hasMulti(key: string, opt: string): boolean {
    const list = this.extraAnswers[key];
    return Array.isArray(list) && list.includes(opt);
  }

  toggleMulti(key: string, opt: string, evt: Event): void {
    const target = evt.target as HTMLInputElement;
    const current: string[] = Array.isArray(this.extraAnswers[key]) ? [...this.extraAnswers[key]] : [];
    if (target.checked) {
      if (!current.includes(opt)) current.push(opt);
    } else {
      const idx = current.indexOf(opt);
      if (idx >= 0) current.splice(idx, 1);
    }
    this.extraAnswers[key] = current;
  }

  triggerFileInput(elementId: string): void {
    const el = document.getElementById(elementId) as HTMLInputElement;
    if (el) {
      el.click();
    }
  }

  onFileUpload(evt: Event, key: string): void {
    const input = evt.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.uploadingFile = true;
    this.formError = '';

    this.committeesService.uploadPublicAttachment(file, this.tenantSlug || undefined).subscribe({
      next: (res: any) => {
        this.uploadingFile = false;
        if (res?.isSuccess && res.data?.url) {
          this.extraAnswers[key] = res.data.url;
          if (!this.attachmentUrls.includes(res.data.url)) {
            this.attachmentUrls.push(res.data.url);
          }
        } else {
          this.formError = res?.message || 'Attachment upload failed. Please try again.';
        }
      },
      error: (err: any) => {
        this.uploadingFile = false;
        this.formError = err?.error?.message || 'Attachment upload failed. Ensure file is within size limits.';
      }
    });
  }

  submitRegistration(): void {
    this.formError = '';

    if (!this.firstName.trim() || !this.lastName.trim()) {
      this.formError = 'Please enter your first and last name.';
      return;
    }
    if (!this.email.trim()) {
      this.formError = 'Please enter a valid email address.';
      return;
    }

    // Validate required Extra-Info questions
    if (this.activeCommittee?.extraInfoForm?.fields?.length) {
      for (const f of this.activeCommittee.extraInfoForm.fields) {
        if (f.isRequired) {
          const val = this.extraAnswers[f.fieldName];
          const isEmpty = val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);
          if (isEmpty) {
            this.formError = `Please complete the mandatory field: "${f.label}".`;
            return;
          }
        }
      }
    }

    this.submitting = true;
    const payload = {
      committeeId: this.activeCommittee.id,
      tenantKey: this.tenantSlug || undefined,
      inviteToken: this.inviteToken || undefined,
      firstName: this.firstName.trim(),
      lastName: this.lastName.trim(),
      email: this.email.trim(),
      phoneNumber: this.phoneNumber.trim(),
      extraAnswers: this.extraAnswers,
      attachmentUrls: this.attachmentUrls
    };

    this.committeesService.submitPublicRegistration(payload, this.tenantSlug || undefined).subscribe({
      next: (res: any) => {
        this.submitting = false;
        if (res?.isSuccess) {
          this.submittedSuccess = true;
          this.submissionStatus = res.data?.status || 'Pending';
          this.submissionMessage = res.message || 'Your registration has been submitted.';
        } else {
          this.formError = res?.message || 'Registration could not be completed. Please try again.';
        }
      },
      error: (err: any) => {
        this.submitting = false;
        this.formError = err?.error?.message || 'An error occurred during registration. Please review and try again.';
      }
    });
  }

  resetForAnother(): void {
    this.submittedSuccess = false;
    this.submissionStatus = '';
    this.submissionMessage = '';
    this.extraAnswers = {};
    this.attachmentUrls = [];
    this.firstName = '';
    this.lastName = '';
    this.email = '';
    this.phoneNumber = '';
    this.formError = '';
  }
}
