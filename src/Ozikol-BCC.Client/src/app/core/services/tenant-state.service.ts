import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/**
 * Global service managing tenant and subdomain resolution status across the entire application lifecycle.
 * Prevents any child route (such as login UI, admin dashboard, or landing page) from rendering
 * before the host subdomain is validated against the Central Master Catalog.
 */
@Injectable({
  providedIn: 'root'
})
export class TenantStateService {
  private tenantNotFoundSubject = new BehaviorSubject<boolean>(false);
  private isCheckingSubject = new BehaviorSubject<boolean>(true);

  /**
   * Observable stream emitting true when the workspace/subdomain is confirmed non-existent.
   */
  public isTenantNotFound$: Observable<boolean> = this.tenantNotFoundSubject.asObservable();

  /**
   * Observable stream indicating whether the initial startup tenant validation is actively in progress.
   */
  public isCheckingTenant$: Observable<boolean> = this.isCheckingSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Sets the tenant not-found state across the SPA.
   * @param notFound Whether the active subdomain/tenant was not found in the master database.
   */
  public setTenantNotFound(notFound: boolean): void {
    this.tenantNotFoundSubject.next(notFound);
    this.isCheckingSubject.next(false);
  }

  /**
   * Gets the current tenant not-found state synchronously.
   * @returns Current boolean flag value.
   */
  public isTenantNotFound(): boolean {
    return this.tenantNotFoundSubject.value;
  }

  /**
   * Initializes tenant check before any route is rendered.
   * Executed during APP_INITIALIZER to block UI flashing.
   */
  public async initTenantCheck(): Promise<void> {
    if (typeof window === 'undefined') {
      this.isCheckingSubject.next(false);
      return;
    }

    const hostname = window.location.hostname;
    if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
      this.isCheckingSubject.next(false);
      return;
    }

    const parts = hostname.split('.');
    const isSubdomain = parts.length > 1 && !['localhost', '127', 'www', 'api', 'central', 'admin'].includes(parts[0]);
    if (!isSubdomain && parts.length <= 1) {
      this.isCheckingSubject.next(false);
      return;
    }

    const resolvedTenantKey = isSubdomain ? parts[0] : hostname;
    const headers = new HttpHeaders({
      'X-Tenant-Key': resolvedTenantKey,
      'X-Tenant-Domain': hostname
    });

    const url = `${(environment.apiUrl || '').replace(/\/+$/, '')}/SettingsApi/brand`;

    try {
      const res: any = await firstValueFrom(this.http.get(url, { headers }));
      const data = res?.data || res;
      const dynamicTitle = data?.siteTitle || data?.websiteTitle || data?.brandName || data?.companyName;
      if (dynamicTitle && typeof document !== 'undefined') {
        document.title = dynamicTitle;
      }
      this.tenantNotFoundSubject.next(false);
    } catch (err: any) {
      if (err?.status === 404 || err?.error?.error === 'TenantNotFound') {
        this.tenantNotFoundSubject.next(true);
      }
    } finally {
      this.isCheckingSubject.next(false);
    }
  }
}
