namespace Ozikol_BCC.Infrastructure.TenantSupport;

/// <summary>
/// Configuration model bound from TenantConfiguration. The root connection string
/// is the default database; each named tenant may override it with a separate database.
/// </summary>
public class TenantConfigurationOptions
{
    public const string ConfigKey = "TenantConfiguration";
    /// <summary>
    /// One configured tenant entry. Name is the tenant key used in scopes and routing;
    /// ConnectionString points to that tenant's database when supplied.
    /// </summary>
    public class Tenant
    {
        public string Name { get; set; } = null!;

        public string? ConnectionString { get; set; }
    }

    public string ConnectionString { get; set; } = null!;

    public ICollection<Tenant> Tenants { get; set; } = new List<Tenant>();
}

