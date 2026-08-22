using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Ozikol.Central.Services;

namespace Ozikol.Central.Pages.Tenants;

public class DetailsModel : PageModel
{
    private readonly ICentralMigrationService _migrationService;
    private readonly ILogger<DetailsModel> _logger;

    public TenantDatabaseDeepDive? DeepDive { get; set; }
    public string? AlertMessage { get; set; }
    public bool AlertIsError { get; set; }
    public string? SearchQuery { get; set; }

    public DetailsModel(ICentralMigrationService migrationService, ILogger<DetailsModel> logger)
    {
        _migrationService = migrationService;
        _logger = logger;
    }

    public async Task<IActionResult> OnGetAsync(string? key, string? q)
    {
        if (string.IsNullOrWhiteSpace(key))
        {
            return RedirectToPage("/Index");
        }

        SearchQuery = q;
        DeepDive = await _migrationService.GetTenantDeepDiveAsync(key);

        if (DeepDive == null)
        {
            return NotFound($"Tenant with key '{key}' was not found.");
        }

        if (!string.IsNullOrWhiteSpace(SearchQuery))
        {
            DeepDive.Tables = DeepDive.Tables
                .Where(t => t.TableName.Contains(SearchQuery, StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        return Page();
    }

    public async Task<IActionResult> OnPostMigrateAsync(string key)
    {
        if (string.IsNullOrWhiteSpace(key))
        {
            AlertMessage = "Tenant key is required.";
            AlertIsError = true;
        }
        else
        {
            var result = await _migrationService.MigrateTenantDatabaseAsync(key);
            AlertMessage = result.Message;
            AlertIsError = !result.Success;
        }

        DeepDive = await _migrationService.GetTenantDeepDiveAsync(key);
        return Page();
    }
}
