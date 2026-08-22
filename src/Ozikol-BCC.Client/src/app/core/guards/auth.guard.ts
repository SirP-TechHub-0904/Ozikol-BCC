import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const router = inject(Router);
  const token = localStorage.getItem('access_token');

  // Sanitize redirect target URL
  const targetUrl = (state.url && !state.url.startsWith('/auth') && !state.url.includes('login')) 
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

      // Extract all user roles
      let userRoles: string[] = [];
      if (Array.isArray(decoded.role)) {
        userRoles = decoded.role;
      } else if (decoded.role) {
        userRoles = [decoded.role];
      } else if (decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']) {
        const raw = decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
        userRoles = Array.isArray(raw) ? raw : [raw];
      }

      // Also check cached roles from localStorage
      const storedRoles = localStorage.getItem('user_roles');
      if (storedRoles) {
        try {
          const parsed = JSON.parse(storedRoles);
          if (Array.isArray(parsed)) userRoles = Array.from(new Set([...userRoles, ...parsed]));
        } catch {}
      }

      const isAdmin = userRoles.some(r => ['superadmin', 'admin', 'identitymanager', 'cmsmanager', 'systemadministrator'].includes(r.toLowerCase()));

      // Check required roles if specified in route data or if accessing console routes
      const requiredRoles = route.data?.['roles'] as string[] | undefined;
      const isConsoleRoute = state.url.includes('/console') || state.url.startsWith('/admin') || state.url.startsWith('/content') || state.url.startsWith('/settings');

      if ((requiredRoles && requiredRoles.length > 0) || (isConsoleRoute && !isAdmin)) {
        if (!isAdmin) {
          console.warn('[AuthGuard] Insufficient role permissions for route:', state.url, 'UserRoles:', userRoles);
          router.navigate(['/access-denied']);
          return false;
        }
      }
    }
  } catch (err) {
    console.error('[AuthGuard] Error parsing token payload:', err);
  }

  return true;
};
