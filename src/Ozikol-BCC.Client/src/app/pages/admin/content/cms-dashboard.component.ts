import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-cms-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="cms-page-container">
      <!-- Top Header -->
      <div class="page-header">
        <div class="header-titles">
          <div class="breadcrumb">
            <a routerLink="/admin/dashboard">Command Center</a>
            <span class="sep">/</span>
            <span class="current">CMS Studio Dashboard</span>
          </div>
          <h1>Dynamic Content & CMS Intelligence</h1>
          <p class="subtitle">Real-time statistics, traffic density analytics, device breakdown, and web structure monitoring.</p>
        </div>
        <div class="header-actions">
          <a href="/" target="_blank" class="btn btn-outline visit-site-btn" title="Open live public website in new tab">
            <span class="material-symbols-outlined">open_in_new</span>
            <span>Visit Website</span>
          </a>
          <a routerLink="/admin/content/pages" class="btn btn-primary">
            <span class="material-symbols-outlined">add_circle</span>
            <span>New Web Page</span>
          </a>
          <button type="button" (click)="loadStats()" class="btn btn-outline" [disabled]="loading">
            <span class="material-symbols-outlined" [class.spin]="loading">refresh</span>
            <span>Refresh Analytics</span>
          </button>
        </div>
      </div>

      <!-- 1. Clickable Metric Cards Grid -->
      <div class="metrics-grid">
        <!-- Card 1: Web Pages -->
        <div class="metric-card clickable" (click)="navigateTo('/admin/content/pages')">
          <div class="card-top">
            <div class="card-icon bg-blue">
              <span class="material-symbols-outlined">description</span>
            </div>
            <span class="card-chip chip-blue">Live Pages</span>
          </div>
          <div class="card-value">{{ metrics?.totalPages || 0 }}</div>
          <div class="card-label">Total Web Pages</div>
          <div class="card-breakdown">
            <span class="text-green"><span class="dot bg-green"></span> {{ metrics?.publishedPages || 0 }} Published</span>
            <span class="text-amber"><span class="dot bg-amber"></span> {{ metrics?.unpublishedPages || 0 }} Drafts</span>
          </div>
        </div>

        <!-- Card 2: Categories -->
        <div class="metric-card clickable" (click)="navigateTo('/admin/content/categories')">
          <div class="card-top">
            <div class="card-icon bg-purple">
              <span class="material-symbols-outlined">folder_open</span>
            </div>
            <span class="card-chip chip-purple">Navigation</span>
          </div>
          <div class="card-value">{{ metrics?.totalCategories || 0 }}</div>
          <div class="card-label">Menu Categories</div>
          <div class="card-breakdown">
            <span class="text-green"><span class="dot bg-green"></span> {{ metrics?.publishedCategories || 0 }} Published</span>
            <span class="text-muted"><span class="dot bg-muted"></span> {{ metrics?.unpublishedCategories || 0 }} Hidden</span>
          </div>
        </div>

        <!-- Card 3: Hero Sliders -->
        <div class="metric-card clickable" (click)="navigateTo('/admin/content/sliders')">
          <div class="card-top">
            <div class="card-icon bg-amber">
              <span class="material-symbols-outlined">view_carousel</span>
            </div>
            <span class="card-chip chip-amber">Carousels</span>
          </div>
          <div class="card-value">{{ metrics?.totalSliders || 0 }}</div>
          <div class="card-label">Hero Sliders</div>
          <div class="card-breakdown">
            <span class="text-green"><span class="dot bg-green"></span> {{ metrics?.publishedSliders || 0 }} Active</span>
          </div>
        </div>

        <!-- Card 4: FAQs -->
        <div class="metric-card clickable" (click)="navigateTo('/admin/content/faqs')">
          <div class="card-top">
            <div class="card-icon bg-teal">
              <span class="material-symbols-outlined">quiz</span>
            </div>
            <span class="card-chip chip-teal">Knowledge</span>
          </div>
          <div class="card-value">{{ metrics?.totalFaqs || 0 }}</div>
          <div class="card-label">FAQs & Answers</div>
          <div class="card-breakdown">
            <span class="text-green"><span class="dot bg-green"></span> {{ metrics?.publishedFaqs || 0 }} Active</span>
            <span class="text-blue">{{ metrics?.totalFaqCategories || 0 }} Categories</span>
          </div>
        </div>

        <!-- Card 5: Template Engine -->
        <div class="metric-card">
          <div class="card-top">
            <div class="card-icon bg-rose">
              <span class="material-symbols-outlined">palette</span>
            </div>
            <span class="card-chip chip-rose">Theme Engine</span>
          </div>
          <div class="card-value" style="font-size: 18px; margin-top: 6px;">{{ metrics?.templateName || 'Enterprise Pro' }}</div>
          <div class="card-label">Active Website Theme</div>
          <div class="card-breakdown">
            <span class="text-green"><span class="dot bg-green"></span> CSS Tokens Loaded</span>
          </div>
        </div>
      </div>

      <!-- 2. Main Analytics Row: Traffic Histogram & Device Breakdown -->
      <div class="analytics-row">
        <!-- Traffic Density Histogram -->
        <div class="analytics-card flex-2">
          <div class="card-header-bar">
            <div>
              <h3>User Traffic & Activity Histogram</h3>
              <p class="card-sub">Session density and visitor activity volume across your website.</p>
            </div>
            <div class="range-selector">
              <button type="button" [class.active]="selectedRange === '24h'" (click)="setRange('24h')">24 Hours</button>
              <button type="button" [class.active]="selectedRange === '7d'" (click)="setRange('7d')">Weekly</button>
              <button type="button" [class.active]="selectedRange === '30d'" (click)="setRange('30d')">Monthly</button>
              <button type="button" [class.active]="selectedRange === '1y'" (click)="setRange('1y')">Yearly</button>
            </div>
          </div>

          <!-- CSS Bar Histogram Visualization -->
          <div class="histogram-chart">
            <div class="bar-col" *ngFor="let item of histogram">
              <div class="bar-container">
                <div class="bar-fill" [style.height.%]="getBarHeight(item.visits)">
                  <span class="tooltip">{{ item.visits }} visits</span>
                </div>
              </div>
              <span class="bar-label">{{ item.label }}</span>
            </div>
          </div>
        </div>

        <!-- Devices & Browsers Distribution -->
        <div class="analytics-card flex-1">
          <div class="card-header-bar">
            <div>
              <h3>Device Distribution</h3>
              <p class="card-sub">Client hardware used to access website.</p>
            </div>
          </div>

          <div class="device-list">
            <div class="device-item" *ngFor="let dev of deviceStats">
              <div class="device-info">
                <span class="device-name">{{ dev.name }}</span>
                <span class="device-pct">{{ dev.percentage }}%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" [style.width.%]="dev.percentage"></div>
              </div>
            </div>
          </div>

          <div class="browser-pills">
            <div class="browser-header">Top Web Browsers:</div>
            <div class="pills-container">
              <span class="browser-pill" *ngFor="let b of browserStats" [style.border-left-color]="b.color">
                {{ b.name }}: <strong>{{ b.percentage }}%</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Lower Row: Most Visited Pages & Broken Pages Detector -->
      <div class="analytics-row">
        <!-- Most Visited Pages Table -->
        <div class="analytics-card flex-1">
          <div class="card-header-bar">
            <div>
              <h3>Most Visited Web Pages</h3>
              <p class="card-sub">Top ranked pages by cumulative user views.</p>
            </div>
            <a routerLink="/admin/content/pages" class="link-btn">View All Pages &rarr;</a>
          </div>

          <div class="table-responsive">
            <table class="cms-table">
              <thead>
                <tr>
                  <th>PAGE TITLE</th>
                  <th>SLUG ROUTE</th>
                  <th>CATEGORY</th>
                  <th>VIEWS</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let p of mostVisitedPages">
                  <td><strong>{{ p.title }}</strong></td>
                  <td><code>/{{ p.slug }}</code></td>
                  <td><span class="badge-cat">{{ p.category }}</span></td>
                  <td><span class="badge-views">{{ p.views }} visits</span></td>
                  <td>
                    <span class="status-pill" [class.published]="p.publish" [class.draft]="!p.publish">
                      {{ p.publish ? 'Published' : 'Draft' }}
                    </span>
                  </td>
                  <td>
                    <a [routerLink]="['/admin/content/pages/edit', p.id]" class="btn-action-sm">Edit</a>
                  </td>
                </tr>
                <tr *ngIf="mostVisitedPages.length === 0">
                  <td colspan="6" class="empty-cell">No web pages found.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Broken Pages & Alerts -->
        <div class="analytics-card flex-1">
          <div class="card-header-bar">
            <div>
              <h3>Health & Route Alerts</h3>
              <p class="card-sub">Pages requiring review or layout configuration.</p>
            </div>
          </div>

          <div class="alerts-list">
            <div class="alert-item" *ngFor="let item of brokenPages">
              <div class="alert-icon">
                <span class="material-symbols-outlined text-amber">warning</span>
              </div>
              <div class="alert-content">
                <div class="alert-title">{{ item.title }} (<code>/{{ item.slug }}</code>)</div>
                <div class="alert-desc">{{ item.issue }}</div>
              </div>
              <a [routerLink]="['/admin/content/pages/edit', item.id]" class="btn-resolve">Fix Page</a>
            </div>
            <div class="alert-clean" *ngIf="brokenPages.length === 0">
              <span class="material-symbols-outlined text-green">check_circle</span>
              <p>All web pages have valid slugs and published sections!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cms-page-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      background: var(--md-sys-color-surface, #ffffff);
      padding: 24px 28px;
      border-radius: 16px;
      border: 1px solid var(--md-sys-color-outline, #e2e8f0);
      box-shadow: 0 4px 20px rgba(0,0,0,0.03);
    }
    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #64748b;
      margin-bottom: 6px;
    }
    .breadcrumb a { color: #0050e5; text-decoration: none; font-weight: 600; }
    .page-header h1 {
      font-size: 26px;
      font-weight: 800;
      color: var(--md-sys-color-on-surface, #0f172a);
      margin: 0 0 4px;
      letter-spacing: -0.5px;
    }
    .subtitle { color: #64748b; font-size: 14px; margin: 0; }
    .header-actions { display: flex; gap: 12px; }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s;
    }
    .btn-primary { background: #0050e5; color: #fff; border: none; }
    .btn-primary:hover { background: #003ebd; transform: translateY(-1px); }
    .btn-outline { background: transparent; border: 1px solid #cbd5e1; color: #334155; }
    .btn-outline:hover { background: #f8fafc; }
    .visit-site-btn {
      color: #0050e5;
      border-color: #bfdbfe;
      background: #eff6ff;
    }
    .visit-site-btn:hover {
      background: #dbeafe;
      border-color: #93c5fd;
      color: #003ebd;
      transform: translateY(-1px);
    }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }

    .cms-nav-tabs {
      display: flex;
      gap: 8px;
      background: var(--md-sys-color-surface, #ffffff);
      padding: 8px 12px;
      border-radius: 12px;
      border: 1px solid var(--md-sys-color-outline, #e2e8f0);
      overflow-x: auto;
    }
    .nav-tab {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      color: #64748b;
      text-decoration: none;
      transition: all 0.2s;
    }
    .nav-tab:hover { background: #f1f5f9; color: #0050e5; }
    .nav-tab.active { background: #0050e5; color: #fff; }
    .tab-badge {
      background: rgba(0,0,0,0.08);
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
    }
    .nav-tab.active .tab-badge { background: rgba(255,255,255,0.25); color: #fff; }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 18px;
    }
    .metric-card {
      background: var(--md-sys-color-surface, #ffffff);
      border: 1px solid var(--md-sys-color-outline, #e2e8f0);
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.02);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .metric-card.clickable { cursor: pointer; }
    .metric-card.clickable:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 25px rgba(0,80,229,0.08);
      border-color: #0050e5;
    }
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .card-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
    }
    .bg-blue { background: linear-gradient(135deg, #0050e5, #3b82f6); }
    .bg-purple { background: linear-gradient(135deg, #9333ea, #a855f7); }
    .bg-amber { background: linear-gradient(135deg, #d97706, #f59e0b); }
    .bg-teal { background: linear-gradient(135deg, #0d9488, #14b8a6); }
    .bg-rose { background: linear-gradient(135deg, #e11d48, #f43f5e); }
    .card-chip { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; text-transform: uppercase; }
    .chip-blue { background: #eff6ff; color: #1d4ed8; }
    .chip-purple { background: #faf5ff; color: #7e22ce; }
    .chip-amber { background: #fffbeb; color: #b45309; }
    .chip-teal { background: #f0fdf4; color: #15803d; }
    .chip-rose { background: #fff1f2; color: #be123c; }

    .card-value { font-size: 30px; font-weight: 800; color: var(--md-sys-color-on-surface, #0f172a); }
    .card-label { font-size: 13px; font-weight: 600; color: #64748b; margin-bottom: 12px; }
    .card-breakdown {
      display: flex;
      gap: 12px;
      font-size: 12px;
      font-weight: 600;
      border-top: 1px solid #f1f5f9;
      padding-top: 10px;
    }
    .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 4px; }
    .bg-green { background: #22c55e; }
    .bg-amber { background: #f59e0b; }
    .bg-muted { background: #94a3b8; }
    .text-green { color: #16a34a; }
    .text-amber { color: #d97706; }
    .text-blue { color: #0050e5; }
    .text-muted { color: #64748b; }

    .analytics-row {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
    }
    .flex-2 { flex: 2; min-width: 320px; }
    .flex-1 { flex: 1; min-width: 300px; }
    .analytics-card {
      background: var(--md-sys-color-surface, #ffffff);
      border: 1px solid var(--md-sys-color-outline, #e2e8f0);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.02);
    }
    .card-header-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
    }
    .card-header-bar h3 { font-size: 17px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
    .card-sub { font-size: 13px; color: #64748b; margin: 0; }
    .range-selector {
      display: flex;
      background: #f1f5f9;
      padding: 4px;
      border-radius: 10px;
      gap: 4px;
    }
    .range-selector button {
      border: none;
      background: transparent;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      transition: all 0.2s;
    }
    .range-selector button.active {
      background: #ffffff;
      color: #0050e5;
      box-shadow: 0 2px 6px rgba(0,0,0,0.08);
    }

    .histogram-chart {
      display: flex;
      align-items: flex-end;
      height: 180px;
      gap: 12px;
      padding-top: 20px;
      border-bottom: 2px solid #e2e8f0;
    }
    .bar-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 100%;
      justify-content: flex-end;
    }
    .bar-container {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }
    .bar-fill {
      width: 80%;
      background: linear-gradient(180deg, #0050e5, #38bdf8);
      border-radius: 6px 6px 0 0;
      position: relative;
      transition: height 0.4s ease;
      min-height: 8px;
    }
    .bar-fill:hover { background: linear-gradient(180deg, #003ebd, #0284c7); }
    .bar-label { font-size: 11px; color: #64748b; font-weight: 600; margin-top: 8px; }
    .tooltip {
      position: absolute;
      top: -28px;
      left: 50%;
      transform: translateX(-50%);
      background: #0f172a;
      color: #fff;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      white-space: nowrap;
      display: none;
    }
    .bar-fill:hover .tooltip { display: block; }

    .device-list { display: flex; flex-direction: column; gap: 14px; margin-bottom: 20px; }
    .device-info { display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; color: #1e293b; margin-bottom: 4px; }
    .progress-bar { height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
    .progress-fill { height: 100%; background: #0050e5; border-radius: 4px; }
    .browser-pills { border-top: 1px solid #f1f5f9; padding-top: 14px; }
    .browser-header { font-size: 12px; font-weight: 700; color: #64748b; margin-bottom: 8px; text-transform: uppercase; }
    .pills-container { display: flex; flex-wrap: wrap; gap: 8px; }
    .browser-pill {
      font-size: 12px;
      background: #f8fafc;
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      border-left-width: 4px;
    }

    .cms-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .cms-table th {
      text-align: left;
      padding: 10px 12px;
      background: #f8fafc;
      color: #64748b;
      font-weight: 700;
      border-bottom: 1px solid #e2e8f0;
      font-size: 11px;
      text-transform: uppercase;
    }
    .cms-table td {
      padding: 12px;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
    }
    .badge-cat { background: #f1f5f9; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; color: #475569; }
    .badge-views { background: #eff6ff; color: #1d4ed8; padding: 3px 8px; border-radius: 6px; font-weight: 700; font-size: 11px; }
    .status-pill {
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
    }
    .status-pill.published { background: #dcfce7; color: #15803d; }
    .status-pill.draft { background: #fef3c7; color: #b45309; }
    .btn-action-sm {
      padding: 4px 10px;
      background: #f1f5f9;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      color: #0050e5;
      text-decoration: none;
    }
    .btn-action-sm:hover { background: #0050e5; color: #fff; }
    .link-btn { font-size: 13px; color: #0050e5; text-decoration: none; font-weight: 600; }
    .link-btn:hover { text-decoration: underline; }

    .alerts-list { display: flex; flex-direction: column; gap: 12px; }
    .alert-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 12px;
    }
    .alert-content { flex: 1; }
    .alert-title { font-size: 13px; font-weight: 700; color: #92400e; }
    .alert-desc { font-size: 12px; color: #b45309; }
    .btn-resolve {
      padding: 6px 12px;
      background: #d97706;
      color: #fff;
      font-size: 12px;
      font-weight: 600;
      border-radius: 6px;
      text-decoration: none;
    }
    .alert-clean {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 16px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 12px;
      color: #166534;
      font-size: 13px;
      font-weight: 600;
    }
  `]
})
export class CmsDashboardComponent implements OnInit {
  loading = false;
  selectedRange = '24h';
  metrics: any = null;
  histogram: any[] = [];
  mostVisitedPages: any[] = [];
  brokenPages: any[] = [];
  deviceStats: any[] = [];
  browserStats: any[] = [];

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.loading = true;
    this.api.get<any>(`CmsDashboardApi/stats?range=${this.selectedRange}`).subscribe({
      next: (res) => {
        this.loading = false;
        const payload = res?.data || res?.Data || res;
        if (payload) {
          this.metrics = payload.metrics || payload.Metrics || {};
          this.histogram = payload.trafficHistogram || payload.TrafficHistogram || [];
          this.mostVisitedPages = payload.mostVisitedPages || payload.MostVisitedPages || [];
          this.brokenPages = payload.brokenPages || payload.BrokenPages || [];
          this.deviceStats = payload.deviceStats || payload.DeviceStats || [];
          this.browserStats = payload.browserStats || payload.BrowserStats || [];
        }
      },
      error: (err) => {
        this.loading = false;
        console.error('[CMS Dashboard] Failed to load statistics:', err);
        // If unauthorized (401) or network error without a token, go to login
        if (err.status === 401 || err.status === 403 || (err.status === 0 && !localStorage.getItem('access_token'))) {
          this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/admin/content' } });
        }
      }
    });
  }

  setRange(range: string): void {
    this.selectedRange = range;
    this.loadStats();
  }

  getBarHeight(visits: number): number {
    if (!this.histogram || this.histogram.length === 0) return 20;
    const max = Math.max(...this.histogram.map(h => h.visits || 1));
    return Math.max(15, Math.round((visits / max) * 100));
  }

  navigateTo(url: string): void {
    this.router.navigateByUrl(url);
  }
}
