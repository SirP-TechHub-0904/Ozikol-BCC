import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-sliders',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="cms-page-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-titles">
          <div class="breadcrumb">
            <a routerLink="/admin/content">CMS Studio</a>
            <span class="sep">/</span>
            <span class="current">Hero Carousel Sliders</span>
          </div>
          <h1>Hero Carousel Sliders</h1>
          <p class="subtitle">Manage homepage hero slide images, video backgrounds, call-to-action buttons, and headlines.</p>
        </div>
        <div class="header-actions">
          <button type="button" class="btn btn-primary" (click)="openCreateModal()">
            <span class="material-symbols-outlined">add_circle</span>
            <span>New Slider</span>
          </button>
          <button type="button" (click)="loadSliders()" class="btn btn-outline" [disabled]="loading">
            <span class="material-symbols-outlined" [class.spin]="loading">refresh</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <!-- Sliders Cards Grid / Table -->
      <div class="cms-card">
        <div class="table-responsive">
          <table class="cms-table">
            <thead>
              <tr>
                <th>PREVIEW</th>
                <th>HEADLINE TITLE</th>
                <th>MINI TITLE</th>
                <th>BUTTON</th>
                <th>ORDER</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let s of sliders">
                <td>
                  <div class="slider-thumb">
                    <img *ngIf="s.url" [src]="s.url" alt="Slide">
                    <span *ngIf="!s.url" class="no-thumb"><span class="material-symbols-outlined">image</span></span>
                  </div>
                </td>
                <td>
                  <strong>{{ s.title || '(No Title)' }}</strong>
                  <div class="sub-text" *ngIf="s.text">{{ s.text | slice:0:50 }}...</div>
                </td>
                <td><span class="mini-pill">{{ s.miniTitle || '-' }}</span></td>
                <td>
                  <span class="btn-tag" *ngIf="s.buttonText">{{ s.buttonText }}</span>
                  <span class="badge-none" *ngIf="!s.buttonText">-</span>
                </td>
                <td><span class="order-badge">#{{ s.sortOrder }}</span></td>
                <td>
                  <span class="status-pill" [class.published]="s.show" [class.draft]="!s.show">
                    {{ s.show ? 'Active' : 'Hidden' }}
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <a [routerLink]="['/admin/content/sliders/edit', s.id]" class="btn-action btn-edit" title="Edit slider">
                      <span class="material-symbols-outlined">edit</span>
                      <span>Edit Page</span>
                    </a>
                    <a [routerLink]="['/content/console/sliders/delete', s.id]" class="btn-action btn-delete" title="Delete Slider">
                      <span class="material-symbols-outlined">delete</span>
                    </a>
                  </div>
                </td>
              </tr>
              <tr *ngIf="sliders.length === 0">
                <td colspan="7" class="empty-cell">No sliders found. Click "New Slider" to create one.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Create Slider Modal (Safe Backdrop) -->
      <div class="modal-backdrop" *ngIf="showCreateModal">
        <div class="modal-card modal-lg">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="material-symbols-outlined text-blue">view_carousel</span>
              <h3>Create Hero Slider</h3>
            </div>
            <button type="button" class="btn-close" (click)="closeCreateModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>SLIDER MAIN TITLE *</label>
              <input type="text" [(ngModel)]="newSlider.title" class="form-control" placeholder="e.g. Welcome to Our Digital Hub">
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label>MINI TITLE (SUB-TAG)</label>
                <input type="text" [(ngModel)]="newSlider.miniTitle" class="form-control" placeholder="WELCOME TO OUR COMMUNITY">
              </div>
              <div class="form-group flex-1">
                <label>SORT ORDER</label>
                <input type="number" [(ngModel)]="newSlider.sortOrder" class="form-control">
              </div>
            </div>

            <div class="form-group">
              <label>SLIDER DESCRIPTION / COPY</label>
              <textarea rows="2" [(ngModel)]="newSlider.text" class="form-control" placeholder="Compelling headline summary..."></textarea>
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label>BUTTON TEXT</label>
                <input type="text" [(ngModel)]="newSlider.buttonText" class="form-control" placeholder="Get Started">
              </div>
              <div class="form-group flex-1">
                <label>BUTTON LINK</label>
                <input type="text" [(ngModel)]="newSlider.buttonLink" class="form-control" placeholder="/auth/login">
              </div>
            </div>

            <div class="error-box" *ngIf="errorMessage">{{ errorMessage }}</div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="closeCreateModal()">Cancel</button>
            <button type="button" class="btn btn-primary" (click)="saveNewSlider()" [disabled]="saving">
              <span *ngIf="!saving">Save & Create Slider</span>
              <span *ngIf="saving">Saving...</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cms-page-container { display: flex; flex-direction: column; gap: 24px; }
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      background: #fff; padding: 24px 28px; border-radius: 16px; border: 1px solid #e2e8f0;
    }
    .breadcrumb { font-size: 13px; color: #64748b; margin-bottom: 6px; }
    .breadcrumb a { color: #0050e5; text-decoration: none; font-weight: 600; }
    .page-header h1 { font-size: 26px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
    .subtitle { color: #64748b; font-size: 14px; margin: 0; }
    .header-actions { display: flex; gap: 12px; }

    .btn {
      display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px;
      border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none;
    }
    .btn-primary { background: #0050e5; color: #fff; border: none; }
    .btn-outline { background: transparent; border: 1px solid #cbd5e1; color: #334155; }

    .cms-nav-tabs {
      display: flex; gap: 8px; background: #fff; padding: 8px 12px;
      border-radius: 12px; border: 1px solid #e2e8f0; overflow-x: auto;
    }
    .nav-tab {
      display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px;
      border-radius: 8px; font-size: 13px; font-weight: 600; color: #64748b; text-decoration: none;
    }
    .nav-tab.active { background: #0050e5; color: #fff; }
    .tab-badge { background: rgba(0,0,0,0.08); padding: 2px 8px; border-radius: 12px; font-size: 11px; }
    .nav-tab.active .tab-badge { background: rgba(255,255,255,0.25); color: #fff; }

    .cms-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; }
    .cms-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .cms-table th {
      text-align: left; padding: 12px; background: #f8fafc; color: #64748b;
      font-weight: 700; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-transform: uppercase;
    }
    .cms-table td { padding: 14px 12px; border-bottom: 1px solid #f1f5f9; }

    .slider-thumb { width: 64px; height: 42px; border-radius: 6px; overflow: hidden; background: #f1f5f9; display: flex; align-items: center; justify-content: center; }
    .slider-thumb img { width: 100%; height: 100%; object-fit: cover; }
    .no-thumb span { font-size: 20px; color: #94a3b8; }
    .mini-pill { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; }
    .btn-tag { background: #eff6ff; color: #0050e5; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; }
    .badge-none { color: #94a3b8; font-size: 11px; }
    .order-badge { background: #f1f5f9; padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 12px; }
    .status-pill { padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; }
    .status-pill.published { background: #dcfce7; color: #15803d; }
    .status-pill.draft { background: #fee2e2; color: #dc2626; }

    .action-buttons { display: flex; gap: 6px; align-items: center; }
    .btn-action {
      display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px;
      border-radius: 6px; font-size: 12px; font-weight: 600; text-decoration: none; cursor: pointer; border: none;
    }
    .btn-edit { background: #eff6ff; color: #0050e5; }
    .btn-edit:hover { background: #0050e5; color: #fff; }
    .btn-delete { background: #fee2e2; color: #dc2626; }
    .btn-delete:hover { background: #dc2626; color: #fff; }

    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center; z-index: 2000;
    }
    .modal-card {
      background: #fff; border-radius: 16px; width: 100%; max-width: 600px;
      box-shadow: 0 25px 60px rgba(0,0,0,0.3); overflow: hidden;
    }
    .modal-header {
      padding: 18px 24px; display: flex; justify-content: space-between; align-items: center;
      border-bottom: 1px solid #e2e8f0;
    }
    .modal-title-group { display: flex; align-items: center; gap: 10px; }
    .modal-title-group h3 { margin: 0; font-size: 18px; font-weight: 800; }
    .btn-close { background: none; border: none; font-size: 20px; cursor: pointer; color: #64748b; }
    .modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
    .modal-footer { padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; }
    .form-control { padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; }
    .form-row { display: flex; gap: 12px; }
    .error-box { background: #fee2e2; color: #991b1b; padding: 10px; border-radius: 8px; font-size: 12px; font-weight: 600; }
  `]
})
export class SlidersComponent implements OnInit {
  loading = false;
  saving = false;
  sliders: any[] = [];

  showCreateModal = false;
  errorMessage = '';
  newSlider: any = {};

  constructor(
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadSliders();
  }

  loadSliders(): void {
    this.loading = true;
    this.api.get<any>('ContentApi/sliders').subscribe({
      next: (res) => {
        this.loading = false;
        this.sliders = res?.data || [];
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  openCreateModal(): void {
    this.newSlider = {
      title: '',
      miniTitle: '',
      text: '',
      buttonText: 'Explore More',
      buttonLink: '/about-us',
      sortOrder: this.sliders.length + 1,
      show: true
    };
    this.errorMessage = '';
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  saveNewSlider(): void {
    if (!this.newSlider.title?.trim()) {
      this.errorMessage = 'Slider Title is required.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    this.api.post<any>('ContentApi/sliders', this.newSlider).subscribe({
      next: () => {
        this.saving = false;
        this.showCreateModal = false;
        this.loadSliders();
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err?.error?.message || 'Failed to create slider.';
      }
    });
  }

  async deleteSlider(s: any): Promise<void> {
    const confirmed = await this.toast.confirm(
      'Delete Hero Slider',
      `You are about to permanently delete hero slider banner "${s.title}".`,
      'Delete Slider',
      'Cancel',
      'danger',
      s.title,
      [
        'This banner slide and its background visuals will be removed from the homepage.',
        'This slide configuration cannot be restored.'
      ]
    );

    if (confirmed) {
      this.api.delete<any>(`ContentApi/sliders/${s.id}`).subscribe({
        next: () => {
          this.toast.success(`Slider "${s.title}" deleted successfully.`);
          this.loadSliders();
        },
        error: (err) => {
          this.toast.error(err?.error?.message || 'Failed to delete slider.');
        }
      });
    }
  }
}
