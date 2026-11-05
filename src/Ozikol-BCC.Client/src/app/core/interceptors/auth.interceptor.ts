import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { TenantStateService } from '../services/tenant-state.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  // These paths are always public and should never redirect to login
  private readonly publicPaths = [
    '/api/Auth',
    '/api/WebsiteContent',
    '/api/WebsiteContentApi',
    '/api/SettingsApi/brand',
    '/api/SettingsApi/public-details'
  ];

  constructor(
    private router: Router,
    private tenantState: TenantStateService
  ) {}

  private isPublicUrl(url: string): boolean {
    return this.publicPaths.some(path => url.includes(path));
  }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = localStorage.getItem('access_token');
    const tenantKey = localStorage.getItem('tenant_key');
    const hostname = window.location.hostname;

    const trustToken = localStorage.getItem('device_trust_token');

    // Retrieve or generate persistent unique client system/device ID
    let systemDeviceId = localStorage.getItem('system_device_id');
    if (!systemDeviceId) {
      systemDeviceId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'web-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now();
      localStorage.setItem('system_device_id', systemDeviceId);
    }

    const headers: { [key: string]: string } = {
      'X-System-Id': systemDeviceId,
      'X-Platform': 'Web'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    let resolvedTenantKey = tenantKey;
    if (!resolvedTenantKey && hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      const parts = hostname.split('.');
      if (parts.length > 1 && !['localhost', '127', 'www', 'api', 'central', 'admin'].includes(parts[0])) {
        resolvedTenantKey = parts[0];
      } else {
        resolvedTenantKey = hostname;
      }
    }

    if (resolvedTenantKey) {
      headers['X-Tenant-Key'] = resolvedTenantKey;
    }
    if (hostname) {
      headers['X-Tenant-Domain'] = hostname;
    }
    if (trustToken) {
      headers['X-Device-Trust-Token'] = trustToken;
    }

    request = request.clone({ setHeaders: headers });

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        const isPublic = this.isPublicUrl(request.url);

        // 404 Not Found — Workspace does not exist in Master Catalog
        if (error.status === 404 && (error.error?.error === 'TenantNotFound' || error.error?.message === 'Workspace not found.')) {
          console.warn(`[AuthInterceptor] TenantNotFound 404 for:`, request.url);
          this.tenantState.setTenantNotFound(true);
        }

        // 401 Unauthorized — token missing, invalid, or signature rotated on server
        if (error.status === 401) {
          console.warn(`[AuthInterceptor] 401 Unauthorized for:`, request.url);
          localStorage.removeItem('access_token');
          localStorage.removeItem('user_roles');
          localStorage.removeItem('user_profile');
          if (!isPublic) {
            const currentUrl = this.router.url || '';
            const isPublicRoute = currentUrl === '/' ||
                                  currentUrl.startsWith('/?') ||
                                  currentUrl.startsWith('/auth') ||
                                  currentUrl.startsWith('/page/') ||
                                  currentUrl.startsWith('/p/') ||
                                  currentUrl.startsWith('/store') ||
                                  currentUrl.startsWith('/shop');

            if (!isPublicRoute) {
              this.router.navigate(['/auth/login'], { queryParams: { returnUrl: currentUrl } });
            }
          }
        }

        // 403 Forbidden — check if Cross-Tenant JWT vs Origin spoofing / mismatch was detected
        else if (error.status === 403) {
          if (error.error?.errorCode === 'CrossTenantAccessDenied') {
            console.warn(`[AuthInterceptor] 403 CrossTenantAccessDenied — clearing mismatched tenant session:`, request.url);
            localStorage.removeItem('access_token');
            localStorage.removeItem('user_roles');
            localStorage.removeItem('user_profile');
            const currentUrl = this.router.url || '';
            if (!currentUrl.startsWith('/auth')) {
              this.router.navigate(['/auth/login']);
            }
          } else {
            console.warn(`[AuthInterceptor] 403 Forbidden for:`, request.url);
          }
        }

        // 0 = Network error
        else if (error.status === 0 && !isPublic) {
          console.warn(`[AuthInterceptor] Network error (ERR_FAILED) for:`, request.url);
        }

        return throwError(() => error);
      })
    );
  }
}
