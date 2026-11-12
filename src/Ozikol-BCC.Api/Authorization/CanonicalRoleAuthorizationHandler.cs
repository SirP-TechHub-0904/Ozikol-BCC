using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Constants;
using Ozikol_BCC.Persistence.EF.SQL;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Ozikol_BCC.Api.Authorization
{
    /// <summary>
    /// Authorization requirement backed by canonical normalized role keys and optional feature area keys.
    /// </summary>
    public sealed class CanonicalRoleRequirement : IAuthorizationRequirement
    {
        /// <summary>
        /// Gets the set of normalized canonical role keys allowed by this policy.
        /// </summary>
        public IReadOnlyCollection<string> AllowedNormalizedRoles { get; }

        /// <summary>
        /// Gets optional <c>BcpUserFeatureRole.FeatureAreaKey</c> values that also satisfy this policy.
        /// </summary>
        public IReadOnlyCollection<string> AllowedFeatureKeys { get; }

        /// <summary>
        /// Initializes a new instance of <see cref="CanonicalRoleRequirement"/>.
        /// </summary>
        /// <param name="allowedNormalizedRoles">Canonical normalized role keys from <see cref="SystemRoles"/>.</param>
        /// <param name="allowedFeatureKeys">Optional feature codes / keys from <c>BcpUserFeatureRoles</c>.</param>
        public CanonicalRoleRequirement(
            IReadOnlyCollection<string> allowedNormalizedRoles,
            IReadOnlyCollection<string>? allowedFeatureKeys = null)
        {
            AllowedNormalizedRoles = allowedNormalizedRoles;
            AllowedFeatureKeys = allowedFeatureKeys ?? Array.Empty<string>();
        }
    }

    /// <summary>
    /// Evaluates <see cref="CanonicalRoleRequirement"/> using normalized role claims (eliminating spaced/unspaced
    /// role string duplication) and active <c>BcpUserFeatureRoles</c> assignments.
    /// </summary>
    public sealed class CanonicalRoleAuthorizationHandler : AuthorizationHandler<CanonicalRoleRequirement>
    {
        private readonly DashboardDbContext _dbContext;

        /// <summary>
        /// Initializes a new instance of <see cref="CanonicalRoleAuthorizationHandler"/>.
        /// </summary>
        /// <param name="dbContext">Tenant database context for verifying active feature role assignments.</param>
        public CanonicalRoleAuthorizationHandler(DashboardDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        /// <summary>
        /// Evaluates whether the current principal satisfies the normalized role or feature assignment requirement.
        /// </summary>
        protected override async Task HandleRequirementAsync(
            AuthorizationHandlerContext context,
            CanonicalRoleRequirement requirement)
        {
            if (context.User?.Identity?.IsAuthenticated != true)
                return;

            // 1. Check normalized role claims (handles both "CMS Studio Manager" and "CmsStudioManager" seamlessly)
            var userRoleClaims = context.User.Claims
                .Where(c => c.Type == ClaimTypes.Role ||
                            c.Type == "role" ||
                            c.Type == "http://schemas.microsoft.com/ws/2008/06/identity/claims/role")
                .Select(c => SystemRoles.Normalize(c.Value))
                .Where(k => !string.IsNullOrEmpty(k))
                .ToList();

            if (userRoleClaims.Any(k => requirement.AllowedNormalizedRoles.Contains(k)))
            {
                context.Succeed(requirement);
                return;
            }

            // 2. Check active BcpUserFeatureRoles assignments for the user
            var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!string.IsNullOrEmpty(userId))
            {
                var activeFeatureKeys = await _dbContext.BcpUserFeatureRoles
                    .AsNoTracking()
                    .Where(f => f.ProfileId == userId && f.IsActive && f.FeatureAreaKey != null)
                    .Select(f => f.FeatureAreaKey!)
                    .ToListAsync();

                if (requirement.AllowedFeatureKeys.Count > 0)
                {
                    var normalizedAllowed = new HashSet<string>(
                        requirement.AllowedFeatureKeys.Select(SystemRoles.Normalize),
                        StringComparer.OrdinalIgnoreCase);

                    if (activeFeatureKeys.Any(fk => normalizedAllowed.Contains(SystemRoles.Normalize(fk))))
                    {
                        context.Succeed(requirement);
                        return;
                    }
                }
                else if (requirement.AllowedNormalizedRoles == SystemRoles.ConsoleDashboardKeys && activeFeatureKeys.Count > 0)
                {
                    // Any user with at least one active feature role is allowed to access the console dashboard shell
                    context.Succeed(requirement);
                    return;
                }
            }
        }
    }
}

