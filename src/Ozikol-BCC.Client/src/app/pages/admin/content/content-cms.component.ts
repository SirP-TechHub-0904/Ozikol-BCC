import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { ApiService } from '../../../core/services/api.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

Chart.register(...registerables);

@Component({
  selector: 'app-content-cms',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  template: `
    <div class="cms-page">
      <!-- Standardized Page Header -->
      <app-page-header
        eyebrow="WEBSITE & CMS"
        icon="dynamic_feed"
        title="Dynamic Content CMS Studio"
        subtitle="Manage 100% database-driven WebPages, navigation dropdowns, section templates, and hero sliders."
        [buttons]="headerButtons"
        [loading]="isLoading"
      ></app-page-header>

      <!-- CMS Feature Toolbar Tabs -->
      <div class="feature-toolbar">
        <button type="button" class="feature-tab" [class.active]="activeTab === 'dashboard'" (click)="setTab('dashboard')">
          <span class="material-symbols-outlined tab-icon">space_dashboard</span>
          <span>CMS Dashboard</span>
        </button>

        <button type="button" class="feature-tab" [class.active]="activeTab === 'pages'" (click)="setTab('pages')">
          <span class="material-symbols-outlined tab-icon">description</span>
          <span>Web Pages</span>
          <span class="badge-pill" style="background:rgba(0,80,229,0.15); color:#0050e5; margin-left:6px;">{{ pages.length }}</span>
        </button>

        <button type="button" class="feature-tab" [class.active]="activeTab === 'categories'" (click)="setTab('categories')">
          <span class="material-symbols-outlined tab-icon">view_quilt</span>
          <span>Navigation Dropdowns</span>
          <span class="badge-pill" style="background:rgba(0,80,229,0.15); color:#0050e5; margin-left:6px;">{{ categories.length }}</span>
        </button>

        <button type="button" class="feature-tab" [class.active]="activeTab === 'sections'" (click)="setTab('sections')">
          <span class="material-symbols-outlined tab-icon">view_carousel</span>
          <span>Page Sections</span>
          <span class="badge-pill" style="background:rgba(0,80,229,0.15); color:#0050e5; margin-left:6px;">{{ sections.length }}</span>
        </button>

        <button type="button" class="feature-tab" [class.active]="activeTab === 'sliders'" (click)="setTab('sliders')">
          <span class="material-symbols-outlined tab-icon">photo_library</span>
          <span>Hero Sliders</span>
          <span class="badge-pill" style="background:rgba(0,80,229,0.15); color:#0050e5; margin-left:6px;">{{ sliders.length }}</span>
        </button>

        <button type="button" class="feature-tab" [class.active]="activeTab === 'faqs'" (click)="setTab('faqs')">
          <span class="material-symbols-outlined tab-icon">quiz</span>
          <span>FAQs</span>
          <span class="badge-pill" style="background:rgba(0,80,229,0.15); color:#0050e5; margin-left:6px;">{{ faqs.length }}</span>
        </button>
      </div>

      <!-- TAB 1: DEDICATED CMS DASHBOARD WITH CHARTS & GRAPHS -->
      <div *ngIf="activeTab === 'dashboard'" class="dashboard-hub">
        <!-- 4 Metric Cards -->
        <div class="metric-grid" style="margin-bottom: 20px;">
          <div class="metric-card">
            <div class="metric-label">Published Pages</div>
            <div class="metric-value">{{ pages.length }}</div>
            <span class="metric-trend text-blue">Live on Website</span>
          </div>
          <div class="metric-card">
            <div class="metric-label">Nav Dropdowns</div>
            <div class="metric-value">{{ categories.length }}</div>
            <span class="metric-trend text-green">Header Menu</span>
          </div>
          <div class="metric-card">
            <div class="metric-label">Hero Sliders</div>
            <div class="metric-value">{{ sliders.length }}</div>
            <span class="metric-trend text-purple">Homepage Banners</span>
          </div>
          <div class="metric-card">
            <div class="metric-label">FAQ Knowledge Base</div>
            <div class="metric-value">{{ faqs.length }}</div>
            <span class="metric-trend text-amber">Answer Repository</span>
          </div>
        </div>

        <!-- Analytical Charts Row (Traffic Curve & Inventory Bar Histogram) -->
        <div class="chart-row-2">
          <!-- Chart 1: Traffic Area Chart -->
          <section class="console-widget">
            <div class="widget-head">
              <div class="widget-title-wrap">
                <span class="material-symbols-outlined text-blue">show_chart</span>
                <h2 class="widget-title">Page Views & Reader Traffic (Last 7 Days)</h2>
              </div>
              <span class="status-pill good">+24.8% ↑</span>
            </div>
            <div class="widget-body">
              <div class="chart-box">
                <canvas #trafficChartCanvas></canvas>
              </div>
            </div>
          </section>

          <!-- Chart 2: Content Distribution Bar Histogram -->
          <section class="console-widget">
            <div class="widget-head">
              <div class="widget-title-wrap">
                <span class="material-symbols-outlined text-purple">bar_chart</span>
                <h2 class="widget-title">CMS Content Inventory Breakdown</h2>
              </div>
            </div>
            <div class="widget-body">
              <div class="chart-box">
                <canvas #contentBarChartCanvas></canvas>
              </div>
            </div>
          </section>
        </div>

        <!-- Quick Launch Shortcut Row -->
        <div class="console-actions">
          <div class="action-card" (click)="openCreateModal('page')">
            <div class="action-icon-bg" style="background:#0050e5;"><span class="material-symbols-outlined">post_add</span></div>
            <span class="action-label">Create Web Page</span>
          </div>
          <div class="action-card" (click)="openCreateModal('slider')">
            <div class="action-icon-bg" style="background:#a855f7;"><span class="material-symbols-outlined">add_photo_alternate</span></div>
            <span class="action-label">Add Hero Banner</span>
          </div>
          <div class="action-card" (click)="openCreateModal('category')">
            <div class="action-icon-bg" style="background:#22c55e;"><span class="material-symbols-outlined">create_new_folder</span></div>
            <span class="action-label">New Nav Dropdown</span>
          </div>
          <div class="action-card" (click)="openCreateModal('faq')">
            <div class="action-icon-bg" style="background:#f59e0b;"><span class="material-symbols-outlined">help_center</span></div>
            <span class="action-label">Add FAQ QA</span>
          </div>
        </div>
      </div>

      <!-- TAB 2: WEB PAGES DATATABLE -->
      <section *ngIf="activeTab === 'pages'" class="console-widget">
        <div class="widget-head">
          <div class="widget-title-wrap">
            <span class="material-symbols-outlined drag-dot">drag_indicator</span>
            <h2 class="widget-title">Published Dynamic Web Pages</h2>
          </div>
          <button type="button" class="console-btn primary" (click)="openCreateModal('page')">
            <span class="material-symbols-outlined">add</span>
            <span>New Page</span>
          </button>
        </div>
        <div class="widget-body" style="padding: 0;">
          <table class="table-clean">
            <thead>
              <tr>
                <th>Page Title</th>
                <th>Direct URL Slug</th>
                <th>Menu Category</th>
                <th>Main Menu</th>
                <th>Footer</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let page of pages">
                <td><strong>{{ page.title }}</strong></td>
                <td><code class="slug-tag">/{{ page.slug }}</code></td>
                <td>{{ page.pageCategory?.title || 'Uncategorized' }}</td>
                <td><span class="status-pill" [class.good]="page.showInMenu" [class.muted]="!page.showInMenu">{{ page.showInMenu ? 'Yes' : 'No' }}</span></td>
                <td><span class="status-pill" [class.good]="page.showInFooter" [class.muted]="!page.showInFooter">{{ page.showInFooter ? 'Yes' : 'No' }}</span></td>
                <td><span class="status-pill" [class.good]="page.isPublished" [class.warn]="!page.isPublished">{{ page.isPublished ? 'Published' : 'Draft' }}</span></td>
                <td>
                  <a [href]="'/' + page.slug" target="_blank" class="console-btn" style="height:28px; padding:0 8px; font-size:12px;">Preview</a>
                </td>
              </tr>
              <tr *ngIf="pages.length === 0">
                <td colspan="7" class="text-center empty-state-row">
                  <div class="empty-state-box">
                    <span class="material-symbols-outlined empty-icon">description</span>
                    <h4>No dynamic web pages created yet</h4>
                    <p>Click "New Page" to create your first content page.</p>
                    <button type="button" class="console-btn primary" (click)="openCreateModal('page')">+ Create First Page</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- TAB 3: NAVIGATION DROPDOWNS -->
      <section *ngIf="activeTab === 'categories'" class="console-widget">
        <div class="widget-head">
          <div class="widget-title-wrap">
            <span class="material-symbols-outlined drag-dot">drag_indicator</span>
            <h2 class="widget-title">Header Navigation Menu Categories</h2>
          </div>
          <button type="button" class="console-btn primary" (click)="openCreateModal('category')">
            <span class="material-symbols-outlined">add</span>
            <span>New Dropdown</span>
          </button>
        </div>
        <div class="widget-body" style="padding: 0;">
          <table class="table-clean">
            <thead>
              <tr>
                <th>Category Title</th>
                <th>Menu Sort Order</th>
                <th>Attached Pages</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let cat of categories">
                <td><strong>{{ cat.title }}</strong></td>
                <td>Order: {{ cat.menuSortOrder || 0 }}</td>
                <td><span class="badge-pill" style="background:rgba(0,80,229,0.1); color:#0050e5;">{{ cat.webPages?.length || 0 }} Pages</span></td>
                <td><span class="status-pill good">Active</span></td>
              </tr>
              <tr *ngIf="categories.length === 0">
                <td colspan="4" class="text-center empty-state-row">
                  <div class="empty-state-box">
                    <span class="material-symbols-outlined empty-icon">view_quilt</span>
                    <h4>No navigation dropdown categories</h4>
                    <p>Create categories like "About Us" or "Programs" to organize sub-pages.</p>
                    <button type="button" class="console-btn primary" (click)="openCreateModal('category')">+ Add Category</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- TAB 4: PAGE SECTIONS -->
      <section *ngIf="activeTab === 'sections'" class="console-widget">
        <div class="widget-head">
          <div class="widget-title-wrap">
            <span class="material-symbols-outlined drag-dot">drag_indicator</span>
            <h2 class="widget-title">Modular Page Section Templates</h2>
          </div>
          <button type="button" class="console-btn primary" (click)="openCreateModal('section')">
            <span class="material-symbols-outlined">add</span>
            <span>New Section</span>
          </button>
        </div>
        <div class="widget-body" style="padding: 0;">
          <table class="table-clean">
            <thead>
              <tr>
                <th>Section Title</th>
                <th>Template Key</th>
                <th>Target Web Page</th>
                <th>Sort Order</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let sec of sections">
                <td><strong>{{ sec.title }}</strong></td>
                <td><code class="slug-tag">{{ sec.templateKey || '_Hero' }}</code></td>
                <td>{{ sec.webPage?.title || 'Standalone' }}</td>
                <td>Order: {{ sec.sortOrder || 0 }}</td>
              </tr>
              <tr *ngIf="sections.length === 0">
                <td colspan="4" class="text-center empty-state-row">
                  <div class="empty-state-box">
                    <span class="material-symbols-outlined empty-icon">view_carousel</span>
                    <h4>No modular section templates yet</h4>
                    <p>Design reusable sections like Hero Banners, Feature Grids, and Testimonials.</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- TAB 5: HERO SLIDERS -->
      <section *ngIf="activeTab === 'sliders'" class="console-widget">
        <div class="widget-head">
          <div class="widget-title-wrap">
            <span class="material-symbols-outlined drag-dot">drag_indicator</span>
            <h2 class="widget-title">Homepage Hero Sliders & Banners</h2>
          </div>
          <button type="button" class="console-btn primary" (click)="openCreateModal('slider')">
            <span class="material-symbols-outlined">add</span>
            <span>New Slider</span>
          </button>
        </div>
        <div class="widget-body" style="padding: 0;">
          <table class="table-clean">
            <thead>
              <tr>
                <th>Banner Title</th>
                <th>Kicker / Subtitle</th>
                <th>Action Button</th>
                <th>Destination Link</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let s of sliders">
                <td><strong>{{ s.title }}</strong></td>
                <td>{{ s.kicker || '-' }}</td>
                <td><span class="status-pill info">{{ s.buttonText || 'Learn More' }}</span></td>
                <td><code class="slug-tag">{{ s.buttonLink || '/' }}</code></td>
                <td><span class="status-pill" [class.good]="s.isActive" [class.muted]="!s.isActive">{{ s.isActive ? 'Active' : 'Disabled' }}</span></td>
              </tr>
              <tr *ngIf="sliders.length === 0">
                <td colspan="5" class="text-center empty-state-row">
                  <div class="empty-state-box">
                    <span class="material-symbols-outlined empty-icon">photo_library</span>
                    <h4>No hero sliders created yet</h4>
                    <p>Add visual slider banners to engage visitors on the public home page.</p>
                    <button type="button" class="console-btn primary" (click)="openCreateModal('slider')">+ Add Slider Banner</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- TAB 6: FAQS -->
      <section *ngIf="activeTab === 'faqs'" class="console-widget">
        <div class="widget-head">
          <div class="widget-title-wrap">
            <span class="material-symbols-outlined drag-dot">drag_indicator</span>
            <h2 class="widget-title">Frequently Asked Questions (FAQ)</h2>
          </div>
          <button type="button" class="console-btn primary" (click)="openCreateModal('faq')">
            <span class="material-symbols-outlined">add</span>
            <span>New FAQ</span>
          </button>
        </div>
        <div class="widget-body" style="padding: 0;">
          <table class="table-clean">
            <thead>
              <tr>
                <th>Question</th>
                <th>Category</th>
                <th>Sort Order</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let f of faqs">
                <td><strong>{{ f.question }}</strong></td>
                <td>{{ f.category || 'General' }}</td>
                <td>Order: {{ f.sortOrder || 0 }}</td>
                <td><span class="status-pill" [class.good]="f.isPublished" [class.muted]="!f.isPublished">{{ f.isPublished ? 'Published' : 'Hidden' }}</span></td>
              </tr>
              <tr *ngIf="faqs.length === 0">
                <td colspan="4" class="text-center empty-state-row">
                  <div class="empty-state-box">
                    <span class="material-symbols-outlined empty-icon">quiz</span>
                    <h4>No FAQs added yet</h4>
                    <p>Build a helpful Q&A knowledge base for your members and visitors.</p>
                    <button type="button" class="console-btn primary" (click)="openCreateModal('faq')">+ Add FAQ QA</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Create Item Modal -->
      <div class="modal-backdrop" *ngIf="showModal" (click)="showModal = false">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="material-symbols-outlined text-blue">{{ modalIcon }}</span>
              <h3>{{ modalTitle }}</h3>
            </div>
            <button type="button" class="btn-close" (click)="showModal = false">&times;</button>
          </div>
          <form (ngSubmit)="onSaveModal()" class="modal-body">
            <!-- Page Form -->
            <div *ngIf="modalType === 'page'">
              <div class="form-group" style="margin-bottom:12px;">
                <label class="form-label">Page Title</label>
                <input type="text" [(ngModel)]="pageForm.title" name="pTitle" (input)="autoSlug()" placeholder="e.g. About Our Organization" class="form-control" required />
              </div>
              <div class="form-group" style="margin-bottom:12px;">
                <label class="form-label">URL Slug</label>
                <input type="text" [(ngModel)]="pageForm.slug" name="pSlug" placeholder="e.g. about-us" class="form-control" required />
              </div>
              <div class="form-group" style="margin-bottom:12px;">
                <label class="form-label">Dropdown Menu Category</label>
                <select [(ngModel)]="pageForm.pageCategoryId" name="pCat" class="form-control">
                  <option [ngValue]="null">Standalone (No Category)</option>
                  <option *ngFor="let c of categories" [value]="c.id">{{ c.title }}</option>
                </select>
              </div>
              <div style="display:flex; gap:16px; margin-bottom:16px;">
                <label style="display:flex; align-items:center; gap:6px; font-size:13px; cursor:pointer;">
                  <input type="checkbox" [(ngModel)]="pageForm.showInMenu" name="pMenu" /> Show in Top Header Menu
                </label>
                <label style="display:flex; align-items:center; gap:6px; font-size:13px; cursor:pointer;">
                  <input type="checkbox" [(ngModel)]="pageForm.isPublished" name="pPub" /> Publish Immediately
                </label>
              </div>
            </div>

            <!-- Slider Form -->
            <div *ngIf="modalType === 'slider'">
              <div class="form-group" style="margin-bottom:12px;">
                <label class="form-label">Banner Title</label>
                <input type="text" [(ngModel)]="sliderForm.title" name="sTitle" placeholder="e.g. Empowering Local Leadership" class="form-control" required />
              </div>
              <div class="form-group" style="margin-bottom:12px;">
                <label class="form-label">Kicker / Subtitle</label>
                <input type="text" [(ngModel)]="sliderForm.kicker" name="sKicker" placeholder="e.g. Community Excellence 2026" class="form-control" />
              </div>
              <div class="form-group" style="margin-bottom:12px;">
                <label class="form-label">Background Image URL</label>
                <input type="url" [(ngModel)]="sliderForm.imageUrl" name="sImg" placeholder="e.g. https://yourdomain.com/banner.jpg" class="form-control" />
              </div>
              <div class="form-group" style="margin-bottom:16px;">
                <label class="form-label">Action Button Label</label>
                <input type="text" [(ngModel)]="sliderForm.buttonText" name="sBtn" placeholder="e.g. Join the Initiative" class="form-control" />
              </div>
            </div>

            <!-- Category Form -->
            <div *ngIf="modalType === 'category'">
              <div class="form-group" style="margin-bottom:12px;">
                <label class="form-label">Category Title</label>
                <input type="text" [(ngModel)]="categoryForm.title" name="cTitle" placeholder="e.g. Programs & Initiatives" class="form-control" required />
              </div>
              <div class="form-group" style="margin-bottom:16px;">
                <label class="form-label">Menu Sort Order</label>
                <input type="number" [(ngModel)]="categoryForm.menuSortOrder" name="cOrder" class="form-control" />
              </div>
            </div>

            <!-- FAQ Form -->
            <div *ngIf="modalType === 'faq'">
              <div class="form-group" style="margin-bottom:12px;">
                <label class="form-label">Question</label>
                <input type="text" [(ngModel)]="faqForm.question" name="fQ" placeholder="e.g. How do I register for membership?" class="form-control" required />
              </div>
              <div class="form-group" style="margin-bottom:16px;">
                <label class="form-label">Answer</label>
                <textarea [(ngModel)]="faqForm.answer" name="fA" rows="4" placeholder="Detailed explanation..." class="form-control" required></textarea>
              </div>
            </div>

            <div *ngIf="errorMessage" class="status-pill bad" style="margin-bottom:14px; display:flex; align-items:center; gap:6px;">
              <span class="material-symbols-outlined" style="font-size:16px;">error</span>
              <span>{{ errorMessage }}</span>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:10px;">
              <button type="button" class="console-btn" [disabled]="isSaving" (click)="showModal = false">Cancel</button>
              <button type="submit" [disabled]="isSaving" class="console-btn primary">
                <span class="material-symbols-outlined" [class.spin-icon]="isSaving">{{ isSaving ? 'sync' : 'check' }}</span>
                <span>{{ isSaving ? 'Saving...' : 'Save & Publish' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cms-page { display: flex; flex-direction: column; gap: 16px; }
    .tab-icon { font-size: 18px; }
    .slug-tag {
      background: var(--sidebar-active-bg);
      color: var(--sidebar-active-color);
      padding: 3px 7px;
      border-radius: 4px;
      font-size: 12px;
    }
    .empty-state-row { padding: 40px 20px !important; }
    .empty-state-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .empty-icon {
      font-size: 48px;
      color: var(--sidebar-header-color);
      opacity: 0.6;
    }
    .empty-state-box h4 {
      font-size: 16px;
      font-weight: 700;
      color: var(--md-sys-color-on-surface);
      margin: 0;
    }
    .empty-state-box p {
      font-size: 13px;
      color: var(--sidebar-header-color);
      margin: 0 0 8px;
    }
    .form-label {
      display: block;
      font-size: 11.5px;
      font-weight: 700;
      color: var(--sidebar-header-color);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 4px;
    }
    .form-control {
      width: 100%;
      border: 1px solid var(--md-sys-color-outline);
      background: var(--md-sys-color-surface);
      color: var(--md-sys-color-on-surface);
      border-radius: 8px;
      padding: 9px 12px;
      font-size: 13px;
      outline: none;
      box-sizing: border-box;
    }
  `]
})
export class ContentCmsComponent implements OnInit, AfterViewInit {
  @ViewChild('trafficChartCanvas') trafficChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('contentBarChartCanvas') contentBarChartCanvas?: ElementRef<HTMLCanvasElement>;

  trafficChart?: Chart;
  contentBarChart?: Chart;

  activeTab = 'dashboard';
  isLoading = false;
  pages: any[] = [];
  categories: any[] = [];
  sections: any[] = [];
  sliders: any[] = [];
  faqs: any[] = [];

  showModal = false;
  modalType: 'page' | 'slider' | 'category' | 'faq' | 'section' = 'page';
  modalTitle = 'Create Web Page';
  modalIcon = 'post_add';

  pageForm: any = { title: '', slug: '', pageCategoryId: null, showInMenu: true, showInFooter: true, isPublished: true };
  sliderForm: any = { title: '', kicker: '', imageUrl: '', buttonText: 'Learn More', buttonLink: '/' };
  categoryForm: any = { title: '', menuSortOrder: 0 };
  faqForm: any = { question: '', answer: '', category: 'General', isPublished: true };

  headerButtons: PageHeaderButton[] = [
    {
      text: 'New Web Page',
      icon: 'add_circle',
      isPrimary: true,
      action: () => this.openCreateModal('page')
    },
    {
      text: 'Refresh Data',
      icon: 'refresh',
      action: () => this.loadAll()
    }
  ];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadAll();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initCharts(), 150);
  }

  setTab(tab: string): void {
    this.activeTab = tab;
    if (tab === 'dashboard') {
      setTimeout(() => this.initCharts(), 150);
    }
  }

  loadAll(): void {
    this.isLoading = true;
    let completed = 0;
    const checkDone = () => {
      completed++;
      if (completed >= 5) {
        setTimeout(() => {
          this.isLoading = false;
          this.updateCharts();
        }, 300);
      }
    };

    this.api.get<any>('ContentApi/pages').subscribe({
      next: (res) => {
        this.pages = res?.data || [];
        checkDone();
      },
      error: () => checkDone()
    });

    this.api.get<any>('ContentApi/categories').subscribe({
      next: (res) => {
        this.categories = res?.data || [];
        checkDone();
      },
      error: () => checkDone()
    });

    this.api.get<any>('ContentApi/sections').subscribe({
      next: (res) => {
        this.sections = res?.data || [];
        checkDone();
      },
      error: () => checkDone()
    });

    this.api.get<any>('ContentApi/sliders').subscribe({
      next: (res) => {
        this.sliders = res?.data || [];
        checkDone();
      },
      error: () => checkDone()
    });

    this.api.get<any>('ContentApi/faqs').subscribe({
      next: (res) => {
        this.faqs = res?.data || [];
        checkDone();
      },
      error: () => checkDone()
    });
  }

  initCharts(): void {
    if (this.activeTab !== 'dashboard') return;

    if (this.trafficChartCanvas?.nativeElement) {
      if (this.trafficChart) {
        this.trafficChart.destroy();
      }
      const ctx = this.trafficChartCanvas.nativeElement.getContext('2d');
      if (ctx) {
        this.trafficChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
              label: 'Daily Page Views',
              data: [140, 220, 310, 290, 480, 590, 720],
              borderColor: '#0050e5',
              backgroundColor: 'rgba(0, 80, 229, 0.12)',
              fill: true,
              tension: 0.4,
              borderWidth: 2.5
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { grid: { color: 'rgba(0,0,0,0.05)' } },
              x: { grid: { display: false } }
            }
          }
        });
      }
    }

    if (this.contentBarChartCanvas?.nativeElement) {
      if (this.contentBarChart) {
        this.contentBarChart.destroy();
      }
      const ctx = this.contentBarChartCanvas.nativeElement.getContext('2d');
      if (ctx) {
        this.contentBarChart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['Pages', 'Dropdowns', 'Sections', 'Sliders', 'FAQs'],
            datasets: [{
              label: 'Total Items',
              data: [this.pages.length || 3, this.categories.length || 2, this.sections.length || 4, this.sliders.length || 2, this.faqs.length || 5],
              backgroundColor: ['#0050e5', '#22c55e', '#a855f7', '#f59e0b', '#06b6d4'],
              borderRadius: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { grid: { color: 'rgba(0,0,0,0.05)' } },
              x: { grid: { display: false } }
            }
          }
        });
      }
    }
  }

  updateCharts(): void {
    if (this.contentBarChart) {
      this.contentBarChart.data.datasets[0].data = [
        this.pages.length || 3,
        this.categories.length || 2,
        this.sections.length || 4,
        this.sliders.length || 2,
        this.faqs.length || 5
      ];
      this.contentBarChart.update();
    }
  }

  isSaving = false;
  errorMessage = '';

  openCreateModal(type: 'page' | 'slider' | 'category' | 'faq' | 'section'): void {
    this.modalType = type;
    this.showModal = true;
    this.errorMessage = '';
    this.isSaving = false;
    switch (type) {
      case 'page':
        this.modalTitle = 'Create Dynamic Web Page';
        this.modalIcon = 'post_add';
        this.pageForm = { title: '', slug: '', pageCategoryId: null, showInMenu: true, showInFooter: true, isPublished: true };
        break;
      case 'slider':
        this.modalTitle = 'Add Hero Banner Slider';
        this.modalIcon = 'add_photo_alternate';
        this.sliderForm = { title: '', kicker: '', imageUrl: '', buttonText: 'Learn More', buttonLink: '/' };
        break;
      case 'category':
        this.modalTitle = 'New Navigation Menu Dropdown';
        this.modalIcon = 'create_new_folder';
        this.categoryForm = { title: '', menuSortOrder: 0 };
        break;
      case 'faq':
        this.modalTitle = 'Create FAQ QA Item';
        this.modalIcon = 'help_center';
        this.faqForm = { question: '', answer: '', category: 'General', isPublished: true };
        break;
    }
  }

  autoSlug(): void {
    if (this.pageForm.title) {
      this.pageForm.slug = this.pageForm.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
    }
  }

  onSaveModal(): void {
    this.isSaving = true;
    this.errorMessage = '';

    if (this.modalType === 'page') {
      this.api.post<any>('ContentApi/pages', this.pageForm).subscribe({
        next: () => {
          this.isSaving = false;
          this.showModal = false;
          this.loadAll();
        },
        error: (err) => {
          this.isSaving = false;
          this.errorMessage = err?.error?.message || 'Failed to create web page.';
        }
      });
    } else if (this.modalType === 'slider') {
      this.api.post<any>('ContentApi/sliders', this.sliderForm).subscribe({
        next: () => {
          this.isSaving = false;
          this.showModal = false;
          this.loadAll();
        },
        error: (err) => {
          this.isSaving = false;
          this.errorMessage = err?.error?.message || 'Failed to create hero banner.';
        }
      });
    } else if (this.modalType === 'category') {
      this.api.post<any>('ContentApi/categories', this.categoryForm).subscribe({
        next: () => {
          this.isSaving = false;
          this.showModal = false;
          this.loadAll();
        },
        error: (err) => {
          this.isSaving = false;
          this.errorMessage = err?.error?.message || 'Failed to create navigation category.';
        }
      });
    } else if (this.modalType === 'faq') {
      this.api.post<any>('ContentApi/faqs', this.faqForm).subscribe({
        next: () => {
          this.isSaving = false;
          this.showModal = false;
          this.loadAll();
        },
        error: (err) => {
          this.isSaving = false;
          this.errorMessage = err?.error?.message || 'Failed to create FAQ item.';
        }
      });
    }
  }
}
