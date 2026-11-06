import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Individual security violation or warning descriptor detected during template code audit.
 */
export interface SecurityViolation {
  /** Target source code tab / asset where violation was located */
  field: 'html' | 'css' | 'js' | 'mock';
  /** Vulnerability taxonomy class (e.g. 'SqlInjection', 'DangerousExecution', 'CredentialTheft') */
  threatCategory: string;
  /** Severity tier: 'critical' blocks persistence; 'warning' offers advisory guidance */
  severity: 'critical' | 'warning';
  /** Exact code excerpt or pattern extracted from the template */
  snippet: string;
  /** Approximate 1-based source code line number */
  lineNumber?: number;
  /** Specific file name in bulk audit */
  fileName?: string;
  /** Human-readable explanation of why this code pattern was flagged */
  message: string;
}

/**
 * Visual progress stage in the Pre-Flight Security & Code Integrity scanning sequence.
 */
export interface ScanStage {
  id: 'html' | 'css' | 'js' | 'links' | 'sql';
  title: string;
  description: string;
  status: 'pending' | 'scanning' | 'passed' | 'warning' | 'failed';
  threatCount: number;
}

/**
 * Payload provided by category visual editors to initiate pre-flight security verification.
 */
export interface SecurityScanRequest {
  /** Template display name */
  title?: string;
  /** Template display name alias */
  templateTitle?: string;
  /** Template category identifier */
  category: string;
  /** Semantic HTML markup */
  html: string;
  /** Scoped CSS rules */
  css?: string;
  /** Client-side JavaScript */
  js?: string;
  /** Sample mock data string */
  mockJson?: string;
  /** Callback triggered when user approves or security scan cleanly passes */
  onConfirmSave: () => void;
}

/**
 * Reactive state snapshot governing the Template Security Pre-Flight Modal.
 */
export interface SecurityScanState {
  isOpen: boolean;
  isScanning: boolean;
  isCompleted: boolean;
  isPassed: boolean;
  hasCriticalThreats: boolean;
  stages: ScanStage[];
  violations: SecurityViolation[];
  request?: SecurityScanRequest;
}

/**
 * Centralized service executing real-time heuristic security audits on template code assets.
 * Inspects for SQL injection signatures, XSS evaluation, session theft, and suspicious links.
 */
@Injectable({
  providedIn: 'root'
})
export class TemplateSecurityScannerService {
  private readonly defaultStages: ScanStage[] = [
    { id: 'html', title: 'HTML Markup & DOM Sanitization', description: 'Checking script sources, dangerous tags, and event attributes', status: 'pending', threatCount: 0 },
    { id: 'css', title: 'Scoped CSS & Style Injection', description: 'Auditing expressions, remote imports, and keylogging selectors', status: 'pending', threatCount: 0 },
    { id: 'js', title: 'JavaScript Execution & Storage Safety', description: 'Inspecting eval(), timer strings, and credential/cookie access', status: 'pending', threatCount: 0 },
    { id: 'links', title: 'URL Protocols & Link Reputation', description: 'Scanning for unencrypted links, URL shorteners, and IP targets', status: 'pending', threatCount: 0 },
    { id: 'sql', title: 'SQL Injection & DB Token Neutrality', description: 'Verifying comment breaks, DDL keywords, and UNION signatures', status: 'pending', threatCount: 0 }
  ];

  private readonly _state$ = new BehaviorSubject<SecurityScanState>({
    isOpen: false,
    isScanning: false,
    isCompleted: false,
    isPassed: false,
    hasCriticalThreats: false,
    stages: [...this.defaultStages],
    violations: []
  });

  /** Observable stream of active security scan state */
  readonly state$: Observable<SecurityScanState> = this._state$.asObservable();

  // 1. SQL Injection Rules
  private readonly sqlRules = [
    { pattern: /'\s*(--|\/\*)/i, category: 'SqlInjection', message: 'SQL literal quote directly followed by comment delimiter detected.' },
    { pattern: /\b(DROP|ALTER|TRUNCATE)\s+TABLE\b/i, category: 'SqlInjection', message: 'Destructive DDL SQL statement (DROP/ALTER/TRUNCATE TABLE) detected.' },
    { pattern: /\bUNION\s+(ALL\s+)?SELECT\b/i, category: 'SqlInjection', message: 'Classic SQL UNION SELECT data exfiltration pattern detected.' },
    { pattern: /\b(XP_CMDSHELL|SP_EXECUTESQL)\b/i, category: 'SqlInjection', message: 'Restricted database stored procedure invocation signature detected.' },
    { pattern: /(?<![\.\?])\bEXEC(UTE)?\s*\(/i, category: 'SqlInjection', message: 'Dynamic SQL execution function signature (EXEC(...)) detected.' },
    { pattern: /\bOR\s+['"]?1['"]?\s*=\s*['"]?1\b/i, category: 'SqlInjection', message: 'Tautological SQL bypass pattern ("OR 1=1") detected.' },
    { pattern: /\b(INFORMATION_SCHEMA|SYS\.OBJECTS|SYSOBJECTS)\b/i, category: 'SqlInjection', message: 'Database system catalog schema interrogation keyword detected.' }
  ];

  // 2. JavaScript Rules
  private readonly jsRules = [
    { pattern: /\beval\s*\(/i, category: 'DangerousExecution', severity: 'critical' as const, message: 'Dynamic code execution via eval() is prohibited.' },
    { pattern: /\bnew\s+Function\s*\(/i, category: 'DangerousExecution', severity: 'critical' as const, message: 'Dynamic code compilation via new Function() is prohibited.' },
    { pattern: /\b(setTimeout|setInterval)\s*\(\s*['"`]/i, category: 'DangerousExecution', severity: 'critical' as const, message: 'String-based timer execution is prohibited. Use arrow functions instead.' },
    { pattern: /\bdocument\.cookie\b/i, category: 'CredentialTheft', severity: 'critical' as const, message: 'Direct access to browser session cookies (document.cookie) is prohibited.' },
    { pattern: /\b(window\.)?(localStorage|sessionStorage)\.(get|set|remove|clear)/i, category: 'CredentialTheft', severity: 'warning' as const, message: 'Access to browser storage detected. Ensure sensitive tenant auth tokens are not exposed.' },
    { pattern: /\b(window\.)?(parent|top)\.location\b/i, category: 'FrameHijacking', severity: 'critical' as const, message: 'Frame navigation hijacking targeting top/parent window detected.' }
  ];

  // 3. HTML Rules
  private readonly htmlRules = [
    { pattern: /<\s*script[^>]*\bsrc\s*=\s*['"]?(https?:)?\/\/(?!cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com|fonts\.googleapis\.com)[^'">\s]+/i, category: 'UntrustedScriptSource', severity: 'critical' as const, message: 'Remote script tags loading from untrusted or unverified CDN domains are blocked.' },
    { pattern: /\bon(error|load|unload|click|mouseover|mouseenter|focus|blur|submit)\s*=\s*['"]?\s*(javascript:)?/i, category: 'InlineEventHandler', severity: 'warning' as const, message: 'Inline HTML event handlers (e.g. onerror=, onload=) detected. Prefer clean event listeners in the JS tab.' },
    { pattern: /\bhref\s*=\s*['"]?\s*javascript:\s*/i, category: 'JavascriptPseudoProtocol', severity: 'critical' as const, message: 'Executable javascript: pseudo-protocol in HTML hyperlinks is prohibited.' },
    { pattern: /<\s*(base|embed|object|applet)\b/i, category: 'DangerousHtmlElement', severity: 'critical' as const, message: 'Potentially hazardous HTML element (<base>, <embed>, <object>) is prohibited.' }
  ];

  // 4. CSS Rules
  private readonly cssRules = [
    { pattern: /\bexpression\s*\(/i, category: 'MaliciousCss', severity: 'critical' as const, message: 'Legacy CSS expression() executable evaluation detected.' },
    { pattern: /\bbehavior\s*:\s*url/i, category: 'MaliciousCss', severity: 'critical' as const, message: 'Internet Explorer HTC behavior binding detected in CSS.' },
    { pattern: /input\[type=['"]?password['"]?\][^{]*{[^}]*background(-image)?\s*:\s*url/i, category: 'CssKeylogging', severity: 'critical' as const, message: 'CSS attribute selector targeting password inputs with background exfiltration URL detected.' }
  ];

  // 5. URL Blacklist Rules (Aligned with Rule 6 Spam/Phishing Policies)
  private readonly urlRules = [
    { pattern: /https?:\/\/(www\.)?(bit\.ly|tinyurl\.com|t\.co|goo\.gl|is\.gd|buff\.ly|ow\.ly|adf\.ly|bitly\.com)\/[A-Za-z0-9_-]+/i, category: 'BlacklistedUrl', severity: 'critical' as const, message: 'URL shorteners (e.g. bit.ly, tinyurl) are prohibited to protect domain sender reputation and prevent phishing.' },
    { pattern: /https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?/i, category: 'RawIpAddressLink', severity: 'warning' as const, message: 'Direct IP address link detected. Domain-named endpoints with valid SSL certificates are strongly recommended.' }
  ];

  /**
   * Initiates pre-flight security scan and presents interactive inspection modal.
   * If code is 100% clean, automatically triggers the onConfirmSave callback after a short delay.
   * If threats are found, holds execution and presents exact snippets with remedial guidance.
   * @param request Full code assets and callback action.
   */
  scanAndExecute(request: SecurityScanRequest): void {
    request.title = request.title || request.templateTitle || 'Template Asset';
    const initialStages: ScanStage[] = this.defaultStages.map(s => ({ ...s, status: 'pending', threatCount: 0 }));

    this._state$.next({
      isOpen: true,
      isScanning: true,
      isCompleted: false,
      isPassed: false,
      hasCriticalThreats: false,
      stages: initialStages,
      violations: [],
      request
    });

    // Run progressive scanning animation (800ms total for rich enterprise UX feedback)
    this.executeProgressiveScan(request);
  }

  private executeProgressiveScan(request: SecurityScanRequest): void {
    const violations: SecurityViolation[] = [];

    // Stage 1: HTML
    this.scanField(request.html, 'html', this.htmlRules, violations);
    // Stage 2: CSS
    if (request.css) this.scanField(request.css, 'css', this.cssRules, violations);
    // Stage 3: JS
    if (request.js) this.scanField(request.js, 'js', this.jsRules, violations);
    // Stage 4: URLs across all text
    this.scanUrls(request.html, 'html', violations);
    if (request.css) this.scanUrls(request.css, 'css', violations);
    if (request.js) this.scanUrls(request.js, 'js', violations);
    if (request.mockJson) this.scanUrls(request.mockJson, 'mock', violations);
    // Stage 5: SQL across all text
    this.scanSql(request.html, 'html', violations);
    if (request.css) this.scanSql(request.css, 'css', violations);
    if (request.js) this.scanSql(request.js, 'js', violations);
    if (request.mockJson) this.scanSql(request.mockJson, 'mock', violations);

    const hasCritical = violations.some(v => v.severity === 'critical');
    const isPassed = !hasCritical;

    // Simulate progressive stage advancement
    setTimeout(() => {
      const updatedStages = this.defaultStages.map(stage => {
        const stageViolations = violations.filter(v => {
          if (stage.id === 'html') return v.field === 'html' && v.threatCategory !== 'SqlInjection' && v.threatCategory !== 'BlacklistedUrl';
          if (stage.id === 'css') return v.field === 'css' && v.threatCategory !== 'SqlInjection';
          if (stage.id === 'js') return v.field === 'js' && v.threatCategory !== 'SqlInjection';
          if (stage.id === 'links') return v.threatCategory === 'BlacklistedUrl' || v.threatCategory === 'RawIpAddressLink';
          if (stage.id === 'sql') return v.threatCategory === 'SqlInjection';
          return false;
        });

        const hasCrit = stageViolations.some(v => v.severity === 'critical');
        const count = stageViolations.length;

        return {
          ...stage,
          threatCount: count,
          status: hasCrit ? 'failed' : (count > 0 ? 'warning' : 'passed')
        } as ScanStage;
      });

      this._state$.next({
        isOpen: true,
        isScanning: false,
        isCompleted: true,
        isPassed,
        hasCriticalThreats: hasCritical,
        stages: updatedStages,
        violations,
        request
      });
    }, 900);
  }

  /**
   * Invoked when user approves proceeding (if only warnings are present or after manual confirmation).
   */
  proceedWithSave(): void {
    const curr = this._state$.value;
    if (curr.request?.onConfirmSave) {
      this.close();
      curr.request.onConfirmSave();
    }
  }

  /**
   * Directly sets backend rejection violations returned from API 400 response.
   * Displays the exact malicious snippet and line number returned by the server gatekeeper.
   * @param err Backend error payload from ContentApiController.
   */
  handleBackendError(err: any): void {
    const rawViolations = err?.error?.data?.violations || err?.violations || [];
    const message = err?.error?.message || err?.message || 'Template save was rejected by server security gatekeeper.';

    const violations: SecurityViolation[] = Array.isArray(rawViolations) && rawViolations.length > 0
      ? rawViolations.map((v: any) => ({
          field: (v.field || 'html').toLowerCase().includes('css') ? 'css'
            : (v.field || '').toLowerCase().includes('js') ? 'js'
            : (v.field || '').toLowerCase().includes('content') ? 'mock' : 'html',
          threatCategory: v.threatCategory || 'SecurityViolation',
          severity: (v.severity || 'critical').toLowerCase() === 'warning' ? 'warning' : 'critical',
          snippet: v.snippet || '',
          lineNumber: v.lineNumber,
          fileName: v.fileName || v.file || undefined,
          message: v.message || 'Security violation detected by backend inspector.'
        }))
      : [{
          field: 'html',
          threatCategory: 'SecurityViolation',
          severity: 'critical',
          snippet: '',
          message
        }];

    const stages: ScanStage[] = this.defaultStages.map(s => ({
      ...s,
      status: 'failed',
      threatCount: violations.length
    }));

    this._state$.next({
      isOpen: true,
      isScanning: false,
      isCompleted: true,
      isPassed: false,
      hasCriticalThreats: true,
      stages,
      violations
    });
  }

  /**
   * Dismisses and resets the pre-flight security scan modal.
   */
  close(): void {
    this._state$.next({
      isOpen: false,
      isScanning: false,
      isCompleted: false,
      isPassed: false,
      hasCriticalThreats: false,
      stages: [...this.defaultStages],
      violations: []
    });
  }

  private scanField(
    content: string,
    field: 'html' | 'css' | 'js' | 'mock',
    rules: Array<{ pattern: RegExp; category: string; severity: 'critical' | 'warning'; message: string }>,
    violations: SecurityViolation[]
  ): void {
    if (!content) return;
    for (const rule of rules) {
      const match = rule.pattern.exec(content);
      if (match) {
        const loc = this.calculateLineLocation(content, match.index);
        violations.push({
          field,
          threatCategory: rule.category,
          severity: rule.severity,
          snippet: this.extractSnippet(content, match.index, match[0].length),
          lineNumber: loc.line,
          fileName: loc.fileName,
          message: rule.message
        });
      }
    }
  }

  private scanSql(
    content: string,
    field: 'html' | 'css' | 'js' | 'mock',
    violations: SecurityViolation[]
  ): void {
    if (!content) return;
    for (const rule of this.sqlRules) {
      const match = rule.pattern.exec(content);
      if (match) {
        const loc = this.calculateLineLocation(content, match.index);
        violations.push({
          field,
          threatCategory: rule.category,
          severity: 'critical',
          snippet: this.extractSnippet(content, match.index, match[0].length),
          lineNumber: loc.line,
          fileName: loc.fileName,
          message: rule.message
        });
      }
    }
  }

  private scanUrls(
    content: string,
    field: 'html' | 'css' | 'js' | 'mock',
    violations: SecurityViolation[]
  ): void {
    if (!content) return;
    for (const rule of this.urlRules) {
      const match = rule.pattern.exec(content);
      if (match) {
        const loc = this.calculateLineLocation(content, match.index);
        violations.push({
          field,
          threatCategory: rule.category,
          severity: rule.severity,
          snippet: this.extractSnippet(content, match.index, match[0].length),
          lineNumber: loc.line,
          fileName: loc.fileName,
          message: rule.message
        });
      }
    }
  }

  private extractSnippet(text: string, index: number, length: number): string {
    const pad = 35;
    const start = Math.max(0, index - pad);
    const end = Math.min(text.length, index + length + pad);
    const snippet = text.substring(start, end).replace(/[\r\n]+/g, ' ').trim();
    return snippet.length > 120 ? snippet.substring(0, 120) + '...' : snippet;
  }

  private calculateLineLocation(text: string, index: number): { line: number; fileName?: string } {
    if (!text || index <= 0) return { line: 1 };
    const prefix = text.substring(0, index);
    const matches = Array.from(prefix.matchAll(/\/\*\s*File:\s*([^\*]+?)\s*\*\//gi));
    if (matches.length > 0) {
      const lastMatch = matches[matches.length - 1];
      const fileName = lastMatch[1].trim();
      const fileStartIdx = (lastMatch.index ?? 0) + lastMatch[0].length;
      let line = 1;
      for (let i = fileStartIdx; i < Math.min(index, text.length); i++) {
        if (text[i] === '\n') line++;
      }
      return { line, fileName };
    }
    let line = 1;
    for (let i = 0; i < Math.min(index, text.length); i++) {
      if (text[i] === '\n') line++;
    }
    return { line };
  }
}
