/**
 * Structured model representing a decomposed and normalized tenant user role.
 */
export interface ParsedUserRole {
  /** Raw role string as received from token or storage. */
  raw: string;
  /** Normalized primary role identifier (e.g., 'Admin', 'Member', 'UserManager', 'IdentityManager'). */
  primaryRole: string;
  /** Normalized operational feature scope (e.g., 'UserManager', 'IdentityManager', 'SystemGovernance'). */
  featureScope?: string;
  /** Operational action permission level ('GlobalEditor', 'FeatureEditor', 'ReadOnly'). */
  actionRole?: string;
}

/**
 * Normalizes a raw role token by trimming whitespace, lowercasing, and removing spaces.
 * 
 * @param role - Raw role string
 * @returns Clean, lowercase string key for exact comparison
 */
export function normalizeRoleKey(role: string): string {
  if (!role || typeof role !== 'string') return '';
  // Extract primary segment if colon-delimited (e.g., 'UserManager:UserManager:FeatureEditor' -> 'UserManager')
  const primaryPart = role.includes(':') ? role.split(':')[0] : role;
  return primaryPart.trim().toLowerCase().replace(/[\s\-_]/g, '');
}

/**
 * Parses any role string (simple or colon-delimited) into a structured ParsedUserRole object.
 * 
 * @param roleStr - Raw role string
 * @returns ParsedUserRole structure
 */
export function parseRoleString(roleStr: string): ParsedUserRole {
  if (!roleStr || typeof roleStr !== 'string') {
    return { raw: '', primaryRole: 'Member' };
  }

  const parts = roleStr.split(':').map(p => p.trim());
  if (parts.length >= 3) {
    return {
      raw: roleStr,
      primaryRole: parts[0],
      featureScope: parts[1],
      actionRole: parts[2]
    };
  }

  return {
    raw: roleStr,
    primaryRole: parts[0]
  };
}

/**
 * Retrieves the current user's assigned roles from local storage or decodes the JWT access token.
 * 
 * @returns Array of role strings assigned to the authenticated user
 */
export function getStoredUserRoles(): string[] {
  if (typeof window === 'undefined') return [];

  const collectedRoles: string[] = [];

  // 1. Check user_roles cache in localStorage
  const rolesJson = localStorage.getItem('user_roles');
  if (rolesJson) {
    try {
      const parsed = JSON.parse(rolesJson);
      if (Array.isArray(parsed)) {
        collectedRoles.push(...parsed.filter((r): r is string => typeof r === 'string' && !!r.trim()));
      }
    } catch {
      // Fallback if not valid JSON
    }
  }

  // 2. Fallback to decoding active JWT access token if user_roles cache is empty
  if (collectedRoles.length === 0) {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          let payloadStr = parts[1];
          switch (payloadStr.length % 4) {
            case 2: payloadStr += '=='; break;
            case 3: payloadStr += '='; break;
          }
          const decoded = JSON.parse(atob(payloadStr.replace(/-/g, '+').replace(/_/g, '/')));
          const roleClaim = decoded['role'] || decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
          if (Array.isArray(roleClaim)) {
            collectedRoles.push(...roleClaim);
          } else if (typeof roleClaim === 'string' && roleClaim.trim()) {
            collectedRoles.push(roleClaim);
          }
        }
      } catch {
        // Token decode error
      }
    }
  }

  return Array.from(new Set(collectedRoles));
}

/**
 * Determines whether the user possesses global administrative authority across all BCC modules.
 * 
 * @param roles - Optional array of roles to evaluate (defaults to stored roles)
 * @returns True if the user is a SuperAdmin, Admin, or SystemAdministrator
 */
export function isGlobalAdmin(roles?: string[]): boolean {
  const userRoles = roles ?? getStoredUserRoles();
  const normalized = userRoles.map(normalizeRoleKey);
  return normalized.some(r => ['superadmin', 'admin', 'systemadministrator'].includes(r));
}

/**
 * Determines whether the authenticated user has console-level access to any BCC management module.
 * Members do not have console access.
 * 
 * @param roles - Optional array of roles to evaluate (defaults to stored roles)
 * @returns True if the user has any admin or feature management role
 */
export function canAccessConsole(roles?: string[]): boolean {
  const userRoles = roles ?? getStoredUserRoles();
  if (userRoles.length === 0) return false;
  if (isGlobalAdmin(userRoles)) return true;

  const normalized = userRoles.map(normalizeRoleKey);
  return normalized.some(r => [
    'superadmin',
    'admin',
    'systemadministrator',
    'usermanager',
    'identitymanager',
    'cmsmanager'
  ].includes(r));
}

/**
 * Checks whether the user is exclusively a Member without administrative or feature manager roles.
 * 
 * @param roles - Optional array of roles to evaluate (defaults to stored roles)
 * @returns True if the user only possesses Member authority
 */
export function isMemberOnly(roles?: string[]): boolean {
  const userRoles = roles ?? getStoredUserRoles();
  if (userRoles.length === 0) return true;
  return !canAccessConsole(userRoles);
}

/**
 * Checks whether the user possesses a specific role by name or normalized key.
 * 
 * @param targetRole - Role name to test (e.g., 'UserManager', 'IdentityManager', 'Admin', 'Member')
 * @param roles - Optional array of roles to evaluate (defaults to stored roles)
 * @returns True if the user has the specified role
 */
export function hasUserRole(targetRole: string, roles?: string[]): boolean {
  const userRoles = roles ?? getStoredUserRoles();
  if (isGlobalAdmin(userRoles)) return true;

  const targetKey = normalizeRoleKey(targetRole);
  const normalized = userRoles.map(normalizeRoleKey);
  return normalized.includes(targetKey);
}

/**
 * Evaluates whether a user with the provided roles is authorized to access a given route.
 * Handles role-based restrictions, feature authority boundaries, and Member vs Console isolation.
 * 
 * @param requiredRoles - Optional list of authorized role names defined in route data
 * @param targetUrl - The target route URL to evaluate
 * @param roles - Optional array of user roles (defaults to stored roles)
 * @returns True if access is permitted; false if access should be denied
 */
export function canAccessRoute(requiredRoles?: string[], targetUrl?: string, roles?: string[]): boolean {
  const userRoles = roles ?? getStoredUserRoles();

  // Global administrators have unrestricted access to all routes
  if (isGlobalAdmin(userRoles)) {
    return true;
  }

  const normalizedUserRoles = userRoles.map(normalizeRoleKey);
  const isMember = isMemberOnly(userRoles);

  const cleanUrl = targetUrl ? targetUrl.toLowerCase().split('?')[0] : '';

  // 1. Console Isolation: Members cannot access any console or admin routes
  const isConsoleRoute = cleanUrl.includes('/console') 
    || cleanUrl.startsWith('/admin') 
    || cleanUrl.startsWith('/content') 
    || cleanUrl.startsWith('/settings')
    || cleanUrl.startsWith('/identity')
    || cleanUrl === '/dashboard/console';

  if (isConsoleRoute && isMember) {
    return false;
  }

  // 2. Specific Route Role Requirement
  if (requiredRoles && requiredRoles.length > 0) {
    const normalizedRequired = requiredRoles.map(normalizeRoleKey);
    const hasMatchingRole = normalizedUserRoles.some(r => normalizedRequired.includes(r));
    if (!hasMatchingRole) {
      return false;
    }
  }

  // 3. Granular Feature Authority Route Boundaries
  // Identity Console is restricted strictly to IdentityManager or Admin
  if (cleanUrl.startsWith('/identity/console') || cleanUrl.startsWith('/admin/identity')) {
    if (!normalizedUserRoles.some(r => ['identitymanager', 'admin', 'superadmin'].includes(r))) {
      return false;
    }
  }

  // Settings Console is restricted to Admin
  if (cleanUrl.startsWith('/settings/console') || cleanUrl.startsWith('/admin/settings')) {
    if (!normalizedUserRoles.some(r => ['admin', 'superadmin', 'systemadministrator'].includes(r))) {
      return false;
    }
  }

  // Content/CMS Console is restricted to CmsManager or Admin
  if (cleanUrl.startsWith('/content/console') || cleanUrl.startsWith('/admin/forms') || cleanUrl.startsWith('/admin/cms')) {
    if (!normalizedUserRoles.some(r => ['cmsmanager', 'admin', 'superadmin'].includes(r))) {
      return false;
    }
  }

  // Users Console is restricted to UserManager or Admin
  if (cleanUrl.startsWith('/users/console') || cleanUrl.startsWith('/admin/users')) {
    if (!normalizedUserRoles.some(r => ['usermanager', 'identitymanager', 'admin', 'superadmin'].includes(r))) {
      return false;
    }
  }

  return true;
}

/**
 * Returns a human-friendly display label representing the user's primary active role.
 * 
 * @param roles - Optional array of roles to evaluate (defaults to stored roles)
 * @returns Professional role title (e.g., 'Administrator', 'User Manager', 'Identity Manager', 'Member')
 */
export function getUserPrimaryRoleName(roles?: string[]): string {
  const userRoles = roles ?? getStoredUserRoles();
  if (userRoles.length === 0) return 'Member';

  const normalized = userRoles.map(normalizeRoleKey);

  if (normalized.some(r => r === 'superadmin' || r === 'systemadministrator')) return 'Super Administrator';
  if (normalized.includes('admin')) return 'Administrator';
  if (normalized.includes('usermanager')) return 'User Manager';
  if (normalized.includes('identitymanager')) return 'Identity Manager';
  if (normalized.includes('cmsmanager')) return 'CMS Manager';

  return 'Member';
}

/**
 * Computes the optimal post-login or return dashboard URL tailored to the user's authority scope.
 * 
 * @param roles - Optional array of roles to evaluate (defaults to stored roles)
 * @returns Appropriate dashboard route path
 */
export function getReturnUrlForRole(roles?: string[]): string {
  const userRoles = roles ?? getStoredUserRoles();

  if (isMemberOnly(userRoles)) {
    return '/dashboard/workspace';
  }

  if (isGlobalAdmin(userRoles)) {
    return '/dashboard/console';
  }

  const normalized = userRoles.map(normalizeRoleKey);

  // Scoped feature authorities land directly on their relevant management console
  if (normalized.includes('usermanager')) {
    return '/users/console/dashboard';
  }

  if (normalized.includes('identitymanager')) {
    return '/identity/console/dashboard';
  }

  if (normalized.includes('cmsmanager')) {
    return '/content/console/forms';
  }

  return '/dashboard/console';
}
