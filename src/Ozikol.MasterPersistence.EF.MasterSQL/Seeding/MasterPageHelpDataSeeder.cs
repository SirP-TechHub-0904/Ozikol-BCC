using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Help;
using Ozikol.MasterDomain.Models;

namespace Ozikol.MasterPersistence.EF.MasterSQL.Seeding
{
    /// <summary>
    /// Dedicated programmatic data seeder for Central Master Page Documentation (<c>MasterPageHelps</c>).
    /// Responsible for initializing canonical workflow guides, action button instructions,
    /// and sibling route shortcuts across all platform feature suites.
    /// Operates safely with non-destructive inserts: existing edited documentation is preserved.
    /// </summary>
    public static class MasterPageHelpDataSeeder
    {
        /// <summary>
        /// Global seeding entry point for all master page guides.
        /// Iterates through canonical baseline definitions and inserts unseeded routes.
        /// </summary>
        /// <param name="dbContext">The master catalog database context instance.</param>
        /// <param name="ct">Cancellation token for async operations.</param>
        /// <returns>A task representing the asynchronous seeding operation.</returns>
        public static async Task SeedAllAsync(
            MasterCatalogDbContext dbContext,
            CancellationToken ct = default)
        {
            var baselinePages = MasterHelpBaselineCatalog.GetAll();
            bool hasChanges = false;

            foreach (var baseline in baselinePages)
            {
                // Check if documentation record already exists by RouteKey
                var existing = await dbContext.MasterPageHelps
                    .FirstOrDefaultAsync(p => p.RouteKey == baseline.RouteKey, ct);

                // Only insert if page is completely unseeded (preserves user-edited changes)
                if (existing == null)
                {
                    await dbContext.MasterPageHelps.AddAsync(new MasterPageHelp
                    {
                        Id = Guid.NewGuid(),
                        RouteKey = baseline.RouteKey,
                        FeatureSuite = baseline.FeatureSuite,
                        PageTitle = baseline.PageTitle,
                        ShortSummary = baseline.ShortSummary,
                        OverviewMarkdown = baseline.OverviewMarkdown,
                        ActionsJson = baseline.ActionsJson,
                        RelatedRoutesJson = baseline.RelatedRoutesJson,
                        TourStepsJson = baseline.TourStepsJson,
                        Category = baseline.Category,
                        IsPublished = baseline.IsPublished,
                        LastUpdatedBy = "system@ozikol.cloud",
                        CreatedAtUtc = DateTime.UtcNow,
                        UpdatedAtUtc = DateTime.UtcNow
                    }, ct);
                    hasChanges = true;
                }
            }

            if (hasChanges)
            {
                await dbContext.SaveChangesAsync(ct);
            }
        }
    }
}
