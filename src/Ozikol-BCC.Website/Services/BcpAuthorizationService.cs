using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Website.Services
{
    public class BcpAuthorizationService : IBcpAuthorizationService
    {
        private readonly UserManager<Profile> _userManager;
        private readonly DashboardDbContext _context;

        public BcpAuthorizationService(UserManager<Profile> userManager, DashboardDbContext context)
        {
            _userManager = userManager;
            _context = context;
        }

        public async Task<bool> CanEditAsync(ClaimsPrincipal user, string featureAreaKey)
        {
            if (user == null) return false;

            // Platform owners, SuperAdmins, and tenant administrators bypass feature checks.
            if (user.IsInRole("PlatformOwner") || user.IsInRole("SuperAdmin") || user.IsInRole("Administrator"))
            {
                return true;
            }

            var appUser = await _userManager.GetUserAsync(user);
            if (appUser == null) return false;

            var roles = await _context.BcpUserFeatureRoles
                .Where(r => r.ProfileId == appUser.Id && r.IsActive)
                .ToListAsync();

            // If they have a GlobalEditor role for ANY feature, they are a GlobalEditor
            if (roles.Any(r => r.ActionRole == BcpActionRole.GlobalEditor))
            {
                return true;
            }

            // Otherwise, check if they are a FeatureEditor for THIS specific feature
            var featureRole = roles.FirstOrDefault(r => string.Equals(r.FeatureAreaKey, featureAreaKey, System.StringComparison.OrdinalIgnoreCase));
            if (featureRole != null && featureRole.ActionRole == BcpActionRole.FeatureEditor)
            {
                return true;
            }

            // They are either Readonly or have no assigned role for this feature
            return false;
        }

        public async Task<bool> HasAccessAsync(ClaimsPrincipal user, string featureAreaKey)
        {
            if (user == null) return false;

            // Platform owners, SuperAdmins, and tenant administrators bypass feature checks.
            if (user.IsInRole("PlatformOwner") || user.IsInRole("SuperAdmin") || user.IsInRole("Administrator"))
            {
                return true;
            }

            var appUser = await _userManager.GetUserAsync(user);
            if (appUser == null) return false;

            var roles = await _context.BcpUserFeatureRoles
                .Where(r => r.ProfileId == appUser.Id && r.IsActive)
                .ToListAsync();

            // If they have a GlobalEditor role for ANY feature, they have access to everything
            if (roles.Any(r => r.ActionRole == BcpActionRole.GlobalEditor))
            {
                return true;
            }

            // Otherwise, check if they have ANY role (FeatureEditor or Readonly) for this specific feature
            return roles.Any(r => string.Equals(r.FeatureAreaKey, featureAreaKey, System.StringComparison.OrdinalIgnoreCase));
        }
    }
}

