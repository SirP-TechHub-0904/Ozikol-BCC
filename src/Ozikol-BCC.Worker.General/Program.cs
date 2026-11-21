using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Ozikol.MasterDomain.Security;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Application;
using Ozikol_BCC.Infrastructure;
using Ozikol_BCC.Infrastructure.Extensions;
using Ozikol_BCC.Infrastructure.TenantSupport;
using Ozikol_BCC.Persistence.EF.SQL;
using Ozikol_BCC.Persistence.EF.SQL.Extensions;
using Ozikol_BCC.Worker.General.Workers;

namespace Ozikol_BCC.Worker.General;

/// <summary>
/// Entry point for the Ozikol-BCC General Background Worker Service.
/// Dedicated to general platform maintenance, periodic health monitoring,
/// and automated domain DNS validation (<see cref="DomainDnsHealthMonitorWorker"/>).
/// </summary>
public static class Program
{
    /// <summary>
    /// Configures and runs the standalone general worker host.
    /// </summary>
    /// <param name="args">Command-line arguments passed at startup.</param>
    public static async Task Main(string[] args)
    {
        DotNetEnv.Env.TraversePath().Load();

        var builder = Host.CreateApplicationBuilder(args);
        builder.Configuration.AddEnvironmentVariables();
        OzikolDataCipher.Initialize(builder.Configuration);

        builder.Services.AddWindowsService(options =>
        {
            options.ServiceName = "Ozikol-BCC General Worker";
        });
        builder.Services.AddSystemd();

        builder.Services
            .AddApplicationExtensions(builder.Configuration)
            .AddTenantSupport(builder.Configuration)
            .AddCustomDomainSupport()
            .AddEntityFrameworkSqlServer<DashboardDbContext>();

        var masterConnectionString = builder.Configuration["TenantConfiguration:ConnectionString"]
            ?? builder.Configuration["TenantConfiguration__ConnectionString"]
            ?? Environment.GetEnvironmentVariable("TenantConfiguration__ConnectionString")
            ?? Environment.GetEnvironmentVariable("TenantConfiguration:ConnectionString")
            ?? builder.Configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException(
                "CRITICAL CONFIGURATION ERROR: Master database connection string is not configured. " +
                "Please specify 'TenantConfiguration:ConnectionString' or 'ConnectionStrings:DefaultConnection' in your .env file, appsettings.json, or environment variables.");

        builder.Services.AddDbContext<MasterCatalogDbContext>(options =>
            options.UseSqlServer(masterConnectionString, sqlOpts =>
            {
                sqlOpts.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(10), errorNumbersToAdd: null);
                sqlOpts.CommandTimeout(60);
            }));

        builder.Services.AddHttpClient();
        builder.Services.AddMemoryCache();

        // Register general platform background maintenance workers
        builder.Services.AddHostedService<DomainDnsHealthMonitorWorker>();

        var host = builder.Build();
        await host.RunAsync();
    }
}
