using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Ozikol.Central.Services;

namespace Ozikol.Central.Pages.Operations;

public class FleetModel : PageModel
{
    private readonly ICentralMigrationService _migrationService;
    private readonly ILogger<FleetModel> _logger;

    public MasterMigrationSummary MasterSummary { get; set; } = new();
    public List<TenantMigrationSummary> Tenants { get; set; } = new();
    public string? AlertMessage { get; set; }
    public bool AlertIsError { get; set; }

    public FleetModel(ICentralMigrationService migrationService, ILogger<FleetModel> logger)
    {
        _migrationService = migrationService;
        _logger = logger;
    }

    public async Task OnGetAsync()
    {
        await LoadDashboardDataAsync();
    }

    public async Task<IActionResult> OnPostMigrateMasterAsync()
    {
        var result = await _migrationService.MigrateMasterDatabaseAsync();
        AlertMessage = result.Message;
        AlertIsError = !result.Success;
        await LoadDashboardDataAsync();
        return Page();
    }

    public async Task<IActionResult> OnPostMigrateTenantAsync(string tenantKey)
    {
        if (string.IsNullOrWhiteSpace(tenantKey))
        {
            AlertMessage = "Tenant key is required.";
            AlertIsError = true;
        }
        else
        {
            var result = await _migrationService.MigrateTenantDatabaseAsync(tenantKey);
            AlertMessage = result.Message;
            AlertIsError = !result.Success;
        }

        await LoadDashboardDataAsync();
        return Page();
    }

    public async Task<IActionResult> OnPostMigrateAllTenantsAsync()
    {
        var batchResult = await _migrationService.MigrateAllTenantsBatchAsync();
        if (batchResult.AllSucceeded)
        {
            AlertMessage = $"General update successful! Migrated {batchResult.SucceededCount} of {batchResult.TotalProcessed} tenant databases.";
            AlertIsError = false;
        }
        else
        {
            AlertMessage = $"General update completed with warnings: {batchResult.SucceededCount} succeeded, {batchResult.FailedCount} failed.";
            AlertIsError = true;
        }

        await LoadDashboardDataAsync();
        return Page();
    }

    private async Task LoadDashboardDataAsync()
    {
        MasterSummary = await _migrationService.GetMasterMigrationStatusAsync();
        Tenants = await _migrationService.GetAllTenantMigrationStatusesAsync();

        MasterSummary.TotalTenantsCount = Tenants.Count;
        MasterSummary.SyncedTenantsCount = Tenants.Count(t => t.Status.IsReachable && !t.Status.HasPendingMigrations);
        MasterSummary.PendingTenantsCount = Tenants.Count(t => t.Status.IsReachable && t.Status.HasPendingMigrations);
        MasterSummary.ErrorTenantsCount = Tenants.Count(t => !t.Status.IsReachable);
        MasterSummary.TotalFleetRecordsCount = Tenants.Sum(t => t.TotalRecordsCount);
    }
}
