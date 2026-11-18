using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Ozikol.MasterDomain.Security;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Application;
using Ozikol_BCC.EmailServices.Postmark;
using Ozikol_BCC.Infrastructure;
using Ozikol_BCC.Infrastructure.Extensions;
using Ozikol_BCC.Infrastructure.Services.Email;
using Ozikol_BCC.Infrastructure.TenantSupport;
using Ozikol_BCC.Persistence.EF.SQL;
using Ozikol_BCC.Persistence.EF.SQL.Extensions;
using Ozikol_BCC.Worker.Services;
using Ozikol_BCC.Worker.Workers;

namespace Ozikol_BCC.Worker;

/// <summary>
/// Entry point for the standalone Ozikol-BCC background Worker Service.
/// Hosts multi-channel outbox dispatching (<see cref="MessagePoolDispatchWorker"/>)
/// and autonomous custom domain DNS health checks (<see cref="DomainDnsHealthMonitorWorker"/>).
/// </summary>
public static class Program
{
    /// <summary>
    /// Configures and runs the standalone worker host.
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
            options.ServiceName = "Ozikol-BCC Worker";
        });
        builder.Services.AddSystemd();

        builder.Services
            .AddApplicationExtensions(builder.Configuration)
            .AddTenantSupport(builder.Configuration)
            .AddMailcowSupport()
            .AddCustomDomainSupport()
            .AddEntityFrameworkSqlServer<DashboardDbContext>();

        builder.Services.AddSingleton<IMailInfrastructureCredentialProvider, WorkerMailInfrastructureCredentialProvider>();
        builder.Services.AddPostmarkEmailServices(builder.Configuration);

        var masterConnectionString = builder.Configuration["TenantConfiguration:ConnectionString"]
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

        builder.Services.AddHostedService<MessagePoolDispatchWorker>();
        builder.Services.AddHostedService<DomainDnsHealthMonitorWorker>();

        var host = builder.Build();
        await host.RunAsync();
    }
}
