using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Application.Common.Errors;

namespace Ozikol.Central.Areas.Centralwks.Pages.ErrorLogs;

/// <summary>
/// Summary row representing a single Tenant's error telemetry in the "By Tenant" view.
/// </summary>
public sealed class TenantErrorSummaryItem
{
    /// <summary>Gets or sets the tenant catalog ID.</summary>
    public Guid TenantId { get; set; }

    /// <summary>Gets or sets the tenant organization name.</summary>
    public string OrganizationName { get; set; } = string.Empty;

    /// <summary>Gets or sets the tenant workspace key.</summary>
    public string TenantKey { get; set; } = string.Empty;

    /// <summary>Gets or sets the primary domain of the tenant.</summary>
    public string? PrimaryDomain { get; set; }

    /// <summary>Gets or sets the total number of recorded errors for this tenant.</summary>
    public int TotalErrorsCount { get; set; }

    /// <summary>Gets or sets the number of errors in the last 24 hours for this tenant.</summary>
    public int Last24HoursCount { get; set; }

    /// <summary>Gets or sets the most recent error code recorded for this tenant.</summary>
    public string? LatestErrorCode { get; set; }

    /// <summary>Gets or sets the most recent custom error message shown to the tenant.</summary>
    public string? LatestCustomError { get; set; }

    /// <summary>Gets or sets the most recent real error message recorded internally.</summary>
    public string? LatestRealError { get; set; }

    /// <summary>Gets or sets the UTC timestamp of the latest error for this tenant.</summary>
    public DateTime? LatestErrorUtc { get; set; }
}

/// <summary>
/// Central Administration PageModel for inspecting API Error Logs ("ERR-XXXX"), Custom Errors (client-facing),
/// and Real Errors (internal gateway/exception causes).
/// Supports three primary views: "by-tenant", "by-central", and "all-tenants", plus the Standard Error Catalog.
/// </summary>
public class IndexModel : PageModel
{
    private readonly MasterCatalogDbContext _context;
    private readonly ILogger<IndexModel> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="IndexModel"/> class.
    /// </summary>
    /// <param name="context">Master catalog database context.</param>
    /// <param name="logger">Diagnostic logger.</param>
    public IndexModel(MasterCatalogDbContext context, ILogger<IndexModel> logger)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Gets or sets the active tab view ("by-tenant", "by-central", "all-tenants", or "catalog").
    /// </summary>
    [BindProperty(SupportsGet = true)]
    public string ViewMode { get; set; } = "by-tenant";

    /// <summary>
    /// Gets or sets the selected Tenant ID when drilling down into a single tenant's error logs.
    /// </summary>
    [BindProperty(SupportsGet = true)]
    public Guid? TenantId { get; set; }

    /// <summary>
    /// Gets or sets the selected Error Code filter (e.g., "ERR-3001").
    /// </summary>
    [BindProperty(SupportsGet = true)]
    public string? CodeFilter { get; set; }

    /// <summary>
    /// Gets or sets the search query across CustomError, RealError, Endpoint, UserEmail, and TraceId.
    /// </summary>
    [BindProperty(SupportsGet = true)]
    public string? Search { get; set; }

    /// <summary>
    /// Gets or sets the per-tenant error summary rows for the "By Tenant" tab.
    /// </summary>
    public List<TenantErrorSummaryItem> TenantSummaries { get; set; } = new();

    /// <summary>
    /// Gets or sets the currently selected tenant entity when drilling down in "By Tenant".
    /// </summary>
    public MasterTenantCatalog? SelectedTenant { get; set; }

    /// <summary>
    /// Gets or sets the error logs for the selected tenant in "By Tenant" drill-down mode.
    /// </summary>
    public List<MasterApiErrorLog> SelectedTenantLogs { get; set; } = new();

    /// <summary>
    /// Gets or sets the Central/Platform-scoped error logs for the "By Central" tab.
    /// </summary>
    public List<MasterApiErrorLog> CentralErrorLogs { get; set; } = new();

    /// <summary>
    /// Gets or sets the chronological list of all tenant error logs for the "All Tenant List" tab.
    /// </summary>
    public List<MasterApiErrorLog> AllTenantErrorLogs { get; set; } = new();

    /// <summary>
    /// Gets or sets the complete catalog of standard error definitions ("ERR-1000" – "ERR-9999").
    /// </summary>
    public IReadOnlyList<StandardErrorDefinition> ErrorCatalog { get; set; } = StandardErrorCodes.GetAll();

    /// <summary>Gets or sets the total count of all tenant errors.</summary>
    public int TotalTenantErrorsCount { get; set; }

    /// <summary>Gets or sets the total count of Central-only errors.</summary>
    public int TotalCentralErrorsCount { get; set; }

    /// <summary>Gets or sets the count of tenants that have at least one recorded error.</summary>
    public int AffectedTenantsCount { get; set; }

    /// <summary>Gets or sets the count of errors recorded in the last 24 hours.</summary>
    public int Last24HoursTotalCount { get; set; }

    /// <summary>
    /// Loads the error telemetry dashboard across By Tenant, By Central, and All Tenant List views.
    /// </summary>
    public async Task OnGetAsync()
    {
        var normalizedView = (ViewMode ?? "by-tenant").Trim().ToLowerInvariant();
        if (normalizedView != "by-tenant" && normalizedView != "by-central" && normalizedView != "all-tenants" && normalizedView != "catalog")
        {
            normalizedView = "by-tenant";
        }
        ViewMode = normalizedView;

        try
        {
            var tenants = await _context.MasterTenantCatalogs
                .AsNoTracking()
                .Where(t => !t.IsDeleted)
                .OrderBy(t => t.OrganizationName)
                .ToListAsync();

            var allLogsQuery = _context.MasterApiErrorLogs.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(CodeFilter))
            {
                var cf = CodeFilter.Trim();
                allLogsQuery = allLogsQuery.Where(e => e.ErrorCode == cf);
            }

            if (!string.IsNullOrWhiteSpace(Search))
            {
                var sq = Search.Trim().ToLower();
                allLogsQuery = allLogsQuery.Where(e =>
                    e.ErrorCode.ToLower().Contains(sq) ||
                    e.CustomError.ToLower().Contains(sq) ||
                    e.RealError.ToLower().Contains(sq) ||
                    e.Endpoint.ToLower().Contains(sq) ||
                    (e.TenantKey != null && e.TenantKey.ToLower().Contains(sq)) ||
                    (e.OrganizationName != null && e.OrganizationName.ToLower().Contains(sq)) ||
                    (e.UserEmail != null && e.UserEmail.ToLower().Contains(sq)) ||
                    (e.TraceId != null && e.TraceId.ToLower().Contains(sq)));
            }

            var recentLogs = await allLogsQuery
                .OrderByDescending(e => e.CreatedUtc)
                .Take(1000)
                .ToListAsync();

            var cutoff24h = DateTime.UtcNow.AddHours(-24);
            var tenantLogs = recentLogs.Where(e => e.SourceScope == "Tenant" || e.MasterTenantCatalogId != null || !string.IsNullOrWhiteSpace(e.TenantKey)).ToList();
            var centralLogs = recentLogs.Where(e => e.SourceScope == "Central" && e.MasterTenantCatalogId == null && string.IsNullOrWhiteSpace(e.TenantKey)).ToList();

            TotalTenantErrorsCount = tenantLogs.Count;
            TotalCentralErrorsCount = centralLogs.Count;
            Last24HoursTotalCount = recentLogs.Count(e => e.CreatedUtc >= cutoff24h);

            // Build By-Tenant Summary
            var logsByTenantId = tenantLogs
                .Where(e => e.MasterTenantCatalogId.HasValue)
                .GroupBy(e => e.MasterTenantCatalogId!.Value)
                .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.CreatedUtc).ToList());

            foreach (var t in tenants)
            {
                logsByTenantId.TryGetValue(t.Id, out var tLogs);
                tLogs ??= new List<MasterApiErrorLog>();
                var latest = tLogs.FirstOrDefault();

                TenantSummaries.Add(new TenantErrorSummaryItem
                {
                    TenantId = t.Id,
                    OrganizationName = t.OrganizationName,
                    TenantKey = t.TenantKey,
                    PrimaryDomain = t.PrimaryDomain,
                    TotalErrorsCount = tLogs.Count,
                    Last24HoursCount = tLogs.Count(x => x.CreatedUtc >= cutoff24h),
                    LatestErrorCode = latest?.ErrorCode,
                    LatestCustomError = latest?.CustomError,
                    LatestRealError = latest?.RealError,
                    LatestErrorUtc = latest?.CreatedUtc
                });
            }

            TenantSummaries = TenantSummaries
                .OrderByDescending(x => x.TotalErrorsCount)
                .ThenBy(x => x.OrganizationName)
                .ToList();

            AffectedTenantsCount = TenantSummaries.Count(x => x.TotalErrorsCount > 0);

            if (TenantId.HasValue)
            {
                SelectedTenant = tenants.FirstOrDefault(t => t.Id == TenantId.Value);
                SelectedTenantLogs = tenantLogs
                    .Where(e => e.MasterTenantCatalogId == TenantId.Value ||
                                (SelectedTenant != null && string.Equals(e.TenantKey, SelectedTenant.TenantKey, StringComparison.OrdinalIgnoreCase)))
                    .OrderByDescending(e => e.CreatedUtc)
                    .Take(300)
                    .ToList();
            }

            CentralErrorLogs = centralLogs.Take(300).ToList();
            AllTenantErrorLogs = tenantLogs.Take(400).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "MasterApiErrorLogs table may not be migrated yet or failed to query.");
        }
    }

    /// <summary>
    /// Deletes a single API error log record.
    /// </summary>
    public async Task<IActionResult> OnPostDeleteLogAsync(Guid id, string? viewMode, Guid? tenantId)
    {
        try
        {
            var entry = await _context.MasterApiErrorLogs.FirstOrDefaultAsync(e => e.Id == id);
            if (entry != null)
            {
                _context.MasterApiErrorLogs.Remove(entry);
                await _context.SaveChangesAsync();
                TempData["SuccessMessage"] = $"Removed error log entry ({entry.ErrorCode}).";
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to delete error log entry {Id}.", id);
        }

        return RedirectToPage(new { ViewMode = viewMode ?? "by-tenant", TenantId = tenantId });
    }

    /// <summary>
    /// Clears error logs for a specific tenant or scope.
    /// </summary>
    public async Task<IActionResult> OnPostClearScopeAsync(string scope, Guid? tenantId, string? viewMode)
    {
        try
        {
            if (tenantId.HasValue)
            {
                var rows = await _context.MasterApiErrorLogs
                    .Where(e => e.MasterTenantCatalogId == tenantId.Value)
                    .ToListAsync();
                _context.MasterApiErrorLogs.RemoveRange(rows);
                await _context.SaveChangesAsync();
                TempData["SuccessMessage"] = $"Cleared {rows.Count} error logs for the selected tenant.";
            }
            else if (string.Equals(scope, "Central", StringComparison.OrdinalIgnoreCase))
            {
                var rows = await _context.MasterApiErrorLogs
                    .Where(e => e.SourceScope == "Central" && e.MasterTenantCatalogId == null)
                    .ToListAsync();
                _context.MasterApiErrorLogs.RemoveRange(rows);
                await _context.SaveChangesAsync();
                TempData["SuccessMessage"] = $"Cleared {rows.Count} Central error logs.";
            }
            else if (string.Equals(scope, "AllTenants", StringComparison.OrdinalIgnoreCase))
            {
                var rows = await _context.MasterApiErrorLogs
                    .Where(e => e.SourceScope == "Tenant" || e.MasterTenantCatalogId != null)
                    .ToListAsync();
                _context.MasterApiErrorLogs.RemoveRange(rows);
                await _context.SaveChangesAsync();
                TempData["SuccessMessage"] = $"Cleared {rows.Count} tenant error logs.";
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to clear error logs for scope {Scope}.", scope);
        }

        return RedirectToPage(new { ViewMode = viewMode ?? "by-tenant", TenantId = tenantId });
    }
}

