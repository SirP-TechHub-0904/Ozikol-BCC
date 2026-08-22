using Microsoft.AspNetCore.Identity;

namespace Ozikol_BCC.Domain.Models;

/// <summary>
/// Platform operator and administrator user in MasterCatalogDbContext.
/// </summary>
public class CentralUser : IdentityUser<string>
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string FullName => $"{FirstName} {LastName}".Trim();
    public string? Department { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginUtc { get; set; }

    public CentralUser()
    {
        Id = Guid.NewGuid().ToString();
    }
}
