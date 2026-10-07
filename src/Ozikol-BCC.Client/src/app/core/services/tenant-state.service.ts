import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/**
 * Global service tracking tenant and subdomain resolution status across the entire application.
 * When a requested subdomain or workspace does not exist in the Master Catalog, this service
 * engages global 404 lock mode, suppressing all routing and rendering a minimal server 404 error.
 */
@Injectable({
  providedIn: 'root'
})
export class TenantStateService {
  private tenantNotFoundSubject = new BehaviorSubject<boolean>(false);

  /**
   * Observable stream emitting true when the workspace/subdomain is invalid or non-existent.
   */
  public isTenantNotFound$: Observable<boolean> = this.tenantNotFoundSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Sets the tenant not-found state across the SPA.
   * @param notFound Whether the active subdomain/tenant was not found in the master database.
   */
  public setTenantNotFound(notFound: boolean): void {
    this.tenantNotFoundSubject.next(notFound);
  }

  /**
   * Gets the current tenant not-found state synchronously.
   * @returns Current boolean flag value.
   */
  public isTenantNotFound(): boolean {
    return this.tenantNotFoundSubject.value;
  }

  /**
   * Evaluates the current hostname upon application bootstrap and verifies if the tenant exists.
   */
  public checkInitialTenant(): void {
    if (typeof window === 'undefined') return;

    const hostname = window.location.hostname;
    if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
      return;
    }

    const parts = hostname.split('.');
    const isSubdomain = parts.length > 1 && !['localhost', '127', 'www', 'api', 'central', 'admin'].includes(parts[0]);
    if (!isSubdomain && parts.length <= 1) {
      return;
    }

    const resolvedTenantKey = isSubdomain ? parts[0] : hostname;
    const headers = new HttpHeaders({
      'X-Tenant-Key': resolvedTenantKey,
      'X-Tenant-Domain': hostname
    });

    const url = `${(environment.apiUrl || '').replace(/\/+$/, '')}/SettingsApi/brand`;
    this.http.get(url, { headers }).subscribe({
      next: () => {
        this.setTenantNotFound(false);
      },
      error: (err) => {
        if (err?.status === 404 || err?.error?.error === 'TenantNotFound') {
          this.setTenantNotFound(true);
        }
      }
    });
  }
}
