using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Ozikol_BCC.Infrastructure.TenantSupport;

/// <summary>
/// Cached tenant model stored in fast in-memory cache to eliminate repeated Master DB queries.
/// </summary>
public class CachedTenantEntry
{
    public int Id { get; set; }
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
            // 1. Direct connection string override
            if (!string.IsNullOrWhiteSpace(CurrentTenant) && (CurrentTenant.Contains("Server=", StringComparison.OrdinalIgnoreCase) || CurrentTenant.Contains("Data Source=", StringComparison.OrdinalIgnoreCase)))
            {
                return CurrentTenant;
            }

            // 2. Fetch all tenants from in-memory cache (or load from Master DB if cache expired)
            var tenants = GetAllCachedTenants();

            // 3. Match against CurrentTenant if a scope is active
            if (!string.IsNullOrWhiteSpace(CurrentTenant))
            {
                var search = CurrentTenant.Trim().ToLowerInvariant();
                var match = tenants.FirstOrDefault(t => t.IsActive && (
                    t.TenantKey.Equals(search, StringComparison.OrdinalIgnoreCase) ||
                    t.PrimaryDomain.Equals(search, StringComparison.OrdinalIgnoreCase) ||
                    (!string.IsNullOrEmpty(t.CustomDomain) && t.CustomDomain.Equals(search, StringComparison.OrdinalIgnoreCase)) ||
                    (!string.IsNullOrEmpty(t.ApiUrl) && t.ApiUrl.ToLowerInvariant().Contains(search)) ||
                    (!string.IsNullOrEmpty(t.WebsiteUrl) && t.WebsiteUrl.ToLowerInvariant().Contains(search))
                ));

                if (match != null && !string.IsNullOrEmpty(match.ConnectionString))
                {
                    return match.ConnectionString;
                }

                // Fallback to static config
                if (_staticTenantConnections.TryGetValue(CurrentTenant, out var staticConn) && !string.IsNullOrEmpty(staticConn))
                {
                    return staticConn;
                }
            }

            // 4. Default Fallback: First active tenant from cache (prevents running tenant queries on Master DB)
            var firstActive = tenants.FirstOrDefault(t => t.IsActive && !string.IsNullOrEmpty(t.ConnectionString));
            if (firstActive != null)
            {
                return firstActive.ConnectionString;
            }

            if (_staticTenantConnections.Values.Any())
            {
                return _staticTenantConnections.Values.First();
            }

            return _defaultConnectionString;
        }
    }

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

    public List<CachedTenantEntry> GetAllCachedTenants()
    {
        if (_memoryCache != null && _memoryCache.TryGetValue<List<CachedTenantEntry>>(CacheKey, out var cachedList) && cachedList != null)
        {
            return cachedList;
        }

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
                                result.Add(new CachedTenantEntry
                                {
                                    Id = (int)item.Id,
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

    public IDisposable BeginScope(string tenant)
    {
        return TenantContext.BeginScope(tenant);
    }

    public override string? ToString()
    {
        return CurrentTenant;
    }
}
