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
 * Determines whether the user possesses global administrative or global editorial authority across all BCC modules.
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
 * Determines whether the user holds the Global Editor operational role across all active workspace modules.
 *
 * @param roles - Optional array of roles to evaluate (defaults to stored roles)
 * @returns True if the user is a Global Editor
 */
export function isGlobalEditor(roles?: string[]): boolean {
  const userRoles = roles ?? getStoredUserRoles();
  const normalized = userRoles.map(normalizeRoleKey);
  return normalized.some(r => ['globaleditor', 'globaledit'].includes(r));
}

/**
 * Determines whether the user has any explicit per-feature scope assignments
 * (e.g., 'FeatureEdit:UserManager', 'ReadOnly:ContentManager', or 'UserManager:UserManager:FeatureEditor').
 *
 * @param roles - Optional array of roles to evaluate (defaults to stored roles)
 * @returns True if at least one colon-scoped feature role claim is present
 */
export function hasScopedFeatureAssignments(roles?: string[]): boolean {
  const userRoles = roles ?? getStoredUserRoles();
  return userRoles.some(r => typeof r === 'string' && r.includes(':'));
}

/**
 * Determines whether the user is a Read-Only Auditor with view-only access.
 *
 * @param roles - Optional array of roles to evaluate (defaults to stored roles)
 * @returns True if the user holds a Read Only role without Global Admin or Global Editor authority
 */
export function isReadOnlyUser(roles?: string[]): boolean {
  const userRoles = roles ?? getStoredUserRoles();
  if (isGlobalAdmin(userRoles) || isGlobalEditor(userRoles)) return false;
  const normalized = userRoles.map(normalizeRoleKey);
  if (normalized.includes('featureeditor') || normalized.includes('featureedit')) return false;
  return normalized.includes('readonly');
}

/**
 * Normalizes a feature scope alias so variations (e.g. 'cms', 'cmsmanager', 'contentmanager')
 * resolve to canonical equivalence groups.
 */
function getEquivalentScopeKeys(targetScope: string): string[] {
  const clean = (targetScope || '').trim().toLowerCase().replace(/[\s\-_]/g, '');
  switch (clean) {
    case 'cms':
    case 'cmsmanager':
    case 'content':
    case 'contentmanager':
    case 'websitecms':
      return ['cms', 'cmsmanager', 'content', 'contentmanager', 'websitecms'];
    case 'usermanager':
    case 'usermanagement':
    case 'users':
      return ['usermanager', 'usermanagement', 'users'];
    case 'identity':
    case 'identitymanager':
    case 'identityaccesscontrol':
    case 'securityaudit':
      return ['identity', 'identitymanager', 'identityaccesscontrol', 'securityaudit'];
    case 'commerce':
    case 'commercemanager':
    case 'store':
    case 'storemanager':
    case 'commercestore':
      return ['commerce', 'commercemanager', 'store', 'storemanager', 'commercestore'];
    case 'crm':
    case 'crmmanager':
    case 'peoplecommunity':
    case 'communicationsupport':
    case 'workforceshifts':
    case 'operationsworkflows':
      return ['crm', 'crmmanager', 'usermanager', 'peoplecommunity', 'communicationsupport'];
    case 'events':
    case 'eventsmanager':
    case 'eventsticketing':
      return ['events', 'eventsmanager', 'eventsticketing'];
    case 'forms':
    case 'formsmanager':
    case 'formsintelligence':
      return ['forms', 'formsmanager', 'formsintelligence', 'contentmanager', 'cms'];
    case 'billing':
    case 'billingmanager':
    case 'financebanking':
      return ['billing', 'billingmanager', 'financebanking'];
    case 'telemetry':
    case 'telemetrymanager':
    case 'demographicscensus':
      return ['telemetry', 'telemetrymanager', 'demographicscensus'];
    default:
      return [clean];
  }
}

/**
 * Checks whether the user has view or edit permission (`FeatureEdit` or `ReadOnly`) for a specific feature scope.
 * If the user is not SuperAdmin, Admin, or Global Editor, ONLY their assigned feature scopes return true.
 *
 * @param targetScope - Target feature scope (e.g., 'usermanager', 'cms', 'identitymanager', 'storemanager')
 * @param roles - Optional array of roles to evaluate (defaults to stored roles)
 * @returns True if the user is authorized to view/access that feature scope
 */
export function hasFeatureScope(targetScope: string, roles?: string[]): boolean {
  const userRoles = roles ?? getStoredUserRoles();
  if (isGlobalAdmin(userRoles) || isGlobalEditor(userRoles)) return true;

  // An unscoped Read-Only Auditor (no specific FeatureAreaKey rows) can view console suites except Settings/Billing
  if (isReadOnlyUser(userRoles) && !hasScopedFeatureAssignments(userRoles)) {
    const clean = (targetScope || '').trim().toLowerCase().replace(/[\s\-_]/g, '');
    return clean !== 'settings' && clean !== 'billingsubscriptions';
  }

  const equivalentTargets = getEquivalentScopeKeys(targetScope);

  for (const r of userRoles) {
    if (!r || typeof r !== 'string') continue;
    const parts = r.split(':').map(p => p.trim().toLowerCase().replace(/[\s\-_]/g, ''));

    // Format 1: 'FeatureEdit:UserManager' or 'ReadOnly:ContentManager' or 'GlobalEdit:UserManager'
    if (parts.length === 2) {
      const [prefix, scopeKey] = parts;
      if (['featureedit', 'featureeditor', 'readonly', 'globaledit', 'globaleditor'].includes(prefix) &&
          equivalentTargets.includes(scopeKey)) {
        return true;
      }
    }

    // Format 2: 'UserManager:UserManager:FeatureEditor'
    if (parts.length >= 3) {
      const scopeKey = parts[1];
      const actionKey = parts[2];
      if (actionKey !== 'none' && equivalentTargets.includes(scopeKey)) {
        return true;
      }
    }

    // Format 3: Direct manager role (e.g., 'UserManager', 'IdentityManager', 'ContentManager')
    if (parts.length === 1 && equivalentTargets.includes(parts[0])) {
      return true;
    }
  }

  return false;
}

/**
 * Checks whether the user has mutation/edit authority (`GlobalEdit` or `FeatureEdit`) for a specific feature scope.
 * Returns FALSE if the user only has `ReadOnly` for that scope or has no access to that scope.
 *
 * @param targetScope - Target feature scope (e.g., 'usermanager', 'cms', 'identitymanager', 'storemanager')
 * @param roles - Optional array of roles to evaluate (defaults to stored roles)
 * @returns True ONLY if the user holds GlobalAdmin, GlobalEditor, or FeatureEdit on the target scope
 */
export function canEditFeatureScope(targetScope: string, roles?: string[]): boolean {
  const userRoles = roles ?? getStoredUserRoles();
  if (isGlobalAdmin(userRoles) || isGlobalEditor(userRoles)) return true;

  const equivalentTargets = getEquivalentScopeKeys(targetScope);
  let hasExplicitEdit = false;
  let hasExplicitReadOnly = false;

  for (const r of userRoles) {
    if (!r || typeof r !== 'string') continue;
    const parts = r.split(':').map(p => p.trim().toLowerCase().replace(/[\s\-_]/g, ''));

    // Format 1: 'FeatureEdit:UserManager' vs 'ReadOnly:UserManager'
    if (parts.length === 2) {
      const [prefix, scopeKey] = parts;
      if (equivalentTargets.includes(scopeKey)) {
        if (['featureedit', 'featureeditor', 'globaledit', 'globaleditor'].includes(prefix)) {
          hasExplicitEdit = true;
        } else if (prefix === 'readonly') {
          hasExplicitReadOnly = true;
        }
      }
    }

    // Format 2: 'UserManager:UserManager:FeatureEditor' vs 'UserManager:UserManager:ReadOnly'
    if (parts.length >= 3) {
      const scopeKey = parts[1];
      const actionKey = parts[2];
      if (equivalentTargets.includes(scopeKey)) {
        if (['featureedit', 'featureeditor', 'globaledit', 'globaleditor'].includes(actionKey)) {
          hasExplicitEdit = true;
        } else if (actionKey === 'readonly') {
          hasExplicitReadOnly = true;
        }
      }
    }

    // Format 3: Direct standalone manager role (e.g., 'UserManager', 'IdentityManager') without ReadOnly restriction
    if (parts.length === 1 && equivalentTargets.includes(parts[0]) && !isReadOnlyUser(userRoles)) {
      hasExplicitEdit = true;
    }
  }

  if (hasExplicitEdit) return true;
  if (hasExplicitReadOnly) return false;
  return false;
}

/**
 * Determines whether the authenticated user has console-level access to any BCC management module.
 * Members do not have console access.
 * 
 * @param roles - Optional array of roles to evaluate (defaults to stored roles)
 * @returns True if the user has any admin, editor, read-only auditor, or feature management role
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
    'cmsmanager',
    'contentmanager',
    'commercemanager',
    'globaleditor',
    'globaledit',
    'featureeditor',
    'featureedit',
    'readonly'
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
 * Resolves the canonical feature scope key associated with a console route URL.
 *
 * @param cleanUrl - Lowercase route path without query string
 * @returns Canonical feature scope key (or null if not a feature-scoped console route)
 */
export function resolveFeatureScopeFromUrl(cleanUrl: string): string | null {
  if (!cleanUrl) return null;
  if (cleanUrl.startsWith('/settings') || cleanUrl.startsWith('/admin/settings')) return 'settings';
  if (cleanUrl.startsWith('/billing') || cleanUrl.startsWith('/admin/billing')) return 'billingmanager';
  if (cleanUrl.startsWith('/identity/console') || cleanUrl.startsWith('/admin/identity')) return 'identitymanager';
  if (cleanUrl.startsWith('/content/console/forms') || cleanUrl.startsWith('/admin/forms')) return 'formsmanager';
  if (cleanUrl.startsWith('/content/console') || cleanUrl.startsWith('/admin/cms')) return 'contentmanager';
  if (cleanUrl.startsWith('/users/console') || cleanUrl.startsWith('/admin/users')) return 'usermanager';
  if (cleanUrl.startsWith('/products/console') || cleanUrl.startsWith('/admin/products')) return 'storemanager';
  if (cleanUrl.startsWith('/groups/console') || cleanUrl.startsWith('/admin/groups') || cleanUrl.startsWith('/admin/alumni') || cleanUrl.startsWith('/admin/messenger')) return 'crmmanager';
  if (cleanUrl.startsWith('/dashboard/console/analytics')) return 'telemetrymanager';
  return null;
}

/**
 * Evaluates whether a user with the provided roles is authorized to access a given route.
 * Enforces:
 * 1. Non-Admin / Non-SuperAdmin users can ONLY access routes belonging to their assigned feature roles.
 * 2. Create / Edit / Delete routes are blocked unless the user has `GlobalEdit` or `FeatureEdit` on that feature (blocked for `ReadOnly`).
 * 
 * @param requiredRoles - Optional list of authorized role names defined in route data
 * @param targetUrl - The target route URL to evaluate
 * @param roles - Optional array of user roles (defaults to stored roles)
 * @returns True if access is permitted; false if access should be denied
 */
export function canAccessRoute(requiredRoles?: string[], targetUrl?: string, roles?: string[]): boolean {
  const userRoles = roles ?? getStoredUserRoles();
  const cleanUrl = targetUrl ? targetUrl.toLowerCase().split('?')[0] : '';

  // Detect whether the target route is a mutation (Create / Edit / Delete) screen
  const isMutationRoute = cleanUrl.endsWith('/create')
    || cleanUrl.includes('/create/')
    || cleanUrl.endsWith('/edit')
    || cleanUrl.includes('/edit/')
    || cleanUrl.endsWith('/delete')
    || cleanUrl.includes('/delete/')
    || cleanUrl.endsWith('/new');

  const routeScope = resolveFeatureScopeFromUrl(cleanUrl);

  // SuperAdmin and Admin have full access to all routes
  if (isGlobalAdmin(userRoles)) {
    return true;
  }

  // Settings & Billing remain strictly restricted to SuperAdmin / Admin
  if (routeScope === 'settings' || routeScope === 'billingmanager') {
    return false;
  }

  // Global Editor can view and edit all non-Settings/non-Billing console features
  if (isGlobalEditor(userRoles)) {
    return true;
  }

  // Rule 2: Any Create / Edit / Delete route requires GlobalEdit or FeatureEdit on that feature (ReadOnly is blocked)
  if (isMutationRoute) {
    if (isReadOnlyUser(userRoles) && !hasScopedFeatureAssignments(userRoles)) {
      return false;
    }
    if (routeScope && !canEditFeatureScope(routeScope, userRoles)) {
      return false;
    }
  }

  // Unscoped Read-Only Auditor can view (GET) console routes (mutations already blocked above)
  if (isReadOnlyUser(userRoles) && !hasScopedFeatureAssignments(userRoles)) {
    return true;
  }

  const normalizedUserRoles = userRoles.map(normalizeRoleKey);
  const isMember = isMemberOnly(userRoles);

  // 1. Console Isolation: Members cannot access any console or admin routes
  const isConsoleRoute = cleanUrl.includes('/console') 
    || cleanUrl.startsWith('/admin') 
    || cleanUrl.startsWith('/content') 
    || cleanUrl.startsWith('/products')
    || cleanUrl.startsWith('/billing')
    || cleanUrl.startsWith('/settings')
    || cleanUrl.startsWith('/identity')
    || cleanUrl.startsWith('/groups/console')
    || cleanUrl.startsWith('/dashboard/mxmails')
    || cleanUrl.startsWith('/dashboard/mxsms')
    || cleanUrl === '/dashboard/console';

  if (isConsoleRoute && isMember) {
    return false;
  }

  // 2. Rule 1: Non-Admin / Non-SuperAdmin users can ONLY access routes for their assigned feature scope
  if (routeScope) {
    // Self-service account route under /identity/console/account is allowed for any console user
    if (!cleanUrl.startsWith('/identity/console/account') && !hasFeatureScope(routeScope, userRoles)) {
      return false;
    }
  }

  // 3. Specific Route Role Requirement from app.routes.ts
  if (requiredRoles && requiredRoles.length > 0) {
    const normalizedRequired = requiredRoles.map(normalizeRoleKey);
    const hasDirectRole = normalizedUserRoles.some(r =>
      normalizedRequired.includes(r) && !['featureeditor', 'featureedit', 'readonly'].includes(r)
    );
    const hasScopedMatch = routeScope
      ? (isMutationRoute ? canEditFeatureScope(routeScope, userRoles) : hasFeatureScope(routeScope, userRoles))
      : requiredRoles.some(req => isMutationRoute ? canEditFeatureScope(req, userRoles) : hasFeatureScope(req, userRoles));

    if (!hasDirectRole && !hasScopedMatch) {
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
  if (normalized.includes('identitymanager')) return 'Identity Manager';
  if (normalized.includes('usermanager')) return 'User Manager';
  if (normalized.includes('cmsmanager') || normalized.includes('contentmanager')) return 'CMS Manager';
  if (normalized.includes('commercemanager')) return 'Commerce Manager';
  if (normalized.includes('globaleditor') || normalized.includes('globaledit')) return 'Global Editor';
  if (normalized.includes('featureeditor') || normalized.includes('featureedit')) return 'Feature Editor';
  if (normalized.includes('readonly')) return 'Read Only Auditor';

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

  if (isGlobalAdmin(userRoles) || isGlobalEditor(userRoles) || isReadOnlyUser(userRoles)) {
    return '/dashboard/console';
  }

  const normalized = userRoles.map(normalizeRoleKey);

  // Scoped feature authorities land directly on their relevant management console
  if (normalized.includes('usermanager') || hasFeatureScope('usermanager', userRoles)) {
    return '/users/console/dashboard';
  }

  if (normalized.includes('identitymanager') || hasFeatureScope('identitymanager', userRoles)) {
    return '/identity/console/dashboard';
  }

  if (normalized.includes('cmsmanager') || normalized.includes('contentmanager') || hasFeatureScope('cms', userRoles)) {
    return '/content/console/forms';
  }

  return '/dashboard/console';
}
