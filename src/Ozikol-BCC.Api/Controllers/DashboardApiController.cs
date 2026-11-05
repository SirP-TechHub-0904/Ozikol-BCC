using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Persistence.EF.SQL;

namespace Ozikol_BCC.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "SuperAdmin,Admin,IdentityManager,Identity Manager,UserManager,User Manager,CmsManager,ContentManager,CommerceManager,GlobalEditor,Global Editor,FeatureEditor,Feature Editor,ReadOnly,Read Only")]
    [Tags("Admin Dashboard & Analytics")]
    public class DashboardApiController : ControllerBase
    {
        private readonly DashboardDbContext _context;
        private readonly MasterCatalogDbContext _masterCatalogDbContext;

        public DashboardApiController(DashboardDbContext context, MasterCatalogDbContext masterCatalogDbContext)
        {
            _context = context;
            _masterCatalogDbContext = masterCatalogDbContext;
        }

        public class DashboardMetricsDto
        {
            public string ResolvedDomain { get; set; } = string.Empty;
            public string ResolvedDatabase { get; set; } = string.Empty;
            public MasterTenantDetailsDto? MasterTenantInfo { get; set; }
            public int TotalMembers { get; set; }
            public int TotalActiveMembers { get; set; }
            public int TotalGroups { get; set; }
            public int TotalPublishedPages { get; set; }
            public int TotalSliders { get; set; }
            public int TotalFaqs { get; set; }
            public List<RecentUserDto> RecentUsers { get; set; } = new();
            public List<RecentActivityDto> RecentActivities { get; set; } = new();
        }

        public class MasterTenantDetailsDto
        {
            public Guid Id { get; set; }
            public string TenantKey { get; set; } = string.Empty;
            public string OrganizationName { get; set; } = string.Empty;
            public string PrimaryDomain { get; set; } = string.Empty;
            public string? CustomDomain { get; set; }
            public string? ApiUrl { get; set; }
            public string? WebsiteUrl { get; set; }
            public string DatabaseName { get; set; } = string.Empty;
            public string? AdminEmail { get; set; }
            public bool IsActive { get; set; }
            public DateTime CreatedUtc { get; set; }
        }

        public class RecentUserDto
        {
            public string Id { get; set; } = string.Empty;
            public string FullName { get; set; } = string.Empty;
            public string Email { get; set; } = string.Empty;
            public string? Category { get; set; }
            public string? AvatarUrl { get; set; }
            public DateTime? CreatedDate { get; set; }
        }

        public class RecentActivityDto
        {
            public string Action { get; set; } = string.Empty;
            public string User { get; set; } = string.Empty;
            public string Details { get; set; } = string.Empty;
            public DateTime Timestamp { get; set; }
        }

        [HttpGet("metrics")]
        [ProducesResponseType(typeof(ApiResponse<DashboardMetricsDto>), 200)]
        public async Task<IActionResult> GetMetrics()
        {
            var host = HttpContext.Request.Host.ToString();
            var tenantKeyHeader = HttpContext.Request.Headers["X-Tenant-Key"].ToString()?.Trim();
            var tenantDomainHeader = HttpContext.Request.Headers["X-Tenant-Domain"].ToString()?.Trim();
            var originHeader = HttpContext.Request.Headers["Origin"].ToString()?.Trim();
            var refererHeader = HttpContext.Request.Headers["Referer"].ToString()?.Trim();

            string? originHost = null;
            if (!string.IsNullOrWhiteSpace(originHeader) && Uri.TryCreate(originHeader, UriKind.Absolute, out var originUri))
            {
                originHost = originUri.Authority;
            }
            string? refererHost = null;
            if (!string.IsNullOrWhiteSpace(refererHeader) && Uri.TryCreate(refererHeader, UriKind.Absolute, out var refererUri))
            {
                refererHost = refererUri.Authority;
            }

            // Extract candidate tenant key from domain if possible (e.g. "cocacolanm.localhost:4200" -> "cocacolanm")
            string? hostSubdomain = null;
            var testHost = originHost ?? refererHost ?? tenantDomainHeader ?? host;
            if (!string.IsNullOrWhiteSpace(testHost))
            {
                var cleanHost = testHost.Split(':')[0];
                var parts = cleanHost.Split('.');
                if (parts.Length > 1 && !new[] { "localhost", "127", "www", "api", "central", "admin" }.Contains(parts[0].ToLowerInvariant()))
                {
                    hostSubdomain = parts[0].ToLowerInvariant();
                }
            }

            var candidateKey = !string.IsNullOrWhiteSpace(tenantKeyHeader) ? tenantKeyHeader : hostSubdomain;
            var dbName = _context.Database.GetDbConnection().Database ?? "TenantDatabase";

            // 1. Retrieve Complete Master Catalog Record
            var masterTenant = await _masterCatalogDbContext.MasterTenantCatalogs
                .FirstOrDefaultAsync(t => (!string.IsNullOrWhiteSpace(candidateKey) && t.TenantKey == candidateKey)
                                       || (!string.IsNullOrWhiteSpace(tenantDomainHeader) && (t.PrimaryDomain == tenantDomainHeader || t.CustomDomain == tenantDomainHeader))
                                       || (!string.IsNullOrWhiteSpace(originHost) && (t.PrimaryDomain == originHost || t.CustomDomain == originHost))
                                       || (!string.IsNullOrWhiteSpace(refererHost) && (t.PrimaryDomain == refererHost || t.CustomDomain == refererHost))
                                       || t.PrimaryDomain == host 
                                       || t.CustomDomain == host 
                                       || (t.ApiUrl != null && t.ApiUrl.Contains(host))
                                       || (t.WebsiteUrl != null && t.WebsiteUrl.Contains(host))
                                       || t.TenantKey == host)
                ?? await _masterCatalogDbContext.MasterTenantCatalogs.OrderBy(t => t.Id).FirstOrDefaultAsync();

            MasterTenantDetailsDto? tenantDetails = null;
            if (masterTenant != null)
            {
                if (!masterTenant.LastAccessedUtc.HasValue || (DateTime.UtcNow - masterTenant.LastAccessedUtc.Value).TotalMinutes >= 1)
                {
                    masterTenant.LastAccessedUtc = DateTime.UtcNow;
                    await _masterCatalogDbContext.SaveChangesAsync();
                }

                tenantDetails = new MasterTenantDetailsDto
                {
                    Id = masterTenant.Id,
                    TenantKey = masterTenant.TenantKey,
                    OrganizationName = masterTenant.OrganizationName,
                    PrimaryDomain = masterTenant.PrimaryDomain,
                    CustomDomain = masterTenant.CustomDomain,
                    ApiUrl = masterTenant.ApiUrl,
                    WebsiteUrl = masterTenant.WebsiteUrl,
                    DatabaseName = masterTenant.DatabaseName,
                    AdminEmail = masterTenant.AdminEmail,
                    IsActive = masterTenant.IsActive,
                    CreatedUtc = masterTenant.CreatedUtc
                };
            }

            var totalMembers = await _context.Users.CountAsync();
            var totalActiveMembers = await _context.Users.CountAsync(u => u.LockoutEnd == null || u.LockoutEnd <= DateTimeOffset.UtcNow);
            var totalGroups = await _context.BcpGroups.CountAsync();
            var totalPages = await _context.WebPages.CountAsync(p => p.Publish);
            var totalSliders = 0;
            var totalFaqs = 0;

            // Fetch table contents for logging
            var pageTitles = await _context.WebPages.Select(p => p.Title).ToListAsync();
            var categoryTitles = await _context.PageCategories.Select(c => c.Title).ToListAsync();

            // LOGGING TO CONSOLE
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine("========================================================================");
            Console.WriteLine($"[MASTER CATALOG DB - RESOLVED TENANT COMPLETE INFO]");
            if (masterTenant != null)
            {
                Console.WriteLine($"  ID              : {masterTenant.Id}");
                Console.WriteLine($"  Tenant Key      : {masterTenant.TenantKey}");
                Console.WriteLine($"  Organization    : {masterTenant.OrganizationName}");
                Console.WriteLine($"  Primary Domain  : {masterTenant.PrimaryDomain}");
                Console.WriteLine($"  Custom Domain   : {masterTenant.CustomDomain ?? "(None)"}");
                Console.WriteLine($"  API Gateway URL : {masterTenant.ApiUrl ?? "(Default)"}");
                Console.WriteLine($"  Website URL     : {masterTenant.WebsiteUrl ?? "(Default)"}");
                Console.WriteLine($"  Database Name   : {masterTenant.DatabaseName}");
                Console.WriteLine($"  Admin Email     : {masterTenant.AdminEmail ?? "(None)"}");
                Console.WriteLine($"  Active Status   : {(masterTenant.IsActive ? "ACTIVE" : "INACTIVE")}");
                Console.WriteLine($"  Registered UTC  : {masterTenant.CreatedUtc}");
            }
            else
            {
                Console.WriteLine($"  No matching tenant found in Master Catalog for domain '{host}'");
            }
            Console.WriteLine("------------------------------------------------------------------------");
            Console.WriteLine($"[TENANT DATABASE TABLE CONTENT RETRIEVED - {dbName}]:");
            Console.WriteLine($"  * WebPages ({pageTitles.Count}): [{string.Join(", ", pageTitles)}]");
            Console.WriteLine($"  * PageCategories ({categoryTitles.Count}): [{string.Join(", ", categoryTitles)}]");
            Console.WriteLine($"  * Groups / Channels ({totalGroups})");
            Console.WriteLine($"  * Members ({totalMembers}) | Active: ({totalActiveMembers})");
            Console.WriteLine("========================================================================");
            Console.ResetColor();

            var recentUsers = await _context.Users
                .Include(u => u.BcpUserCategory)
                .OrderByDescending(u => u.Id)
                .Take(5)
                .Select(u => new RecentUserDto
                {
                    Id = u.Id,
                    FullName = $"{u.FirstName} {u.LastName}".Trim(),
                    Email = u.Email ?? string.Empty,
                    Category = u.BcpUserCategory != null ? u.BcpUserCategory.Name : "Member",
                    AvatarUrl = null,
                    CreatedDate = DateTime.UtcNow
                })
                .ToListAsync();

            var recentAudits = await _context.BcpActivityLogs
                .OrderByDescending(l => l.Date)
                .Take(5)
                .Select(l => new RecentActivityDto
                {
                    Action = l.ActionType ?? "Action",
                    User = l.PerformedByFullName ?? l.PerformedByProfileId ?? "System",
                    Details = l.Description ?? string.Empty,
                    Timestamp = l.Date
                })
                .ToListAsync();

            var metrics = new DashboardMetricsDto
            {
                ResolvedDomain = host,
                ResolvedDatabase = dbName,
                MasterTenantInfo = tenantDetails,
                TotalMembers = totalMembers,
                TotalActiveMembers = totalActiveMembers,
                TotalGroups = totalGroups,
                TotalPublishedPages = totalPages,
                TotalSliders = totalSliders,
                TotalFaqs = totalFaqs,
                RecentUsers = recentUsers,
                RecentActivities = recentAudits
            };

            return Ok(ApiResponse<DashboardMetricsDto>.SuccessResponse(metrics, $"Complete Master DB info & table data retrieved for '{host}'."));
        }

        /// <summary>
        /// Request model for binding or updating tenant custom domain in Master Catalog.
        /// </summary>
        public class UpdateCustomDomainRequest
        {
            /// <summary>
            /// Unique tenant key identifier.
            /// </summary>
            public string? TenantKey { get; set; }

            /// <summary>
            /// Custom domain (e.g. "www.company.com" or empty/null to unbind).
            /// </summary>
            public string? CustomDomain { get; set; }
        }

        /// <summary>
        /// Updates, binds, or unlinks a custom domain for a tenant directly in the Master Catalog Database.
        /// </summary>
        /// <param name="request">Payload containing tenant key and desired custom domain.</param>
        /// <returns>Updated master tenant info response.</returns>
        [HttpPut("update-custom-domain")]
        [Authorize(Roles = "SuperAdmin,Admin,IdentityManager,Identity Manager,UserManager,User Manager,GlobalEditor,Global Editor,ReadOnly,Read Only")]
        public async Task<IActionResult> UpdateCustomDomain([FromBody] UpdateCustomDomainRequest request)
        {
            var host = HttpContext.Request.Host.ToString();
            var tenantKeyHeader = HttpContext.Request.Headers["X-Tenant-Key"].ToString()?.Trim();
            var candidateKey = !string.IsNullOrWhiteSpace(request.TenantKey) ? request.TenantKey.Trim() : tenantKeyHeader;

            // Retrieve Master Catalog tenant
            var masterTenant = await _masterCatalogDbContext.MasterTenantCatalogs
                .FirstOrDefaultAsync(t => (!string.IsNullOrWhiteSpace(candidateKey) && t.TenantKey == candidateKey)
                                       || t.PrimaryDomain == host 
                                       || t.CustomDomain == host);

            if (masterTenant == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Workspace could not be found."));
            }

            // Sanitize custom domain
            string? cleanDomain = null;
            if (!string.IsNullOrWhiteSpace(request.CustomDomain))
            {
                cleanDomain = request.CustomDomain.Trim().ToLowerInvariant()
                    .Replace("https://", string.Empty)
                    .Replace("http://", string.Empty)
                    .TrimEnd('/');
            }

            masterTenant.CustomDomain = cleanDomain;
            if (!string.IsNullOrWhiteSpace(cleanDomain))
            {
                masterTenant.WebsiteUrl = $"https://{cleanDomain}";
            }
            else
            {
                masterTenant.WebsiteUrl = !string.IsNullOrWhiteSpace(masterTenant.PrimaryDomain)
                    ? $"https://{masterTenant.PrimaryDomain}"
                    : null;
            }

            masterTenant.LastAccessedUtc = DateTime.UtcNow;
            await _masterCatalogDbContext.SaveChangesAsync();

            var tenantDetails = new MasterTenantDetailsDto
            {
                Id = masterTenant.Id,
                TenantKey = masterTenant.TenantKey,
                OrganizationName = masterTenant.OrganizationName,
                PrimaryDomain = masterTenant.PrimaryDomain,
                CustomDomain = masterTenant.CustomDomain,
                ApiUrl = masterTenant.ApiUrl,
                WebsiteUrl = masterTenant.WebsiteUrl,
                DatabaseName = masterTenant.DatabaseName,
                AdminEmail = masterTenant.AdminEmail,
                IsActive = masterTenant.IsActive,
                CreatedUtc = masterTenant.CreatedUtc
            };

            return Ok(ApiResponse<MasterTenantDetailsDto>.SuccessResponse(tenantDetails, "Custom domain updated successfully."));
        }
    }
}
