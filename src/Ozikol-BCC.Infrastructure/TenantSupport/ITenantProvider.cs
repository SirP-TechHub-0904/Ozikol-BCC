
namespace Ozikol_BCC.Infrastructure.TenantSupport;

/// <summary>
/// Provides the current tenant context and resolves the correct database connection string.
/// BCP uses separate databases per tenant, so callers should scope tenant identity before data access.
/// </summary>
public interface ITenantProvider
{
    /// <summary>
    /// Current tenant key stored for the active async flow.
    /// </summary>
    string? CurrentTenant { get; }

    //string DbSchemaName { get; }
    /// <summary>
    /// Connection string for the current tenant, or the configured default when no tenant is active.
    /// </summary>
    string ConnectionString { get; }

    /// <summary>
    /// Starts a tenant scope for the current async operation. Dispose the returned object
    /// to clear the tenant and avoid leaking tenant context into later work.
    /// </summary>
    IDisposable BeginScope(string tenant);
}

