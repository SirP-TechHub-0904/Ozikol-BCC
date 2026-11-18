import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  /**
   * Resolves the API base endpoint dynamically:
   * - Local development hosts (`localhost`, `127.0.0.1`, `*.localhost`, `*.127.0.0.1.nip.io`) and
   *   platform domains (`ozikol.cloud`, `*.ozikol.cloud`, `ozikol.com`, `*.ozikol.com`) use `environment.apiUrl`
   *   (`http://localhost:51025/api` locally, `https://api-ozikol.ozikol.cloud/api` in production).
   * - Sovereign custom domains (e.g. `nightpresssecurity.co.uk`) use the same-origin relative `'/api'` endpoint,
   *   routing through the custom domain's Nginx `location /api/` reverse proxy with zero CORS latency.
   * @returns Resolved API base URL string.
   */
  public static resolveDynamicApiBaseUrl(): string {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname.toLowerCase();
      if (!ApiService.isLocalOrPlatformHost(hostname)) {
        return '/api';
      }
    }
    return environment.apiUrl;
  }

  /**
   * Resolves the root API origin (without trailing `/api`) for SignalR WebSocket hubs:
   * - Local and platform hosts resolve the origin of `environment.apiUrl`.
   * - Sovereign custom domains resolve `window.location.origin` so `/hubs/*` routes through the custom domain's Nginx proxy.
   * @returns Resolved API origin URL string.
   */
  public static resolveDynamicApiOrigin(): string {
    const base = ApiService.resolveDynamicApiBaseUrl();
    if (base.startsWith('http')) {
      return base.replace(/\/api\/?$/, '');
    }
    const relativePrefix = base.replace(/\/api\/?$/, '');
    return typeof window !== 'undefined' ? `${window.location.origin}${relativePrefix}` : '';
  }

  /**
   * Determines whether the current browser hostname is a local development address
   * or an official Ozikol platform domain/subdomain.
   * @param hostname Lowercase browser hostname.
   * @returns True when running on localhost or an official platform domain (`*.ozikol.cloud`, `*.ozikol.com`).
   */
  public static isLocalOrPlatformHost(hostname: string): boolean {
    if (!hostname) return true;
    const lower = hostname.toLowerCase();
    return lower === 'localhost' ||
           lower === '127.0.0.1' ||
           lower.endsWith('.localhost') ||
           lower.endsWith('.127.0.0.1.nip.io') ||
           lower === 'ozikol.cloud' ||
           lower.endsWith('.ozikol.cloud') ||
           lower === 'ozikol.com' ||
           lower.endsWith('.ozikol.com');
  }

  /**
   * Instance getter delegating to `ApiService.resolveDynamicApiBaseUrl()`.
   */
  public get baseUrl(): string {
    return ApiService.resolveDynamicApiBaseUrl();
  }

  constructor(private http: HttpClient) {}

  private isPlatformSubdomain(hostname: string): boolean {
    if (!hostname) return false;
    const lower = hostname.toLowerCase();
    return lower.endsWith('.ozikol.cloud') ||
           lower.endsWith('.ozikol.com') ||
           lower.endsWith('.localhost') ||
           lower.endsWith('.127.0.0.1.nip.io');
  }

  private getTenantKey(): string | null {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      if (this.isPlatformSubdomain(hostname)) {
        const parts = hostname.split('.');
        if (parts.length > 1 && !['localhost', '127', 'www', 'api', 'central', 'admin'].includes(parts[0].toLowerCase())) {
          const subdomainTenant = parts[0].toLowerCase();
          // Keep localStorage synchronized with active URL platform subdomain
          if (typeof localStorage !== 'undefined' && localStorage.getItem('tenant_key') !== subdomainTenant) {
            localStorage.setItem('tenant_key', subdomainTenant);
          }
          return subdomainTenant;
        }
      }
    }
    return typeof localStorage !== 'undefined' ? (localStorage.getItem('tenant_key') || localStorage.getItem('tenant_domain')) : null;
  }

  private getHeaders(body?: any): HttpHeaders {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const tenantKey = this.getTenantKey();

    let headers = new HttpHeaders();

    // Do NOT set Content-Type if body is FormData (browser automatically sets multipart boundary)
    if (!(body instanceof FormData)) {
      headers = headers.set('Content-Type', 'application/json');
    }

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    if (tenantKey) {
      headers = headers.set('X-Tenant-Key', tenantKey);
    }
    if (hostname) {
      headers = headers.set('X-Tenant-Domain', hostname);
    }

    return headers;
  }

  private logRequest(_method: string, _url: string, _payload?: any): void {
    // Intentionally suppressed to keep browser DevTools console clean and avoid exposing internal API details.
  }

  private buildUrl(path: string): string {
    const base = (this.baseUrl || '').replace(/\/+$/, '');
    let cleanPath = (path || '').replace(/^\/+/, '');
    // Guard against accidental double 'api/' prefix when baseUrl already has '/api'
    if (base.endsWith('/api') && cleanPath.startsWith('api/')) {
      cleanPath = cleanPath.substring(4);
    }
    return `${base}/${cleanPath}`;
  }

  get<T>(path: string, params?: any): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    const fullUrl = this.buildUrl(path);
    this.logRequest('GET', fullUrl, params);
    return this.http.get<T>(fullUrl, {
      headers: this.getHeaders(),
      params: httpParams
    });
  }

  post<T>(path: string, body: any): Observable<T> {
    const fullUrl = this.buildUrl(path);
    this.logRequest('POST', fullUrl, body);
    return this.http.post<T>(fullUrl, body, {
      headers: this.getHeaders(body)
    });
  }

  put<T>(path: string, body: any): Observable<T> {
    const fullUrl = this.buildUrl(path);
    this.logRequest('PUT', fullUrl, body);
    return this.http.put<T>(fullUrl, body, {
      headers: this.getHeaders(body)
    });
  }

  patch<T>(path: string, body?: any): Observable<T> {
    const fullUrl = this.buildUrl(path);
    this.logRequest('PATCH', fullUrl, body);
    return this.http.patch<T>(fullUrl, body || {}, {
      headers: this.getHeaders(body)
    });
  }

  delete<T>(path: string, params?: any): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    const fullUrl = this.buildUrl(path);
    this.logRequest('DELETE', fullUrl, params);
    return this.http.delete<T>(fullUrl, {
      headers: this.getHeaders(),
      params: httpParams
    });
  }
}
