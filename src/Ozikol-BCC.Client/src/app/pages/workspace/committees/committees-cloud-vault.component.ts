import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import {
  CommitteeAliases,
  CommitteeInfoSpec,
  CommitteeTourStep,
  CommitteesService
} from '../../../core/services/committees.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { CommitteesUxHelpersComponent } from '../../../shared/components/committees-ux-helpers/committees-ux-helpers.component';

/**
 * Connected Google & Cloud Document Vault (M5 — /committees/workspace/cloud-links).
 * Manages connected Google Docs, Google Sheets, NotebookLM, Excel Online, OneNote, and Notion documents
 * across the member's enrolled Committees & Sub-Groups with inline live iframe preview.
 */
@Component({
  selector: 'app-committees-cloud-vault',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, CommitteesUxHelpersComponent],
  template: `
    <div class="vault-shell">
      <header class="vault-header">
        <div>
          <span class="vault-eyebrow">{{ 'committees.eyebrow' | translate:'PEOPLE & COMMUNITY' }}</span>
          <div class="vault-title-row">
            <h1>{{ 'committees.cloud_vault' | translate:'My Connected Cloud Docs' }}</h1>
            <button type="button" class="vault-info-btn" (click)="openInfo()">
              <span class="material-symbols-outlined">info</span>
            </button>
          </div>
          <p class="vault-subtitle">
            Connect Google Docs, Google Sheets, Slides, Cloud Notebooks, or Excel Online workbooks and pin them to your {{ aliases.aliasPlural.toLowerCase() }}.
          </p>
        </div>

        <div class="vault-actions">
          <button type="button" class="vault-btn-ghost" (click)="showTour = true">
            <span class="material-symbols-outlined">help</span>
            <span>{{ 'committees.tour_guide' | translate:'Tour Guide' }}</span>
          </button>
          <button type="button" class="vault-btn-primary" (click)="connectWithGoogle()">
            <span class="material-symbols-outlined">add_to_drive</span>
            <span>{{ 'committees.connect_google' | translate:'Sign in with Google to Link Docs / Sheets' }}</span>
          </button>
        </div>
      </header>

      <div class="vault-notice" *ngIf="statusMessage">
        <span class="material-symbols-outlined">info</span>
        <span>{{ statusMessage }}</span>
      </div>

      <!-- Connect / Paste Cloud Document Bar -->
      <section class="vault-connect-card">
        <div class="vault-connect-grid">
          <div class="vault-field">
            <label>Document Title</label>
            <input type="text" [(ngModel)]="docTitle" placeholder="e.g. Q4 Budget Sheet or Meeting Notebook" />
          </div>
          <div class="vault-field" style="flex:2">
            <label>Google Docs / Sheets / Notebook / Excel Online URL</label>
            <input type="url" [(ngModel)]="docUrl" placeholder="https://docs.google.com/document/d/..." />
          </div>
          <div class="vault-field">
            <label>Pin to {{ aliases.aliasSingular }} (Optional)</label>
            <select [(ngModel)]="selectedCommitteeId">
              <option value="">Personal Vault Only</option>
              <option *ngFor="let g of myGroups" [value]="g.committeeId">{{ g.name }}</option>
            </select>
          </div>
          <div class="vault-field action-col">
            <button type="button" class="vault-btn-secondary" [disabled]="saving" (click)="saveCloudLink()">
              <span class="material-symbols-outlined">add_link</span>
              <span>Link Document</span>
            </button>
          </div>
        </div>
      </section>

      <!-- Empty State -->
      <div class="vault-empty" *ngIf="!loading && documents.length === 0">
        <span class="material-symbols-outlined">cloud_done</span>
        <h3>No Cloud Documents Connected Yet</h3>
        <p>Click <strong>Sign in with Google to Link Docs / Sheets</strong> or paste a cloud notebook/spreadsheet link above.</p>
      </div>

      <!-- Connected Cloud Docs Grid -->
      <div class="vault-grid" *ngIf="documents.length > 0">
        <article class="vault-card" *ngFor="let doc of documents">
          <div class="vault-card-top">
            <div class="vault-provider-icon">
              <span class="material-symbols-outlined">{{ getProviderIcon(doc.provider) }}</span>
            </div>
            <div class="vault-doc-headings">
              <span class="vault-provider-tag">{{ doc.provider }}</span>
              <h3>{{ doc.title }}</h3>
              <small *ngIf="doc.committeeName">Pinned to: {{ doc.committeeName }}</small>
              <small *ngIf="!doc.committeeName">Personal Workspace Vault</small>
            </div>
          </div>

          <div class="vault-card-footer">
            <button type="button" class="vault-btn-ghost" (click)="openPreview(doc)">
              <span class="material-symbols-outlined">visibility</span>
              <span>Preview</span>
            </button>
            <a [href]="doc.documentUrl" target="_blank" rel="noopener" class="vault-btn-secondary">
              <span class="material-symbols-outlined">open_in_new</span>
              <span>Open Live</span>
            </a>
            <button *ngIf="doc.isMine" type="button" class="vault-btn-danger" (click)="unlinkDoc(doc.id)" title="Disconnect">
              <span class="material-symbols-outlined">link_off</span>
            </button>
          </div>
        </article>
      </div>

      <!-- Inline Live Preview -->
      <section class="vault-preview-panel" *ngIf="previewSafeUrl">
        <div class="vault-preview-head">
          <strong>{{ previewDocTitle }}</strong>
          <button type="button" class="vault-btn-ghost" (click)="previewSafeUrl = null">Close Preview</button>
        </div>
        <iframe [src]="previewSafeUrl" title="Connected Cloud Document Preview"></iframe>
      </section>

      <app-committees-ux-helpers
        [activeInfo]="activeInfo"
        (closeInfo)="activeInfo = null"
        [showTour]="showTour"
        [tourSteps]="tourSteps"
        (tourClosed)="onTourClosed()"
      ></app-committees-ux-helpers>
    </div>
  `,
  styles: [`
    .vault-shell { padding: 24px; max-width: 1380px; margin: 0 auto; display: flex; flex-direction: column; gap: 18px; }
    .vault-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
    .vault-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.8px; color: #0050e5; text-transform: uppercase; }
    .vault-title-row { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
    .vault-title-row h1 { margin: 0; font-size: 24px; font-weight: 800; color: #0f172a; }
    :host-context(.dark-mode) .vault-title-row h1 { color: #f8fafc; }
    .vault-subtitle { margin: 6px 0 0; font-size: 13.5px; color: #64748b; }
    .vault-info-btn { background: transparent; border: none; color: #0050e5; cursor: pointer; }
    .vault-actions { display: flex; gap: 10px; flex-wrap: wrap; }
    .vault-btn-primary, .vault-btn-secondary, .vault-btn-ghost, .vault-btn-danger {
      display: inline-flex; align-items: center; gap: 7px; padding: 9px 15px; border-radius: 10px;
      font-size: 13px; font-weight: 600; text-decoration: none; cursor: pointer; border: 1px solid transparent;
    }
    .vault-btn-primary { background: #0050e5; color: #ffffff; }
    .vault-btn-secondary { background: rgba(0, 80, 229, 0.08); color: #0050e5; border-color: rgba(0, 80, 229, 0.2); }
    .vault-btn-ghost { background: #ffffff; color: #334155; border-color: #cbd5e1; }
    .vault-btn-danger { background: rgba(220, 38, 38, 0.1); color: #dc2626; }
    .vault-notice {
      display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-radius: 10px;
      background: rgba(0, 80, 229, 0.08); color: #0050e5; font-size: 13px; font-weight: 600;
    }
    .vault-connect-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px 20px; }
    :host-context(.dark-mode) .vault-connect-card, :host-context(.dark-mode) .vault-card, :host-context(.dark-mode) .vault-empty {
      background: #1e293b; border-color: rgba(255,255,255,0.08);
    }
    .vault-connect-grid { display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end; }
    .vault-field { flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 6px; }
    .vault-field.action-col { flex: 0 0 auto; min-width: auto; }
    .vault-field label { font-size: 12.5px; font-weight: 600; color: #334155; }
    :host-context(.dark-mode) .vault-field label { color: #cbd5e1; }
    .vault-field input, .vault-field select { padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 9px; font-size: 13.5px; }
    .vault-empty {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 48px 24px;
      text-align: center; color: #64748b; display: flex; flex-direction: column; align-items: center; gap: 10px;
    }
    .vault-empty .material-symbols-outlined { font-size: 42px; color: #0050e5; }
    .vault-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
    .vault-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; display: flex; flex-direction: column; gap: 16px; }
    .vault-card-top { display: flex; gap: 12px; align-items: flex-start; }
    .vault-provider-icon {
      width: 44px; height: 44px; border-radius: 12px; background: rgba(0, 80, 229, 0.1); color: #0050e5;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .vault-provider-tag { font-size: 11px; font-weight: 700; color: #0050e5; text-transform: uppercase; }
    .vault-doc-headings h3 { margin: 2px 0 4px; font-size: 16px; font-weight: 700; }
    .vault-doc-headings small { color: #64748b; font-size: 12px; display: block; }
    .vault-card-footer { display: flex; gap: 8px; align-items: center; margin-top: auto; }
    .vault-preview-panel { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 16px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    .vault-preview-head { display: flex; justify-content: space-between; align-items: center; }
    .vault-preview-panel iframe { width: 100%; height: 520px; border: none; border-radius: 10px; }
  `]
})
export class CommitteesCloudVaultComponent implements OnInit, OnDestroy {
  aliases: CommitteeAliases;
  loading = false;
  saving = false;
  documents: any[] = [];
  myGroups: any[] = [];

  docTitle = '';
  docUrl = '';
  selectedCommitteeId = '';
  statusMessage = '';

  previewDocTitle = '';
  previewSafeUrl: SafeResourceUrl | null = null;

  activeInfo: CommitteeInfoSpec | null = null;
  showTour = false;
  tourSteps: CommitteeTourStep[] = [];

  private aliasSub?: Subscription;
  private readonly TOUR_KEY = 'committees_cloud_vault';

  constructor(
    private committeesService: CommitteesService,
    private sanitizer: DomSanitizer
  ) {
    this.aliases = this.committeesService.currentAliases;
  }

  ngOnInit(): void {
    this.aliasSub = this.committeesService.aliases$.subscribe((a) => {
      this.aliases = a;
      this.buildTourSteps();
    });
    this.buildTourSteps();
    this.committeesService.getSettings().subscribe();
    this.loadVault();
    this.committeesService.getMyWorkspaceCommittees().subscribe({
      next: (res) => {
        if (res?.isSuccess && res.data?.enrolledCommittees) {
          this.myGroups = res.data.enrolledCommittees;
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.aliasSub?.unsubscribe();
  }

  loadVault(): void {
    this.loading = true;
    this.committeesService.getCloudDocuments().subscribe({
      next: (res) => {
        this.loading = false;
        if (res?.isSuccess) this.documents = res.data || [];
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  async connectWithGoogle(): Promise<void> {
    const res = await this.committeesService.launchGoogleDrivePicker();
    if (res.picked) {
      this.committeesService
        .linkCloudDocument({
          committeeId: this.selectedCommitteeId || null,
          provider: res.picked.provider,
          title: res.picked.title,
          documentUrl: res.picked.url,
          externalFileId: res.picked.externalFileId,
          isPinnedToShelf: !!this.selectedCommitteeId
        })
        .subscribe(() => {
          this.statusMessage = `Connected "${res.picked!.title}" from Google Drive.`;
          this.loadVault();
        });
    } else {
      this.statusMessage = 'Paste any Google Docs, Google Sheets, NotebookLM, or Excel Online share URL in the bar below to link it immediately.';
    }
  }

  saveCloudLink(): void {
    if (!this.docUrl.trim()) return;
    this.saving = true;
    this.committeesService
      .linkCloudDocument({
        committeeId: this.selectedCommitteeId || null,
        title: this.docTitle.trim(),
        documentUrl: this.docUrl.trim(),
        isPinnedToShelf: !!this.selectedCommitteeId
      })
      .subscribe({
        next: (res) => {
          this.saving = false;
          if (res?.isSuccess) {
            this.docTitle = '';
            this.docUrl = '';
            this.statusMessage = 'Cloud document linked.';
            this.loadVault();
          }
        },
        error: (err) => {
          this.saving = false;
          this.statusMessage = err?.error?.message || 'Enter a valid https:// cloud document URL.';
        }
      });
  }

  openPreview(doc: any): void {
    const target = doc.embedUrl || doc.documentUrl;
    if (!target) return;
    this.previewDocTitle = doc.title;
    this.previewSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(target);
  }

  unlinkDoc(docId: string): void {
    this.committeesService.unlinkCloudDocument(docId).subscribe({
      next: () => {
        this.statusMessage = 'Cloud document disconnected.';
        this.loadVault();
      }
    });
  }

  getProviderIcon(provider: string): string {
    return this.committeesService.getProviderIcon(provider);
  }

  openInfo(): void {
    this.activeInfo = {
      title: 'Connected Cloud Docs & Notebooks Vault',
      purpose: 'Connects live Google Docs, Google Sheets, Slides, NotebookLM, OneNote, Notion, and Excel Online links without copying static files repeatedly.',
      inputs: 'Sign in with Google via the Drive Picker or paste a shared https:// document URL and optionally pin it to an enrolled group.',
      impact: 'Pinned documents appear immediately on your group shelf and can be previewed inline.',
      bestPractices: 'Set Google Docs / Sheets sharing to "Anyone in organization with link can view" so fellow group members can preview seamlessly.'
    };
  }

  onTourClosed(): void {
    this.showTour = false;
    this.committeesService.markTourCompleted(this.TOUR_KEY);
  }

  private buildTourSteps(): void {
    this.tourSteps = [
      {
        icon: 'add_to_drive',
        title: 'Sign in with Google Picker',
        description: 'Authorize only the specific Google Doc, Sheet, or Notebook you select — Ozikol BCC never scans unrelated Drive folders.'
      },
      {
        icon: 'visibility',
        title: 'Inline Cloud Preview & Group Pinning',
        description: `Preview connected documents inside your workspace or pin them directly to any ${this.aliases.aliasSingular.toLowerCase()} shelf.`
      }
    ];
  }
}

