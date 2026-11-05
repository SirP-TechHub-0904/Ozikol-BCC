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
        // 1. Check if an explicit connection string was passed via CLI args (e.g. --connection "<conn>")
        string? connectionString = null;
        for (int i = 0; i < args.Length; i++)
        {
            if ((args[i].Equals("--connection", StringComparison.OrdinalIgnoreCase) ||
                 args[i].Equals("-c", StringComparison.OrdinalIgnoreCase)) && i + 1 < args.Length)
            {
                connectionString = args[i + 1];
                break;
            }
        }

        connectionString ??= ResolveMasterConnectionString();

        var builder = new DbContextOptionsBuilder<MasterCatalogDbContext>();
        builder.UseSqlServer(connectionString, sqlOptions =>
        {
            sqlOptions.MigrationsAssembly(typeof(MasterCatalogDbContext).Assembly.FullName);
            sqlOptions.EnableRetryOnFailure(
                maxRetryCount: 5,
                maxRetryDelay: TimeSpan.FromSeconds(30),
                errorNumbersToAdd: null);
        })
        .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));

        return new MasterCatalogDbContext(builder.Options);
    }

    private static string ResolveMasterConnectionString()
    {
        var root = FindRepositoryRoot();
        LoadEnvFile(Path.Combine(root, ".env"));
        LoadEnvFile(Path.Combine(root, "src", "Ozikol.Central", ".env"));
        LoadEnvFile(Path.Combine(root, "src", "Ozikol-BCC.Api", ".env"));

        var fromEnv = Environment.GetEnvironmentVariable("TenantConfiguration:ConnectionString")
            ?? Environment.GetEnvironmentVariable("TenantConfiguration__ConnectionString")
            ?? Environment.GetEnvironmentVariable("ConnectionStrings:MasterCatalogConnection")
            ?? Environment.GetEnvironmentVariable("ConnectionStrings__MasterCatalogConnection")
            ?? Environment.GetEnvironmentVariable("ConnectionStrings:DefaultConnection")
            ?? Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");

        if (!string.IsNullOrWhiteSpace(fromEnv))
        {
            return fromEnv;
        }

        throw new InvalidOperationException(
            "Design-time Master Catalog database connection string not found. " +
            "Please ensure 'TenantConfiguration:ConnectionString' or 'TenantConfiguration__ConnectionString' is set in your .env file or environment variables.");
    }

    private static string FindRepositoryRoot()
    {
        var candidates = new[]
        {
            Directory.GetCurrentDirectory(),
            AppContext.BaseDirectory,
            typeof(MasterMigrationsDbContextFactory).Assembly.Location
        };

        foreach (var candidate in candidates)
        {
            if (string.IsNullOrWhiteSpace(candidate))
            {
                continue;
            }

            var directory = new DirectoryInfo(candidate);
            while (directory != null)
            {
                if (File.Exists(Path.Combine(directory.FullName, "Ozikol-BCC.sln")) ||
                    Directory.Exists(Path.Combine(directory.FullName, "src", "Ozikol.Central")))
                {
                    return directory.FullName;
                }

                directory = directory.Parent;
            }
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

            Environment.SetEnvironmentVariable(key, value);

            // Also normalize colon and double-underscore equivalents for cross-compatibility
            if (key.Contains(':'))
            {
                Environment.SetEnvironmentVariable(key.Replace(":", "__"), value);
            }
            else if (key.Contains("__"))
            {
                Environment.SetEnvironmentVariable(key.Replace("__", ":"), value);
            }
        }
    }
}
