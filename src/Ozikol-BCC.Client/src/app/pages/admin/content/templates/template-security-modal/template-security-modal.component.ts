import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TemplateSecurityScannerService, SecurityScanState, SecurityViolation } from '../services/template-security-scanner.service';

/**
 * Enterprise Pre-Flight Security & Code Integrity Scanning Modal.
 * Intercepts template create and update operations, providing real-time 5-point heuristic
 * auditing of HTML, CSS, JavaScript, and dynamic mock tokens before database persistence.
 */
@Component({
  selector: 'app-template-security-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="security-modal-overlay" *ngIf="state.isOpen" (click)="onBackdropClick($event)">
      <div class="security-modal-card" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <div class="header-badge-row">
            <div class="security-icon-badge" [class.badge-pulse]="state.isScanning" [class.badge-pass]="state.isPassed && !state.hasCriticalThreats" [class.badge-fail]="state.hasCriticalThreats">
              <span class="material-symbols-outlined icon-main">
                {{ state.isScanning ? 'radar' : (state.hasCriticalThreats ? 'gpp_bad' : 'verified_user') }}
              </span>
            </div>
            <div class="header-titles">
              <h3 class="modal-title">Pre-Flight Security &amp; Code Integrity Scan</h3>
              <p class="modal-subtitle">
                Verifying template source assets against SQL injection, executable scripts, and security policies before database persistence.
              </p>
            </div>
          </div>
          <button type="button" class="btn-close-modal" (click)="close()" title="Close scanner">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <!-- Scanning Pulse Banner (When Active) -->
        <div class="scanning-pulse-banner" *ngIf="state.isScanning">
          <div class="scanning-spinner"></div>
          <span class="scanning-text">Executing 5-point heuristic inspection across HTML, CSS, JavaScript, and database tokens...</span>
        </div>

        <!-- 5-Point Security Checklist Stages -->
        <div class="stages-grid">
          <div
            class="stage-item-card"
            *ngFor="let stage of state.stages"
            [class.status-pending]="stage.status === 'pending'"
            [class.status-scanning]="stage.status === 'scanning'"
            [class.status-passed]="stage.status === 'passed'"
            [class.status-warning]="stage.status === 'warning'"
            [class.status-failed]="stage.status === 'failed'"
          >
            <div class="stage-icon-wrap">
              <span class="material-symbols-outlined stage-status-icon" *ngIf="stage.status === 'pending'">hourglass_empty</span>
              <span class="material-symbols-outlined stage-status-icon spin" *ngIf="stage.status === 'scanning'">sync</span>
              <span class="material-symbols-outlined stage-status-icon text-success" *ngIf="stage.status === 'passed'">check_circle</span>
              <span class="material-symbols-outlined stage-status-icon text-warning" *ngIf="stage.status === 'warning'">warning</span>
              <span class="material-symbols-outlined stage-status-icon text-danger" *ngIf="stage.status === 'failed'">cancel</span>
            </div>
            <div class="stage-content">
              <div class="stage-title-row">
                <span class="stage-name">{{ stage.title }}</span>
                <span class="stage-badge badge-clean" *ngIf="stage.status === 'passed'">Verified Safe</span>
                <span class="stage-badge badge-warn" *ngIf="stage.status === 'warning'">{{ stage.threatCount }} Notice(s)</span>
                <span class="stage-badge badge-threat" *ngIf="stage.status === 'failed'">{{ stage.threatCount }} Threat(s)</span>
              </div>
              <p class="stage-desc">{{ stage.description }}</p>
            </div>
          </div>
        </div>

        <!-- Outcome Status Banner (When Completed) -->
        <div class="outcome-banner-wrap" *ngIf="state.isCompleted">
          <!-- 1. All Clean -->
          <div class="outcome-banner banner-success" *ngIf="state.isPassed && state.violations.length === 0">
            <span class="material-symbols-outlined outcome-icon">task_alt</span>
            <div class="outcome-texts">
              <h4 class="outcome-headline">0 Security Violations Detected</h4>
              <p class="outcome-detail">
                All semantic HTML, scoped CSS, client scripts, and URLs successfully passed enterprise safety requirements. Safe to commit to the database.
              </p>
            </div>
          </div>

          <!-- 2. Passed with Warnings -->
          <div class="outcome-banner banner-advisory" *ngIf="state.isPassed && state.violations.length > 0">
            <span class="material-symbols-outlined outcome-icon">info</span>
            <div class="outcome-texts">
              <h4 class="outcome-headline">Security Audit Passed with Advisories</h4>
              <p class="outcome-detail">
                {{ state.violations.length }} non-blocking advisory note(s) identified. You can review them below or proceed with database persistence.
              </p>
            </div>
          </div>

          <!-- 3. Critical Block -->
          <div class="outcome-banner banner-blocked" *ngIf="state.hasCriticalThreats">
            <span class="material-symbols-outlined outcome-icon">dangerous</span>
            <div class="outcome-texts">
              <h4 class="outcome-headline">Database Persistence Blocked</h4>
              <p class="outcome-detail">
                The security gatekeeper detected prohibited code patterns. These must be removed from the template before the database can be updated.
              </p>
            </div>
          </div>
        </div>

        <!-- Identified Violations List -->
        <div class="violations-section" *ngIf="state.violations.length > 0">
          <div class="violations-header">
            <span class="violations-title">Audited Findings ({{ state.violations.length }})</span>
            <span class="violations-hint">Review exact line numbers and code snippets flagged by the security engine</span>
          </div>

          <div class="violations-list-scroll">
            <div
              class="violation-card"
              *ngFor="let item of state.violations"
              [class.violation-critical]="item.severity === 'critical'"
              [class.violation-warning]="item.severity === 'warning'"
            >
              <div class="violation-top-row">
                <div class="badges-group">
                  <span class="severity-pill" [class.pill-critical]="item.severity === 'critical'" [class.pill-warning]="item.severity === 'warning'">
                    {{ item.severity | uppercase }}
                  </span>
                  <span class="category-tag">{{ item.threatCategory }}</span>
                  <span class="file-pill" *ngIf="item.fileName">
                    <span class="material-symbols-outlined file-pill-icon">description</span>
                    {{ item.fileName }}
                  </span>
                  <span class="field-pill">Tab: {{ item.field | uppercase }}</span>
                  <span class="line-pill" *ngIf="item.lineNumber">Line {{ item.lineNumber }}</span>
                </div>
              </div>

              <p class="violation-message">{{ item.message }}</p>

              <div class="snippet-block" *ngIf="item.snippet">
                <div class="snippet-header">
                  <span class="material-symbols-outlined snippet-icon">terminal</span>
                  <span>Flagged Snippet</span>
                </div>
                <code class="snippet-code">{{ item.snippet }}</code>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary-back" (click)="close()">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>Return to Editor</span>
          </button>

          <button
            type="button"
            class="btn btn-proceed-save"
            *ngIf="state.isPassed"
            [disabled]="state.isScanning"
            (click)="proceed()"
          >
            <span class="material-symbols-outlined">shield</span>
            <span>Proceed &amp; Save to Database</span>
          </button>

          <button
            type="button"
            class="btn btn-blocked-disabled"
            *ngIf="state.hasCriticalThreats"
            disabled
          >
            <span class="material-symbols-outlined">block</span>
            <span>Save Blocked (Resolve Violations)</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .security-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.72);
      backdrop-filter: blur(8px);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      animation: fadeIn 0.2s ease-out;
    }

    .security-modal-card {
      background: #ffffff;
      border-radius: 20px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(226, 232, 240, 0.8);
      width: 100%;
      max-width: 760px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      animation: modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .modal-header {
      padding: 20px 24px;
      border-bottom: 1.5px solid #f1f5f9;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      background: #ffffff;
    }

    .header-badge-row {
      display: flex;
      align-items: flex-start;
      gap: 14px;
    }

    .security-icon-badge {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      background: #eff6ff;
      border: 1.5px solid #bfdbfe;
      color: #0050e5;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.3s ease;
    }

    .security-icon-badge.badge-pulse {
      background: #eef2ff;
      color: #4f46e5;
      border-color: #c7d2fe;
      animation: scanPulse 1.4s infinite ease-in-out;
    }

    .security-icon-badge.badge-pass {
      background: #ecfdf5;
      color: #059669;
      border-color: #a7f3d0;
    }

    .security-icon-badge.badge-fail {
      background: #fef2f2;
      color: #dc2626;
      border-color: #fecaca;
    }

    .icon-main {
      font-size: 26px;
    }

    .header-titles {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .modal-title {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
      letter-spacing: -0.01em;
    }

    .modal-subtitle {
      font-size: 13px;
      color: #64748b;
      margin: 0;
      line-height: 1.45;
    }

    .btn-close-modal {
      background: transparent;
      border: none;
      width: 34px;
      height: 34px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-close-modal:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    .scanning-pulse-banner {
      background: #f8faff;
      border-bottom: 1px solid #e0e7ff;
      padding: 10px 24px;
      display: flex;
      align-items: center;
      gap: 12px;
      color: #4338ca;
      font-size: 13px;
      font-weight: 500;
    }

    .scanning-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid #c7d2fe;
      border-top-color: #0050e5;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    .stages-grid {
      padding: 16px 24px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: #fafbfc;
      border-bottom: 1.5px solid #f1f5f9;
    }

    .stage-item-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      gap: 12px;
      transition: all 0.2s ease;
    }

    .stage-item-card.status-passed {
      border-color: #d1fae5;
      background: #fcfdfd;
    }

    .stage-item-card.status-failed {
      border-color: #fecaca;
      background: #fffafa;
    }

    .stage-icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stage-status-icon {
      font-size: 20px;
      color: #94a3b8;
    }

    .text-success { color: #10b981 !important; }
    .text-warning { color: #f59e0b !important; }
    .text-danger { color: #ef4444 !important; }

    .stage-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .stage-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .stage-name {
      font-size: 13px;
      font-weight: 600;
      color: #1e293b;
    }

    .stage-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 9999px;
      letter-spacing: 0.02em;
    }

    .badge-clean { background: #ecfdf5; color: #059669; }
    .badge-warn { background: #fffbeb; color: #b45309; }
    .badge-threat { background: #fef2f2; color: #dc2626; }

    .stage-desc {
      font-size: 11.5px;
      color: #64748b;
      margin: 0;
    }

    .outcome-banner-wrap {
      padding: 16px 24px 8px;
    }

    .outcome-banner {
      border-radius: 12px;
      padding: 14px 16px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .banner-success { background: #f0fdf4; border: 1.5px solid #bbf7d0; color: #166534; }
    .banner-advisory { background: #fffbeb; border: 1.5px solid #fde68a; color: #854d0e; }
    .banner-blocked { background: #fef2f2; border: 1.5px solid #fecaca; color: #991b1b; }

    .outcome-icon { font-size: 24px; flex-shrink: 0; }
    .banner-success .outcome-icon { color: #16a34a; }
    .banner-advisory .outcome-icon { color: #d97706; }
    .banner-blocked .outcome-icon { color: #dc2626; }

    .outcome-texts { display: flex; flex-direction: column; gap: 2px; }
    .outcome-headline { font-size: 14px; font-weight: 700; margin: 0; }
    .outcome-detail { font-size: 12.5px; margin: 0; line-height: 1.45; opacity: 0.9; }

    .violations-section {
      padding: 12px 24px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      overflow: hidden;
      flex: 1;
    }

    .violations-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .violations-title { font-size: 13px; font-weight: 700; color: #0f172a; }
    .violations-hint { font-size: 11.5px; color: #64748b; }

    .violations-list-scroll {
      display: flex;
      flex-direction: column;
      gap: 8px;
      overflow-y: auto;
      max-height: 240px;
      padding-right: 4px;
    }

    .violation-card {
      border-radius: 10px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      border: 1px solid #e2e8f0;
    }

    .violation-critical { background: #fffafa; border-color: #fecaca; }
    .violation-warning { background: #fffdfa; border-color: #fed7aa; }

    .violation-top-row { display: flex; align-items: center; justify-content: space-between; }
    .badges-group { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }

    .severity-pill {
      font-size: 10.5px;
      font-weight: 800;
      padding: 1px 6px;
      border-radius: 4px;
      letter-spacing: 0.04em;
    }

    .pill-critical { background: #dc2626; color: #ffffff; }
    .pill-warning { background: #f59e0b; color: #ffffff; }

    .category-tag { font-size: 11.5px; font-weight: 600; color: #0f172a; }
    .file-pill {
      font-size: 11px;
      font-weight: 700;
      background: rgba(0, 80, 229, 0.08);
      color: #0050e5;
      border: 1px solid rgba(0, 80, 229, 0.2);
      padding: 1px 7px;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-family: monospace;
    }
    .file-pill-icon {
      font-size: 13px;
    }

    .field-pill, .line-pill {
      font-size: 11px;
      font-weight: 600;
      background: #f1f5f9;
      color: #475569;
      padding: 1px 6px;
      border-radius: 4px;
    }

    .violation-message {
      font-size: 12.5px;
      color: #334155;
      margin: 0;
      line-height: 1.4;
    }

    .snippet-block {
      background: #0f172a;
      border-radius: 8px;
      padding: 8px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      border-left: 3px solid #ef4444;
    }

    .snippet-header {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 600;
      color: #94a3b8;
    }

    .snippet-icon { font-size: 13px; }

    .snippet-code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      color: #fca5a5;
      word-break: break-all;
    }

    .modal-footer {
      padding: 16px 24px;
      border-top: 1.5px solid #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      background: #ffffff;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      border-radius: 10px;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      border: none;
    }

    .btn-secondary-back {
      background: #f1f5f9;
      color: #334155;
    }

    .btn-secondary-back:hover {
      background: #e2e8f0;
      color: #0f172a;
    }

    .btn-proceed-save {
      background: #0050e5;
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(0, 80, 229, 0.25);
    }

    .btn-proceed-save:hover {
      background: #0043c2;
      box-shadow: 0 6px 16px rgba(0, 80, 229, 0.35);
    }

    .btn-blocked-disabled {
      background: #fee2e2;
      color: #991b1b;
      cursor: not-allowed;
      opacity: 0.85;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes scanPulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.35); }
      50% { box-shadow: 0 0 0 10px rgba(79, 70, 229, 0); }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes modalSlideUp {
      from { transform: translateY(16px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `]
})
export class TemplateSecurityModalComponent {
  state: SecurityScanState = {
    isOpen: false,
    isScanning: false,
    isCompleted: false,
    isPassed: false,
    hasCriticalThreats: false,
    stages: [],
    violations: []
  };

  constructor(private securityScanner: TemplateSecurityScannerService) {
    this.securityScanner.state$.subscribe(s => {
      this.state = s;
    });
  }

  proceed(): void {
    this.securityScanner.proceedWithSave();
  }

  close(): void {
    this.securityScanner.close();
  }

  onBackdropClick(event: MouseEvent): void {
    // Only close if scan is finished and not currently scanning
    if (!this.state.isScanning) {
      this.close();
    }
  }
}
