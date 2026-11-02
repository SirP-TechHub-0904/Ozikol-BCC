import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { getReturnUrlForRole } from '../utils/user-role.utils';

export interface EnrolledWorkspaceSession {
  tenantKey: string;
  organizationName: string;
  brandLogoUrl?: string;
  brandIconUrl?: string;
  authToken: string;
  userEmail?: string;
  userFullName?: string;
  userRoles?: string[];
  lastAccessed: string;
}

/**
 * Service managing multi-workspace enrollment, session persistence, and isolated context switching
 * across all client application views.
 */
@Injectable({
  providedIn: 'root'
})
export class MultiWorkspaceService {
  private readonly STORAGE_KEY = 'bcp_enrolled_workspaces';
  private enrolledSubject = new BehaviorSubject<EnrolledWorkspaceSession[]>(this.loadFromStorage());

  public enrolledWorkspaces$: Observable<EnrolledWorkspaceSession[]> = this.enrolledSubject.asObservable();

  constructor(private router: Router) {}

  /**
   * Retrieves all saved workspace sessions from local storage.
   */
  public getEnrolledWorkspaces(): EnrolledWorkspaceSession[] {
    return this.enrolledSubject.value;
  }

  /**
   * Saves or updates an active authenticated workspace session in persistent storage.
   * @param session Data payload containing token, tenantKey, and user metadata.
   */
  public saveSession(session: {
    tenantKey: string;
    token: string;
    fullName?: string;
    email?: string;
    roles?: string[];
    organizationName?: string;
    brandLogoUrl?: string;
    brandIconUrl?: string;
  }): void {
    if (!session.tenantKey || !session.token) return;

    const list = this.loadFromStorage();
    const existingIndex = list.findIndex(w => w.tenantKey.toLowerCase() === session.tenantKey.toLowerCase());

    const orgName = session.organizationName || localStorage.getItem('tenant_name') || session.tenantKey;
    const logoUrl = session.brandLogoUrl || localStorage.getItem('tenant_logo') || undefined;
    const iconUrl = session.brandIconUrl || localStorage.getItem('tenant_icon') || undefined;

    const entry: EnrolledWorkspaceSession = {
      tenantKey: session.tenantKey,
      organizationName: orgName,
      brandLogoUrl: logoUrl,
      brandIconUrl: iconUrl,
      authToken: session.token,
      userEmail: session.email || localStorage.getItem('user_email') || undefined,
      userFullName: session.fullName || localStorage.getItem('user_name') || undefined,
      userRoles: session.roles || (localStorage.getItem('user_roles') ? JSON.parse(localStorage.getItem('user_roles')!) : []),
      lastAccessed: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...entry };
    } else {
      list.unshift(entry);
    }

    this.persist(list);
  }

  /**
   * Atomically switches active workspace context to another enrolled organization.
   * Restores that organization's token, user information, and navigates to the role-tailored dashboard.
   * @param tenantKey Target workspace key.
   * @returns True if switch succeeded; false if session not found.
   */
  public switchWorkspace(tenantKey: string): boolean {
    const list = this.loadFromStorage();
    const target = list.find(w => w.tenantKey.toLowerCase() === tenantKey.toLowerCase());
    if (!target || !target.authToken) return false;

    // Atomically swap active keys in localStorage
    localStorage.setItem('tenant_key', target.tenantKey);
    localStorage.setItem('access_token', target.authToken);
    if (target.userFullName) localStorage.setItem('user_name', target.userFullName);
    if (target.userEmail) localStorage.setItem('user_email', target.userEmail);
    if (target.userRoles && Array.isArray(target.userRoles)) {
      localStorage.setItem('user_roles', JSON.stringify(target.userRoles));
    }
    if (target.organizationName) localStorage.setItem('tenant_name', target.organizationName);
    if (target.brandLogoUrl) localStorage.setItem('tenant_logo', target.brandLogoUrl);
    if (target.brandIconUrl) localStorage.setItem('tenant_icon', target.brandIconUrl);

    // Update last accessed
    target.lastAccessed = new Date().toISOString();
    this.persist(list);

    // Navigate to role-tailored dashboard
    const targetUrl = getReturnUrlForRole(target.userRoles || []);
    // Hard refresh or reload to ensure complete SignalR socket and component re-hydration
    window.location.href = targetUrl;
    return true;
  }

  /**
   * Clears the active authentication token for a workspace while preserving its enrollment record.
   * @param tenantKey Target workspace key.
   */
  public signOutWorkspace(tenantKey: string): void {
    const list = this.loadFromStorage();
    const target = list.find(w => w.tenantKey.toLowerCase() === tenantKey.toLowerCase());
    if (target) {
      target.authToken = '';
      this.persist(list);
    }

    const currentKey = localStorage.getItem('tenant_key');
    if (currentKey && currentKey.toLowerCase() === tenantKey.toLowerCase()) {
      localStorage.removeItem('access_token');
      this.router.navigate(['/auth/login']);
    }
  }

  /**
   * Completely removes an enrolled workspace record from device storage.
   * @param tenantKey Target workspace key.
   */
  public removeWorkspace(tenantKey: string): void {
    const list = this.loadFromStorage().filter(w => w.tenantKey.toLowerCase() !== tenantKey.toLowerCase());
    this.persist(list);
  }

  private loadFromStorage(): EnrolledWorkspaceSession[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private persist(list: EnrolledWorkspaceSession[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
      this.enrolledSubject.next([...list]);
    } catch {}
  }
}
