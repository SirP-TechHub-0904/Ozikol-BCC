namespace Ozikol_BCC.Infrastructure.TenantSupport;

public class ProvisionTenantRequest
{
    public string TenantKey { get; set; } = null!;
    public string OrganizationName { get; set; } = null!;
    public string? PrimaryDomain { get; set; }
    public string? CustomDomain { get; set; }
    public string? ApiUrl { get; set; }
    public string? WebsiteUrl { get; set; }
    public string AdminEmail { get; set; } = null!;
    public string AdminPassword { get; set; } = null!;
    public string? AdminFirstName { get; set; }
    public string? AdminLastName { get; set; }
}

public class ProvisionTenantResult
{
    public bool Success { get; set; }
    public string TenantKey { get; set; } = null!;
    public string PrimaryDomain { get; set; } = null!;
    public string? CustomDomain { get; set; }
    public string DatabaseName { get; set; } = null!;
    public string? ApiUrl { get; set; }
    public string? WebsiteUrl { get; set; }
    public string Message { get; set; } = null!;
    public Exception? Exception { get; set; }
}

public interface ITenantProvisioningService
{
    Task<ProvisionTenantResult> ProvisionTenantAsync(ProvisionTenantRequest request, CancellationToken cancellationToken = default);
    Task<List<TenantCatalogDto>> GetAllTenantsAsync(CancellationToken cancellationToken = default);
    Task<bool> ToggleTenantStatusAsync(string tenantKey, bool isActive, CancellationToken cancellationToken = default);
    Task<bool> UpdateCustomDomainAsync(string tenantKey, string? customDomain, CancellationToken cancellationToken = default);
}

public class TenantCatalogDto
{
    public Guid Id { get; set; }
    public string TenantKey { get; set; } = null!;
    public string OrganizationName { get; set; } = null!;
    public string PrimaryDomain { get; set; } = null!;
    public string? CustomDomain { get; set; }
    public string? ApiUrl { get; set; }
    public string? WebsiteUrl { get; set; }
    public string DatabaseName { get; set; } = null!;
    public string? AdminEmail { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedUtc { get; set; }
}
