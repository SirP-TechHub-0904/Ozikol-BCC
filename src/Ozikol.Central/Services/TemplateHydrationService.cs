using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;

namespace Ozikol.Central.Services
{
    public interface ITemplateHydrationService
    {
        /// <summary>
        /// Installs a Master Marketplace Template into a tenant database and hydrates demo sections and child cards.
        /// </summary>
        Task<bool> InstallTemplateToTenantAsync(
            Guid masterTemplateId, 
            Guid? tenantWebPageId, 
            DashboardDbContext tenantDbContext, 
            CancellationToken cancellationToken = default);
    }

    public class TemplateHydrationService : ITemplateHydrationService
    {
        private readonly MasterCatalogDbContext _masterCatalogDbContext;
        private readonly ILogger<TemplateHydrationService> _logger;

        public TemplateHydrationService(
            MasterCatalogDbContext masterCatalogDbContext,
            ILogger<TemplateHydrationService> logger)
        {
            _masterCatalogDbContext = masterCatalogDbContext;
            _logger = logger;
        }

        public async Task<bool> InstallTemplateToTenantAsync(
            Guid masterTemplateId, 
            Guid? tenantWebPageId, 
            DashboardDbContext tenantDbContext, 
            CancellationToken cancellationToken = default)
        {
            try
            {
                // 1. Fetch Master Template with all child Sections & SectionLists
                var masterTemplate = await _masterCatalogDbContext.MasterMarketplaceTemplates
                    .Include(t => t.Sections)
                        .ThenInclude(s => s.SectionLists)
                    .AsNoTracking()
                    .FirstOrDefaultAsync(t => t.Id == masterTemplateId, cancellationToken);

                if (masterTemplate == null)
                {
                    _logger.LogWarning("TemplateHydration: Master template [{TemplateId}] not found.", masterTemplateId);
                    return false;
                }

                // 2. Add or Update TenantInstalledTemplate
                var installedTemplate = await tenantDbContext.TenantInstalledTemplates
                    .FirstOrDefaultAsync(t => t.TemplateKey == masterTemplate.VariantCode, cancellationToken);

                if (installedTemplate == null)
                {
                    installedTemplate = new TenantInstalledTemplate
                    {
                        Id = Guid.NewGuid(),
                        MasterTemplateId = masterTemplate.Id,
                        TemplateKey = masterTemplate.VariantCode,
                        CategoryKey = masterTemplate.CategoryKey,
                        Name = masterTemplate.Name,
                        VariantCode = masterTemplate.VariantCode,
                        HtmlTemplate = masterTemplate.HtmlTemplate,
                        CssStyles = masterTemplate.CssStyles,
                        JsScript = masterTemplate.JsScript,
                        InstalledVersion = masterTemplate.Version ?? "1.0.0",
                        InstalledUtc = DateTime.UtcNow,
                        IsActive = true
                    };
                    tenantDbContext.TenantInstalledTemplates.Add(installedTemplate);
                }
                else
                {
                    installedTemplate.MasterTemplateId = masterTemplate.Id;
                    installedTemplate.HtmlTemplate = masterTemplate.HtmlTemplate;
                    installedTemplate.CssStyles = masterTemplate.CssStyles;
                    installedTemplate.JsScript = masterTemplate.JsScript;
                    installedTemplate.LastUpdatedUtc = DateTime.UtcNow;
                }

                await tenantDbContext.SaveChangesAsync(cancellationToken);

                // 3. Hydrate PageSections and PageSectionLists into tenant database if a target page is provided
                if (tenantWebPageId.HasValue && tenantWebPageId.Value != Guid.Empty)
                {
                    foreach (var mSec in masterTemplate.Sections.OrderBy(s => s.SortOrder))
                    {
                        var tenantSection = new PageSection
                        {
                            Id = Guid.NewGuid(),
                            WebPageId = tenantWebPageId.Value,
                            TemplateKey = masterTemplate.VariantCode,
                            MasterTemplateId = masterTemplate.Id,
                            Title = mSec.Title,
                            MiniTitle = mSec.MiniTitle,
                            Description = mSec.SubTitle ?? mSec.Description,
                            FullDescription = mSec.Description,
                            ImageUrl = mSec.PrimaryImageUrl,
                            SecondImageUrl = mSec.SecondaryImageUrl,
                            ButtonText = mSec.ButtonText,
                            ButtonLink = mSec.ButtonUrl,
                            PageSortOrder = mSec.SortOrder,
                            Disable = false,
                            HtmlTemplate = masterTemplate.HtmlTemplate,
                            CssStyles = masterTemplate.CssStyles,
                            JsScript = masterTemplate.JsScript
                        };

                        tenantDbContext.PageSections.Add(tenantSection);
                        await tenantDbContext.SaveChangesAsync(cancellationToken);

                        // 4. Hydrate Child SectionLists (Cards, Slides, FAQ Items, Pricing Plans, Contacts)
                        foreach (var mItem in mSec.SectionLists.OrderBy(i => i.SortOrder))
                        {
                            var tenantItem = new PageSectionList
                            {
                                Id = Guid.NewGuid(),
                                PageSectionId = tenantSection.Id,
                                Title = mItem.Title,
                                MiniTitle = mItem.SubTitle,
                                Description = mItem.Description,
                                ImageUrl = mItem.ImageUrl,
                                IconText = mItem.IconClass,
                                ButtonText = mItem.ButtonText,
                                ButtonLink = mItem.ButtonLink,
                                SortOrder = mItem.SortOrder,
                                Disable = false
                            };

                            tenantDbContext.PageSectionLists.Add(tenantItem);
                        }

                        if (mSec.SectionLists.Count > 0)
                        {
                            await tenantDbContext.SaveChangesAsync(cancellationToken);
                        }
                    }
                }

                _logger.LogInformation("TemplateHydration: Successfully hydrated template [{TemplateCode}] into tenant database.", masterTemplate.VariantCode);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "TemplateHydration: Failed to hydrate template [{TemplateId}].", masterTemplateId);
                return false;
            }
        }
    }
}
