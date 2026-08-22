using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Persistence.EF.SQL;

namespace Ozikol.Central.Pages;

public class IndexModel : PageModel
{
    private readonly MasterCatalogDbContext _masterCatalogDbContext;

    public int TotalActiveTenants { get; set; }
    public int TotalMarketplaceTemplates { get; set; }

    public IndexModel(MasterCatalogDbContext masterCatalogDbContext)
    {
        _masterCatalogDbContext = masterCatalogDbContext;
    }

    public async Task OnGetAsync()
    {
        try
        {
            if (await _masterCatalogDbContext.Database.CanConnectAsync())
            {
                TotalActiveTenants = await _masterCatalogDbContext.MasterTenantCatalogs.CountAsync(t => t.IsActive);
                TotalMarketplaceTemplates = await _masterCatalogDbContext.MasterMarketplaceTemplates.CountAsync(t => t.IsActive);
            }
        }
        catch
        {
            // Graceful fallback for marketing display
            TotalActiveTenants = 0;
            TotalMarketplaceTemplates = 0;
        }
    }
}
