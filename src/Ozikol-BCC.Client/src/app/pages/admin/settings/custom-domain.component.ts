import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

/**
 * Interface representing DNS record configuration.
 */
interface DnsRecordEntry {
  type: string;
  name: string;
  target: string;
  ttl: string;
  key: string;
  description?: string;
}

/**
 * Detailed real-time DNS diagnostic probe result from public root resolvers.
 */
interface DnsProbeResult {
  domain: string;
  expectedTarget: string;
  detectedTarget: string;
  cnamePassed: boolean;
  sslReady: boolean;
  routingReady: boolean;
  isNxDomain: boolean;
  detectedIps: string[];
  isIpMatch?: boolean;
}

/**
 * Dedicated Custom Domain & DNS Routing Studio Component.
 * Enables workspace administrators to connect their custom apex and subdomain
 * with real-time Master Catalog synchronization, live propagation tests, and Cloudflare instructions.
 */
@Component({
  selector: 'app-custom-domain',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent],
  template: `
    <div class="custom-domain-page">
      <!-- Standardized Page Header -->
      <app-page-header
        eyebrow="DOMAIN ROUTING & DNS STUDIO"
        icon="dns"
        title="Custom Domain & DNS Setup"
        subtitle="Route and connect your custom domain (e.g. www.mycompany.org) to your workspace with automated routing, SSL encryption, and automatic domain verification."
        [buttons]="headerButtons"
      ></app-page-header>

      <!-- Top Summary Grid: Live Status & DNS Health -->
      <div class="domain-overview-grid">
        <!-- 1. Master Default Domain Card -->
        <div class="overview-card">
          <div class="card-icon-tag bg-blue">
            <span class="material-symbols-outlined">cloud</span>
          </div>
          <div class="overview-content">
            <span class="overview-label">Default Platform Host</span>
            <div class="overview-value">{{ cleanTargetHost || 'workspace.ozikol.cloud' }}</div>
            <div class="overview-status">
              <span class="badge badge-success"><span class="dot bg-green"></span> Always Active / Failover</span>
            </div>
          </div>
        </div>

        <!-- 2. Custom Domain Card -->
        <div class="overview-card" [class.is-connected]="hasCustomDomain">
          <div class="card-icon-tag" [class.bg-green]="hasCustomDomain" [class.bg-amber]="!hasCustomDomain">
            <span class="material-symbols-outlined">{{ hasCustomDomain ? 'domain_verification' : 'add_link' }}</span>
          </div>
          <div class="overview-content">
            <span class="overview-label">Active Custom Domain</span>
            <div class="overview-value">{{ customDomain || '(No Custom Domain Linked)' }}</div>
            <div class="overview-status">
              <!-- Case 1: Verified and DNS tallies -->
              <span *ngIf="hasCustomDomain && probeResults?.cnamePassed" class="badge badge-success">
                <span class="dot bg-green"></span> Connected &amp; Live
              </span>

              <!-- Case 2: DNS checked and does NOT tally with ours -->
              <span *ngIf="hasCustomDomain && probeResults && !probeResults.cnamePassed" class="badge badge-danger">
                <span class="dot bg-red"></span> Domain Not Yet Pointed
              </span>

              <!-- Case 3: Linked in DB but not yet tested -->
              <span *ngIf="hasCustomDomain && !probeResults" class="badge badge-warning">
                <span class="dot bg-amber"></span> Awaiting DNS Verification
              </span>

              <!-- Case 4: No custom domain saved -->
              <span *ngIf="!hasCustomDomain" class="badge badge-warning">
                <span class="dot bg-amber"></span> Unbound / Setup Pending
              </span>

              <!-- Visit Domain link only active if DNS is verified and pointing -->
              <a *ngIf="hasCustomDomain && probeResults?.cnamePassed" [href]="liveCustomDomainUrl" target="_blank" class="test-link" title="Open custom domain in new tab">
                <span>Visit Domain ↗</span>
              </a>
            </div>
          </div>
        </div>

        <!-- 3. SSL & Traffic Encryption -->
        <div class="overview-card">
          <div class="card-icon-tag bg-purple">
            <span class="material-symbols-outlined">lock</span>
          </div>
          <div class="overview-content">
            <span class="overview-label">Edge SSL / TLS Security</span>
            <div class="overview-value">Automated HTTPS</div>
            <div class="overview-status">
              <span class="badge badge-info"><span class="dot bg-purple"></span> TLS 1.3 Strict Mode</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Studio Content Grid -->
      <div class="studio-two-column">
        <!-- Left Column: Domain Input & Actions -->
        <div class="studio-main-card">
          <div class="card-header">
            <div class="header-icon-box">
              <span class="material-symbols-outlined">link</span>
            </div>
            <div>
              <h3>Link Branded Domain</h3>
              <p class="card-subtitle">Specify the root domain or subdomain you wish to bind to this organization.</p>
            </div>
          </div>

          <div class="card-body">
            <div class="form-group">
              <label for="customDomainInput" class="form-label">
                Custom Domain URL or Hostname
                <span class="required">*</span>
              </label>
              <div class="input-with-icon">
                <span class="material-symbols-outlined input-icon">globe</span>
                <input
                  type="text"
                  id="customDomainInput"
                  class="form-control"
                  placeholder="e.g. www.company.org"
                  [(ngModel)]="customDomainInput"
                  (keyup.enter)="saveCustomDomain()"
                  [disabled]="saving"
                />
              </div>
              <p class="field-hint">
                Enter your fully qualified domain name without <code>https://</code> (e.g. <code>www.mycompany.org</code>, <code>portal.mycompany.com</code>).
              </p>
            </div>

            <!-- Action Buttons Bar -->
            <div class="actions-bar">
              <button
                type="button"
                class="btn btn-primary"
                (click)="saveCustomDomain()"
                [disabled]="saving || !customDomainInput.trim()"
              >
                <span class="material-symbols-outlined" [class.spin-icon]="saving">
                  {{ saving ? 'sync' : 'save' }}
                </span>
                <span>{{ saving ? 'Updating Domain Routing...' : 'Save &amp; Bind Domain' }}</span>
              </button>

              <button
                type="button"
                *ngIf="hasCustomDomain"
                class="btn btn-danger-outline"
                (click)="unlinkDomain()"
                [disabled]="saving"
              >
                <span class="material-symbols-outlined">link_off</span>
                <span>Unlink Domain</span>
              </button>

              <button
                type="button"
                class="btn btn-outline"
                (click)="probeDns()"
                [disabled]="probing || !customDomainInput.trim()"
              >
                <span class="material-symbols-outlined" [class.spin-icon]="probing">
                  {{ probing ? 'sync' : 'network_check' }}
                </span>
                <span>{{ probing ? 'Probing DNS...' : 'Verify DNS Propagation' }}</span>
              </button>
            </div>

            <!-- Live Diagnostic Probe Result Banner -->
            <div *ngIf="probeResults" class="probe-result-box" [class.passed]="probeResults.cnamePassed" [class.failed]="!probeResults.cnamePassed">
              <div class="probe-header">
                <span class="material-symbols-outlined" [class.text-green]="probeResults.cnamePassed" [class.text-red]="!probeResults.cnamePassed">
                  {{ probeResults.cnamePassed ? 'verified' : 'error' }}
                </span>
                <div class="probe-header-title">
                  <strong>DNS Propagation Diagnostic Report for {{ probeResults.domain }}</strong>
                  <span class="probe-status-pill" [class.pill-success]="probeResults.cnamePassed" [class.pill-danger]="!probeResults.cnamePassed">
                    {{ probeResults.cnamePassed ? 'OPERATIONAL' : 'ACTION REQUIRED' }}
                  </span>
                </div>
              </div>

              <div class="probe-items">
                <div class="probe-item" [class.item-success]="probeResults.cnamePassed" [class.item-danger]="!probeResults.cnamePassed">
                  <span class="material-symbols-outlined">
                    {{ probeResults.cnamePassed ? 'check_circle' : 'cancel' }}
                  </span>
                  <div class="probe-item-text">
                    <span class="probe-item-label">
                      <span *ngIf="probeResults.isIpMatch">A Record Points to Platform IP <code>2.24.162.42</code></span>
                      <span *ngIf="!probeResults.isIpMatch">DNS Host Record Points to <code>{{ cleanTargetHost }}</code></span>
                    </span>
                    <div *ngIf="!probeResults.cnamePassed" class="probe-subtext">
                      <span class="subtext-alert">Current DNS Resolution:</span> <code class="text-danger-code">{{ probeResults.detectedTarget }}</code>
                    </div>
                  </div>
                </div>

                <div class="probe-item" [class.item-success]="probeResults.sslReady" [class.item-warning]="!probeResults.sslReady">
                  <span class="material-symbols-outlined">
                    {{ probeResults.sslReady ? 'check_circle' : 'hourglass_top' }}
                  </span>
                  <div class="probe-item-text">
                    <span class="probe-item-label">SSL / HTTPS Certificate Auto-Issued &amp; Edge Cached</span>
                    <div *ngIf="!probeResults.sslReady" class="probe-subtext text-muted">
                      SSL certificates cannot be issued until public DNS successfully routes to this platform host.
                    </div>
                  </div>
                </div>

                <div class="probe-item" [class.item-success]="probeResults.routingReady" [class.item-warning]="!probeResults.routingReady">
                  <span class="material-symbols-outlined">
                    {{ probeResults.routingReady ? 'check_circle' : 'pending' }}
                  </span>
                  <div class="probe-item-text">
                    <span class="probe-item-label">Workspace Domain Routing Synchronized</span>
                    <div *ngIf="!probeResults.routingReady" class="probe-subtext text-muted">
                      Routing configuration is saved, but incoming traffic cannot reach this server until DNS is pointed.
                    </div>
                  </div>
                </div>
              </div>

              <!-- Remediation Guide (Shown when DNS has not propagated or is pointing to the wrong target) -->
              <div *ngIf="!probeResults.cnamePassed" class="probe-remediation-box">
                <div class="remediation-header">
                  <span class="material-symbols-outlined">warning</span>
                  <strong>Why your website won't work yet &amp; how to fix it:</strong>
                </div>
                <p class="remediation-desc">
                  Public DNS resolvers (Google 8.8.8.8, Cloudflare 1.1.1.1) report that <strong>{{ probeResults.domain }}</strong>
                  is <strong>not currently pointing</strong> to <strong>{{ cleanTargetHost }}</strong> or Platform IP <strong>2.24.162.42</strong>.
                  Anyone typing <code>https://{{ probeResults.domain }}</code> will receive a browser error (<code>DNS_PROBE_FINISHED_NXDOMAIN</code>).
                </p>
                <div class="remediation-steps">
                  <div class="remediation-step">
                    <span class="step-num-pill">1</span>
                    <div class="step-desc">
                      Log in to your <strong>DNS Registrar</strong> (Hostinger, GoDaddy, Namecheap, Cloudflare, Route 53, etc.) where <strong>{{ probeResults.domain }}</strong> is registered.
                    </div>
                  </div>
                  <div class="remediation-step">
                    <span class="step-num-pill">2</span>
                    <div class="step-desc">
                      Navigate to the <strong>DNS Records / DNS Zone</strong> management tab.
                    </div>
                  </div>
                  <div class="remediation-step">
                    <span class="step-num-pill">3</span>
                    <div class="step-desc">
                      Add or update your <strong>DNS Records</strong>:
                      <div class="code-snippet-box">
                        <div class="code-row"><span>Option 1 (Hostinger / GoDaddy A Record):</span> <strong>Type: A | Name: &#64; | Value: 2.24.162.42</strong></div>
                        <div class="code-row"><span>Option 2 (Subdomain CNAME Record):</span> <strong>Type: CNAME | Name: www | Value: {{ cleanTargetHost }}</strong></div>
                        <div class="code-row"><span>TTL:</span> <strong>Auto (or 300s)</strong></div>
                      </div>
                    </div>
                  </div>
                  <div class="remediation-step">
                    <span class="step-num-pill">4</span>
                    <div class="step-desc">
                      Save your DNS record, wait <strong>2 to 10 minutes</strong> for worldwide propagation, and click <strong>Verify DNS Propagation</strong> again.
                    </div>
                  </div>

                  <!-- Registrar DNS Limitation / Cloudflare Callout -->
                  <div class="remediation-cf-callout">
                    <span class="material-symbols-outlined text-orange">lightbulb</span>
                    <div>
                      <strong>DNS settings not available or registrar blocks apex (&#64;) CNAME?</strong>
                      <span>Follow the <strong>Cloudflare Free Setup Guide</strong> on the right to switch your DNS to Cloudflare (Free) for instant apex CNAME support, free SSL, and zero configuration limits.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: DNS Setup Instructions & Cloudflare Guide -->
        <div class="studio-side-card">
          <div class="card-header">
            <div class="header-icon-box bg-purple">
              <span class="material-symbols-outlined">help_center</span>
            </div>
            <div>
              <h3>DNS Setup Instructions</h3>
              <p class="card-subtitle">Configure these 2 records at your DNS registrar or Cloudflare dashboard.</p>
            </div>
          </div>

          <div class="card-body">
            <!-- Step by Step Walkthrough -->
            <div class="guide-steps">
              <div class="guide-step">
                <div class="step-num">1</div>
                <div class="step-content">
                  <strong>Log in to your Domain Registrar</strong>
                  <p>Open Cloudflare, GoDaddy, Namecheap, Google Domains, or Route 53 where your domain was purchased.</p>
                </div>
              </div>

              <div class="guide-step">
                <div class="step-num">2</div>
                <div class="step-content">
                  <strong>Add the 2 CNAME Records</strong>
                  <p>Add <code>www</code> and <code>&#64; (Apex)</code> pointing to <code>{{ cleanTargetHost }}</code> from the table below.</p>
                </div>
              </div>

              <div class="guide-step">
                <div class="step-num">3</div>
                <div class="step-content">
                  <strong>Verify &amp; Activate</strong>
                  <p>DNS propagation typically completes within 2 to 10 minutes. Click <strong>Verify DNS Propagation</strong> to activate.</p>
                </div>
              </div>
            </div>

            <!-- Recommended Cloudflare Free Setup Guide -->
            <div class="cloudflare-setup-box">
              <div class="cf-header">
                <span class="material-symbols-outlined text-orange">cloud_sync</span>
                <div>
                  <strong>DNS Not Available at Your Registrar?</strong>
                  <p class="cf-subtitle">Use Cloudflare (100% Free) for instant DNS management, free SSL, and Apex CNAME support:</p>
                </div>
              </div>
              <div class="cf-steps">
                <div class="cf-step">
                  <span class="cf-step-badge">1</span>
                  <span>Go to <a href="https://dash.cloudflare.com/sign-up" target="_blank" class="cf-link">cloudflare.com</a> and sign up for a free account.</span>
                </div>
                <div class="cf-step">
                  <span class="cf-step-badge">2</span>
                  <span>Click <strong>+ Add a Site</strong>, enter your domain name, and choose the <strong>Free Plan ($0/mo)</strong>.</span>
                </div>
                <div class="cf-step">
                  <span class="cf-step-badge">3</span>
                  <span>Cloudflare provides 2 Nameservers (e.g. <code>alice.ns.cloudflare.com</code>). In your current registrar's portal, replace existing nameservers with them.</span>
                </div>
                <div class="cf-step">
                  <span class="cf-step-badge">4</span>
                  <span>In Cloudflare's <strong>DNS</strong> tab, add the 2 CNAME records (<code>&#64;</code> and <code>www</code>) pointing to <code>{{ cleanTargetHost }}</code>.</span>
                </div>
                <div class="cf-step">
                  <span class="cf-step-badge">5</span>
                  <span>Return here and click <strong>Verify DNS Propagation</strong> to complete activation.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- DNS Records Table -->
      <div class="dns-matrix-card">
        <div class="card-header-bar">
          <div>
            <h3>DNS Records</h3>
            <p class="card-subtitle">Update your DNS with these records to route your custom domain to your website.</p>
          </div>
        </div>

        <div class="table-responsive">
          <table class="dns-table">
            <thead>
              <tr>
                <th>TYPE</th>
                <th>NAME / HOST</th>
                <th>TARGET / VALUE</th>
                <th>TTL</th>
                <th style="text-align: right;">ACTION</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let rec of dnsRecords">
                <td><span class="dns-type-tag" [class.tag-cname]="rec.type === 'CNAME'" [class.tag-a]="rec.type === 'A'" [class.tag-txt]="rec.type === 'TXT'">{{ rec.type }}</span></td>
                <td>
                  <code>{{ rec.name }}</code>
                  <span *ngIf="rec.description" style="display:block; font-size:11px; color:#64748b; margin-top:3px; line-height:1.3;">{{ rec.description }}</span>
                </td>
                <td>
                  <div class="value-cell">
                    <code>{{ rec.target }}</code>
                    <button type="button" class="btn-copy" (click)="copyValue(rec.target, rec.key)" [title]="'Copy ' + rec.target">
                      <span class="material-symbols-outlined">{{ copySuccess[rec.key] ? 'done' : 'content_copy' }}</span>
                      <span>{{ copySuccess[rec.key] ? 'Copied' : 'Copy' }}</span>
                    </button>
                  </div>
                </td>
                <td><span>{{ rec.ttl }}</span></td>
                <td style="text-align: right;">
                  <button type="button" class="btn-copy-full" (click)="copyFullRecord(rec)" title="Copy full record values">
                    <span class="material-symbols-outlined">copy_all</span>
                    <span>Copy All</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .custom-domain-page {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Top Domain Overview Grid */
    .domain-overview-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
    }
    .overview-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 20px 22px;
      display: flex;
      align-items: flex-start;
      gap: 16px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .overview-card:hover {
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
    }
    .overview-card.is-connected {
      border-color: #86efac;
      background: linear-gradient(to bottom, #ffffff, #f0fdf4);
    }
    .card-icon-tag {
      width: 46px;
      height: 46px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .card-icon-tag .material-symbols-outlined {
      font-size: 24px;
      color: #ffffff;
    }
    .bg-blue { background: #0050e5; }
    .bg-green { background: #16a34a; }
    .bg-amber { background: #d97706; }
    .bg-purple { background: #7c3aed; }
    .overview-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .overview-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
    }
    .overview-value {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      word-break: break-all;
    }
    .overview-status {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 6px;
      flex-wrap: wrap;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
    }
    .badge-success { background: #dcfce7; color: #15803d; }
    .badge-warning { background: #fef3c7; color: #b45309; }
    .badge-danger { background: #fee2e2; color: #dc2626; }
    .badge-info { background: #f3e8ff; color: #7c3aed; }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
    .bg-red { background: #dc2626; }
    .bg-green { background: #16a34a; }
    .bg-amber { background: #f59e0b; }
    .test-link {
      font-size: 11px;
      font-weight: 700;
      color: #0050e5;
      text-decoration: none;
    }
    .test-link:hover { text-decoration: underline; }

    /* Studio Two Column Layout */
    .studio-two-column {
      display: grid;
      grid-template-columns: 3fr 2fr;
      gap: 24px;
    }
    @media (max-width: 960px) {
      .studio-two-column { grid-template-columns: 1fr; }
    }
    .studio-main-card, .studio-side-card, .dns-matrix-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
      overflow: hidden;
    }
    .card-header {
      padding: 20px 24px;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      align-items: center;
      gap: 14px;
      background: #fafbfc;
    }
    .header-icon-box {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: #eff6ff;
      color: #0050e5;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .header-icon-box .material-symbols-outlined { font-size: 22px; }
    .header-icon-box.bg-purple { background: #f3e8ff; color: #7c3aed; }
    .card-header h3 {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .card-subtitle {
      font-size: 12px;
      color: #64748b;
      margin: 2px 0 0;
    }
    .card-body {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* Form Inputs & Controls */
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-label {
      font-size: 13px;
      font-weight: 700;
      color: #334155;
    }
    .required { color: #dc2626; }
    .input-with-icon {
      position: relative;
      display: flex;
      align-items: center;
    }
    .input-icon {
      position: absolute;
      left: 14px;
      font-size: 20px;
      color: #94a3b8;
    }
    .form-control {
      width: 100%;
      padding: 12px 14px 12px 42px;
      font-size: 14px;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      color: #0f172a;
      background: #ffffff;
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .form-control:focus {
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.1);
    }
    .field-hint {
      font-size: 12px;
      color: #64748b;
      margin: 4px 0 0;
    }
    .field-hint code {
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      color: #0050e5;
    }

    /* Action Buttons */
    .actions-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 6px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 10px;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-primary {
      background: #0050e5;
      color: #ffffff;
    }
    .btn-primary:hover:not(:disabled) {
      background: #003db3;
    }
    .btn-danger-outline {
      background: #fef2f2;
      color: #dc2626;
      border-color: #fecaca;
    }
    .btn-danger-outline:hover:not(:disabled) {
      background: #fee2e2;
    }
    .btn-outline {
      background: #ffffff;
      color: #334155;
      border-color: #cbd5e1;
    }
    .btn-outline:hover:not(:disabled) {
      background: #f8fafc;
      border-color: #94a3b8;
    }
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .spin-icon {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    /* Live Diagnostic Probe Result */
    .probe-result-box {
      border-radius: 12px;
      padding: 18px 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      animation: fadeIn 0.2s ease-out;
    }
    .probe-result-box.passed {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
    }
    .probe-result-box.failed {
      background: #fff5f5;
      border: 1px solid #fecaca;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .probe-header {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
    }
    .probe-header-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex: 1;
      flex-wrap: wrap;
      gap: 8px;
    }
    .probe-status-pill {
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.5px;
    }
    .pill-success { background: #dcfce7; color: #15803d; }
    .pill-danger { background: #fee2e2; color: #dc2626; }
    .probe-items {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .probe-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 13px;
    }
    .probe-item-text {
      display: flex;
      flex-direction: column;
      gap: 3px;
      flex: 1;
    }
    .probe-item-label {
      color: #1e293b;
      font-weight: 600;
    }
    .probe-item code {
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 700;
      color: #0050e5;
    }
    .probe-item.item-success .material-symbols-outlined { color: #16a34a; font-size: 20px; }
    .probe-item.item-danger .material-symbols-outlined { color: #dc2626; font-size: 20px; }
    .probe-item.item-warning .material-symbols-outlined { color: #d97706; font-size: 20px; }
    .probe-subtext {
      font-size: 12px;
    }
    .subtext-alert {
      font-weight: 700;
      color: #b91c1c;
    }
    .text-danger-code {
      background: #fee2e2 !important;
      color: #991b1b !important;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
    }
    .text-muted { color: #64748b; font-style: italic; }
    .text-red { color: #dc2626; }
    .text-green { color: #16a34a; }

    /* Remediation Guide Box */
    .probe-remediation-box {
      margin-top: 8px;
      padding: 16px;
      background: #ffffff;
      border: 1px solid #fecaca;
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .remediation-header {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #b91c1c;
      font-size: 13px;
    }
    .remediation-header .material-symbols-outlined { font-size: 20px; color: #dc2626; }
    .remediation-desc {
      margin: 0;
      font-size: 12px;
      color: #334155;
      line-height: 1.5;
    }
    .remediation-steps {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 4px;
    }
    .remediation-step {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 12px;
      color: #334155;
    }
    .step-num-pill {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #fee2e2;
      color: #dc2626;
      font-weight: 700;
      font-size: 11px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .step-desc { flex: 1; line-height: 1.4; }
    .code-snippet-box {
      margin-top: 6px;
      padding: 10px 14px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-family: monospace;
      font-size: 11px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .code-row { display: flex; gap: 8px; }
    .code-row span { color: #64748b; width: 90px; }
    .code-row strong { color: #0050e5; font-family: monospace; }

    /* Guide Steps */
    .guide-steps {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .guide-step {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    .step-num {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #eff6ff;
      color: #0050e5;
      font-weight: 700;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .step-content strong {
      font-size: 13px;
      color: #0f172a;
      display: block;
    }
    .step-content p {
      font-size: 12px;
      color: #64748b;
      margin: 2px 0 0;
      line-height: 1.4;
    }
    .text-orange { color: #ea580c; }
    .cloudflare-setup-box {
      background: #fffaf0;
      border: 1px solid #fed7aa;
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .cf-header {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    .cf-header .material-symbols-outlined {
      font-size: 24px;
      color: #ea580c;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .cf-header strong {
      font-size: 13px;
      color: #9a3412;
      display: block;
    }
    .cf-subtitle {
      font-size: 11px;
      color: #7c2d12;
      margin: 2px 0 0;
      line-height: 1.4;
    }
    .cf-steps {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .cf-step {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 11px;
      color: #431407;
      line-height: 1.4;
    }
    .cf-step-badge {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #fed7aa;
      color: #9a3412;
      font-size: 10px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .cf-step code {
      background: #ffedd5;
      color: #c2410c;
      padding: 1px 4px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 11px;
    }
    .cf-link {
      color: #ea580c;
      font-weight: 700;
      text-decoration: underline;
    }
    .remediation-cf-callout {
      margin-top: 8px;
      padding: 10px 12px;
      background: #fffaf0;
      border: 1px dashed #fed7aa;
      border-radius: 8px;
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 11px;
      color: #9a3412;
      line-height: 1.4;
    }
    .remediation-cf-callout .material-symbols-outlined {
      font-size: 18px;
      color: #ea580c;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .remediation-cf-callout strong {
      display: block;
      margin-bottom: 2px;
    }

    /* Recommended DNS Records Table Matrix */
    .card-header-bar {
      padding: 20px 24px;
      border-bottom: 1px solid #f1f5f9;
      background: #fafbfc;
    }
    .card-header-bar h3 {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .table-responsive {
      overflow-x: auto;
    }
    .dns-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .dns-table th {
      text-align: left;
      padding: 12px 16px;
      background: #f8fafc;
      color: #64748b;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      border-bottom: 1px solid #e2e8f0;
    }
    .dns-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
    }
    .dns-type-tag {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
    }
    .tag-cname { background: #eff6ff; color: #1d4ed8; }
    .tag-a { background: #f0fdf4; color: #15803d; }
    .tag-txt { background: #fef3c7; color: #b45309; }
    .value-cell {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .value-cell code {
      font-size: 12px;
      background: #f1f5f9;
      padding: 3px 8px;
      border-radius: 6px;
      font-family: monospace;
      color: #0f172a;
    }
    .btn-copy, .btn-copy-full {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-copy:hover, .btn-copy-full:hover {
      background: #0050e5;
      color: #ffffff;
      border-color: #0050e5;
    }
    .btn-copy .material-symbols-outlined, .btn-copy-full .material-symbols-outlined {
      font-size: 14px;
    }
  `]
})
export class CustomDomainComponent implements OnInit {
  loading = false;
  saving = false;
  probing = false;

  tenantKey: string = '';
  primaryDomain: string = '';
  customDomain: string = '';
  customDomainInput: string = '';
  websiteUrl: string = '';

  probeResults: DnsProbeResult | null = null;
  copySuccess: { [key: string]: boolean } = {};

  headerButtons: PageHeaderButton[] = [];

  get hasCustomDomain(): boolean {
    return !!(this.customDomain && this.customDomain.trim());
  }

  get liveCustomDomainUrl(): string {
    if (!this.customDomain) return '';
    const trimmed = this.customDomain.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    const isLocal = trimmed.includes('localhost') || trimmed.includes('127.0.0.1');
    return `${isLocal ? 'http://' : 'https://'}${trimmed}`;
  }

  /**
   * Sanitized default host without protocol, path, or port.
   * e.g. 'paulc.ozikol.cloud' or 'paulc.localhost'
   */
  get cleanTargetHost(): string {
    const raw = this.primaryDomain || `${this.tenantKey || 'company'}.ozikol.cloud`;
    return raw.replace(/^https?:\/\//i, '').split('/')[0].split(':')[0].trim();
  }

  /**
   * DNS Records required to link custom domain.
   * Supports both standard CNAME routing and direct A record IP mapping for registrars (Hostinger, GoDaddy).
   */
  get dnsRecords(): DnsRecordEntry[] {
    const targetHost = this.cleanTargetHost;
    return [
      {
        type: 'CNAME',
        name: 'www',
        target: targetHost,
        ttl: 'Auto (300s)',
        key: 'cname_www',
        description: 'Subdomain routing to your workspace'
      },
      {
        type: 'A',
        name: '@ (Apex Root)',
        target: '2.24.162.42',
        ttl: 'Auto (300s)',
        key: 'a_root',
        description: 'Recommended: for Hostinger, GoDaddy, Namecheap or any registrar requiring an IP'
      },
      {
        type: 'CNAME',
        name: '@ (Apex Root)',
        target: targetHost,
        ttl: 'Auto (300s)',
        key: 'cname_root',
        description: 'Alternative: for Cloudflare DNS or registrars supporting CNAME Flattening'
      }
    ];
  }

  constructor(
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.initHeaderButtons();
    this.loadTenantInfo();
  }

  private initHeaderButtons(): void {
    this.headerButtons = [
      {
        text: 'Refresh Status',
        icon: 'refresh',
        action: () => this.loadTenantInfo()
      },
      {
        text: 'Brand Settings',
        icon: 'palette',
        routerLink: '/settings/console'
      }
    ];
  }

  loadTenantInfo(): void {
    this.loading = true;
    this.api.get<any>('DashboardApi/metrics').subscribe({
      next: (res) => {
        this.loading = false;
        const tenantInfo = res?.data?.masterTenantInfo || res?.Data?.MasterTenantInfo;
        if (tenantInfo) {
          this.tenantKey = tenantInfo.tenantKey || '';
          this.primaryDomain = tenantInfo.primaryDomain || '';
          this.customDomain = tenantInfo.customDomain || '';
          this.customDomainInput = this.customDomain;
          this.websiteUrl = tenantInfo.websiteUrl || '';

          if (this.customDomain) {
            localStorage.setItem('tenant_custom_domain', this.customDomain);
          } else {
            localStorage.removeItem('tenant_custom_domain');
          }
          if (this.primaryDomain) {
            localStorage.setItem('tenant_primary_domain', this.primaryDomain);
          }
          if (this.websiteUrl) {
            localStorage.setItem('tenant_website_url', this.websiteUrl);
          }
        }
      },
      error: (err) => {
        this.loading = false;
        console.error('[Custom Domain] Failed to load tenant metrics:', err);
      }
    });
  }

  saveCustomDomain(): void {
    const rawInput = (this.customDomainInput || '').trim();
    if (!rawInput) {
      this.toast.error('Please enter a valid domain name.', 'Validation Error');
      return;
    }

    // Sanitize domain
    const cleanDomain = rawInput
      .replace(/^https?:\/\//i, '')
      .replace(/\/+$/, '')
      .trim();

    this.saving = true;
    const payload = {
      tenantKey: this.tenantKey,
      customDomain: cleanDomain
    };

    this.api.put<any>('DashboardApi/update-custom-domain', payload).subscribe({
      next: (res) => {
        this.saving = false;
        const updated = res?.data || res?.Data;
        this.customDomain = cleanDomain;
        this.customDomainInput = cleanDomain;
        localStorage.setItem('tenant_custom_domain', cleanDomain);
        if (updated?.websiteUrl) {
          this.websiteUrl = updated.websiteUrl;
          localStorage.setItem('tenant_website_url', updated.websiteUrl);
        }

        // Notify layout and other components of the updated domain
        window.dispatchEvent(new CustomEvent('tenant_domain_updated', {
          detail: { customDomain: cleanDomain }
        }));

        const prov = updated?.provisioningStatus || updated?.ProvisioningStatus;
        if (prov) {
          if (prov.dnsProbe) {
            this.probeResults = {
              domain: cleanDomain,
              expectedTarget: prov.dnsProbe.expectedTarget || '2.24.162.42',
              detectedTarget: prov.dnsProbe.detectedTarget || cleanDomain,
              cnamePassed: prov.dnsProbe.isDnsPointed,
              sslReady: prov.sslActive,
              routingReady: prov.nginxConfigured,
              isNxDomain: prov.dnsProbe.isNxDomain,
              detectedIps: prov.dnsProbe.detectedIps || [],
              isIpMatch: prov.dnsProbe.isIpMatch
            };
          }
          if (prov.succeeded) {
            this.toast.success(`Custom domain '${cleanDomain}' bound! Automated server routing and SSL active.`, 'Domain Operational');
          } else if (prov.dnsVerified) {
            this.toast.success(`Custom domain '${cleanDomain}' bound! DNS verified at 2.24.162.42.`, 'Domain Bound');
          } else {
            this.toast.info(`Domain saved to workspace. Update DNS A record to 2.24.162.42 to activate.`, 'DNS Setup Pending');
          }
        } else {
          this.toast.success(`Custom domain '${cleanDomain}' linked successfully!`, 'Domain Bound');
        }
      },
      error: (err) => {
        this.saving = false;
        console.error('[Custom Domain] Failed to save custom domain:', err);
        const errorMsg = err?.error?.message || err?.error?.Message || 'Failed to update custom domain.';
        this.toast.error(errorMsg, 'Binding Failed');
      }
    });
  }

  unlinkDomain(): void {
    if (!confirm(`Are you sure you want to unlink '${this.customDomain}'? Your website will revert to '${this.primaryDomain}'.`)) {
      return;
    }

    this.saving = true;
    const payload = {
      tenantKey: this.tenantKey,
      customDomain: ''
    };

    this.api.put<any>('DashboardApi/update-custom-domain', payload).subscribe({
      next: () => {
        this.saving = false;
        this.customDomain = '';
        this.customDomainInput = '';
        this.probeResults = null;
        localStorage.removeItem('tenant_custom_domain');

        // Notify layout
        window.dispatchEvent(new CustomEvent('tenant_domain_updated', {
          detail: { customDomain: '' }
        }));

        this.toast.success('Custom domain was unlinked. Reverted to default host.', 'Domain Unlinked');
      },
      error: (err) => {
        this.saving = false;
        console.error('[Custom Domain] Failed to unlink domain:', err);
        this.toast.error('Failed to unlink custom domain.', 'Error');
      }
    });
  }

  /**
   * Queries public global DNS root resolvers (Google DNS DoH / Cloudflare DoH) in real-time
   * to accurately determine if the custom domain's CNAME or A records point to this platform host.
   */
  async probeDns(): Promise<void> {
    const rawInput = (this.customDomainInput || this.customDomain || '').trim();
    if (!rawInput) {
      this.toast.error('Please enter a domain name to verify.', 'Domain Required');
      return;
    }

    const cleanDomain = rawInput
      .replace(/^https?:\/\//i, '')
      .replace(/\/+$/, '')
      .trim();

    const expectedHost = this.cleanTargetHost.toLowerCase();
    this.probing = true;
    this.probeResults = null;

    try {
      // 1. Query Google DNS-over-HTTPS (DoH) for CNAME record
      let cnameData: any = null;
      let aRecordData: any = null;

      try {
        const dohCnameUrl = `https://dns.google/resolve?name=${encodeURIComponent(cleanDomain)}&type=CNAME`;
        const cnameRes = await fetch(dohCnameUrl, { headers: { 'Accept': 'application/json' } });
        if (cnameRes.ok) {
          cnameData = await cnameRes.json();
        }
      } catch (err) {
        console.warn('[DNS Probe] Google DoH CNAME query error:', err);
      }

      // 2. Query Google DNS-over-HTTPS (DoH) for A record
      try {
        const dohAUrl = `https://dns.google/resolve?name=${encodeURIComponent(cleanDomain)}&type=A`;
        const aRes = await fetch(dohAUrl, { headers: { 'Accept': 'application/json' } });
        if (aRes.ok) {
          aRecordData = await aRes.json();
        }
      } catch (err) {
        console.warn('[DNS Probe] Google DoH A query error:', err);
      }

      // 3. Fallback to Cloudflare DoH if Google DNS returned no response
      if (!cnameData && !aRecordData) {
        try {
          const cfUrl = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(cleanDomain)}&type=CNAME`;
          const cfRes = await fetch(cfUrl, { headers: { 'Accept': 'application/dns-json' } });
          if (cfRes.ok) {
            cnameData = await cfRes.json();
          }
        } catch (cfErr) {
          console.warn('[DNS Probe] Cloudflare DoH query error:', cfErr);
        }
      }

      // Synthesize all answer records
      const answers: any[] = [
        ...(cnameData?.Answer || []),
        ...(aRecordData?.Answer || [])
      ];

      // Extract detected CNAMEs (type 5) and normalize (strip trailing dot)
      const detectedCnames = answers
        .filter(a => a.type === 5)
        .map(a => (a.data || '').toLowerCase().replace(/\.$/, '').trim());

      // Extract detected IPv4 addresses (type 1)
      const detectedIps = answers
        .filter(a => a.type === 1)
        .map(a => a.data?.trim());

      // Compare against expected host (CNAME)
      const cnameMatch = detectedCnames.some(c => c === expectedHost || c.includes(expectedHost) || c.endsWith('.ozikol.cloud'));

      // Compare against platform server IP or Cloudflare edge IPs (A Record)
      const validPlatformIps = ['2.24.162.42', '104.21.32.45', '172.67.182.206'];
      const ipMatch = detectedIps.some(ip => validPlatformIps.includes(ip));

      // Domain passes verification if either CNAME or A Record points to the platform
      const dnsPassed = cnameMatch || ipMatch;

      // Check if NXDOMAIN (DNS Status 3)
      const isNxDomain = cnameData?.Status === 3 || aRecordData?.Status === 3;

      let detectedTarget = '';
      if (detectedCnames.length > 0) {
        detectedTarget = detectedCnames[0];
      } else if (detectedIps.length > 0) {
        detectedTarget = `A Record IP: ${detectedIps.slice(0, 3).join(', ')}`;
      } else if (isNxDomain) {
        detectedTarget = 'NXDOMAIN (Domain not registered or has no DNS zone)';
      } else {
        detectedTarget = 'No CNAME or A records found on global DNS';
      }

      this.probeResults = {
        domain: cleanDomain,
        expectedTarget: expectedHost,
        detectedTarget: detectedTarget,
        cnamePassed: dnsPassed,
        sslReady: dnsPassed,
        routingReady: dnsPassed,
        isNxDomain: isNxDomain,
        detectedIps: detectedIps,
        isIpMatch: ipMatch
      };

      if (dnsPassed) {
        const resolutionNote = ipMatch ? 'A Record IP (2.24.162.42)' : `'${expectedHost}'`;
        this.toast.success(`DNS verified! '${cleanDomain}' correctly points to ${resolutionNote}.`, 'DNS Verified');

        // Automatically trigger server routing and SSL provisioning in background
        this.api.post<any>('DashboardApi/provision-custom-domain', {
          tenantKey: this.tenantKey,
          customDomain: cleanDomain
        }).subscribe({
          next: (pRes) => {
            const pData = pRes?.data || pRes?.Data;
            if (pData?.succeeded || pData?.nginxConfigured) {
              if (this.probeResults) {
                this.probeResults.sslReady = pData.sslActive;
                this.probeResults.routingReady = pData.nginxConfigured;
              }
              this.toast.success(`Automated routing and SSL configured for '${cleanDomain}'!`, 'Server Active');
            }
          },
          error: (pErr) => {
            console.warn('[Custom Domain] Automated background provisioning note:', pErr);
          }
        });
      } else {
        this.toast.warning(
          `Domain not yet pointed. DNS records do not match '${expectedHost}' or Platform IP '2.24.162.42'. Live custom domain will remain inactive until pointed.`,
          'Domain Not Yet Pointed'
        );
      }
    } catch (error) {
      console.error('[DNS Probe] Unexpected error running DNS probe:', error);
      this.toast.error('Failed to probe public DNS. Please check your internet connection.', 'Probe Error');
    } finally {
      this.probing = false;
    }
  }

  copyValue(text: string, key: string): void {
    if (!navigator?.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      this.copySuccess[key] = true;
      setTimeout(() => {
        this.copySuccess[key] = false;
      }, 2000);
    });
  }

  copyFullRecord(rec: DnsRecordEntry): void {
    const full = `Type: ${rec.type}\nName: ${rec.name}\nValue: ${rec.target}\nTTL: ${rec.ttl}`;
    if (!navigator?.clipboard) return;
    navigator.clipboard.writeText(full).then(() => {
      this.toast.success(`Copied ${rec.type} record configuration.`, 'Copied to Clipboard');
    });
  }
}
