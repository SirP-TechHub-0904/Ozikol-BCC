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
                  (keyup.enter)="verifyAndSaveDomain()"
                  [disabled]="saving"
                />
              </div>
              <p class="field-hint">
                Enter your fully qualified domain name without <code>https://</code> (e.g. <code>www.mycompany.org</code>, <code>portal.mycompany.com</code>).
              </p>
            </div>

            <!-- Action Buttons Bar -->
            <div class="actions-bar">
              <!-- 1. Verify & Save Domain (Active when unverified; Inactive when verified) -->
              <button
                type="button"
                class="btn btn-primary"
                (click)="verifyAndSaveDomain()"
                [disabled]="saving || !customDomainInput.trim() || isDomainVerified"
                [title]="isDomainVerified ? 'Domain is verified and active' : 'Verify DNS and save custom domain'"
              >
                <span class="material-symbols-outlined" [class.spin-icon]="saving">
                  {{ saving ? 'sync' : (isDomainVerified ? 'check_circle' : 'verified') }}
                </span>
                <span>{{ saving ? 'Verifying &amp; Saving Domain...' : (isDomainVerified ? 'Domain Verified &amp; Active' : 'Verify &amp; Save Domain') }}</span>
              </button>

              <!-- 2. Unbind Domain (Active when verified; Inactive when unverified) -->
              <button
                type="button"
                class="btn btn-danger-outline"
                (click)="unbindDomain()"
                [disabled]="saving || !isDomainVerified"
                [title]="isDomainVerified ? 'Unbind and remove this custom domain' : 'Unbind is only active when domain is verified'"
              >
                <span class="material-symbols-outlined">link_off</span>
                <span>Unbind Domain</span>
              </button>

              <!-- 3. Verify DNS Propagation (Diagnostics Only) -->
              <button
                type="button"
                class="btn btn-outline"
                (click)="probeDns()"
                [disabled]="probing || !customDomainInput.trim()"
                title="Run real-time DNS diagnostic check against public root resolvers"
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
                  <div class="value-cell">
                    <code>{{ rec.name }}</code>
                    <button type="button" class="btn-copy" (click)="copyValue(rec.name, 'name_' + rec.key)" [title]="'Copy ' + rec.name">
                      <span class="material-symbols-outlined">{{ copySuccess['name_' + rec.key] ? 'done' : 'content_copy' }}</span>
                      <span>{{ copySuccess['name_' + rec.key] ? 'Copied' : 'Copy' }}</span>
                    </button>
                  </div>
                  <span *ngIf="rec.description" style="display:block; font-size:11px; color:#64748b; margin-top:3px; line-height:1.3;">{{ rec.description }}</span>
                </td>
                <td>
                  <div class="value-cell">
                    <code>{{ rec.target }}</code>
                    <button type="button" class="btn-copy" (click)="copyValue(rec.target, 'val_' + rec.key)" [title]="'Copy ' + rec.target">
                      <span class="material-symbols-outlined">{{ copySuccess['val_' + rec.key] ? 'done' : 'content_copy' }}</span>
                      <span>{{ copySuccess['val_' + rec.key] ? 'Copied' : 'Copy' }}</span>
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

      <!-- Domain Email & Business Mailbox Suite -->
      <div *ngIf="hasCustomDomain" class="email-suite-card">
        <div class="card-header-bar email-suite-header">
          <div class="header-title-group">
            <div class="header-icon-box bg-blue">
              <span class="material-symbols-outlined">mark_email_read</span>
            </div>
            <div>
              <div class="suite-title-row">
                <h3>Domain Email &amp; Business Mailboxes</h3>
                <span class="badge" [class.badge-success]="emailConfig?.isFullyProvisioned" [class.badge-warning]="!emailConfig?.isFullyProvisioned">
                  <span class="dot" [class.bg-green]="emailConfig?.isFullyProvisioned" [class.bg-amber]="!emailConfig?.isFullyProvisioned"></span>
                  {{ emailConfig?.isFullyProvisioned ? 'Mail Server Active' : 'Setup In Progress' }}
                </span>
              </div>
              <p class="card-subtitle">
                Send and receive emails from your custom domain (e.g. <code>support&#64;{{ customDomain }}</code>). Includes 1 free custom mailbox and automated system sender.
              </p>
            </div>
          </div>
          <div class="header-actions">
            <button
              type="button"
              class="btn-secondary-action"
              (click)="loadDomainEmailConfig(customDomain)"
              [disabled]="loadingEmailConfig"
              title="Refresh email configurations from Mailcow"
            >
              <span class="material-symbols-outlined" [class.spin]="loadingEmailConfig">refresh</span>
              <span>Refresh Mail Suite</span>
            </button>
            <button
              type="button"
              class="btn-primary-action"
              [class.btn-all-verified]="isAllEmailDnsVerified"
              (click)="verifyAllEmailDnsRecords()"
              [disabled]="verifyingAllEmailDns || isAllEmailDnsVerified"
              [title]="isAllEmailDnsVerified ? 'All email DNS records are verified and active on live root resolvers' : 'Verify live propagation of MX, SPF, DKIM, and DMARC records'"
            >
              <span class="material-symbols-outlined" [class.spin]="verifyingAllEmailDns">
                {{ isAllEmailDnsVerified ? 'check_circle' : 'task_alt' }}
              </span>
              <span>{{ isAllEmailDnsVerified ? 'All Email DNS Verified' : 'Verify All Email DNS' }}</span>
            </button>
          </div>
        </div>

        <!-- 1. Email DNS Authentication Matrix Table -->
        <div class="email-section-block">
          <div class="section-subheading">
            <span class="material-symbols-outlined text-blue">verified_user</span>
            <div>
              <h4>Email DNS Records &amp; Anti-Spam Authentication</h4>
              <p>Add these 4 DNS records to your domain registrar (Hostinger, Cloudflare, GoDaddy) so your emails deliver straight to the inbox and never to spam.</p>
            </div>
          </div>

          <div class="table-responsive">
            <table class="dns-table email-dns-table">
              <thead>
                <tr>
                  <th style="width: 100px;">TYPE</th>
                  <th style="width: 170px;">HOST / NAME</th>
                  <th>VALUE / TARGET</th>
                  <th style="width: 120px;">PRIORITY / TTL</th>
                  <th style="width: 120px;">STATUS</th>
                  <th style="width: 150px; text-align: right;">ACTION</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let rec of emailDnsRecords">
                  <td>
                    <span class="dns-type-tag" [class.tag-mx]="rec.recordType === 'MX'" [class.tag-txt]="rec.recordType === 'TXT'">
                      {{ rec.recordType }}
                    </span>
                  </td>
                  <td>
                    <div class="value-cell">
                      <code>{{ rec.host || rec.name || rec.hostName || '@' }}</code>
                      <button
                        type="button"
                        class="btn-copy"
                        (click)="copyValue(rec.host || rec.name || rec.hostName || '@', 'host_' + (rec.key || rec.subType || rec.recordType))"
                        [title]="'Copy Host / Name: ' + (rec.host || rec.name || rec.hostName || '@')"
                      >
                        <span class="material-symbols-outlined">{{ copySuccess['host_' + (rec.key || rec.subType || rec.recordType)] ? 'done' : 'content_copy' }}</span>
                        <span>{{ copySuccess['host_' + (rec.key || rec.subType || rec.recordType)] ? 'Copied' : 'Copy' }}</span>
                      </button>
                    </div>
                    <span class="rec-desc">{{ rec.description }}</span>
                  </td>
                  <td>
                    <div class="value-cell">
                      <code class="code-long" [title]="rec.value || rec.recordValue || rec.target">{{ rec.value || rec.recordValue || rec.target }}</code>
                      <button
                        type="button"
                        class="btn-copy"
                        (click)="copyValue(rec.value || rec.recordValue || rec.target, 'val_' + (rec.key || rec.subType || rec.recordType))"
                        [title]="'Copy Target Value'"
                      >
                        <span class="material-symbols-outlined">{{ copySuccess['val_' + (rec.key || rec.subType || rec.recordType)] ? 'done' : 'content_copy' }}</span>
                        <span>{{ copySuccess['val_' + (rec.key || rec.subType || rec.recordType)] ? 'Copied' : 'Copy' }}</span>
                      </button>
                    </div>
                    <span *ngIf="rec.detectedValue" class="detected-dns-note">
                      Detected on DNS: <code>{{ rec.detectedValue }}</code>
                    </span>
                  </td>
                  <td>
                    <span class="priority-badge" *ngIf="rec.recordType === 'MX' && rec.priority">Priority: {{ rec.priority }}</span>
                    <span *ngIf="rec.recordType !== 'MX'" class="ttl-text">{{ rec.ttl || 'Auto / 300s' }}</span>
                  </td>
                  <td>
                    <span *ngIf="rec.isVerified" class="badge badge-success">
                      <span class="dot bg-green"></span> Verified
                    </span>
                    <span *ngIf="!rec.isVerified" class="badge badge-warning">
                      <span class="dot bg-amber"></span> Pending
                    </span>
                  </td>
                  <td style="text-align: right;">
                    <button
                      type="button"
                      class="btn-verify-row"
                      [class.btn-row-verified]="rec.isVerified"
                      (click)="verifyEmailDnsRecord(rec.subType || rec.recordType)"
                      [disabled]="rec.isVerified || verifyingDns[rec.subType || rec.recordType]"
                      [title]="rec.isVerified ? 'Record is verified and active on live root DNS' : 'Verify this DNS record on live root resolvers'"
                    >
                      <span class="material-symbols-outlined" [class.spin]="verifyingDns[rec.subType || rec.recordType]">
                        {{ verifyingDns[rec.subType || rec.recordType] ? 'sync' : (rec.isVerified ? 'check_circle' : 'done_all') }}
                      </span>
                      <span>{{ verifyingDns[rec.subType || rec.recordType] ? 'Checking...' : (rec.isVerified ? 'Verified' : 'Verify') }}</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 2. Business Mailbox Management (System + 1 Free Custom Mailbox) -->
        <div class="email-section-block">
          <div class="section-subheading">
            <span class="material-symbols-outlined text-purple">mark_email_unread</span>
            <div class="title-with-quota">
              <div>
                <h4>Business Mailboxes</h4>
                <p>Manage inboxes for your domain. Includes 1 free custom mailbox plus automated system sender.</p>
              </div>
              <div class="quota-pill" [class.quota-full]="(customMailbox ? 1 : (emailConfig?.customMailboxesUsed || 0)) >= (emailConfig?.customMailboxesAllowed || 1)">
                <span class="material-symbols-outlined">account_balance_wallet</span>
                <span>Free Mailboxes: <strong>{{ (customMailbox ? 1 : (emailConfig?.customMailboxesUsed || 0)) }} / {{ emailConfig?.customMailboxesAllowed || 1 }}</strong> Used</span>
              </div>
            </div>
          </div>

          <div class="mailboxes-grid">
            <!-- Mailbox Card: System Sender -->
            <div class="mailbox-card system-mailbox-card">
              <div class="mailbox-header">
                <div class="mailbox-icon-tag bg-blue">
                  <span class="material-symbols-outlined">smart_toy</span>
                </div>
                <div class="mailbox-info">
                  <div class="mailbox-email">noreply&#64;{{ customDomain }}</div>
                  <div class="mailbox-name">System Automated Sender</div>
                </div>
                <span class="badge badge-info">
                  <span class="material-symbols-outlined badge-icon">lock</span> System Protected
                </span>
              </div>
              <div class="mailbox-body">
                <p class="mailbox-note">Used automatically by the BCC platform to dispatch system alerts, invoices, security tokens, and customer notifications.</p>
                <div class="mailbox-meta">
                  <span class="meta-item"><span class="material-symbols-outlined">storage</span> 2,048 MB Storage</span>
                  <span class="meta-item"><span class="material-symbols-outlined">verified</span> Active</span>
                </div>
              </div>
            </div>

            <!-- Mailbox Card: Custom Free Mailbox (if exists) -->
            <div *ngIf="customMailbox" class="mailbox-card custom-mailbox-card">
              <div class="mailbox-header">
                <div class="mailbox-icon-tag bg-green">
                  <span class="material-symbols-outlined">person</span>
                </div>
                <div class="mailbox-info">
                  <div class="mailbox-email">{{ customMailbox.email }}</div>
                  <div class="mailbox-name">{{ customMailbox.name || 'Custom Business Mailbox' }}</div>
                </div>
                <span class="badge badge-success">
                  <span class="dot bg-green"></span> 1 Free Included
                </span>
              </div>
              <div class="mailbox-body">
                <p class="mailbox-note">Your designated custom business mailbox for inquiries, customer support, or executive correspondence.</p>
                <div class="mailbox-meta">
                  <span class="meta-item"><span class="material-symbols-outlined">storage</span> {{ customMailbox.quotaMb || 2048 }} MB Storage</span>
                  <span class="meta-item"><span class="material-symbols-outlined">inbox</span> IMAP / SMTP Ready</span>
                </div>
                <div class="mailbox-actions">
                  <button
                    type="button"
                    class="btn-delete-mailbox"
                    (click)="deleteCustomMailbox(customMailbox)"
                    [disabled]="deletingMailbox"
                    title="Delete mailbox to free up slot"
                  >
                    <span class="material-symbols-outlined">delete</span>
                    <span>{{ deletingMailbox ? 'Deleting...' : 'Delete Mailbox' }}</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Mailbox Creation Form (if custom mailbox not created) -->
            <div *ngIf="!customMailbox" class="mailbox-card create-mailbox-card">
              <div class="mailbox-header">
                <div class="mailbox-icon-tag bg-purple">
                  <span class="material-symbols-outlined">add_circle</span>
                </div>
                <div class="mailbox-info">
                  <div class="mailbox-email">Create Your 1 Free Custom Mailbox</div>
                  <div class="mailbox-name">Zero setup fees. Choose any custom address.</div>
                </div>
                <span class="badge badge-success">
                  <span class="material-symbols-outlined badge-icon">check_circle</span> 1 Free Slot Available
                </span>
              </div>
              <div class="mailbox-form">
                <div class="form-row-compact">
                  <div class="form-col">
                    <label class="form-label-compact">Email Prefix <span class="required">*</span></label>
                    <div class="prefix-input-wrap">
                      <input
                        type="text"
                        class="form-control-compact"
                        [(ngModel)]="newMailboxPrefix"
                        placeholder="e.g. support or info"
                      />
                      <span class="domain-addon">&#64;{{ customDomain }}</span>
                    </div>
                  </div>
                  <div class="form-col">
                    <label class="form-label-compact">Display Name <span class="required">*</span></label>
                    <input
                      type="text"
                      class="form-control-compact"
                      [(ngModel)]="newMailboxDisplayName"
                      placeholder="e.g. Support Team"
                    />
                  </div>
                </div>

                <div class="form-row-compact">
                  <div class="form-col full-width">
                    <div class="label-with-action">
                      <label class="form-label-compact">Password <span class="required">*</span></label>
                      <button type="button" class="btn-text-link" (click)="generateSecurePassword()">
                        <span class="material-symbols-outlined">key</span> Generate Strong Password
                      </button>
                    </div>
                    <div class="password-input-wrap">
                      <input
                        [type]="showMailboxPassword ? 'text' : 'password'"
                        class="form-control-compact"
                        [(ngModel)]="newMailboxPassword"
                        placeholder="e.g. Minimum 8 characters"
                      />
                      <button type="button" class="btn-toggle-eye" (click)="showMailboxPassword = !showMailboxPassword">
                        <span class="material-symbols-outlined">{{ showMailboxPassword ? 'visibility_off' : 'visibility' }}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div class="form-action-row">
                  <button
                    type="button"
                    class="btn-create-mailbox"
                    (click)="createCustomMailbox()"
                    [disabled]="creatingMailbox || !newMailboxPrefix || !newMailboxPassword"
                  >
                    <span class="material-symbols-outlined">add</span>
                    <span>{{ creatingMailbox ? 'Creating...' : 'Create Free Mailbox' }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. Deliverability Test & Mobile/Desktop Device Setup -->
        <div class="email-bottom-split">
          <!-- Left: Send Live Test Email Card -->
          <div class="test-email-card">
            <div class="section-subheading">
              <span class="material-symbols-outlined text-green">send</span>
              <div>
                <h4>Send Live Test Email</h4>
                <p>Verify outbound deliverability and confirm your custom domain routes emails smoothly to external inboxes.</p>
              </div>
            </div>

            <div class="test-email-form">
              <div class="form-group-compact">
                <label class="form-label-compact">Send From</label>
                <select class="form-control-compact" [(ngModel)]="testEmailSender">
                  <option *ngFor="let m of emailConfig?.mailboxes" [value]="m.emailAddress || m.email">
                    {{ m.emailAddress || m.email }} ({{ m.displayName || m.name || (m.isSystemMailbox ? 'System Automated Sender' : 'Custom Mailbox') }})
                  </option>
                  <option *ngIf="!emailConfig?.mailboxes?.length" [value]="'noreply@' + customDomain">
                    noreply&#64;{{ customDomain }} (System Automated Sender)
                  </option>
                </select>
              </div>

              <div class="form-group-compact">
                <label class="form-label-compact">Recipient Email Address <span class="required">*</span></label>
                <input
                  type="email"
                  class="form-control-compact"
                  [(ngModel)]="testEmailRecipient"
                  placeholder="e.g. user@domain.com"
                />
              </div>

              <button
                type="button"
                class="btn-send-test"
                (click)="sendDomainTestEmail()"
                [disabled]="sendingTestEmail || !testEmailRecipient"
              >
                <span class="material-symbols-outlined" [class.spin]="sendingTestEmail">
                  {{ sendingTestEmail ? 'sync' : 'mark_email_read' }}
                </span>
                <span>{{ sendingTestEmail ? 'Dispatching...' : 'Send Test Email' }}</span>
              </button>
            </div>
          </div>

          <!-- Right: Mobile Device & Email Client Setup Card -->
          <div class="client-setup-card">
            <div class="section-subheading">
              <span class="material-symbols-outlined text-blue">phonelink_setup</span>
              <div>
                <h4>Mobile &amp; Email Client Setup</h4>
                <p>Connect your domain mailbox to iPhone, Android, Outlook, or Apple Mail using standard IMAP/SMTP.</p>
              </div>
            </div>

            <!-- Device Tabs -->
            <div class="client-tabs">
              <button
                type="button"
                class="client-tab-btn"
                [class.active]="selectedClientTab === 'ios'"
                (click)="selectedClientTab = 'ios'"
              >
                <span class="material-symbols-outlined">phone_iphone</span>
                <span>iOS (iPhone / iPad)</span>
              </button>
              <button
                type="button"
                class="client-tab-btn"
                [class.active]="selectedClientTab === 'android'"
                (click)="selectedClientTab = 'android'"
              >
                <span class="material-symbols-outlined">smartphone</span>
                <span>Android (Gmail)</span>
              </button>
              <button
                type="button"
                class="client-tab-btn"
                [class.active]="selectedClientTab === 'desktop'"
                (click)="selectedClientTab = 'desktop'"
              >
                <span class="material-symbols-outlined">laptop</span>
                <span>Desktop (Outlook/Mac)</span>
              </button>
            </div>

            <!-- Step by step instructions per tab -->
            <div class="tab-instructions">
              <div *ngIf="selectedClientTab === 'ios'" class="instruction-list">
                <div class="inst-step"><span>1</span> Open <strong>Settings</strong> &gt; <strong>Mail</strong> &gt; <strong>Accounts</strong> &gt; <strong>Add Account</strong>.</div>
                <div class="inst-step"><span>2</span> Tap <strong>Other</strong> &gt; <strong>Add Mail Account</strong>.</div>
                <div class="inst-step"><span>3</span> Enter your Name, your domain email address, and your mailbox password.</div>
                <div class="inst-step"><span>4</span> Under <strong>Incoming Mail Server</strong> and <strong>Outgoing Mail Server</strong>, enter the Host and Ports below.</div>
                <div class="inst-step"><span>5</span> Tap <strong>Save</strong>. iOS automatically activates SSL encryption.</div>
              </div>

              <div *ngIf="selectedClientTab === 'android'" class="instruction-list">
                <div class="inst-step"><span>1</span> Open the <strong>Gmail app</strong> (or Samsung Email) &gt; Tap profile icon &gt; <strong>Add another account</strong>.</div>
                <div class="inst-step"><span>2</span> Select <strong>Other</strong> &gt; Enter your domain email address.</div>
                <div class="inst-step"><span>3</span> Select <strong>Personal (IMAP)</strong> and enter your mailbox password.</div>
                <div class="inst-step"><span>4</span> Enter Incoming Server (<code>mail.ozikol.cloud</code>, Port 993, SSL/TLS).</div>
                <div class="inst-step"><span>5</span> Enter Outgoing Server (<code>mail.ozikol.cloud</code>, Port 587, STARTTLS). Tap <strong>Next</strong>.</div>
              </div>

              <div *ngIf="selectedClientTab === 'desktop'" class="instruction-list">
                <div class="inst-step"><span>1</span> In <strong>Outlook</strong> or <strong>Apple Mail</strong>, choose <strong>Add Account</strong> &gt; <strong>Manual Setup</strong> (IMAP).</div>
                <div class="inst-step"><span>2</span> Username: Enter your full email address (e.g. <code *ngIf="customMailbox">{{ customMailbox.email }}</code><code *ngIf="!customMailbox">support&#64;{{ customDomain }}</code>).</div>
                <div class="inst-step"><span>3</span> Incoming: <code>mail.ozikol.cloud</code> | Port <code>993</code> | SSL/TLS.</div>
                <div class="inst-step"><span>4</span> Outgoing: <code>mail.ozikol.cloud</code> | Port <code>587</code> | STARTTLS (or 465 SSL/TLS).</div>
                <div class="inst-step"><span>5</span> Authentication: Normal password.</div>
              </div>
            </div>

            <!-- Server Connection Reference Box -->
            <div class="server-specs-box">
              <div class="spec-row">
                <span class="spec-label">Incoming (IMAP):</span>
                <span class="spec-val"><code>mail.ozikol.cloud</code> : Port <code>993</code> (SSL/TLS)</span>
              </div>
              <div class="spec-row">
                <span class="spec-label">Outgoing (SMTP):</span>
                <span class="spec-val"><code>mail.ozikol.cloud</code> : Port <code>587</code> (STARTTLS) or <code>465</code> (SSL/TLS)</span>
              </div>
              <div class="spec-row">
                <span class="spec-label">Username:</span>
                <span class="spec-val">Your Full Email Address</span>
              </div>
            </div>
          </div>
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

    /* Email Suite Card Styles */
    .email-suite-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 24px;
      padding-bottom: 24px;
    }
    .email-suite-header {
      padding: 20px 24px;
      border-bottom: 1px solid #f1f5f9;
      background: #fafbfc;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .header-title-group {
      display: flex;
      align-items: center;
      gap: 14px;
      flex: 1;
      min-width: 280px;
    }
    .suite-title-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .btn-secondary-action, .btn-primary-action {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-secondary-action {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #334155;
    }
    .btn-secondary-action:hover:not(:disabled) {
      background: #e2e8f0;
      color: #0f172a;
    }
    .btn-primary-action {
      background: #0050e5;
      border: 1px solid #0050e5;
      color: #ffffff;
    }
    .btn-primary-action:hover:not(:disabled) {
      background: #003ebd;
    }
    .btn-primary-action.btn-all-verified {
      background: #16a34a;
      border-color: #16a34a;
      color: #ffffff;
      opacity: 0.95;
      cursor: default;
    }
    .btn-secondary-action:disabled, .btn-primary-action:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .spin {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    .email-section-block {
      padding: 0 24px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .section-subheading {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    .section-subheading .material-symbols-outlined {
      font-size: 24px;
      margin-top: 2px;
    }
    .section-subheading h4 {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .section-subheading p {
      font-size: 12px;
      color: #64748b;
      margin: 2px 0 0;
    }
    .title-with-quota {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      flex-wrap: wrap;
      gap: 12px;
    }
    .quota-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1d4ed8;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    .quota-pill.quota-full {
      background: #fef2f2;
      border-color: #fecaca;
      color: #b91c1c;
    }
    .quota-pill .material-symbols-outlined {
      font-size: 16px;
      margin: 0;
    }

    .email-dns-table {
      margin-top: 6px;
    }
    .tag-mx { background: #e0e7ff; color: #4338ca; }
    .rec-desc {
      display: block;
      font-size: 11px;
      color: #64748b;
      margin-top: 3px;
    }
    .code-long {
      max-width: 320px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      display: inline-block;
      vertical-align: middle;
    }
    .detected-dns-note {
      display: block;
      font-size: 10px;
      color: #059669;
      margin-top: 4px;
    }
    .detected-dns-note code {
      font-size: 10px;
      background: #ecfdf5;
      padding: 1px 4px;
    }
    .priority-badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      background: #f1f5f9;
      font-size: 11px;
      font-weight: 600;
      color: #334155;
    }
    .ttl-text {
      font-size: 11px;
      color: #64748b;
    }
    .btn-verify-row {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 5px 10px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      color: #1d4ed8;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-verify-row:hover:not(:disabled) {
      background: #0050e5;
      color: #ffffff;
      border-color: #0050e5;
    }
    .btn-verify-row:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .btn-verify-row.btn-row-verified {
      background: #f0fdf4;
      border-color: #bbf7d0;
      color: #15803d;
      opacity: 0.95;
      cursor: default;
    }
    .btn-verify-row.btn-row-verified .material-symbols-outlined {
      color: #16a34a;
    }
    .btn-verify-row .material-symbols-outlined {
      font-size: 15px;
    }

    /* Mailboxes Grid */
    .mailboxes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 16px;
      margin-top: 6px;
    }
    .mailbox-card {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      gap: 12px;
      transition: border-color 0.15s ease;
    }
    .system-mailbox-card {
      background: linear-gradient(to bottom, #ffffff, #f8fafc);
      border-color: #cbd5e1;
    }
    .custom-mailbox-card {
      background: linear-gradient(to bottom, #ffffff, #f0fdf4);
      border-color: #86efac;
    }
    .create-mailbox-card {
      background: linear-gradient(to bottom, #ffffff, #faf5ff);
      border-color: #d8b4fe;
    }
    .mailbox-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    .mailbox-icon-tag {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .mailbox-icon-tag .material-symbols-outlined {
      font-size: 20px;
      color: #ffffff;
    }
    .mailbox-info {
      flex: 1;
    }
    .mailbox-email {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      word-break: break-all;
    }
    .mailbox-name {
      font-size: 12px;
      color: #64748b;
      margin-top: 1px;
    }
    .badge-icon {
      font-size: 12px;
      margin-right: 2px;
    }
    .mailbox-body {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .mailbox-note {
      font-size: 12px;
      color: #64748b;
      margin: 0;
      line-height: 1.4;
    }
    .mailbox-meta {
      display: flex;
      align-items: center;
      gap: 14px;
      font-size: 11px;
      color: #475569;
      font-weight: 600;
    }
    .meta-item {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .meta-item .material-symbols-outlined {
      font-size: 14px;
      color: #64748b;
    }
    .mailbox-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 6px;
    }
    .btn-delete-mailbox {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 12px;
      background: #fee2e2;
      border: 1px solid #fca5a5;
      color: #dc2626;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-delete-mailbox:hover:not(:disabled) {
      background: #dc2626;
      color: #ffffff;
      border-color: #dc2626;
    }
    .btn-delete-mailbox .material-symbols-outlined {
      font-size: 14px;
    }

    /* Mailbox Creation Form */
    .mailbox-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .form-row-compact {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    .form-col {
      flex: 1;
      min-width: 140px;
    }
    .form-col.full-width {
      flex: 1 1 100%;
    }
    .form-label-compact {
      font-size: 11px;
      font-weight: 700;
      color: #475569;
      display: block;
      margin-bottom: 4px;
    }
    .prefix-input-wrap {
      display: flex;
      align-items: center;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      overflow: hidden;
      background: #ffffff;
    }
    .prefix-input-wrap .form-control-compact {
      border: none;
      flex: 1;
      box-shadow: none;
    }
    .domain-addon {
      background: #f1f5f9;
      padding: 8px 10px;
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      border-left: 1px solid #cbd5e1;
    }
    .form-control-compact {
      width: 100%;
      box-sizing: border-box;
      max-width: 100%;
      padding: 8px 12px;
      font-size: 12px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      color: #0f172a;
      outline: none;
      transition: border-color 0.15s ease;
    }
    .form-control-compact:focus {
      border-color: #0050e5;
    }
    .label-with-action {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .label-with-action .form-label-compact {
      margin-bottom: 0;
    }
    .btn-text-link {
      background: none;
      border: none;
      color: #0050e5;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 0;
    }
    .btn-text-link:hover {
      text-decoration: underline;
    }
    .btn-text-link .material-symbols-outlined {
      font-size: 13px;
    }
    .password-input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }
    .btn-toggle-eye {
      position: absolute;
      right: 8px;
      background: none;
      border: none;
      color: #64748b;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
    }
    .btn-toggle-eye .material-symbols-outlined {
      font-size: 16px;
    }
    .form-action-row {
      display: flex;
      justify-content: flex-end;
      margin-top: 4px;
    }
    .btn-create-mailbox {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: #7c3aed;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-create-mailbox:hover:not(:disabled) {
      background: #6d28d9;
    }
    .btn-create-mailbox:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .btn-create-mailbox .material-symbols-outlined {
      font-size: 16px;
    }

    /* Bottom Split: Deliverability Test & Mobile/Desktop Device Setup */
    .email-bottom-split {
      padding: 0 24px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    @media (max-width: 900px) {
      .email-bottom-split {
        grid-template-columns: 1fr;
      }
    }
    .test-email-card, .client-setup-card {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      gap: 14px;
      box-sizing: border-box;
      min-width: 0;
      overflow: hidden;
    }
    .test-email-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
      box-sizing: border-box;
      min-width: 0;
    }
    .form-group-compact {
      display: flex;
      flex-direction: column;
      gap: 4px;
      width: 100%;
      box-sizing: border-box;
      min-width: 0;
    }
    .btn-send-test {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 10px 18px;
      background: #0050e5;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      margin-top: 4px;
      transition: all 0.15s ease;
    }
    .btn-send-test:hover:not(:disabled) {
      background: #003ebd;
    }
    .btn-send-test:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .btn-send-test .material-symbols-outlined {
      font-size: 18px;
    }

    /* Device Tabs & Instructions */
    .client-tabs {
      display: flex;
      gap: 6px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 8px;
      flex-wrap: wrap;
    }
    .client-tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 6px;
      background: #f1f5f9;
      border: 1px solid transparent;
      color: #64748b;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .client-tab-btn:hover {
      background: #e2e8f0;
      color: #0f172a;
    }
    .client-tab-btn.active {
      background: #eff6ff;
      border-color: #bfdbfe;
      color: #0050e5;
      font-weight: 700;
    }
    .client-tab-btn .material-symbols-outlined {
      font-size: 15px;
    }
    .tab-instructions {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .instruction-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .inst-step {
      font-size: 12px;
      color: #334155;
      line-height: 1.4;
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }
    .inst-step span {
      background: #e2e8f0;
      color: #1e293b;
      font-weight: 700;
      font-size: 10px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .inst-step code {
      font-size: 11px;
      background: #f1f5f9;
      padding: 1px 4px;
      border-radius: 4px;
      color: #0f172a;
    }
    .server-specs-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 4px;
    }
    .spec-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      flex-wrap: wrap;
      gap: 4px;
    }
    .spec-label {
      color: #64748b;
      font-weight: 600;
    }
    .spec-val {
      color: #0f172a;
      font-weight: 600;
    }
    .spec-val code {
      font-size: 11px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      padding: 1px 4px;
      border-radius: 4px;
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

  // Email Suite State
  emailConfig: any = null;
  loadingEmailConfig = false;
  verifyingDns: { [key: string]: boolean } = {};
  verifyingAllEmailDns = false;
  newMailboxPrefix = '';
  newMailboxDisplayName = '';
  newMailboxPassword = '';
  showMailboxPassword = false;
  creatingMailbox = false;
  deletingMailbox = false;
  testEmailRecipient = '';
  testEmailSender = '';
  sendingTestEmail = false;
  selectedClientTab: 'ios' | 'android' | 'desktop' = 'ios';

  get hasCustomDomain(): boolean {
    return !!(this.customDomain && this.customDomain.trim());
  }

  get customMailbox(): any | null {
    if (!this.emailConfig?.mailboxes?.length) return null;
    return this.emailConfig.mailboxes.find((m: any) => !m.isSystemMailbox) || null;
  }

  /**
   * Returns true if all 4 required email authentication DNS records (MX, SPF, DKIM, DMARC)
   * are actively verified on live root resolvers.
   */
  get isAllEmailDnsVerified(): boolean {
    const list = this.emailDnsRecords;
    return list.length > 0 && list.every(r => !!r.isVerified);
  }

  get emailDnsRecords(): any[] {
    const rawList = this.emailConfig?.dnsRecords || this.emailConfig?.DnsRecords;
    if (rawList && rawList.length > 0) {
      return rawList.map((rec: any) => ({
        ...rec,
        host: rec.host || rec.Host || rec.name || rec.hostName || '@',
        value: rec.value || rec.Value || rec.recordValue || rec.target || '',
        subType: rec.subType || rec.SubType || rec.recordType || rec.RecordType || '',
        recordType: rec.recordType || rec.RecordType || 'TXT',
        priority: rec.priority !== undefined ? rec.priority : (rec.Priority !== undefined ? rec.Priority : null),
        ttl: rec.ttl || rec.Ttl || 'Auto (300s)',
        description: rec.description || rec.Description || '',
        key: rec.key || rec.Key || rec.subType || rec.recordType || 'rec',
        isVerified: !!(rec.isVerified || rec.IsVerified),
        detectedValue: rec.detectedValue || rec.DetectedValue || null
      }));
    }

    return [
      {
        recordType: 'MX',
        subType: 'MX',
        host: '@',
        value: 'mail.ozikol.cloud',
        priority: 10,
        ttl: 'Auto (300s)',
        description: 'Directs incoming email traffic to the Mailcow mail server',
        isVerified: false,
        key: 'mx_primary'
      },
      {
        recordType: 'TXT',
        subType: 'SPF',
        host: '@',
        value: 'v=spf1 a mx a:mail.ozikol.cloud ~all',
        priority: null,
        ttl: 'Auto (300s)',
        description: 'SPF: Authorizes Mailcow server to send emails on behalf of this domain',
        isVerified: false,
        key: 'txt_spf'
      },
      {
        recordType: 'TXT',
        subType: 'DKIM',
        host: 'dkim._domainkey',
        value: 'v=DKIM1; k=rsa; p=(Generating 2048-bit key...)',
        priority: null,
        ttl: 'Auto (300s)',
        description: 'DKIM: Cryptographic signature confirming outbound email authenticity',
        isVerified: false,
        key: 'txt_dkim'
      },
      {
        recordType: 'TXT',
        subType: 'DMARC',
        host: '_dmarc',
        value: `v=DMARC1; p=none; rua=mailto:dmarc@${this.customDomain || 'domain.com'}`,
        priority: null,
        ttl: 'Auto (300s)',
        description: 'DMARC: Domain-based Message Authentication Reporting and Conformance policy',
        isVerified: false,
        key: 'txt_dmarc'
      }
    ];
  }

  /**
   * Indicates whether the domain is fully verified against DNS records (A record or CNAME).
   * When true: "Unbind Domain" is active, and "Verify & Save Domain" is inactive.
   * When false: "Verify & Save Domain" is active, and "Unbind Domain" is inactive.
   */
  get isDomainVerified(): boolean {
    if (!this.hasCustomDomain) return false;
    const currentInput = (this.customDomainInput || '').trim().toLowerCase().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
    const activeDomain = (this.customDomain || '').trim().toLowerCase().replace(/^https?:\/\//i, '').replace(/\/+$/, '');

    // If user edited the input to a different domain, it is unverified
    if (currentInput !== activeDomain) return false;

    // Verified when probe results confirm CNAME or A record match
    return !!(this.probeResults && this.probeResults.cnamePassed);
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
            this.probeDnsSilently(this.customDomain);
            this.loadDomainEmailConfig(this.customDomain);
          } else {
            localStorage.removeItem('tenant_custom_domain');
            this.emailConfig = null;
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

  /**
   * Verifies DNS records for the entered custom domain and binds it in the Master Catalog.
   * If verification fails:
   *   - The button is NOT disabled, allowing the user to easily retry after updating DNS.
   *   - "Unbind Domain" remains disabled/inactive.
   * If verification succeeds:
   *   - The domain is bound, making "Unbind Domain" active and "Verify & Save Domain" inactive.
   */
  async verifyAndSaveDomain(): Promise<void> {
    const rawInput = (this.customDomainInput || '').trim();
    if (!rawInput) {
      this.toast.error('Please enter a valid domain name.', 'Validation Error');
      return;
    }

    const cleanDomain = rawInput
      .replace(/^https?:\/\//i, '')
      .replace(/\/+$/, '')
      .trim();

    this.saving = true;

    try {
      // 1. Proactively probe DNS resolution first
      const dnsPassed = await this.executeDnsProbe(cleanDomain);

      if (!dnsPassed) {
        // If DNS did NOT verify, reset saving immediately so the button is NOT disabled!
        this.saving = false;
        this.toast.warning(
          `Domain not yet pointed. DNS records do not match Platform IP '2.24.162.42' or '${this.cleanTargetHost}'. The button remains active so you can try again once your registrar updates.`,
          'Verification Required'
        );
        return;
      }

      // 2. DNS is verified! Proceed to save & bind in Master Catalog & provision server routing
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

          const prov = updated?.provisioningStatus || updated?.ProvisioningStatus;
          if (prov?.dnsProbe) {
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
          } else if (this.probeResults) {
            this.probeResults.cnamePassed = true;
            this.probeResults.routingReady = true;
            this.probeResults.sslReady = true;
          }

          // Notify layout and other components of the updated domain
          window.dispatchEvent(new CustomEvent('tenant_domain_updated', {
            detail: { customDomain: cleanDomain }
          }));

          this.loadDomainEmailConfig(cleanDomain);

          this.toast.success(`Domain '${cleanDomain}' verified and saved successfully! Automated routing is active.`, 'Domain Verified');
        },
        error: (err) => {
          // If save fails, reset saving so the button is NOT disabled
          this.saving = false;
          console.error('[Custom Domain] Failed to save custom domain:', err);
          const errorMsg = err?.error?.message || err?.error?.Message || 'Failed to update custom domain.';
          this.toast.error(errorMsg, 'Binding Failed');
        }
      });
    } catch (err) {
      // In case of error, reset saving so the button is NOT disabled
      this.saving = false;
      console.error('[Custom Domain] Error during domain verification:', err);
      this.toast.error('An error occurred during domain verification. Please try again.', 'Error');
    }
  }

  saveCustomDomain(): void {
    this.verifyAndSaveDomain();
  }

  /**
   * Unbinds the custom domain, removing custom routing and restoring the default host.
   * When complete, "Verify & Save Domain" becomes active and "Unbind Domain" becomes inactive.
   */
  unbindDomain(): void {
    if (!this.customDomain) return;

    if (!confirm(`Are you sure you want to unbind '${this.customDomain}'? Your website will revert to '${this.primaryDomain}'.`)) {
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
        const previousDomain = this.customDomain;
        this.customDomain = '';
        this.customDomainInput = '';
        this.probeResults = null;
        this.emailConfig = null;
        localStorage.removeItem('tenant_custom_domain');

        // Notify layout
        window.dispatchEvent(new CustomEvent('tenant_domain_updated', {
          detail: { customDomain: '' }
        }));

        this.toast.success(`Custom domain '${previousDomain}' was unbound. Reverted to default host.`, 'Domain Unbound');
      },
      error: (err) => {
        this.saving = false;
        console.error('[Custom Domain] Failed to unbind domain:', err);
        this.toast.error('Failed to unbind custom domain.', 'Error');
      }
    });
  }

  unlinkDomain(): void {
    this.unbindDomain();
  }

  /**
   * Probes DNS silently on page load to initialize verified state without showing toast notifications.
   */
  async probeDnsSilently(domain: string): Promise<void> {
    try {
      await this.executeDnsProbe(domain);
    } catch (err) {
      console.warn('[Custom Domain] Silent DNS probe warning:', err);
    }
  }

  /**
   * Central DNS probe executor that checks server probe API and falls back to public DoH.
   */
  async executeDnsProbe(domain: string): Promise<boolean> {
    const cleanDomain = domain.replace(/^https?:\/\//i, '').replace(/\/+$/, '').trim();

    // 1. Try server-side probe API first
    try {
      const serverRes: any = await this.api.get<any>(`DashboardApi/probe-custom-domain-dns?domain=${encodeURIComponent(cleanDomain)}`).toPromise();
      const probeData = serverRes?.data || serverRes?.Data;
      if (probeData) {
        const passed = !!probeData.isDnsPointed;
        this.probeResults = {
          domain: cleanDomain,
          expectedTarget: probeData.expectedTarget || '2.24.162.42',
          detectedTarget: probeData.detectedTarget || cleanDomain,
          cnamePassed: passed,
          sslReady: passed,
          routingReady: passed,
          isNxDomain: !!probeData.isNxDomain,
          detectedIps: probeData.detectedIps || [],
          isIpMatch: !!probeData.isIpMatch
        };
        return passed;
      }
    } catch (apiErr) {
      console.warn('[DNS Probe] Server DNS probe error, falling back to public DoH:', apiErr);
    }

    // 2. Fallback to public DoH resolvers
    return await this.probeDnsPublicResolvers(cleanDomain);
  }

  /**
   * Performs public Google / Cloudflare DoH resolution.
   */
  async probeDnsPublicResolvers(cleanDomain: string): Promise<boolean> {
    const expectedHost = this.cleanTargetHost.toLowerCase();
    let cnameData: any = null;
    let aRecordData: any = null;

    try {
      const dohCnameUrl = `https://dns.google/resolve?name=${encodeURIComponent(cleanDomain)}&type=CNAME`;
      const cnameRes = await fetch(dohCnameUrl, { headers: { 'Accept': 'application/json' } });
      if (cnameRes.ok) cnameData = await cnameRes.json();
    } catch {}

    try {
      const dohAUrl = `https://dns.google/resolve?name=${encodeURIComponent(cleanDomain)}&type=A`;
      const aRes = await fetch(dohAUrl, { headers: { 'Accept': 'application/json' } });
      if (aRes.ok) aRecordData = await aRes.json();
    } catch {}

    if (!cnameData && !aRecordData) {
      try {
        const cfUrl = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(cleanDomain)}&type=CNAME`;
        const cfRes = await fetch(cfUrl, { headers: { 'Accept': 'application/dns-json' } });
        if (cfRes.ok) cnameData = await cfRes.json();
      } catch {}
    }

    const answers: any[] = [
      ...(cnameData?.Answer || []),
      ...(aRecordData?.Answer || [])
    ];

    const detectedCnames = answers
      .filter(a => a.type === 5)
      .map(a => (a.data || '').toLowerCase().replace(/\.$/, '').trim());

    const detectedIps = answers
      .filter(a => a.type === 1)
      .map(a => a.data?.trim());

    const cnameMatch = detectedCnames.some(c => c === expectedHost || c.includes(expectedHost) || c.endsWith('.ozikol.cloud'));
    const validPlatformIps = ['2.24.162.42', '104.21.32.45', '172.67.182.206'];
    const ipMatch = detectedIps.some(ip => validPlatformIps.includes(ip));
    const dnsPassed = cnameMatch || ipMatch;
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

    return dnsPassed;
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

    this.probing = true;
    try {
      const dnsPassed = await this.executeDnsProbe(cleanDomain);
      if (dnsPassed) {
        const resolutionNote = this.probeResults?.isIpMatch ? 'A Record IP (2.24.162.42)' : `'${this.cleanTargetHost}'`;
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
          `Domain not yet pointed. DNS records do not match '${this.cleanTargetHost}' or Platform IP '2.24.162.42'. The button remains active.`,
          'Domain Not Yet Pointed'
        );
      }
    } finally {
      this.probing = false;
    }
  }

  /**
   * Loads domain email configuration and active mailboxes from backend/Mailcow.
   */
  loadDomainEmailConfig(domain?: string): void {
    const targetDomain = domain || this.customDomain;
    if (!targetDomain) return;

    const cleanDomain = targetDomain.replace(/^https?:\/\//i, '').replace(/\/+$/, '').trim();
    this.loadingEmailConfig = true;

    this.api.get<any>(`DashboardApi/domain-email-config?domain=${encodeURIComponent(cleanDomain)}`).subscribe({
      next: (res) => {
        this.loadingEmailConfig = false;
        const data = res?.data || res?.Data;
        if (data) {
          if (Array.isArray(data.mailboxes)) {
            data.mailboxes = data.mailboxes.map((m: any) => ({
              ...m,
              email: m.email || m.emailAddress || m.EmailAddress,
              emailAddress: m.emailAddress || m.EmailAddress || m.email,
              name: m.name || m.displayName || m.DisplayName || m.localPart || m.LocalPart,
              displayName: m.displayName || m.DisplayName || m.name
            }));
          }

          const customCount = Array.isArray(data.mailboxes)
            ? data.mailboxes.filter((m: any) => !m.isSystemMailbox).length
            : (data.currentCustomMailboxCount ?? data.CurrentCustomMailboxCount ?? 0);

          data.customMailboxesUsed = customCount;
          data.customMailboxesAllowed = data.maxFreeMailboxes ?? data.MaxFreeMailboxes ?? 1;
          this.emailConfig = data;
          if (!this.testEmailSender && data.mailboxes?.length > 0) {
            this.testEmailSender = data.mailboxes[0].emailAddress || data.mailboxes[0].email;
          } else if (!this.testEmailSender && this.customDomain) {
            this.testEmailSender = `noreply@${this.customDomain}`;
          }
        }
      },
      error: (err) => {
        this.loadingEmailConfig = false;
        console.warn('[Custom Domain] Note loading email config:', err);
      }
    });
  }

  /**
   * Verifies live DNS propagation for a single record type (MX, SPF, DKIM, DMARC).
   */
  verifyEmailDnsRecord(recordType: string): void {
    const targetDomain = this.customDomain;
    if (!targetDomain) {
      this.toast.error('No custom domain configured.', 'Error');
      return;
    }

    const targetType = (recordType || '').toUpperCase();
    const existingRec = this.emailConfig?.dnsRecords?.find((r: any) =>
      (r.subType && r.subType.toUpperCase() === targetType) ||
      (r.recordType && r.recordType.toUpperCase() === targetType) ||
      (r.SubType && r.SubType.toUpperCase() === targetType) ||
      (r.RecordType && r.RecordType.toUpperCase() === targetType)
    );
    if (existingRec && (existingRec.isVerified ?? existingRec.IsVerified)) {
      this.toast.info(`${recordType} record is already verified and active on live DNS.`, 'Already Verified');
      return;
    }

    const cleanDomain = targetDomain.replace(/^https?:\/\//i, '').replace(/\/+$/, '').trim();
    this.verifyingDns[recordType] = true;

    this.api.get<any>(`DashboardApi/verify-domain-email-dns?domain=${encodeURIComponent(cleanDomain)}&subType=${encodeURIComponent(recordType)}&recordType=${encodeURIComponent(recordType)}`).subscribe({
      next: (res) => {
        this.verifyingDns[recordType] = false;
        const result = res?.data || res?.Data;
        if (result) {
          // Update local record status
          if (this.emailConfig?.dnsRecords) {
            const rec = this.emailConfig.dnsRecords.find((r: any) =>
              (r.subType && r.subType.toUpperCase() === targetType) ||
              (r.recordType && r.recordType.toUpperCase() === targetType) ||
              (r.SubType && r.SubType.toUpperCase() === targetType) ||
              (r.RecordType && r.RecordType.toUpperCase() === targetType)
            );
            if (rec) {
              rec.isVerified = !!(result.isVerified ?? result.IsVerified);
              rec.detectedValue = result.detectedValue ?? result.DetectedValue ?? null;
              if (this.emailConfig?.dnsRecords) {
                this.emailConfig.isFullyProvisioned = this.emailConfig.dnsRecords.every((r: any) => !!(r.isVerified ?? r.IsVerified));
              }
            }
          }

          if (result.isVerified) {
            this.toast.success(`${recordType} record verified successfully on live DNS!`, 'DNS Record Active');
          } else {
            this.toast.warning(
              result.notes || `${recordType} record not detected yet. DNS changes can take up to 10 minutes to propagate globally.`,
              'Propagation Pending'
            );
          }
        }
      },
      error: (err) => {
        this.verifyingDns[recordType] = false;
        console.error(`[Custom Domain] Error verifying ${recordType} record:`, err);
        this.toast.error(`Failed to verify ${recordType} record. Please try again.`, 'Verification Error');
      }
    });
  }

  /**
   * Probes and verifies all email DNS records (MX, SPF, DKIM, DMARC) in sequence.
   */
  async verifyAllEmailDnsRecords(): Promise<void> {
    if (this.isAllEmailDnsVerified) {
      this.toast.info('All email DNS records are already verified and active.', 'Already Verified');
      return;
    }

    const records = ['MX', 'SPF', 'DKIM', 'DMARC'];
    this.verifyingAllEmailDns = true;

    try {
      for (const rec of records) {
        this.verifyingDns[rec] = true;
      }
      this.toast.info('Checking live propagation for MX, SPF, DKIM, and DMARC across root resolvers...', 'Probing DNS');

      // Reload config from backend which triggers comprehensive live verification
      await this.api.get<any>(`DashboardApi/domain-email-config?domain=${encodeURIComponent(this.customDomain)}`).toPromise().then(res => {
        const data = res?.data || res?.Data;
        if (data) {
          this.emailConfig = data;
        }
      });

      const allPassed = this.emailConfig?.dnsRecords?.every((r: any) => r.isVerified);
      if (allPassed) {
        this.toast.success('All email DNS records are verified and active! Your domain is fully authenticated for inbox deliverability.', 'All Records Active');
      } else {
        this.toast.warning('Some email DNS records have not propagated yet. Check the table for details.', 'Propagation in Progress');
      }
    } catch (err) {
      console.error('[Custom Domain] Error verifying all DNS records:', err);
      this.toast.error('Could not complete DNS verification. Please check individual records.', 'Verification Error');
    } finally {
      this.verifyingAllEmailDns = false;
      for (const rec of records) {
        this.verifyingDns[rec] = false;
      }
    }
  }

  /**
   * Creates the 1 free custom business mailbox for the tenant domain.
   */
  createCustomMailbox(): void {
    if (!this.customDomain) return;
    const prefix = (this.newMailboxPrefix || '').trim().toLowerCase();
    const displayName = (this.newMailboxDisplayName || '').trim();
    const password = (this.newMailboxPassword || '').trim();

    if (!prefix) {
      this.toast.error('Please enter an email prefix (e.g. support or info).', 'Validation Error');
      return;
    }

    if (!displayName) {
      this.toast.error('Please enter a display name for this mailbox.', 'Validation Error');
      return;
    }

    if (!password || password.length < 8) {
      this.toast.error('Mailbox password must be at least 8 characters long.', 'Password Too Short');
      return;
    }

    this.creatingMailbox = true;
    const payload = {
      domain: this.customDomain,
      localPart: prefix,
      username: prefix,
      prefix: prefix,
      displayName: displayName,
      password: password
    };

    this.api.post<any>('DashboardApi/create-custom-mailbox', payload).subscribe({
      next: (res) => {
        this.creatingMailbox = false;
        this.toast.success(`Mailbox '${prefix}@${this.customDomain}' created successfully!`, 'Mailbox Created');
        this.newMailboxPrefix = '';
        this.newMailboxDisplayName = '';
        this.newMailboxPassword = '';
        this.showMailboxPassword = false;
        this.loadDomainEmailConfig(this.customDomain);
      },
      error: (err) => {
        this.creatingMailbox = false;
        console.error('[Custom Domain] Failed to create mailbox:', err);
        const msg = err?.error?.message || err?.error?.Message || 'Failed to create mailbox.';
        this.toast.error(msg, 'Creation Failed');
      }
    });
  }

  /**
   * Deletes a custom mailbox to release the 1-free mailbox quota.
   */
  deleteCustomMailbox(mailbox: any): void {
    if (!mailbox || !this.customDomain) return;

    if (!confirm(`Are you sure you want to delete '${mailbox.email}'? This will permanently delete stored messages and free up your 1 custom mailbox slot.`)) {
      return;
    }

    const local = mailbox.localPart || (mailbox.email && mailbox.email.includes('@') ? mailbox.email.split('@')[0] : '');
    this.deletingMailbox = true;
    const payload = {
      domain: this.customDomain,
      localPart: local,
      username: local,
      email: mailbox.email
    };

    this.api.post<any>('DashboardApi/delete-custom-mailbox', payload).subscribe({
      next: () => {
        this.deletingMailbox = false;
        this.toast.success(`Mailbox '${mailbox.email}' deleted. 1 custom mailbox slot is now available.`, 'Mailbox Removed');
        this.loadDomainEmailConfig(this.customDomain);
      },
      error: (err) => {
        this.deletingMailbox = false;
        console.error('[Custom Domain] Failed to delete mailbox:', err);
        const msg = err?.error?.message || err?.error?.Message || 'Failed to delete mailbox.';
        this.toast.error(msg, 'Delete Failed');
      }
    });
  }

  /**
   * Generates a strong, random password for the new mailbox.
   */
  generateSecurePassword(): void {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let pwd = '';
    for (let i = 0; i < 14; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.newMailboxPassword = pwd;
    this.showMailboxPassword = true;
    this.toast.info('Secure password generated and displayed. Copy it before saving!', 'Password Generated');
  }

  /**
   * Sends a live test email from the domain to a designated recipient address.
   */
  sendDomainTestEmail(): void {
    if (!this.customDomain) return;
    const recipient = (this.testEmailRecipient || '').trim();
    if (!recipient || !recipient.includes('@') || !recipient.includes('.')) {
      this.toast.error('Please enter a valid recipient email address (e.g. user@domain.com).', 'Invalid Email');
      return;
    }

    const sender = this.testEmailSender || `noreply@${this.customDomain}`;
    this.sendingTestEmail = true;

    const payload = {
      domain: this.customDomain,
      senderEmail: sender,
      recipientEmail: recipient
    };

    this.api.post<any>('DashboardApi/send-domain-test-email', payload).subscribe({
      next: (res) => {
        this.sendingTestEmail = false;
        this.toast.success(`Test email dispatched successfully from '${sender}' to '${recipient}'! Check your inbox.`, 'Test Email Sent');
      },
      error: (err) => {
        this.sendingTestEmail = false;
        console.error('[Custom Domain] Test email error:', err);
        const msg = err?.error?.message || err?.error?.Message || 'Failed to send test email.';
        this.toast.error(msg, 'Dispatch Failed');
      }
    });
  }

  copyValue(text: string, key: string): void {
    if (!text || text === 'undefined') {
      this.toast.warning('No value available to copy.', 'Copy Warning');
      return;
    }

    const cleanText = String(text).trim();

    if (!navigator?.clipboard) {
      const textarea = document.createElement('textarea');
      textarea.value = cleanText;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        this.copySuccess[key] = true;
        const displaySnippet = cleanText.length > 35 ? cleanText.substring(0, 35) + '...' : cleanText;
        this.toast.success(`Copied: ${displaySnippet}`, 'Copied to Clipboard');
        setTimeout(() => {
          this.copySuccess[key] = false;
        }, 2000);
      } catch {
        this.toast.error('Could not copy to clipboard.', 'Error');
      } finally {
        document.body.removeChild(textarea);
      }
      return;
    }

    navigator.clipboard.writeText(cleanText).then(() => {
      this.copySuccess[key] = true;
      const displaySnippet = cleanText.length > 35 ? cleanText.substring(0, 35) + '...' : cleanText;
      this.toast.success(`Copied: ${displaySnippet}`, 'Copied to Clipboard');
      setTimeout(() => {
        this.copySuccess[key] = false;
      }, 2000);
    }).catch(err => {
      console.error('[Copy Error]', err);
      this.toast.error('Failed to copy to clipboard.', 'Error');
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
