using System;
using System.IO;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Ozikol.MasterPersistence.EF.MasterSQL;

/// <summary>
/// Design-time factory for EF Core migrations targeting MasterCatalogDbContext.
/// Allows Package Manager Console (PMC) and `dotnet ef` CLI to run migrations
/// reliably from Visual Studio and command-line tools.
/// </summary>
public class MasterMigrationsDbContextFactory : IDesignTimeDbContextFactory<MasterCatalogDbContext>
{
    public MasterCatalogDbContext CreateDbContext(string[] args)
    {
        var connectionString = ResolveMasterConnectionString();

        var builder = new DbContextOptionsBuilder<MasterCatalogDbContext>();
        builder.UseSqlServer(connectionString, sqlOptions =>
        {
            sqlOptions.MigrationsAssembly(typeof(MasterCatalogDbContext).Assembly.FullName);
        })
        .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));

        return new MasterCatalogDbContext(builder.Options);
    }

    private static string ResolveMasterConnectionString()
    {
        var root = FindRepositoryRoot();
        LoadEnvFile(Path.Combine(root, ".env"));
        LoadEnvFile(Path.Combine(root, "src", "Ozikol.Central", ".env"));

        var fromEnv = Environment.GetEnvironmentVariable("TenantConfiguration__ConnectionString")
            ?? Environment.GetEnvironmentVariable("ConnectionStrings__MasterCatalogConnection")
            ?? Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");

        if (!string.IsNullOrWhiteSpace(fromEnv))
        {
            return fromEnv;
        }

        throw new InvalidOperationException(
            "Design-time Master Catalog database connection string not found. " +
            "Please ensure 'TenantConfiguration__ConnectionString' or 'ConnectionStrings__MasterCatalogConnection' is set in your .env file or environment variables.");
    }

    private static string FindRepositoryRoot()
    {
        var directory = new DirectoryInfo(Directory.GetCurrentDirectory());

        while (directory != null)
        {
            if (File.Exists(Path.Combine(directory.FullName, "Ozikol-BCC.sln")))
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
}
