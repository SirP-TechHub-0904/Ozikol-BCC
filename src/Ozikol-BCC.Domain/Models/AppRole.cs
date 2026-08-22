using Ozikol_BCC.Domain.Models;
using Microsoft.AspNetCore.Identity;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Tenant role record for broad Identity authorization.
    /// BCP feature-level permissions are handled separately by BcpUserFeatureRole.
    /// </summary>
    public class AppRole : IdentityRole
    {
        public AppRole() : base() { }

        public AppRole(string roleName) : base(roleName) { }

        /// <summary>
        /// Indicates where this role should be visible and usable.
        /// </summary>
        public Enum.Enum.RoleCategory RoleCategory { get; set; } = Enum.Enum.RoleCategory.Both;
    }
}


