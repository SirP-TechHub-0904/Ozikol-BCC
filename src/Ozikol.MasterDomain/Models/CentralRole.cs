using Microsoft.AspNetCore.Identity;

namespace Ozikol.MasterDomain.Models;

/// <summary>
/// Platform Operator Role definition stored strictly in the central Master Catalog database.
/// Roles: SuperAdmin, Admin, TemplateManager, ReferralManager.
/// </summary>
public class CentralRole : IdentityRole
{
    public CentralRole() : base() { }

    public CentralRole(string roleName) : base(roleName) { }

    public CentralRole(string roleName, string description) : base(roleName)
    {
        Description = description;
    }

    public string? Description { get; set; }

    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
}
