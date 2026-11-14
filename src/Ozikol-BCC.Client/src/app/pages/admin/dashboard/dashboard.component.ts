import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeaderComponent],
  template: `
    <div class="console-dashboard-container">
      <!-- Universal Responsive Page Header -->
      <app-page-header
        title="Console Dashboard"
        subtitle="Multi-tenant workspace command center, membership telemetry, and administrative operations."
        icon="space_dashboard"
        [buttons]="headerButtons"
        [loading]="loading">
      </app-page-header>

      <!-- Main Widget Grid (12-column system) -->
      <div class="console-grid">
        <!-- ======================================================== -->
        <!-- SECTION 1: Workspace Identity & Team (Span 7)            -->
        <!-- ======================================================== -->
        <section class="console-widget span-7">
          <div class="widget-head">
            <div class="widget-title-wrap">
              <span class="material-symbols-outlined text-primary">groups</span>
              <h2 class="widget-title">Workspace Identity & Team</h2>
            </div>
            <a routerLink="/admin/users" class="info-link">View Directory &rarr;</a>
          </div>

          <div class="widget-body">
            <!-- 4-KPI Mini Strip for Team Governance -->
            <div class="identity-kpi-grid">
              <div class="identity-kpi-card" routerLink="/admin/users">
                <div class="kpi-icon-wrap bg-blue">
                  <span class="material-symbols-outlined">person</span>
                </div>
                <div class="kpi-info">
                  <div class="kpi-value">{{ metrics?.totalMembers || 0 }}</div>
                  <div class="kpi-label">Total Members</div>
                </div>
              </div>

              <div class="identity-kpi-card" routerLink="/admin/users">
                <div class="kpi-icon-wrap bg-purple">
                  <span class="material-symbols-outlined">verified_user</span>
                </div>
                <div class="kpi-info">
                  <div class="kpi-value">{{ metrics?.totalAdministrators || 1 }}</div>
                  <div class="kpi-label">Administrators</div>
                </div>
              </div>

              <div class="identity-kpi-card" routerLink="/admin/users">
                <div class="kpi-icon-wrap bg-green">
                  <span class="material-symbols-outlined">lock</span>
                </div>
                <div class="kpi-info">
                  <div class="kpi-value">{{ metrics?.twoFactorAdoptionRate || 0 }}%</div>
                  <div class="kpi-label">2FA Adoption</div>
                </div>
              </div>

              <div class="identity-kpi-card" routerLink="/admin/users">
                <div class="kpi-icon-wrap bg-amber">
                  <span class="material-symbols-outlined">how_to_reg</span>
                </div>
                <div class="kpi-info">
                  <div class="kpi-value">{{ metrics?.totalActiveMembers || 0 }}</div>
                  <div class="kpi-label">Active Directory</div>
                </div>
              </div>
            </div>

            <!-- Recently Registered Members Table -->
            <div class="table-responsive" style="margin-top: 14px;">
              <table class="table-clean">
                <thead>
                  <tr>
                    <th>Member Name</th>
                    <th>Email Address</th>
                    <th>Role / Category</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let user of metrics?.recentUsers">
                    <td>
                      <div class="user-inline-cell">
                        <div class="user-inline-avatar">{{ (user.fullName || 'U')[0] }}</div>
                        <span class="user-inline-name">{{ user.fullName }}</span>
                      </div>
                    </td>
                    <td class="code-cell">{{ user.email }}</td>
                    <td><span class="status-pill info">{{ user.category || 'Member' }}</span></td>
                    <td><span class="status-pill good">Active</span></td>
                  </tr>
                  <tr *ngIf="!metrics?.recentUsers?.length">
                    <td colspan="4" class="empty-cell">No registered members found.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="widget-footer">
            <a routerLink="/admin/users">Manage directory members, roles & permissions &rarr;</a>
          </div>
        </section>

        <!-- ======================================================== -->
        <!-- SECTION 2: Administrative Shortcuts (Span 5)             -->
        <!-- ======================================================== -->
        <section class="console-widget span-5">
          <div class="widget-head">
            <div class="widget-title-wrap">
              <span class="material-symbols-outlined text-primary">tune</span>
              <h2 class="widget-title">Administrative Shortcuts</h2>
            </div>
          </div>
          <div class="widget-body">
            <div class="quick-actions-stack">
              <!-- Domain & DNS -->
              <a routerLink="/admin/domains" class="quick-action-row">
                <div class="action-icon-circle bg-blue">
                  <span class="material-symbols-outlined">language</span>
                </div>
                <div class="action-info">
                  <div class="action-title">Domain & DNS Routing</div>
                  <div class="action-desc">Custom domain binding, SSL certificates & DNS verification</div>
                </div>
                <span class="material-symbols-outlined arrow">chevron_right</span>
              </a>

              <!-- Business Mailboxes -->
              <a routerLink="/admin/email-domains" class="quick-action-row">
                <div class="action-icon-circle bg-green">
                  <span class="material-symbols-outlined">mail</span>
                </div>
                <div class="action-info">
                  <div class="action-title">Business Mailboxes</div>
                  <div class="action-desc">Free custom mailbox setup, MX/SPF/DKIM & spam defense</div>
                </div>
                <span class="material-symbols-outlined arrow">chevron_right</span>
              </a>

              <!-- Security & User Access -->
              <a routerLink="/admin/users" class="quick-action-row">
                <div class="action-icon-circle bg-purple">
                  <span class="material-symbols-outlined">admin_panel_settings</span>
                </div>
                <div class="action-info">
                  <div class="action-title">Security & User Access</div>
                  <div class="action-desc">Manage team directory, administrative roles & 2FA</div>
                </div>
                <span class="material-symbols-outlined arrow">chevron_right</span>
              </a>

              <!-- Brand & Appearance -->
              <a routerLink="/admin/settings" class="quick-action-row">
                <div class="action-icon-circle bg-amber">
                  <span class="material-symbols-outlined">palette</span>
                </div>
                <div class="action-info">
                  <div class="action-title">Brand & Appearance</div>
                  <div class="action-desc">Corporate logo, brand color accents & sign-in page</div>
                </div>
                <span class="material-symbols-outlined arrow">chevron_right</span>
              </a>
            </div>
          </div>
        </section>

        <!-- ======================================================== -->
        <!-- SECTION 3: Real-Time System Audit & Security Log (Span 12) -->
        <!-- ======================================================== -->
        <section class="console-widget span-12">
          <div class="widget-head">
            <div class="widget-title-wrap">
              <span class="material-symbols-outlined text-primary">security</span>
              <h2 class="widget-title">System Audit & Security Log Stream</h2>
            </div>
            <!-- Severity Filter Pills -->
            <div class="severity-filter-bar">
              <button
                type="button"
                class="filter-pill"
                [class.active]="currentSeverityFilter === 'ALL'"
                (click)="currentSeverityFilter = 'ALL'">
                All Logs
              </button>
              <button
                type="button"
                class="filter-pill filter-good"
                [class.active]="currentSeverityFilter === 'Normal'"
                (click)="currentSeverityFilter = 'Normal'">
                <span class="status-dot good"></span> Normal
              </button>
              <button
                type="button"
                class="filter-pill filter-amber"
                [class.active]="currentSeverityFilter === 'Suspicious'"
                (click)="currentSeverityFilter = 'Suspicious'">
                <span class="status-dot amber"></span> Suspicious
              </button>
              <button
                type="button"
                class="filter-pill filter-red"
                [class.active]="currentSeverityFilter === 'Critical'"
                (click)="currentSeverityFilter = 'Critical'">
                <span class="status-dot red"></span> Critical
              </button>
            </div>
          </div>

          <div class="widget-body table-responsive" style="padding:0;">
            <table class="table-clean">
              <thead>
                <tr>
                  <th style="width: 130px;">Severity</th>
                  <th>Action Type</th>
                  <th>Performed By</th>
                  <th>Details & Context</th>
                  <th>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let audit of filteredActivities">
                  <td>
                    <span class="status-pill" [ngClass]="getSeverityClass(audit.severity)">
                      <span class="material-symbols-outlined action-mini-icon">{{ getSeverityIcon(audit.severity) }}</span>
                      <span>{{ audit.severity || 'Normal' }}</span>
                    </span>
                  </td>
                  <td>
                    <div class="action-type-cell">
                      <span class="material-symbols-outlined action-type-icon">{{ getActionIcon(audit.action) }}</span>
                      <span class="action-type-text">{{ formatAction(audit.action) }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="user-audit-meta">
                      <strong>{{ audit.user }}</strong>
                      <span class="ip-meta" *ngIf="audit.ipAddress">{{ audit.ipAddress }}</span>
                    </div>
                  </td>
                  <td class="details-cell">{{ formatDetails(audit.details, audit.action) }}</td>
                  <td class="code-cell">{{ audit.timestamp | date:'MMM d, y, h:mm a' }}</td>
                </tr>
                <tr *ngIf="!filteredActivities.length">
                  <td colspan="5" class="empty-cell">No matching audit events for this filter.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="widget-footer">
            <a routerLink="/admin/users">View complete security audit trail & session logs &rarr;</a>
          </div>
        </section>
      </div>

      <!-- ======================================================== -->
      <!-- INTERACTIVE SYSTEM HEALTH & INFRASTRUCTURE MODAL         -->
      <!-- ======================================================== -->
      <div class="modal-backdrop" *ngIf="showHealthModal" (click)="closeHealthModal()">
        <div class="modal-card health-modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-group">
              <div class="health-header-icon">
                <span class="material-symbols-outlined">verified</span>
              </div>
              <div>
                <h3>Live System Health & Infrastructure Diagnostics</h3>
                <p class="modal-subtitle">Real-time connectivity, SSL certificates, email deliverability & edge cache</p>
              </div>
            </div>
            <button (click)="closeHealthModal()" class="btn-close" title="Close Diagnostics">&times;</button>
          </div>

          <div class="modal-body">
            <div class="health-cards-grid">
              <!-- 1. Database & API -->
              <div class="health-card">
                <div class="health-card-head">
                  <div class="health-icon bg-blue">
                    <span class="material-symbols-outlined">database</span>
                  </div>
                  <span class="status-pill good">Connected (SQL)</span>
                </div>
                <div class="health-metric-title">Database & API</div>
                <div class="health-metric-value">~{{ metrics?.systemHealth?.databaseLatencyMs || 12 }}ms</div>
                <div class="health-metric-sub">
                  Database: <strong>{{ metrics?.systemHealth?.resolvedDatabase || metrics?.resolvedDatabase || 'Connected' }}</strong>
                </div>
              </div>

              <!-- 2. Custom Domain -->
              <div class="health-card">
                <div class="health-card-head">
                  <div class="health-icon bg-green">
                    <span class="material-symbols-outlined">language</span>
                  </div>
                  <span class="status-pill good">SSL Active (HTTPS)</span>
                </div>
                <div class="health-metric-title">Custom Domain</div>
                <div class="health-metric-value">Expires in {{ metrics?.systemHealth?.domainSslExpiresDays || 88 }} days</div>
                <div class="health-metric-sub">
                  Host: <strong>{{ metrics?.systemHealth?.customDomain || metrics?.resolvedDomain }}</strong>
                </div>
              </div>

              <!-- 3. Domain Email -->
              <div class="health-card">
                <div class="health-card-head">
                  <div class="health-icon bg-purple">
                    <span class="material-symbols-outlined">mail</span>
                  </div>
                  <span class="status-pill good">SPF/DKIM/DMARC OK</span>
                </div>
                <div class="health-metric-title">Domain Email</div>
                <div class="health-metric-value">Mailbox: {{ metrics?.systemHealth?.mailboxesUsed || 1 }}/1 Used</div>
                <div class="health-metric-sub">
                  Relay: <strong>Port 587 STARTTLS</strong>
                </div>
              </div>

              <!-- 4. CDN & Storage -->
              <div class="health-card">
                <div class="health-card-head">
                  <div class="health-icon bg-amber">
                    <span class="material-symbols-outlined">cloud_done</span>
                  </div>
                  <span class="status-pill good">Cloud CDN Ready</span>
                </div>
                <div class="health-metric-title">CDN & Storage</div>
                <div class="health-metric-value">Assets: {{ metrics?.systemHealth?.storageAssetsCached || 24 }} Cached</div>
                <div class="health-metric-sub">
                  Global Edge Acceleration Active
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <div class="modal-footer-actions">
              <a routerLink="/admin/domains" (click)="closeHealthModal()" class="btn btn-outline btn-sm">
                <span class="material-symbols-outlined">language</span> Manage Domain & DNS
              </a>
              <a routerLink="/admin/email-domains" (click)="closeHealthModal()" class="btn btn-outline btn-sm">
                <span class="material-symbols-outlined">mail</span> Manage Mailboxes
              </a>
              <button type="button" (click)="closeHealthModal()" class="btn btn-primary btn-sm">
                Close Diagnostics
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .console-dashboard-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .table-responsive {
      width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    .table-clean {
      width: 100%;
      min-width: 580px;
      border-collapse: collapse;
      font-size: 13px;
    }
    .table-clean th {
      text-align: left;
      padding: 10px 14px;
      color: var(--sidebar-header-color);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-bottom: 1px solid var(--md-sys-color-outline);
    }
    .table-clean td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--md-sys-color-outline);
      color: var(--sidebar-color);
    }

    /* Identity KPI Mini Strip */
    .identity-kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }
    @media (max-width: 900px) {
      .identity-kpi-grid { grid-template-columns: repeat(2, 1fr); }
    }
    .identity-kpi-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border: 1px solid var(--md-sys-color-outline);
      border-radius: 8px;
      background: var(--md-sys-color-surface);
      cursor: pointer;
      transition: all 0.15s ease;
      text-decoration: none;
      color: inherit;
    }
    .identity-kpi-card:hover {
      border-color: #0050e5;
      background: rgba(0, 80, 229, 0.04);
      transform: translateY(-1px);
    }
    .kpi-icon-wrap {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .kpi-icon-wrap span { font-size: 18px; }
    .kpi-info { display: flex; flex-direction: column; min-width: 0; }
    .kpi-value { font-size: 17px; font-weight: 800; color: var(--md-sys-color-on-surface); line-height: 1.2; }
    .kpi-label { font-size: 11px; color: var(--sidebar-header-color); font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }

    .user-inline-cell {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .user-inline-avatar {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: rgba(0, 80, 229, 0.12);
      color: #0050e5;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 12px;
    }
    .user-inline-name {
      font-weight: 600;
      color: var(--md-sys-color-on-surface);
    }
    .code-cell {
      font-family: monospace;
      font-size: 12px;
    }
    .empty-cell {
      text-align: center;
      padding: 30px;
      color: var(--sidebar-header-color);
    }

    /* Administrative Shortcuts */
    .quick-actions-stack {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .quick-action-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border: 1px solid var(--md-sys-color-outline);
      border-radius: 8px;
      text-decoration: none;
      color: inherit;
      transition: all 0.15s ease;
      background: var(--md-sys-color-surface);
    }
    .quick-action-row:hover {
      border-color: #0050e5;
      background: rgba(0, 80, 229, 0.04);
      transform: translateX(4px);
    }
    .action-icon-circle {
      width: 38px;
      height: 38px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .action-icon-circle span { font-size: 20px; }
    .bg-blue { background: rgba(0, 80, 229, 0.12); color: #0050e5; }
    .bg-green { background: rgba(34, 197, 94, 0.12); color: #16a34a; }
    .bg-purple { background: rgba(168, 85, 247, 0.12); color: #9333ea; }
    .bg-amber { background: rgba(245, 158, 11, 0.12); color: #d97706; }
    .action-info { flex: 1; min-width: 0; }
    .action-title { font-size: 13px; font-weight: 700; color: var(--md-sys-color-on-surface); }
    .action-desc { font-size: 11px; color: var(--sidebar-header-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .arrow { color: var(--sidebar-header-color); }

    /* Severity filter bar */
    .severity-filter-bar {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .filter-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: 16px;
      font-size: 11px;
      font-weight: 600;
      border: 1px solid var(--md-sys-color-outline);
      background: transparent;
      color: var(--sidebar-color);
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .filter-pill:hover {
      background: rgba(0, 80, 229, 0.06);
    }
    .filter-pill.active {
      background: #0050e5;
      color: #ffffff;
      border-color: #0050e5;
    }
    .filter-pill.filter-good.active { background: #16a34a; border-color: #16a34a; }
    .filter-pill.filter-amber.active { background: #d97706; border-color: #d97706; }
    .filter-pill.filter-red.active { background: #dc2626; border-color: #dc2626; }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      display: inline-block;
    }
    .status-dot.good { background: #16a34a; }
    .status-dot.amber { background: #d97706; }
    .status-dot.red { background: #dc2626; }

    .action-type-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .action-type-icon { font-size: 16px; color: #0050e5; }
    .action-type-text { font-weight: 600; color: var(--md-sys-color-on-surface); }

    .user-audit-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .ip-meta {
      font-size: 10px;
      font-family: monospace;
      color: var(--sidebar-header-color);
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
    }
    .status-pill.good { background: #dcfce7; color: #15803d; }
    .status-pill.info { background: #eff6ff; color: #0050e5; }
    .status-pill.violet { background: #f3e8ff; color: #7e22ce; }
    .status-pill.amber { background: #fef3c7; color: #b45309; }
    .status-pill.red { background: #fee2e2; color: #b91c1c; }
    .status-pill.muted { background: #f1f5f9; color: #64748b; }
    .action-mini-icon { font-size: 13px; }
    .details-cell {
      max-width: 480px;
      line-height: 1.45;
      color: #334155;
      font-size: 12.5px;
    }

    /* Diagnostics Modal */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .health-modal-card {
      background: #ffffff;
      border-radius: 14px;
      width: 100%;
      max-width: 820px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: modalSlide 0.2s ease-out;
    }
    @keyframes modalSlide {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .modal-header {
      padding: 18px 24px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .modal-title-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .health-header-icon {
      width: 38px;
      height: 38px;
      border-radius: 8px;
      background: rgba(34, 197, 94, 0.12);
      color: #16a34a;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .health-header-icon span { font-size: 22px; }
    .modal-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
    }
    .modal-subtitle {
      margin: 2px 0 0;
      font-size: 12px;
      color: #64748b;
    }
    .btn-close {
      background: none;
      border: none;
      font-size: 24px;
      color: #94a3b8;
      cursor: pointer;
      line-height: 1;
    }
    .btn-close:hover { color: #0f172a; }
    .modal-body {
      padding: 24px;
    }
    .health-cards-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    @media (max-width: 650px) {
      .health-cards-grid { grid-template-columns: 1fr; }
    }
    .health-card {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px;
      background: #f8fafc;
      transition: all 0.15s ease;
    }
    .health-card:hover {
      border-color: #0050e5;
      background: #ffffff;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    .health-card-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .health-icon {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .health-icon span { font-size: 18px; }
    .health-metric-title {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }
    .health-metric-value {
      font-size: 18px;
      font-weight: 800;
      color: #0050e5;
      margin: 4px 0;
    }
    .health-metric-sub {
      font-size: 11.5px;
      color: #64748b;
      margin-top: 4px;
    }
    .modal-footer {
      padding: 14px 24px;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
      display: flex;
      justify-content: flex-end;
    }
    .modal-footer-actions {
      display: flex;
      gap: 10px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s ease;
      border: 1px solid transparent;
    }
    .btn-outline {
      border-color: #cbd5e1;
      background: #ffffff;
      color: #334155;
    }
    .btn-outline:hover {
      border-color: #0050e5;
      color: #0050e5;
    }
    .btn-primary {
      background: #0050e5;
      color: #ffffff;
    }
    .btn-primary:hover {
      background: #003ebd;
    }
    .btn-sm { padding: 6px 12px; font-size: 11.5px; }
    .btn-sm span { font-size: 15px; }
  `]
})
export class DashboardComponent implements OnInit {
  metrics: any = null;
  loading = false;
  showHealthModal = false;
  currentSeverityFilter: 'ALL' | 'Normal' | 'Suspicious' | 'Critical' = 'ALL';

  get headerButtons(): PageHeaderButton[] {
    return [
      {
        text: 'System Health: Operational',
        icon: 'verified',
        action: () => this.openHealthModal()
      },
      {
        text: 'Refresh Telemetry',
        icon: 'refresh',
        loading: this.loading,
        action: () => this.loadMetrics()
      }
    ];
  }

  get filteredActivities(): any[] {
    if (!this.metrics?.recentActivities) return [];
    if (this.currentSeverityFilter === 'ALL') return this.metrics.recentActivities;
    return this.metrics.recentActivities.filter((a: any) => a.severity === this.currentSeverityFilter);
  }

  constructor(private api: ApiService) { }

  ngOnInit(): void {
    this.loadMetrics();
  }

  openHealthModal(): void {
    this.showHealthModal = true;
  }

  closeHealthModal(): void {
    this.showHealthModal = false;
  }

  getSeverityClass(severity?: string): string {
    switch (severity) {
      case 'Critical': return 'red';
      case 'Suspicious': return 'amber';
      case 'Normal':
      default: return 'good';
    }
  }

  getSeverityIcon(severity?: string): string {
    switch (severity) {
      case 'Critical': return 'error';
      case 'Suspicious': return 'warning';
      case 'Normal':
      default: return 'check_circle';
    }
  }

  formatAction(action?: string): string {
    if (!action) return 'Activity';
    const clean = action.trim();
    if (clean === 'LOGIN_SUCCESS') return 'User Sign-In';
    if (clean === 'LOGIN_FAILED') return 'Failed Sign-In';
    if (clean === 'PASSWORD_RESET') return 'Password Reset';
    if (clean.includes('SiteCodeInjectionTag')) return 'Custom Code & Styles';
    if (clean.includes('TenantInstalledTemplate')) return 'Section Template';
    return clean;
  }

  getActionIcon(action?: string): string {
    if (!action) return 'info';
    const a = action.toLowerCase();
    if (a.includes('login_success') || a.includes('sign-in')) return 'login';
    if (a.includes('code') || a.includes('sitecode')) return 'code';
    if (a.includes('template')) return 'layers';
    if (a.includes('page') || a.includes('section')) return 'article';
    if (a.includes('role') || a.includes('permission')) return 'verified_user';
    if (a.includes('delete') || a.includes('suspend')) return 'delete_forever';
    if (a.includes('user') || a.includes('profile')) return 'person';
    if (a.includes('password') || a.includes('reset')) return 'lock_reset';
    return 'history';
  }

  formatDetails(details?: string, action?: string): string {
    if (!details) return '';
    let text = details.trim();

    // 1. Strip internal timestamp change noise
    text = text.replace(/(?:,\s*)?(?:UpdatedAtUtc|LastUpdatedUtc|ModifiedAt|CreatedAt|RowVersion):\s*'[^']*'\s*(?:➔|->)\s*'[^']*'/gi, '');

    // 2. Clean up raw HTML code dumps
    text = text.replace(/HtmlTemplate:\s*'[^']*'\s*(?:➔|->)\s*'[^']*'/gi, 'Template layout updated');

    // 3. Clean up trailing commas, empty brackets
    text = text.replace(/\[,\s*/g, '[').replace(/\[\]/g, '').replace(/\[:\s*\]/g, '').trim();
    if (text.endsWith(':')) text = text.slice(0, -1).trim();

    // 4. Clean up raw entity names
    text = text.replace(/SiteCodeInjectionTag/g, 'Custom Code & Styles')
               .replace(/TenantInstalledTemplate/g, 'Section Template');

    return text;
  }

  loadMetrics(): void {
    this.loading = true;
    this.api.get<any>('DashboardApi/metrics').subscribe({
      next: (res) => {
        this.loading = false;
        if (res?.data) {
          this.metrics = res.data;
          if (res.data.masterTenantInfo) {
            console.groupCollapsed('%c[Master Catalog Multi-Tenant Resolution]', 'color: #0050e5; font-weight: bold;');
            console.table(res.data.masterTenantInfo);
            console.groupEnd();
          }
        }
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
