using Microsoft.AspNetCore.Identity;

namespace Ozikol_BCC.Domain.Models;

/// <summary>
/// Platform operator role (SuperAdmin, DevOps, SupportOperator) in MasterCatalogDbContext.
/// </summary>
public class CentralRole : IdentityRole<string>
{
    public string? Description { get; set; }
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

    public CentralRole()
    {
        Id = Guid.NewGuid().ToString();
    }

    public CentralRole(string roleName, string? description = null) : base(roleName)
    {
        Id = Guid.NewGuid().ToString();
        Description = description;
        CreatedUtc = DateTime.UtcNow;
    }
}
