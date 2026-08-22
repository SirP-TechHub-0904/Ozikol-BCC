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
    const tenantKey = localStorage.getItem('tenant_key') || localStorage.getItem('tenant_domain');

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

  get<T>(path: string, params?: any): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    const fullUrl = `${this.baseUrl}/${path}`;
    this.logRequest('GET', fullUrl, params);
    return this.http.get<T>(fullUrl, {
      headers: this.getHeaders(),
      params: httpParams
    });
  }

  post<T>(path: string, body: any): Observable<T> {
    const fullUrl = `${this.baseUrl}/${path}`;
    this.logRequest('POST', fullUrl, body);
    return this.http.post<T>(fullUrl, body, {
      headers: this.getHeaders(body)
    });
  }

  put<T>(path: string, body: any): Observable<T> {
    const fullUrl = `${this.baseUrl}/${path}`;
    this.logRequest('PUT', fullUrl, body);
    return this.http.put<T>(fullUrl, body, {
      headers: this.getHeaders(body)
    });
  }

  delete<T>(path: string): Observable<T> {
    const fullUrl = `${this.baseUrl}/${path}`;
    this.logRequest('DELETE', fullUrl);
    return this.http.delete<T>(fullUrl, {
      headers: this.getHeaders()
    });
  }
}
