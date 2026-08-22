using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;
using Ozikol_BCC.Website.Services;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Website.Filters
{
    public class BcpFeatureAccessFilter : IAsyncPageFilter
    {
        private readonly DashboardDbContext _context;
        private readonly IBcpAuthorizationService _bcpAuth;

        public BcpFeatureAccessFilter(DashboardDbContext context, IBcpAuthorizationService bcpAuth)
        {
            _context = context;
            _bcpAuth = bcpAuth;
        }

        public async Task OnPageHandlerExecutionAsync(PageHandlerExecutingContext context, PageHandlerExecutionDelegate next)
        {
            var path = context.HttpContext.Request.Path.Value;

            // 1. Bail out immediately if this is NOT an BCP area request
            if (string.IsNullOrEmpty(path) || !path.StartsWith("/Bcp", StringComparison.OrdinalIgnoreCase))
            {
                await next();
                return;
            }
            
            // 2. Bypass filter for the BcpManagement area itself and the Suspended page
            if (path.StartsWith("/BcpManagement", StringComparison.OrdinalIgnoreCase) || path.StartsWith("/SuspendedFeature", StringComparison.OrdinalIgnoreCase))
            {
                await next();
                return;
            }

            var knownFeature = BcpFeatureCatalog.FindByPath(path);

            if (knownFeature != null)
            {
                // The user is trying to access a known feature module.
                // Let's check if this feature is actually configured and enabled in the database.
                var features = await _context.BcpFeatures.ToListAsync();
                var matchingFeature = features.FirstOrDefault(f => f.ModuleFolder == knownFeature.ModuleFolder);

                if (matchingFeature == null)
                {
                    // Auto-provision feature in DB as Active free module if accessed
                    matchingFeature = new BcpFeature
                    {
                        FeatureName = knownFeature.FeatureName,
                        ModuleFolder = knownFeature.ModuleFolder,
                        Description = knownFeature.Description,
                        Status = FeatureBillingStatus.Active,
                        BillingDuration = FeatureBillingDuration.Free,
                        CostPerDuration = 0,
                        GracePeriodDays = 0
                    };
                    _context.BcpFeatures.Add(matchingFeature);
                    await _context.SaveChangesAsync();
                }

                if (matchingFeature.Status == FeatureBillingStatus.Disabled)
                {
                    // If completely disabled, redirect to main BCP Console Dashboard
                    context.Result = new RedirectToPageResult("/Console/Dashboard", new { area = "BcpConsole" });
                    return;
                }

                if (matchingFeature.Status == FeatureBillingStatus.Suspended)
                {
                    // Feature is suspended due to unpaid bill -> redirect to suspended page
                    context.Result = new RedirectToPageResult("/SuspendedFeature", new { area = "BcpManagement", featureName = matchingFeature.FeatureName });
                    return;
                }

                // If Active, check billing date and grace period to see if we need to auto-suspend
                if (matchingFeature.NextBillingDate.HasValue && matchingFeature.NextBillingDate.Value.AddDays(matchingFeature.GracePeriodDays) < DateTime.UtcNow)
                {
                    // Auto-suspend the feature
                    matchingFeature.Status = FeatureBillingStatus.Suspended;
                    _context.Entry(matchingFeature).State = EntityState.Modified;
                    await _context.SaveChangesAsync();

                    context.Result = new RedirectToPageResult("/SuspendedFeature", new { area = "BcpManagement", featureName = matchingFeature.FeatureName });
                    return;
                }

                // Console routes are organizational management routes; Workspace routes are personal user routes.
                if (path != null && path.Contains("/Console/", StringComparison.OrdinalIgnoreCase))
                {
                    // Check Feature Access Authorization
                    bool hasAccess = await _bcpAuth.HasAccessAsync(context.HttpContext.User, knownFeature.ModuleFolder);
                    if (!hasAccess)
                    {
                        context.Result = new RedirectToPageResult("/Workspace/Dashboard", new { area = "BcpWorkspace" });
                        return;
                    }

                    // If it's a POST request, block modifications if they don't have Edit access (e.g. Readonly users)
                    if (context.HttpContext.Request.Method.Equals("POST", StringComparison.OrdinalIgnoreCase))
                    {
                        bool canEdit = await _bcpAuth.CanEditAsync(context.HttpContext.User, knownFeature.ModuleFolder);
                        if (!canEdit)
                        {
                            context.Result = new ForbidResult();
                            return;
                        }
                    }
                }
            }

            await next();
        }

        public Task OnPageHandlerSelectionAsync(PageHandlerSelectedContext context)
        {
            return Task.CompletedTask;
        }
    }
}

