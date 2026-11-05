import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApiService } from '../services/api.service';
import { of, map, catchError } from 'rxjs';

/**
 * Enterprise Feature Subscription Route Guard.
 * 
 * Verifies that the current tenant organization has an active, valid subscription
 * for modular capabilities (e.g., 'bcp-workspace', 'bcp-committees', etc.).
 * 
 * If a user attempts to manually type or deep-link to a feature URL that is not
 * actively subscribed by the tenant, access is intercepted and redirected to
 * the dedicated "Feature Not Available" page.
 */
export const featureGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const router = inject(Router);
  const api = inject(ApiService);

  // Resolve deepest route to extract required feature metadata
  let deepestRoute: ActivatedRouteSnapshot = route;
  while (deepestRoute.firstChild) {
    deepestRoute = deepestRoute.firstChild;
  }

  const requiredFeature = (deepestRoute.data?.['feature'] || deepestRoute.data?.['featureCode'] || route.data?.['feature'] || route.data?.['featureCode']) as string | undefined;
  const featureName = (deepestRoute.data?.['featureName'] || route.data?.['featureName'] || requiredFeature) as string | undefined;

  // If no feature scope is bound to this route, allow activation
  if (!requiredFeature) {
    return true;
  }

  const targetCode = requiredFeature.trim().toLowerCase();

  // 1. Fast path: Check cached active feature codes in localStorage
  try {
    const raw = localStorage.getItem('bcp_active_feature_codes');
    if (raw) {
      const activeList: string[] = JSON.parse(raw);
      if (Array.isArray(activeList) && activeList.some(code => code.toLowerCase() === targetCode)) {
        return true;
      }
    }
  } catch (err) {
    console.warn('[FeatureGuard] Error reading bcp_active_feature_codes cache:', err);
  }

  // 2. Authoritative check: Fetch real-time billing features snapshot from Central API
  // Guarantees resilience when users type the URL directly in fresh browser tabs
  return api.get<any>('billing/features').pipe(
    map((res) => {
      const activeSet = new Set<string>();
      if (res && (res.success || res.isSuccess) && res.data) {
        const d = res.data;
        const all: any[] = [...(d.included || []), ...(d.subscribed || [])];
        for (const item of all) {
          if (item && item.featureCode && item.isActive && item.isAvailableForUse !== false) {
            activeSet.add(String(item.featureCode).toLowerCase());
          }
        }
        // Synchronize local cache
        localStorage.setItem('bcp_active_feature_codes', JSON.stringify(Array.from(activeSet)));
      }

      if (activeSet.has(targetCode)) {
        return true;
      }

      // Feature is not active / subscribed -> redirect to dedicated Feature Not Available page
      console.warn(`[FeatureGuard] Access denied to URL '${state.url}'. Feature '${targetCode}' is not actively subscribed for this workspace.`);
      router.navigate(['/feature-unavailable'], {
        queryParams: {
          feature: targetCode,
          featureName: featureName,
          attemptedUrl: state.url
        }
      });
      return false;
    }),
    catchError((err) => {
      console.error('[FeatureGuard] Failed to fetch billing features snapshot:', err);
      router.navigate(['/feature-unavailable'], {
        queryParams: {
          feature: targetCode,
          featureName: featureName,
          attemptedUrl: state.url
        }
      });
      return of(false);
    })
  );
};

