using System;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Serilog;

namespace Ozikol.MasterPersistence.EF.DbMigrator
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            try
            {
                DotNetEnv.Env.TraversePath().Load();
            }
            catch { }

            var host = CreateHostBuilder(args).Build();
            await host.RunAsync();
        }

        public static IHostBuilder CreateHostBuilder(string[] args) =>
            Host.CreateDefaultBuilder(args)
                .ConfigureAppConfiguration((hostingContext, config) =>
                {
                    config.AddJsonFile("appsettings.json", optional: true, reloadOnChange: true);
                    config.AddJsonFile($"appsettings.{hostingContext.HostingEnvironment.EnvironmentName}.json", optional: true);
                    config.AddEnvironmentVariables();
                })
                .UseSerilog((context, services, configuration) =>
                {
                    configuration
                        .ReadFrom.Configuration(context.Configuration)
                        .ReadFrom.Services(services)
                        .Enrich.FromLogContext()
                        .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}");
                })
                .ConfigureServices((hostContext, services) =>
                {
                    var configuration = hostContext.Configuration;

                    var masterConnStr = configuration["TenantConfiguration:ConnectionString"]
                        ?? configuration.GetConnectionString("MasterCatalogConnection")
                        ?? configuration.GetConnectionString("DefaultConnection")
                        ?? throw new InvalidOperationException(
                            "CRITICAL CONFIGURATION ERROR: Master database connection string is not configured. " +
                            "Please specify 'TenantConfiguration:ConnectionString' or 'ConnectionStrings:DefaultConnection' in your .env file, appsettings.json, or environment variables.");

                    services.AddDataProtection();

                    services.AddDbContext<MasterCatalogDbContext>(options =>
                    {
                        options.UseSqlServer(masterConnStr, sqlOptions =>
                        {
                            sqlOptions.MigrationsAssembly(typeof(MasterCatalogDbContext).Assembly.FullName);
                            sqlOptions.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(30), errorNumbersToAdd: null);
                        })
                        .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
                    });

                    services.AddIdentityCore<CentralUser>(options =>
                    {
                        options.User.RequireUniqueEmail = true;
                    })
                    .AddRoles<CentralRole>()
                    .AddEntityFrameworkStores<MasterCatalogDbContext>()
                    .AddDefaultTokenProviders();

                    services.AddHostedService<MasterDbMigratorHostedService>();
                });
    }
}
