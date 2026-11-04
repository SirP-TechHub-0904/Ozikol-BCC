import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';

/**
 * Dynamic terminology aliases configured by the tenant for bcp-committees.
 */
export interface CommitteeAliases {
  aliasSingular: string;
  aliasPlural: string;
  subGroupAliasSingular: string;
  subGroupAliasPlural: string;
  leaderTitleAlias: string;
  secretaryTitleAlias: string;
}

/**
 * Picked cloud document returned from Google Drive Picker or direct URL paste.
 */
export interface PickedCloudDoc {
  provider: string;
  title: string;
  url: string;
  externalFileId?: string;
  ownerEmail?: string;
}

/**
 * Interactive tour step structure for Committees Console & Workspace screens.
 */
export interface CommitteeTourStep {
  title: string;
  description: string;
  icon: string;
}

/**
 * Contextual (i) Info Icon popover metadata.
 */
export interface CommitteeInfoSpec {
  title: string;
  purpose: string;
  inputs: string;
  impact: string;
  bestPractices: string;
}

@Injectable({
  providedIn: 'root'
})
export class CommitteesService {
  private readonly ALIAS_STORAGE_KEY = 'bcp_committee_aliases_v1';

  private aliasesSubject = new BehaviorSubject<CommitteeAliases>(this.loadStoredAliases());
  /** Reactive stream of the tenant's active Singular/Plural Committee aliases. */
  public readonly aliases$: Observable<CommitteeAliases> = this.aliasesSubject.asObservable();

  public googlePickerConfig: { clientId: string; apiKey: string; appId: string; isConfigured: boolean } = {
    clientId: '',
    apiKey: '',
    appId: '',
    isConfigured: false
  };

  constructor(
    private api: ApiService,
    private http: HttpClient
  ) {}

  /**
   * Synchronous getter for current terminology aliases.
   */
  get currentAliases(): CommitteeAliases {
    return this.aliasesSubject.value;
  }

  /**
   * Updates active aliases in memory and localStorage so sidebar & headers switch instantaneously.
   * @param partial Incoming alias properties from API or SignalR.
   */
  applyAliases(partial: Partial<CommitteeAliases> | any): void {
    if (!partial) return;
    const cur = this.aliasesSubject.value;
    const next: CommitteeAliases = {
      aliasSingular: partial.aliasSingular || partial.committeeAliasSingular || cur.aliasSingular || 'Committee',
      aliasPlural: partial.aliasPlural || partial.committeeAliasPlural || partial.groupAlias || cur.aliasPlural || 'Committees',
      subGroupAliasSingular: partial.subGroupAliasSingular || cur.subGroupAliasSingular || 'Sub-Group',
      subGroupAliasPlural: partial.subGroupAliasPlural || cur.subGroupAliasPlural || 'Sub-Groups',
      leaderTitleAlias: partial.leaderTitleAlias || cur.leaderTitleAlias || 'Chairperson',
      secretaryTitleAlias: partial.secretaryTitleAlias || cur.secretaryTitleAlias || 'Secretary'
    };
    this.aliasesSubject.next(next);
    try {
      localStorage.setItem(this.ALIAS_STORAGE_KEY, JSON.stringify(next));
      localStorage.setItem('alias_group', next.aliasPlural);
    } catch {}
  }

  private loadStoredAliases(): CommitteeAliases {
    try {
      const raw = localStorage.getItem(this.ALIAS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.aliasSingular && parsed?.aliasPlural) {
          return parsed;
        }
      }
    } catch {}
    return {
      aliasSingular: 'Committee',
      aliasPlural: 'Committees',
      subGroupAliasSingular: 'Sub-Group',
      subGroupAliasPlural: 'Sub-Groups',
      leaderTitleAlias: 'Chairperson',
      secretaryTitleAlias: 'Secretary'
    };
  }

  // =========================================================================
  // SETTINGS & DASHBOARD
  // =========================================================================

  getSettings(): Observable<any> {
    return this.api.get<any>('committees/settings').pipe(
      tap((res) => {
        if (res?.isSuccess && res.data) {
          this.applyAliases(res.data);
          if (res.data.googlePickerConfig) {
            this.googlePickerConfig = res.data.googlePickerConfig;
          }
        }
      })
    );
  }

  updateSettings(payload: any): Observable<any> {
    return this.api.put<any>('committees/settings', payload).pipe(
      tap((res) => {
        if (res?.isSuccess && res.data) {
          this.applyAliases(res.data);
        }
      })
    );
  }

  getDashboard(): Observable<any> {
    return this.api.get<any>('committees/dashboard').pipe(
      tap((res) => {
        if (res?.isSuccess && res.data?.aliases) {
          this.applyAliases(res.data.aliases);
        }
      })
    );
  }

  // =========================================================================
  // MANAGE COMMITTEES, ROSTER & FORMS
  // =========================================================================

  getManagedCommittees(search?: string, status?: string): Observable<any> {
    return this.api.get<any>('committees/manage', { search: search || '', status: status || 'All' });
  }

  getCommitteeDetails(id: string): Observable<any> {
    return this.api.get<any>(`committees/${id}`);
  }

  createCommittee(payload: any): Observable<any> {
    return this.api.post<any>('committees', payload);
  }

  updateCommittee(id: string, payload: any): Observable<any> {
    return this.api.put<any>(`committees/${id}`, payload);
  }

  deleteCommittee(id: string): Observable<any> {
    return this.api.delete<any>(`committees/${id}`);
  }

  regenerateExternalLink(id: string): Observable<any> {
    return this.api.post<any>(`committees/${id}/regenerate-link`, {});
  }

  searchUserCandidates(search: string, committeeId?: string): Observable<any> {
    const params: any = { search: search || '' };
    if (committeeId) params.committeeId = committeeId;
    return this.api.get<any>('committees/candidates', params);
  }

  addMember(committeeId: string, payload: { userProfileId: string; role: string; customRoleTitle?: string }): Observable<any> {
    return this.api.post<any>(`committees/${committeeId}/members`, payload);
  }

  updateMember(committeeId: string, memberId: string, payload: { role?: string; customRoleTitle?: string; status?: string }): Observable<any> {
    return this.api.put<any>(`committees/${committeeId}/members/${memberId}`, payload);
  }

  removeMember(committeeId: string, memberId: string): Observable<any> {
    return this.api.delete<any>(`committees/${committeeId}/members/${memberId}`);
  }

  // =========================================================================
  // EXTRA-INFO FORMS & REGISTRATIONS
  // =========================================================================

  getForms(): Observable<any> {
    return this.api.get<any>('committees/forms');
  }

  createForm(payload: any): Observable<any> {
    return this.api.post<any>('committees/forms', payload);
  }

  updateForm(formId: string, payload: any): Observable<any> {
    return this.api.put<any>(`committees/forms/${formId}`, payload);
  }

  deleteForm(formId: string): Observable<any> {
    return this.api.delete<any>(`committees/forms/${formId}`);
  }

  getRegistrations(committeeId?: string, status?: string): Observable<any> {
    const params: any = {};
    if (committeeId) params.committeeId = committeeId;
    if (status) params.status = status;
    return this.api.get<any>('committees/registrations', params);
  }

  reviewRegistration(regId: string, payload: { decision: string; reassignCommitteeId?: string; assignedRole?: string; reviewNotes?: string }): Observable<any> {
    return this.api.post<any>(`committees/registrations/${regId}/review`, payload);
  }

  // =========================================================================
  // MEETING REPORTS, FILE UPLOADS & OZI AI DIGEST
  // =========================================================================

  getReports(committeeId?: string, reviewStatus?: string): Observable<any> {
    const params: any = {};
    if (committeeId) params.committeeId = committeeId;
    if (reviewStatus) params.reviewStatus = reviewStatus;
    return this.api.get<any>('committees/reports', params);
  }

  getReportById(reportId: string): Observable<any> {
    return this.api.get<any>(`committees/reports/${reportId}`);
  }

  submitReport(payload: any): Observable<any> {
    return this.api.post<any>('committees/reports', payload);
  }

  reviewReport(reportId: string, payload: { reviewStatus: string; adminRemarks?: string }): Observable<any> {
    return this.api.post<any>(`committees/reports/${reportId}/review`, payload);
  }

  generateAiDigest(reportId: string): Observable<any> {
    return this.api.post<any>(`committees/reports/${reportId}/ai-digest`, {});
  }

  uploadAttachment(file: File): Observable<any> {
    const fd = new FormData();
    fd.append('file', file);
    return this.api.post<any>('committees/upload-attachment', fd);
  }

  // =========================================================================
  // MEMBER WORKSPACE & CLOUD VAULT
  // =========================================================================

  getMyWorkspaceCommittees(): Observable<any> {
    return this.api.get<any>('committees/workspace/my').pipe(
      tap((res) => {
        if (res?.isSuccess && res.data?.aliases) {
          this.applyAliases(res.data.aliases);
        }
      })
    );
  }

  discoverWorkspaceCommittees(): Observable<any> {
    return this.api.get<any>('committees/workspace/discover');
  }

  joinFromWorkspace(committeeId: string, payload: { extraInfoResponses?: any; attachmentUrls?: string[] }): Observable<any> {
    return this.api.post<any>(`committees/workspace/${committeeId}/join`, payload);
  }

  getCloudDocuments(): Observable<any> {
    return this.api.get<any>('committees/workspace/cloud-docs');
  }

  linkCloudDocument(payload: any): Observable<any> {
    return this.api.post<any>('committees/workspace/cloud-docs', payload);
  }

  unlinkCloudDocument(docId: string): Observable<any> {
    return this.api.delete<any>(`committees/workspace/cloud-docs/${docId}`);
  }

  // =========================================================================
  // PUBLIC EXTERNAL REGISTRATION ENDPOINTS (SUPPORTS EXPLICIT TENANT SLUG)
  // =========================================================================

  private buildPublicHeaders(tenantSlug?: string): HttpHeaders {
    let headers = new HttpHeaders();
    const token = localStorage.getItem('access_token');
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    const effectiveTenant = tenantSlug || localStorage.getItem('tenant_key') || '';
    if (effectiveTenant) {
      headers = headers.set('X-Tenant-Key', effectiveTenant);
    }
    return headers;
  }

  private getApiRoot(): string {
    return (environment.apiUrl || '/api').replace(/\/+$/, '');
  }

  getPublicDirectory(tenantSlug?: string): Observable<any> {
    const q = tenantSlug ? `?tenantKey=${encodeURIComponent(tenantSlug)}` : '';
    return this.http.get<any>(`${this.getApiRoot()}/public/committees/directory${q}`, {
      headers: this.buildPublicHeaders(tenantSlug)
    });
  }

  getPublicCommitteeBySlug(groupSlug: string, tenantSlug?: string, inviteToken?: string): Observable<any> {
    const params = new URLSearchParams();
    if (inviteToken) params.set('token', inviteToken);
    if (tenantSlug) params.set('tenantKey', tenantSlug);
    const q = params.toString() ? `?${params.toString()}` : '';
    return this.http.get<any>(`${this.getApiRoot()}/public/committees/${encodeURIComponent(groupSlug)}${q}`, {
      headers: this.buildPublicHeaders(tenantSlug)
    });
  }

  submitPublicRegistration(payload: any, tenantSlug?: string): Observable<any> {
    const q = tenantSlug ? `?tenantKey=${encodeURIComponent(tenantSlug)}` : '';
    return this.http.post<any>(`${this.getApiRoot()}/public/committees/register${q}`, payload, {
      headers: this.buildPublicHeaders(tenantSlug)
    });
  }

  uploadPublicAttachment(file: File, tenantSlug?: string): Observable<any> {
    const fd = new FormData();
    fd.append('file', file);
    const q = tenantSlug ? `?tenantKey=${encodeURIComponent(tenantSlug)}` : '';
    return this.http.post<any>(`${this.getApiRoot()}/public/committees/upload${q}`, fd, {
      headers: this.buildPublicHeaders(tenantSlug)
    });
  }

  // =========================================================================
  // GOOGLE SIGN-IN & DRIVE PICKER OAUTH HELPER + URL DETECTOR
  // =========================================================================

  /**
   * Builds the shareable external registration link for a specific group or the workspace directory.
   */
  buildExternalRegistrationUrl(groupSlug?: string, inviteToken?: string): string {
    const origin = window.location.origin;
    const tenantKey = localStorage.getItem('tenant_key') || '';
    let path = tenantKey
      ? `${origin}/join-committee/${encodeURIComponent(tenantKey)}`
      : `${origin}/join-committee`;

    if (groupSlug) {
      path += `/${encodeURIComponent(groupSlug)}`;
    }
    if (inviteToken) {
      path += `?token=${encodeURIComponent(inviteToken)}`;
    }
    return path;
  }

  /**
   * Launches Google's official OAuth 2.0 + Google Picker popup when platform ClientId & ApiKey are configured.
   * Resolves with the selected Google Doc / Sheet / Slide / Notebook metadata, or null if dismissed/unconfigured.
   */
  async launchGoogleDrivePicker(): Promise<{ picked?: PickedCloudDoc; fallbackReason?: string }> {
    const cfg = this.googlePickerConfig;
    if (!cfg?.isConfigured || !cfg.clientId || !cfg.apiKey) {
      return { fallbackReason: 'unconfigured' };
    }

    try {
      await this.loadScriptOnce('https://accounts.google.com/gsi/client', 'google-gsi-sdk');
      await this.loadScriptOnce('https://apis.google.com/js/api.js', 'google-gapi-sdk');

      const w = window as any;
      await new Promise<void>((resolve) => w.gapi.load('picker', { callback: resolve }));

      const accessToken: { token: string; email?: string } = await new Promise((resolve, reject) => {
        const tokenClient = w.google.accounts.oauth2.initTokenClient({
          client_id: cfg.clientId,
          scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email',
          callback: (resp: any) => {
            if (resp?.error) {
              reject(resp.error);
            } else {
              resolve({ token: resp.access_token });
            }
          }
        });
        tokenClient.requestAccessToken({ prompt: 'select_account' });
      });

      return await new Promise((resolve) => {
        const docsView = new w.google.picker.DocsView()
          .setIncludeFolders(false)
          .setSelectFolderEnabled(false);

        const builder = new w.google.picker.PickerBuilder()
          .addView(docsView)
          .setOAuthToken(accessToken.token)
          .setDeveloperKey(cfg.apiKey)
          .setCallback((data: any) => {
            if (data[w.google.picker.Response.ACTION] === w.google.picker.Action.PICKED) {
              const doc = data[w.google.picker.Response.DOCUMENTS][0];
              const url = doc[w.google.picker.Document.URL] || '';
              resolve({
                picked: {
                  provider: this.detectProviderFromUrl(url),
                  title: doc[w.google.picker.Document.NAME] || 'Google Document',
                  url,
                  externalFileId: doc[w.google.picker.Document.ID]
                }
              });
            } else if (data[w.google.picker.Response.ACTION] === w.google.picker.Action.CANCEL) {
              resolve({});
            }
          });

        if (cfg.appId) {
          builder.setAppId(cfg.appId);
        }
        builder.build().setVisible(true);
      });
    } catch {
      return { fallbackReason: 'popup_blocked_or_cancelled' };
    }
  }

  detectProviderFromUrl(url: string): string {
    const u = (url || '').toLowerCase();
    if (u.includes('docs.google.com/spreadsheets')) return 'GoogleSheets';
    if (u.includes('docs.google.com/presentation')) return 'GoogleSlides';
    if (u.includes('notebooklm.google') || u.includes('keep.google.com') || u.includes('colab.research.google')) return 'GoogleNotebook';
    if (u.includes('docs.google.com/document')) return 'GoogleDocs';
    if (u.includes('drive.google.com')) return 'GoogleDrive';
    if (u.includes('onedrive.live.com') || u.includes('sharepoint.com') || u.includes('1drv.ms') || u.includes('office.com')) return 'ExcelOnline';
    if (u.includes('onenote.com')) return 'OneNote';
    if (u.includes('notion.so') || u.includes('notion.site')) return 'Notion';
    return 'CloudLink';
  }

  getProviderIcon(provider: string): string {
    switch (provider) {
      case 'GoogleDocs': return 'description';
      case 'GoogleSheets': return 'table_chart';
      case 'GoogleSlides': return 'slideshow';
      case 'GoogleNotebook': return 'menu_book';
      case 'ExcelOnline': return 'grid_on';
      case 'OneNote': return 'book_2';
      case 'Notion': return 'article';
      default: return 'cloud_done';
    }
  }

  hasCompletedTour(screenKey: string): boolean {
    const tenant = localStorage.getItem('tenant_key') || 'default';
    return localStorage.getItem(`has_completed_tour_${screenKey}_${tenant}`) === 'true';
  }

  markTourCompleted(screenKey: string): void {
    const tenant = localStorage.getItem('tenant_key') || 'default';
    localStorage.setItem(`has_completed_tour_${screenKey}_${tenant}`, 'true');
  }

  private loadScriptOnce(src: string, id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.getElementById(id)) {
        resolve();
        return;
      }
      const s = document.createElement('script');
      s.id = id;
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(s);
    });
  }
}

