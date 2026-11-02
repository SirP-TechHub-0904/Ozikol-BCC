import { ApplicationConfig, provideZoneChangeDetection, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { TenantStateService } from './core/services/tenant-state.service';

/**
 * Pre-bootstrap initializer that resolves tenant validity BEFORE routes mount,
 * preventing any flash of unauthorized or unverified UI on non-existent subdomains.
 */
export function initializeTenantApp(tenantState: TenantStateService) {
  return () => tenantState.initTenantCheck();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeTenantApp,
      deps: [TenantStateService],
      multi: true
    },
    provideAnimations()
  ]
};
