using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Ozikol_BCC.Persistence.EF.SQL.Infrastructure;
using System.Text.Json;

namespace Ozikol_BCC.Persistence.EF.SQL;

/// <summary>
/// Design-time DbContext factory used by EF migration commands.
/// Runtime tenant resolution is not available during design-time migration generation.
/// </summary>
public class MigrationsDbContextFactory : IDesignTimeDbContextFactory<DashboardDbContext>
{
    public DashboardDbContext CreateDbContext(string[] args)
    {
        var builder = new DbContextOptionsBuilder<DashboardDbContext>();
        var connectionString = ResolveDesignTimeConnectionString();

        // Use a stable migration tenant provider so EF can generate snapshots without a request scope.
        // Tenant migrations are still applied by the DbMigrator project; this is only the default
        // database used by EF tooling when creating migrations and snapshots.
        return new DashboardDbContext(builder.Options, new MigrationsTenantProvider(connectionString));
    }

    private static string ResolveDesignTimeConnectionString()
    {
        var root = FindRepositoryRoot();

        LoadEnvFile(Path.Combine(root, ".env"));
        LoadEnvFile(Path.Combine(root, "src", "Ozikol-BCC.Api", ".env"));
        LoadEnvFile(Path.Combine(root, "src", "Ozikol.Central", ".env"));

        var fromEnvironment = Environment.GetEnvironmentVariable("TenantConfiguration__ConnectionString")
            ?? Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");

        if (!string.IsNullOrWhiteSpace(fromEnvironment))
        {
            return fromEnvironment;
        }

        var fromAppSettings = ReadTenantConnectionString(Path.Combine(root, "src", "Ozikol-BCC.Api", "appsettings.json"));
        if (!string.IsNullOrWhiteSpace(fromAppSettings))
        {
            return fromAppSettings;
        }

        throw new InvalidOperationException(
            "Design-time Tenant database connection string not found. " +
            "Please ensure 'TenantConfiguration__ConnectionString' is set in your .env file or environment variables.");
    }

    private static string FindRepositoryRoot()
    {
        var directory = new DirectoryInfo(Directory.GetCurrentDirectory());

        while (directory != null)
        {
            if (File.Exists(Path.Combine(directory.FullName, ".env"))
                || File.Exists(Path.Combine(directory.FullName, "Ozikol-BCC.sln")))
            {
                return directory.FullName;
            }

            directory = directory.Parent;
        }

        return Directory.GetCurrentDirectory();
    }

    private static void LoadEnvFile(string path)
    {
        if (!File.Exists(path))
        {
            return;
        }

        foreach (var rawLine in File.ReadAllLines(path))
        {
            var line = rawLine.Trim();
            if (string.IsNullOrWhiteSpace(line) || line.StartsWith("#", StringComparison.Ordinal))
            {
                continue;
            }

            var separatorIndex = line.IndexOf('=');
            if (separatorIndex <= 0)
            {
                continue;
            }

            var key = line[..separatorIndex].Trim();
            var value = line[(separatorIndex + 1)..].Trim().Trim('"');

            if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(key)))
            {
                Environment.SetEnvironmentVariable(key, value);
            }
        }
    }

    private static string? ReadTenantConnectionString(string appSettingsPath)
    {
        if (!File.Exists(appSettingsPath))
        {
            return null;
        }

        using var stream = File.OpenRead(appSettingsPath);
        using var document = JsonDocument.Parse(stream);

        if (document.RootElement.TryGetProperty("TenantConfiguration", out var tenantConfiguration)
            && tenantConfiguration.TryGetProperty("ConnectionString", out var connectionStringElement))
        {
            return connectionStringElement.GetString();
        }

        return null;
    }
}
