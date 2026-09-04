using Microsoft.AspNetCore.Identity;

namespace Ozikol.MasterDomain.Models;

/// <summary>
/// Platform Operator User account stored strictly in the central Master Catalog database.
/// Used for SuperAdmins and Support Staff managing tenant fleets, template catalogs, and billing.
/// </summary>
public class CentralUser : IdentityUser
{
    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public string FullName => $"{FirstName} {LastName}".Trim();

    public string? Department { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

    public DateTime? LastLoginUtc { get; set; }
}
