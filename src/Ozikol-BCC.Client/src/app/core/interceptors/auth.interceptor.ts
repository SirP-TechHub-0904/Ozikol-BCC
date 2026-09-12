import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  // These paths are always public and should never redirect to login
  private readonly publicPaths = ['/api/Auth/', '/api/WebsiteContent/', '/api/WebsiteContent'];

  constructor(private router: Router) {}

  private isPublicUrl(url: string): boolean {
    return this.publicPaths.some(path => url.includes(path));
  }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = localStorage.getItem('access_token');
    const tenantKey = localStorage.getItem('tenant_key');
    const hostname = window.location.hostname;

    const trustToken = localStorage.getItem('device_trust_token');

    const headers: { [key: string]: string } = {};
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

        // 401 Unauthorized — token missing, invalid, or expired
        if (error.status === 401) {
          console.warn(`[AuthInterceptor] 401 Unauthorized for:`, request.url);
          localStorage.removeItem('access_token');
          if (!isPublic) {
            const currentUrl = this.router.url;
            if (currentUrl && !currentUrl.startsWith('/auth') && !currentUrl.includes('login')) {
              this.router.navigate(['/auth/login'], { queryParams: { returnUrl: currentUrl } });
            } else if (!currentUrl || currentUrl.startsWith('/auth')) {
              this.router.navigate(['/auth/login']);
            }
          }
        }

        // 403 Forbidden — user is authenticated but does not have permission for this specific endpoint
        // DO NOT wipe tokens or redirect to login. Simply log and pass through to component.
        else if (error.status === 403) {
          console.warn(`[AuthInterceptor] 403 Forbidden for:`, request.url);
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
