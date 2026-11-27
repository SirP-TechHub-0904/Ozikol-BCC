import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { TenantStateService } from '../services/tenant-state.service';
import { WebsiteSyncService } from '../services/website-sync.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  // These paths are always public and should never redirect to login or send stale tokens
  private readonly publicPaths = [
    '/api/Auth',
    '/api/WebsiteContent',
    '/api/WebsiteContentApi',
    '/api/SettingsApi/brand',
    '/api/SettingsApi/public-details',
    '/api/RegistrationFormApi/public-schema',
    '/api/RegistrationFormApi/public-submit',
    '/api/workforce/members/verify-token',
    '/api/workforce/members/complete-onboarding',
    '/api/workforce/rota/members/verify-token',
    '/api/workforce/rota/members/complete-onboarding',
    '/api/workforce/invitations'
  ];

  constructor(
    private router: Router,
    private tenantState: TenantStateService,
    private websiteSync: WebsiteSyncService
  ) {}

  private isWebsiteMutationRequest(request: HttpRequest<unknown>): boolean {
    const method = request.method.toUpperCase();
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return false;
    }

    const url = request.url.toLowerCase();
    const isWatchedEndpoint =
      url.includes('/api/contentapi') ||
      url.includes('/api/pageformsapi') ||
      url.includes('/api/settingsapi') ||
      url.includes('/api/committeesapi');

    if (!isWatchedEndpoint) {
      return false;
    }

    return !url.includes('/ai-') && !url.includes('/preview') && !url.includes('/inspect');
  }

  private isPublicUrl(url: string): boolean {
    const lower = url.toLowerCase();
    return this.publicPaths.some(path => lower.includes(path.toLowerCase()));
  }

  /**
   * Evaluates whether the currently active browser route is a public or self-service flow
   * that should never be forcefully bounced to /auth/login upon background 401s.
   */
  private isPublicClientRoute(currentUrl: string): boolean {
    if (!currentUrl) return false;
    const lower = currentUrl.toLowerCase();
    return (
      lower === '/' ||
      lower.startsWith('/?') ||
      lower.startsWith('/auth') ||
      lower.startsWith('/login') ||
      lower.startsWith('/signin') ||
      lower.startsWith('/sign-in') ||
      lower.startsWith('/register') ||
      lower.startsWith('/join') ||
      lower.startsWith('/apply') ||
      lower.startsWith('/enroll') ||
      lower.startsWith('/get-started') ||
      lower.startsWith('/onboarding') ||
      lower.startsWith('/workforce/onboarding') ||
      lower.startsWith('/invite') ||
      lower.startsWith('/survey') ||
      lower.startsWith('/page/') ||
      lower.startsWith('/p/') ||
      lower.startsWith('/store') ||
      lower.startsWith('/shop') ||
      lower.startsWith('/form-success')
    );
  }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = localStorage.getItem('access_token');
    const tenantKey = localStorage.getItem('tenant_key');
    const hostname = window.location.hostname;
    const isPublic = this.isPublicUrl(request.url);

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

    // Attach Authorization header for protected endpoints, avoiding contaminating public onboarding/auth calls with stale tokens
    if (token && !isPublic) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    let resolvedTenantKey = tenantKey;
    if (!resolvedTenantKey && hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      const lower = hostname.toLowerCase();
      const isPlatformDomain = lower.endsWith('.ozikol.cloud') || lower.endsWith('.localhost') || lower.endsWith('.127.0.0.1.nip.io');
      if (isPlatformDomain) {
        const parts = hostname.split('.');
        if (parts.length > 1 && !['localhost', '127', 'www', 'api', 'central', 'admin'].includes(parts[0])) {
          resolvedTenantKey = parts[0];
        }
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
      tap((event: HttpEvent<unknown>) => {
        if (event instanceof HttpResponse && this.isWebsiteMutationRequest(request)) {
          this.websiteSync.notifyLocalMutation(request.url);
        }
      }),
      catchError((error: HttpErrorResponse) => {
        const isPublic = this.isPublicUrl(request.url);

        // 404 Not Found — Workspace does not exist in Master Catalog
        if (
          error.status === 404 &&
          (error.error?.error === 'TenantNotFound' ||
            error.error?.error === 'WorkspaceNotFound' ||
            error.error?.message === 'Workspace not found.' ||
            error.error?.message === 'Workspace could not be found.')
        ) {
          console.warn(`[AuthInterceptor] WorkspaceNotFound 404 for:`, request.url);
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
            const isPublicRoute = this.isPublicClientRoute(currentUrl);

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
