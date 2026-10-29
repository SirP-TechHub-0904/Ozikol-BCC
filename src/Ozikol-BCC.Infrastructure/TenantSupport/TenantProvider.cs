using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Ozikol_BCC.Infrastructure.TenantSupport;

/// <summary>
/// Cached tenant model stored in fast in-memory cache to eliminate repeated Master DB queries.
/// </summary>
public class CachedTenantEntry
{
    public Guid Id { get; set; }
    public string TenantKey { get; set; } = string.Empty;
    public string OrganizationName { get; set; } = string.Empty;
    public string PrimaryDomain { get; set; } = string.Empty;
    public string? CustomDomain { get; set; }
    public string? ApiUrl { get; set; }
    public string? WebsiteUrl { get; set; }
    public string DatabaseName { get; set; } = string.Empty;
    public string ConnectionString { get; set; } = string.Empty;
    public string? AdminEmail { get; set; }
    public bool IsActive { get; set; }
}

/// <summary>
/// Runtime tenant resolver. Resolves connection strings dynamically using fast IMemoryCache (< 0.1ms)
/// backed by the central Master Catalog Database, matching against TenantKey, PrimaryDomain, or CustomDomain.
/// </summary>
public class TenantProvider : ITenantProvider
{
    public const string DefaultSchemaName = "dbo";
    private const string CacheKey = "master_catalog_all_tenants_cache";
    private readonly string _defaultConnectionString;
    private readonly Dictionary<string, string> _staticTenantConnections;
    private readonly IMemoryCache? _memoryCache;
    private readonly IServiceScopeFactory? _scopeFactory;

    public string? CurrentTenant => TenantContext.CurrentTenant;

    public string ConnectionString
    {
        get
        {
            // 1. Direct connection string override (e.g. during integration tests or direct migrations)
            if (!string.IsNullOrWhiteSpace(CurrentTenant) && (CurrentTenant.Contains("Server=", StringComparison.OrdinalIgnoreCase) || CurrentTenant.Contains("Data Source=", StringComparison.OrdinalIgnoreCase)))
            {
                return CurrentTenant;
            }

            // 2. Fetch all tenants from in-memory cache
            var tenants = GetAllCachedTenants();

            // 3. Match against CurrentTenant if a scope is active
            if (!string.IsNullOrWhiteSpace(CurrentTenant))
            {
                var match = FindMatchingTenant(tenants, CurrentTenant);

                // On cache miss, attempt a single live refresh from Master DB (e.g. brand-new tenant onboarding)
                if (match == null)
                {
                    tenants = RefreshCachedTenants();
                    match = FindMatchingTenant(tenants, CurrentTenant);
                }

                if (match != null && !string.IsNullOrEmpty(match.ConnectionString))
                {
                    TouchTenantLastAccessed(match.Id, match.TenantKey);
                    return ResolveActiveTenantConnectionString(match.ConnectionString);
                }

                // Fallback to static config if explicitly configured for this name
                if (_staticTenantConnections.TryGetValue(CurrentTenant, out var staticConn) && !string.IsNullOrEmpty(staticConn))
                {
                    return staticConn;
                }

                // Strict multi-tenant security: Never connect to another tenant's database when an active tenant is requested but missing
                throw new InvalidOperationException($"[TenantResolution] No active tenant matching '{CurrentTenant}' could be resolved in the Master Catalog. Connection to an unauthorized fallback database is strictly forbidden.");
            }

            // 4. Default host connection string when NO tenant scope is active (e.g. system/background jobs)
            if (_staticTenantConnections.Values.Any())
            {
                return _staticTenantConnections.Values.First();
            }

            if (!string.IsNullOrEmpty(_defaultConnectionString))
            {
                return _defaultConnectionString;
            }

            throw new InvalidOperationException("[TenantResolution] No active tenant scope is set, and no default connection string is configured.");
        }
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="TenantProvider"/> class.
    /// </summary>
    /// <param name="tenantConfigurationOptions">Static tenant options from configuration.</param>
    /// <param name="serviceProvider">Dependency injection service provider.</param>
    public TenantProvider(
        IOptions<TenantConfigurationOptions> tenantConfigurationOptions,
        IServiceProvider serviceProvider)
    {
        _defaultConnectionString = tenantConfigurationOptions.Value.ConnectionString ?? string.Empty;
        _staticTenantConnections = tenantConfigurationOptions.Value.Tenants
            .Where(t => !string.IsNullOrWhiteSpace(t.ConnectionString))
            .ToDictionary(ks => ks.Name, vs => vs.ConnectionString!, StringComparer.OrdinalIgnoreCase);

        _memoryCache = serviceProvider.GetService<IMemoryCache>();
        _scopeFactory = serviceProvider.GetService<IServiceScopeFactory>();
    }

    /// <summary>
    /// Retrieves all active tenant entries from fast in-memory cache, or loads from Master Catalog DB if expired.
    /// </summary>
    /// <returns>A list of cached tenant entries.</returns>
    public List<CachedTenantEntry> GetAllCachedTenants()
    {
        if (_memoryCache != null && _memoryCache.TryGetValue<List<CachedTenantEntry>>(CacheKey, out var cachedList) && cachedList != null)
        {
            return cachedList;
        }

        return RefreshCachedTenants();
    }

    /// <summary>
    /// Actively refreshes the in-memory cache of tenants by reading directly from MasterCatalogDbContext.
    /// Invoked automatically on cache miss when a new tenant was recently registered.
    /// </summary>
    /// <returns>The freshly loaded list of active cached tenants.</returns>
    public List<CachedTenantEntry> RefreshCachedTenants()
    {
        var loaded = LoadTenantsFromMasterDb();
        if (loaded.Count > 0 && _memoryCache != null)
        {
            _memoryCache.Set(CacheKey, loaded, new MemoryCacheEntryOptions
            {
                Size = 1,
                AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1)
            });
        }

        return loaded;
    }

    /// <summary>
    /// Performs subdomain-first, port-agnostic matching against cached tenants.
    /// Handles subdomain extraction ('cocacola.localhost:4200' -> 'cocacola'),
    /// primary domains, and custom domains.
    /// </summary>
    /// <param name="tenants">The candidate list of cached tenants.</param>
    /// <param name="searchKey">The search key, origin, hostname, or tenant identifier.</param>
    /// <returns>The matching <see cref="CachedTenantEntry"/>, or null if not found.</returns>
    public static CachedTenantEntry? FindMatchingTenant(IEnumerable<CachedTenantEntry> tenants, string? searchKey)
    {
        if (string.IsNullOrWhiteSpace(searchKey)) return null;

        var clean = searchKey.Trim().ToLowerInvariant()
            .Replace("https://", "")
            .Replace("http://", "")
            .Replace("www.", "")
            .Split('/')[0];

        // Strip port (e.g. 'cocacola.localhost:4200' -> 'cocacola.localhost')
        var hostWithoutPort = clean.Split(':')[0];

        // Extract subdomain if present
        string? subdomain = null;
        if (hostWithoutPort.Contains('.'))
        {
            var parts = hostWithoutPort.Split('.');
            if (parts.Length >= 2)
            {
                var candidate = parts[0];
                if (!candidate.Equals("localhost", StringComparison.OrdinalIgnoreCase) &&
                    !candidate.Equals("127", StringComparison.OrdinalIgnoreCase) &&
                    !candidate.Equals("www", StringComparison.OrdinalIgnoreCase) &&
                    !candidate.Equals("api", StringComparison.OrdinalIgnoreCase) &&
                    !candidate.Equals("admin", StringComparison.OrdinalIgnoreCase) &&
                    !candidate.Equals("central", StringComparison.OrdinalIgnoreCase))
                {
                    subdomain = candidate;
                }
            }
        }

        // 1. Direct TenantKey match (e.g., 'cocacola')
        var match = tenants.FirstOrDefault(t => t.IsActive && (
            t.TenantKey.Equals(clean, StringComparison.OrdinalIgnoreCase) ||
            t.TenantKey.Equals(hostWithoutPort, StringComparison.OrdinalIgnoreCase) ||
            (!string.IsNullOrEmpty(subdomain) && t.TenantKey.Equals(subdomain, StringComparison.OrdinalIgnoreCase))
        ));
        if (match != null) return match;

        // 2. PrimaryDomain match (port-agnostic, e.g. 'cocacola.localhost:4200' vs 'cocacola.localhost')
        match = tenants.FirstOrDefault(t => t.IsActive && (
            t.PrimaryDomain.Equals(clean, StringComparison.OrdinalIgnoreCase) ||
            t.PrimaryDomain.Split(':')[0].Equals(hostWithoutPort, StringComparison.OrdinalIgnoreCase) ||
            (!string.IsNullOrEmpty(subdomain) && t.PrimaryDomain.Split(':')[0].StartsWith(subdomain + ".", StringComparison.OrdinalIgnoreCase))
        ));
        if (match != null) return match;

        // 3. CustomDomain match (port-agnostic, e.g. 'portal.cocacola.com')
        match = tenants.FirstOrDefault(t => t.IsActive && !string.IsNullOrEmpty(t.CustomDomain) && (
            t.CustomDomain.Equals(clean, StringComparison.OrdinalIgnoreCase) ||
            t.CustomDomain.Split(':')[0].Equals(hostWithoutPort, StringComparison.OrdinalIgnoreCase)
        ));
        if (match != null) return match;

        // 4. Fallback URL substrings
        match = tenants.FirstOrDefault(t => t.IsActive && (
            (!string.IsNullOrEmpty(t.WebsiteUrl) && t.WebsiteUrl.ToLowerInvariant().Contains(hostWithoutPort)) ||
            (!string.IsNullOrEmpty(t.ApiUrl) && t.ApiUrl.ToLowerInvariant().Contains(hostWithoutPort))
        ));

        return match;
    }

    /// <summary>
    /// Updates <c>LastAccessedUtc</c> on the resolved tenant record in the Master Catalog Database in the background,
    /// throttled via in-memory cache to once every 2 minutes per tenant to ensure zero request latency.
    /// </summary>
    private void TouchTenantLastAccessed(Guid tenantId, string tenantKey)
    {
        if (tenantId == Guid.Empty || _scopeFactory == null) return;

        var throttleKey = $"tenant_last_accessed_touch_{tenantId}";
        if (_memoryCache != null && _memoryCache.TryGetValue(throttleKey, out _))
        {
            return;
        }

        _memoryCache?.Set(throttleKey, true, new MemoryCacheEntryOptions
        {
            Size = 1,
            AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(2)
        });

        _ = Task.Run(() =>
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var dbContextType = AppDomain.CurrentDomain.GetAssemblies()
                    .SelectMany(a => a.GetTypes())
                    .FirstOrDefault(t => t.Name == "MasterCatalogDbContext");

                if (dbContextType == null) return;
                var masterDbContext = scope.ServiceProvider.GetService(dbContextType);
                if (masterDbContext == null) return;

                var tenantsProperty = dbContextType.GetProperty("MasterTenantCatalogs");
                if (tenantsProperty?.GetValue(masterDbContext) is IQueryable<object> queryable)
                {
                    foreach (dynamic item in queryable)
                    {
                        object? rawId = item.Id;
                        Guid itemId = rawId is Guid gid ? gid : Guid.Empty;
                        if (itemId == tenantId || string.Equals((string)item.TenantKey, tenantKey, StringComparison.OrdinalIgnoreCase))
                        {
                            item.LastAccessedUtc = DateTime.UtcNow;
                            var saveMethod = dbContextType.GetMethod("SaveChanges", Type.EmptyTypes);
                            saveMethod?.Invoke(masterDbContext, null);
                            break;
                        }
                    }
                }
            }
            catch
            {
                // Non-blocking background telemetry touch
            }
        });
    }

    private List<CachedTenantEntry> LoadTenantsFromMasterDb()
    {
        var result = new List<CachedTenantEntry>();
        if (_scopeFactory == null) return result;

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var dbContextType = AppDomain.CurrentDomain.GetAssemblies()
                .SelectMany(a => a.GetTypes())
                .FirstOrDefault(t => t.Name == "MasterCatalogDbContext");

            if (dbContextType != null)
            {
                var masterDbContext = scope.ServiceProvider.GetService(dbContextType);
                if (masterDbContext != null)
                {
                    var tenantsProperty = dbContextType.GetProperty("MasterTenantCatalogs");
                    if (tenantsProperty != null)
                    {
                        var queryable = tenantsProperty.GetValue(masterDbContext) as IQueryable<object>;
                        if (queryable != null)
                        {
                            foreach (dynamic item in queryable)
                            {
                                object? rawId = item.Id;
                                Guid resolvedId = rawId is Guid gid ? gid : (rawId != null && Guid.TryParse(rawId.ToString(), out Guid parsedGid) ? parsedGid : Guid.Empty);

                                result.Add(new CachedTenantEntry
                                {
                                    Id = resolvedId,
                                    TenantKey = (string)item.TenantKey,
                                    OrganizationName = (string)item.OrganizationName,
                                    PrimaryDomain = (string)item.PrimaryDomain,
                                    CustomDomain = (string?)item.CustomDomain,
                                    ApiUrl = (string?)item.ApiUrl,
                                    WebsiteUrl = (string?)item.WebsiteUrl,
                                    DatabaseName = (string)item.DatabaseName,
                                    ConnectionString = (string)item.ConnectionString,
                                    AdminEmail = (string?)item.AdminEmail,
                                    IsActive = (bool)item.IsActive
                                });
                            }
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[TenantProvider] Error loading Master Catalog DB into cache: {ex.Message}");
        }

        return result;
    }

    /// <summary>
    /// Intelligently harmonizes a tenant database connection string with the active master database host.
    /// When developing locally against a remote master database (e.g. 187.7.24.129), tenant connection
    /// strings created with '127.0.0.1' or 'localhost' on the live server are dynamically redirected
    /// to the remote server host so local development seamlessly accesses the tenant's remote database.
    /// </summary>
    /// <param name="rawTenantConnectionString">The raw connection string stored in the Master Catalog.</param>
    /// <returns>The harmonized connection string.</returns>
    private string ResolveActiveTenantConnectionString(string rawTenantConnectionString)
    {
        if (string.IsNullOrWhiteSpace(rawTenantConnectionString) || string.IsNullOrWhiteSpace(_defaultConnectionString))
        {
            return rawTenantConnectionString;
        }

        try
        {
            var masterBuilder = new System.Data.Common.DbConnectionStringBuilder { ConnectionString = _defaultConnectionString };
            var tenantBuilder = new System.Data.Common.DbConnectionStringBuilder { ConnectionString = rawTenantConnectionString };

            string? masterServer = null;
            if (masterBuilder.TryGetValue("Server", out var srv) || masterBuilder.TryGetValue("Data Source", out srv))
            {
                masterServer = srv?.ToString()?.Trim();
            }

            string? tenantServer = null;
            if (tenantBuilder.TryGetValue("Server", out var tsrv) || tenantBuilder.TryGetValue("Data Source", out tsrv))
            {
                tenantServer = tsrv?.ToString()?.Trim();
            }

            // Check if Master connects to a remote server host
            var isMasterRemote = !string.IsNullOrWhiteSpace(masterServer) &&
                !masterServer.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase) &&
                !masterServer.Equals("localhost", StringComparison.OrdinalIgnoreCase) &&
                !masterServer.Equals(".", StringComparison.OrdinalIgnoreCase) &&
                !masterServer.StartsWith(".\\", StringComparison.OrdinalIgnoreCase);

            var isTenantLocal = string.IsNullOrWhiteSpace(tenantServer) ||
                tenantServer.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase) ||
                tenantServer.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
                tenantServer.Equals(".", StringComparison.OrdinalIgnoreCase) ||
                tenantServer.StartsWith(".\\", StringComparison.OrdinalIgnoreCase);

            if (isMasterRemote && isTenantLocal)
            {
                if (tenantBuilder.ContainsKey("Server"))
                {
                    tenantBuilder["Server"] = masterServer!;
                }
                else
                {
                    tenantBuilder["Data Source"] = masterServer!;
                }

                // If master has credentials and tenant lacks them, inherit master credentials
                if (masterBuilder.TryGetValue("User Id", out var masterUser) && !string.IsNullOrWhiteSpace(masterUser?.ToString()))
                {
                    tenantBuilder["User Id"] = masterUser;
                    if (masterBuilder.TryGetValue("Password", out var masterPass))
                    {
                        tenantBuilder["Password"] = masterPass;
                    }
                    if (tenantBuilder.ContainsKey("Integrated Security"))
                    {
                        tenantBuilder.Remove("Integrated Security");
                    }
                    if (tenantBuilder.ContainsKey("Trusted_Connection"))
                    {
                        tenantBuilder.Remove("Trusted_Connection");
                    }
                }

                if (masterBuilder.TryGetValue("TrustServerCertificate", out var trustCert))
                {
                    tenantBuilder["TrustServerCertificate"] = trustCert;
                }

                return tenantBuilder.ConnectionString;
            }
        }
        catch
        {
            // Fallback safely to raw tenant connection string on any parsing anomaly
        }

        return rawTenantConnectionString;
    }

    public IDisposable BeginScope(string tenant)
    {
        return TenantContext.BeginScope(tenant);
    }

    public override string? ToString()
    {
        return CurrentTenant;
    }
}
