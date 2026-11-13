import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { canAccessRoute, getStoredUserRoles, isMemberOnly } from '../utils/user-role.utils';
import { ApiService } from '../services/api.service';

// Debounce map to prevent flooding the server with repeated logs for the same route attempt
const recentBlockedReports = new Map<string, number>();

/**
 * Global authentication and role authorization guard for BCC client routes.
 * Validates authentication tokens, token expiration, and route-level authority scopes.
 * Redirects unauthorized users to the dedicated Access Denied page and reports suspicious attempts.
 */
export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const router = inject(Router);
  const api = inject(ApiService);
  const token = localStorage.getItem('access_token');

  // Sanitize redirect target URL
  const targetUrl = (state.url && !state.url.startsWith('/auth') && !state.url.includes('login') && !state.url.includes('access-denied')) 
    ? state.url 
    : '/admin/dashboard';

  if (!token) {
    console.warn('[AuthGuard] Unauthenticated access attempt to:', state.url, '-> Redirecting to /auth/login');
    const queryParams = (targetUrl !== '/admin/dashboard') ? { returnUrl: targetUrl } : {};
    router.navigate(['/auth/login'], { queryParams });
    return false;
  }

  try {
    // Check JWT expiration if available
    const parts = token.split('.');
    if (parts.length === 3) {
      let payload = parts[1];
      switch (payload.length % 4) {
        case 2: payload += '=='; break;
        case 3: payload += '='; break;
      }
      const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      const exp = decoded.exp;
      if (exp && (Date.now() >= exp * 1000)) {
        console.warn('[AuthGuard] Token has expired -> Redirecting to /auth/login');
        localStorage.removeItem('access_token');
        const queryParams = (targetUrl !== '/admin/dashboard') ? { returnUrl: targetUrl } : {};
        router.navigate(['/auth/login'], { queryParams });
        return false;
      }
    }
  } catch (err) {
    console.error('[AuthGuard] Error parsing token payload:', err);
  }

  // Retrieve user roles (from storage or decoded token)
  const userRoles = getStoredUserRoles();

  // Smart redirect for bare '/dashboard' URL:
  // Members automatically go to workspace, while console admins go to console
  if (state.url === '/dashboard' || state.url === '/dashboard/') {
    if (isMemberOnly(userRoles)) {
      router.navigate(['/dashboard/workspace']);
      return false;
    } else {
      router.navigate(['/dashboard/console']);
      return false;
    }
  }

  // Evaluate role permissions for this specific route (resolving deepest child route data when triggered on parent shell)
  let deepestRoute: ActivatedRouteSnapshot = route;
  while (deepestRoute.firstChild) {
    deepestRoute = deepestRoute.firstChild;
  }
  const requiredRoles = (deepestRoute.data?.['roles'] ?? route.data?.['roles']) as string[] | undefined;
  const isAuthorized = canAccessRoute(requiredRoles, state.url, userRoles);

  if (!isAuthorized) {
    console.warn('[AuthGuard] Insufficient role permissions for route:', state.url, 'UserRoles:', userRoles);

    // Send suspicious access report to backend (debounced 10s per URL)
    const now = Date.now();
    const lastReportTime = recentBlockedReports.get(state.url) || 0;
    if (now - lastReportTime > 10000) {
      recentBlockedReports.set(state.url, now);
      api.post<any>('identity/security-audit/suspicious-access', { attemptedUrl: state.url }).subscribe({
        error: (err) => console.warn('[AuthGuard] Failed to log suspicious access:', err)
      });
    }

    router.navigate(['/auth/access-denied'], {
      queryParams: { attemptedUrl: state.url }
    });
    return false;
  }

  return true;
};

