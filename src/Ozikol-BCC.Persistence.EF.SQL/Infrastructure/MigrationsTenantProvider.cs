using Ozikol_BCC.Infrastructure.TenantSupport;

namespace Ozikol_BCC.Persistence.EF.SQL.Infrastructure;

/// <summary>
/// Design-time tenant provider for EF migrations.
/// Do not use this provider at runtime; runtime tenants are resolved by the infrastructure tenant provider.
/// </summary>
public class MigrationsTenantProvider : ITenantProvider
{
    private readonly string _connectionString;

    public MigrationsTenantProvider(string connectionString)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException("A design-time migration connection string is required.");
        }

        _connectionString = connectionString;
    }

    public string? CurrentTenant => null;

    public string DbSchemaName => "dbo"; 

    /// <summary>
    /// Migration-sensitive: this is the default design-time database used when adding migrations locally.
    /// The value is supplied by MigrationsDbContextFactory from .env/appsettings/environment variables.
    /// </summary>
    public string ConnectionString => _connectionString;

    public IDisposable BeginScope(string tenant)
    {
        throw new NotSupportedException("Design-time migrations do not support tenant scopes.");
    }
}

