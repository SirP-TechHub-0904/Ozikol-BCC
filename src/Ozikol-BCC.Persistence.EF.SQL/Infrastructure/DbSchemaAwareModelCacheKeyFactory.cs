using Ozikol_BCC.Infrastructure.TenantSupport;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace Ozikol_BCC.Persistence.EF.SQL.Infrastructure;

/// <summary>
/// EF model-cache hook for tenant-aware database models.
/// Since tenants currently use separate databases with the same schema, the cache key does not vary by tenant schema.
/// </summary>
internal class DbSchemaAwareModelCacheKeyFactory : IModelCacheKeyFactory
{
    private readonly ITenantProvider _tenantProvider;

    public DbSchemaAwareModelCacheKeyFactory(ITenantProvider tenantProvider)
    {
        _tenantProvider = tenantProvider;
    }

    public object Create(DbContext context, bool designTime)
    {
        // Migration-sensitive: include schema/tenant here only if tenant schemas diverge.
        return Tuple.Create(context.GetType(), /*_tenantProvider.DbSchemaName*/ designTime);
    }
}

