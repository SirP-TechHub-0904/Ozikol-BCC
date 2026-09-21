import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  public baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getHeaders(body?: any): HttpHeaders {
    const token = localStorage.getItem('access_token');
    let tenantKey = localStorage.getItem('tenant_key') || localStorage.getItem('tenant_domain');
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    if (!tenantKey && hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      const parts = hostname.split('.');
      tenantKey = parts.length > 1 && !['localhost', '127', 'www', 'api', 'central', 'admin'].includes(parts[0])
        ? parts[0]
        : hostname;
    }

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

  private logRequest(method: string, url: string, payload?: any): void {
    const domain = window.location.host;
    const tenantKey = localStorage.getItem('tenant_key') || localStorage.getItem('tenant_domain') || '(Default Host Domain)';
    console.groupCollapsed(`%c[ANGULAR API ${method}] ${url}`, 'color: #0050e5; font-weight: bold;');
    console.log('%cBrowser Domain  :', 'font-weight:bold;', domain);
    console.log('%cResolved Tenant :', 'font-weight:bold; color:#16a34a;', tenantKey);
    console.log('%cAPI Endpoint    :', 'font-weight:bold;', url);
    if (payload) console.log('%cPayload Sent   :', 'font-weight:bold;', payload);
    console.groupEnd();
  }

  private buildUrl(path: string): string {
    const base = (this.baseUrl || '').replace(/\/+$/, '');
    const cleanPath = (path || '').replace(/^\/+/, '');
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

  delete<T>(path: string): Observable<T> {
    const fullUrl = this.buildUrl(path);
    this.logRequest('DELETE', fullUrl);
    return this.http.delete<T>(fullUrl, {
      headers: this.getHeaders()
    });
  }
}
