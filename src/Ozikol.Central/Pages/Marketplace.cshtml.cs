using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;

namespace Ozikol.Central.Pages;

public class MarketplaceModel : PageModel
{
    private readonly MasterCatalogDbContext _masterCatalogDbContext;

    public List<MasterMarketplaceTemplate> Templates { get; set; } = new();

    public MarketplaceModel(MasterCatalogDbContext masterCatalogDbContext)
    {
        _masterCatalogDbContext = masterCatalogDbContext;
    }

    public async Task OnGetAsync()
    {
        try
        {
            if (await _masterCatalogDbContext.Database.CanConnectAsync())
            {
                Templates = await _masterCatalogDbContext.MasterMarketplaceTemplates
                    .AsNoTracking()
                    .Where(t => t.IsActive)
                    .OrderBy(t => t.SortOrder)
                    .ToListAsync();
            }
        }
        catch
        {
            Templates = new List<MasterMarketplaceTemplate>();
        }

        // Provide rich default marketplace blueprints if catalog is empty
        if (Templates.Count == 0)
        {
            Templates = GetDefaultMarketplaceBlueprints();
        }
    }

    private static List<MasterMarketplaceTemplate> GetDefaultMarketplaceBlueprints()
    {
        return new List<MasterMarketplaceTemplate>
        {
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Apex Enterprise MIS",
                VariantCode = "standard",
                CategoryKey = "enterprise",
                Tag = "Executive Portal",
                Badge = "Popular",
                Description = "Clean, dark-mode executive management layout with real-time financial ledger metrics, interactive charts, and role governance.",
                PreviewTitle = "Apex Executive Portal",
                PreviewSubtitle = "Real-time governance and multi-tier finance",
                HtmlTemplate = "<div class='apex-hero'><h1>{{ Title }}</h1></div>",
                IsActive = true,
                SortOrder = 1
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Lumina Digital Storefront",
                VariantCode = "storefront-pro",
                CategoryKey = "ecommerce",
                Tag = "E-Commerce & Digital Products",
                Badge = "Featured",
                Description = "High-converting digital product catalog with instant download fulfillment, license key generation, and Stripe checkout.",
                PreviewTitle = "Lumina Digital Commerce",
                PreviewSubtitle = "High-converting storefront blueprint",
                HtmlTemplate = "<div class='store-hero'><h1>{{ Title }}</h1></div>",
                IsActive = true,
                SortOrder = 2
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "AutoDetails Precision Hub",
                VariantCode = "autodetails",
                CategoryKey = "automotive",
                Tag = "Service & Booking CMS",
                Badge = "New",
                Description = "Tailored for service organizations, vehicle detailing, repair bookings, dynamic hero galleries, and customer reviews.",
                PreviewTitle = "AutoDetails Service Portal",
                PreviewSubtitle = "Vehicle detailing and appointment booking",
                HtmlTemplate = "<div class='autodetails-hero'><h1>{{ Title }}</h1></div>",
                IsActive = true,
                SortOrder = 3
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Nexus Community & Membership",
                VariantCode = "membership-hub",
                CategoryKey = "community",
                Tag = "Membership & Subscriptions",
                Badge = "Trending",
                Description = "Member portal with tiered subscription badges, recurring billing, private forums, and member directory governance.",
                PreviewTitle = "Nexus Community Hub",
                PreviewSubtitle = "Tiered member portal and subscriptions",
                HtmlTemplate = "<div class='nexus-hero'><h1>{{ Title }}</h1></div>",
                IsActive = true,
                SortOrder = 4
            }
        };
    }
}
