using System.Reflection;
using Ozikol_BCC.Infrastructure.Extensions;
using Ozikol_BCC.Infrastructure.TenantSupport;
using Ozikol_BCC.Persistence.EF.DbMigrator;
using Ozikol_BCC.Persistence.EF.SQL;
using Ozikol_BCC.Persistence.EF.SQL.Extensions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

// 1. Explicitly load .env from Api project or output directory
var baseDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location) ?? AppContext.BaseDirectory;
var apiEnvPath = Path.Combine(baseDir, ".env");
if (!File.Exists(apiEnvPath))
{
    var solutionDir = Directory.GetParent(baseDir)?.Parent?.Parent?.Parent?.FullName;
    if (!string.IsNullOrEmpty(solutionDir))
    {
        apiEnvPath = Path.Combine(solutionDir, "src", "Ozikol-BCC.Api", ".env");
    }
}

if (File.Exists(apiEnvPath))
{
    DotNetEnv.Env.Load(apiEnvPath);
}
else
{
    DotNetEnv.Env.TraversePath().Load();
}

// 2. Build host using Primary Api AppSettings and Environment variables
IHost host = Host.CreateDefaultBuilder(args)
    .ConfigureAppConfiguration((hostingContext, configBuilder) =>
    {
        configBuilder.SetBasePath(baseDir);
        configBuilder.AddJsonFile("appsettings.json", optional: true, reloadOnChange: true);
        configBuilder.AddJsonFile($"appsettings.{hostingContext.HostingEnvironment.EnvironmentName}.json", optional: true, reloadOnChange: true);
        configBuilder.AddEnvironmentVariables();
    })
    .ConfigureServices((hostContext, services) =>
    {
        services.AddATenantSupport(hostContext.Configuration);
        
        var masterConnStr = hostContext.Configuration["TenantConfiguration:ConnectionString"] 
            ?? hostContext.Configuration.GetConnectionString("DefaultConnection") 
            ?? "Server=JSS\\SQLEXPRESS;Database=Ozikol_MasterCatalogDb;Integrated Security=true;TrustServerCertificate=True;";

        services.AddDbContext<MasterCatalogDbContext>(options =>
            options.UseSqlServer(masterConnStr));

        services.AddMemoryCache();
        services.AddEntityFrameworkSqlServer<DashboardDbContext>();
        services.AddHostedService<DbMigratorHostedService>();
    })
    .Build();

await host.RunAsync();
