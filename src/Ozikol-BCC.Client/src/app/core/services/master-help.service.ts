import { Injectable, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { filter, tap, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { getStoredUserRoles } from '../utils/user-role.utils';
import {
  MasterPageHelpDto,
  SaveMasterPageHelpRequest,
  MasterHelpTopicSearchResultDto
} from '../models/master-help.models';

/**
 * Global service managing contextual, page-based help drawers,
 * documentation resolution from the Central Master Catalog,
 * full-text topic search, and dual-guarded in-place authoring.
 */
@Injectable({
  providedIn: 'root'
})
export class MasterHelpService {
  private readonly router = inject(Router);
  private readonly apiService = inject(ApiService);

  private readonly _isOpen = new BehaviorSubject<boolean>(false);
  public readonly isOpen$: Observable<boolean> = this._isOpen.asObservable();

  private readonly _isLoading = new BehaviorSubject<boolean>(false);
  public readonly isLoading$: Observable<boolean> = this._isLoading.asObservable();

  private readonly _currentPageHelp = new BehaviorSubject<MasterPageHelpDto | null>(null);
  public readonly currentPageHelp$: Observable<MasterPageHelpDto | null> = this._currentPageHelp.asObservable();

  private readonly _searchResults = new BehaviorSubject<MasterHelpTopicSearchResultDto[]>([]);
  public readonly searchResults$: Observable<MasterHelpTopicSearchResultDto[]> = this._searchResults.asObservable();

  private readonly _isSearching = new BehaviorSubject<boolean>(false);
  public readonly isSearching$: Observable<boolean> = this._isSearching.asObservable();

  private readonly _isEditing = new BehaviorSubject<boolean>(false);
  public readonly isEditing$: Observable<boolean> = this._isEditing.asObservable();

  private readonly _currentRoute = new BehaviorSubject<string>('');
  public readonly currentRoute$: Observable<string> = this._currentRoute.asObservable();

  // In-memory route documentation cache to avoid redundant network round-trips
  private readonly _cache = new Map<string, MasterPageHelpDto>();

  constructor() {
    // Track active route changes across navigation
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        const cleanRoute = this.normalizeRoute(event.urlAfterRedirects || event.url);
        this._currentRoute.next(cleanRoute);

        // If drawer is already open, dynamically load help for the new route
        if (this._isOpen.value) {
          this.fetchPageHelp(cleanRoute);
        }
      });

    // Set initial route
    if (typeof window !== 'undefined') {
      const initialRoute = this.normalizeRoute(this.router.url || window.location.pathname);
      this._currentRoute.next(initialRoute);
    }
  }

  /**
   * Evaluates the dual-guard developer permission check:
   * True if running on localhost development or caller has CentralAdmin/SuperAdmin authority.
   */
  public isDevEditAllowed(): boolean {
    if (typeof window === 'undefined') return false;
    const host = window.location.hostname.toLowerCase();
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost');
    if (isLocal) return true;

    const roles = getStoredUserRoles();
    return roles.some(r => {
      const norm = r.toLowerCase();
      return norm.includes('centraladmin') || norm.includes('superadmin');
    });
  }

  /**
   * Opens the slide-out help drawer and loads documentation for the active or specified route.
   * @param routeOverride Optional specific route key to open.
   */
  public open(routeOverride?: string): void {
    const route = routeOverride ? this.normalizeRoute(routeOverride) : (this._currentRoute.value || this.normalizeRoute(this.router.url));
    this._isOpen.next(true);
    this._isEditing.next(false);
    this.fetchPageHelp(route);
  }

  /**
   * Closes the slide-out help drawer and clears transient editing/search states.
   */
  public close(): void {
    this._isOpen.next(false);
    this._isEditing.next(false);
    this._isSearching.next(false);
    this._searchResults.next([]);
  }

  /**
   * Toggles the help drawer between open and closed.
   */
  public toggle(): void {
    if (this._isOpen.value) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Enters or exits developer in-place editing mode.
   */
  public setEditing(editing: boolean): void {
    if (!this.isDevEditAllowed()) return;
    this._isEditing.next(editing);
  }

  /**
   * Fetches contextual documentation for a route from cache or Central Master Catalog API.
   * @param routeKey Route path (e.g. "/workforce/console/analytics").
   * @param forceRefresh If true, bypasses in-memory cache.
   */
  public fetchPageHelp(routeKey: string, forceRefresh = false): void {
    const normalized = this.normalizeRoute(routeKey);

    if (!forceRefresh && this._cache.has(normalized)) {
      this._currentPageHelp.next(this._cache.get(normalized)!);
      return;
    }

    this._isLoading.next(true);
    this.apiService.get<any>(`master-help/page?route=${encodeURIComponent(normalized)}`)
      .pipe(
        tap((res: any) => {
          this._isLoading.next(false);
          if (res?.isSuccess && res.data) {
            const dto: MasterPageHelpDto = res.data;
            this._cache.set(normalized, dto);
            this._currentPageHelp.next(dto);
          } else {
            this.setFallbackDraft(normalized);
          }
        }),
        catchError(err => {
          this._isLoading.next(false);
          console.warn('[MasterHelpService] Error resolving page help from Central:', err);
          this.setFallbackDraft(normalized);
          return of(null);
        })
      )
      .subscribe();
  }

  /**
   * Performs real-time search across all documentation topics.
   * @param query Search query string.
   */
  public search(query: string): void {
    const clean = query?.trim() ?? '';
    if (!clean) {
      this._isSearching.next(false);
      this._searchResults.next([]);
      return;
    }

    this._isSearching.next(true);
    this.apiService.get<any>(`master-help/search?q=${encodeURIComponent(clean)}`)
      .pipe(
        tap((res: any) => {
          if (res?.isSuccess && Array.isArray(res.data)) {
            this._searchResults.next(res.data);
          } else {
            this._searchResults.next([]);
          }
        }),
        catchError(err => {
          console.warn('[MasterHelpService] Search error:', err);
          this._searchResults.next([]);
          return of(null);
        })
      )
      .subscribe();
  }

  /**
   * Clears active search mode and restores the current page documentation view.
   */
  public clearSearch(): void {
    this._isSearching.next(false);
    this._searchResults.next([]);
  }

  /**
   * Saves or updates page documentation in the Central Master Catalog.
   * @param request Document modification payload.
   */
  public savePageHelp(request: SaveMasterPageHelpRequest): Observable<any> {
    this._isLoading.next(true);
    return this.apiService.put<any>('master-help/page', request).pipe(
      tap((res: any) => {
        this._isLoading.next(false);
        if (res?.isSuccess && res.data) {
          const updated: MasterPageHelpDto = res.data;
          this._cache.set(this.normalizeRoute(updated.routeKey), updated);
          this._currentPageHelp.next(updated);
          this._isEditing.next(false);
        }
      }),
      catchError(err => {
        this._isLoading.next(false);
        console.error('[MasterHelpService] Failed to save documentation:', err);
        throw err;
      })
    );
  }

  /**
   * Normalizes a route by stripping query params, hash fragments, and trailing slashes.
   */
  public normalizeRoute(route: string): string {
    if (!route) return '/';
    let clean = route.trim();
    const qIdx = clean.indexOf('?');
    if (qIdx >= 0) clean = clean.substring(0, qIdx);
    const hIdx = clean.indexOf('#');
    if (hIdx >= 0) clean = clean.substring(0, hIdx);
    if (!clean.startsWith('/')) clean = '/' + clean;
    if (clean.length > 1 && clean.endsWith('/')) clean = clean.slice(0, -1);
    return clean.toLowerCase();
  }

  private setFallbackDraft(normalized: string): void {
    const parts = normalized.split('/').filter(p => !!p);
    const lastPart = parts.length > 0 ? parts[parts.length - 1] : 'Home';
    const title = lastPart
      .split(/[-_]/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    const fallback: MasterPageHelpDto = {
      id: '',
      routeKey: normalized,
      featureSuite: normalized.includes('/workspace/') ? 'Personal Workspace' : 'Console Management',
      pageTitle: title,
      category: normalized.includes('/workspace/') ? 'Workspace' : 'Console',
      shortSummary: `Operational overview and guide for ${title}.`,
      overviewMarkdown: `### ${title}\nNo formal documentation has been published for this page yet.\n\nUse the **Edit Page Help** action below to author instructions and document key actions.`,
      actions: [],
      relatedRoutes: [],
      isPublished: true,
      lastUpdatedBy: 'system@ozikol.cloud',
      updatedAtUtc: new Date().toISOString()
    };

    this._cache.set(normalized, fallback);
    this._currentPageHelp.next(fallback);
  }
}
