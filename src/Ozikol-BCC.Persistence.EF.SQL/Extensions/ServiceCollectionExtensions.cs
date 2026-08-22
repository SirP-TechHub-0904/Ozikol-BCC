using Ozikol_BCC.Infrastructure.TenantSupport;
using Ozikol_BCC.Persistence.EF.SQL.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Ozikol_BCC.Persistence.EF.SQL.Extensions;

public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Registers EF SQL Server services with tenant-aware model/migration infrastructure.
    /// The active tenant connection is still supplied by DashboardDbContext through ITenantProvider.
    /// </summary>
    public static IServiceCollection AddEntityFrameworkSqlServer<TContext>(this IServiceCollection services)
        where TContext : DbContext
    {
        // These hooks are migration-sensitive: update them only when changing tenant schema strategy.
        services.AddSingleton<IModelCacheKeyFactory, DbSchemaAwareModelCacheKeyFactory>();
        services.AddScoped<IMigrationsSqlGenerator, DbSchemaAwareSqlServerMigrationsSqlGenerator>();

        services.TryAddSingleton<ITenantProvider, TenantProvider>();

        services
            .AddEntityFrameworkSqlServer()
            .AddDbContext<TContext>((sp, options) =>
                options.UseInternalServiceProvider(sp)
            );

        return services;
    }
}

