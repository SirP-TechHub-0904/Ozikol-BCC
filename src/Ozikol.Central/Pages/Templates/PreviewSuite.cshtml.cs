using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Application.Dtos.Sections;
using Ozikol_BCC.Application.Interfaces.Services;

namespace Ozikol.Central.Pages.Templates
{
    /// <summary>
    /// PageModel for rendering complete multi-section website theme suite live demos.
    /// Assembles all sections belonging to a SuiteCode/Tag in order, resolves CDN scripts,
    /// and provides smooth section auto-scrolling to show individual sections in full website context.
    /// </summary>
    public class PreviewSuiteModel : PageModel
    {
        private readonly MasterCatalogDbContext _dbContext;
        private readonly ISectionLibraryResolverService _libraryResolver;

        public PreviewSuiteModel(
            MasterCatalogDbContext dbContext,
            ISectionLibraryResolverService libraryResolver)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _libraryResolver = libraryResolver ?? throw new ArgumentNullException(nameof(libraryResolver));
        }

        public string SuiteCode { get; set; } = string.Empty;
        public string SuiteTitle { get; set; } = string.Empty;
        public string? FocusedSectionKey { get; set; }
        public List<MasterMarketplaceTemplate> TemplatesInSuite { get; set; } = new();
        public string HeadInjections { get; set; } = string.Empty;
        public string FooterInjections { get; set; } = string.Empty;

        public async Task<IActionResult> OnGetAsync(string? suiteCode, [FromQuery] string? focus, CancellationToken cancellationToken)
        {
            SuiteCode = string.IsNullOrWhiteSpace(suiteCode) ? "modern" : suiteCode.Trim();
            FocusedSectionKey = focus?.Trim();

            // 1. Query all templates matching this SuiteCode / Tag
            TemplatesInSuite = await _dbContext.MasterMarketplaceTemplates
                .Include(t => t.Category)
                .Where(t => t.IsActive && (t.Tag.ToLower() == SuiteCode.ToLower() || t.VariantCode.ToLower() == SuiteCode.ToLower()))
                .OrderBy(t => GetCategoryOrder(t.CategoryKey))
                .ThenBy(t => t.SortOrder)
                .ToListAsync(cancellationToken);

            // If empty, try matching by prefix
            if (!TemplatesInSuite.Any())
            {
                TemplatesInSuite = await _dbContext.MasterMarketplaceTemplates
                    .Include(t => t.Category)
                    .Where(t => t.IsActive && t.VariantCode.ToLower().StartsWith(SuiteCode.ToLower()))
                    .OrderBy(t => GetCategoryOrder(t.CategoryKey))
                    .ThenBy(t => t.SortOrder)
                    .ToListAsync(cancellationToken);
            }

            // Fallback to all active templates if none matched
            if (!TemplatesInSuite.Any())
            {
                TemplatesInSuite = await _dbContext.MasterMarketplaceTemplates
                    .Include(t => t.Category)
                    .Where(t => t.IsActive)
                    .Take(8)
                    .OrderBy(t => GetCategoryOrder(t.CategoryKey))
                    .ThenBy(t => t.SortOrder)
                    .ToListAsync(cancellationToken);
            }

            SuiteTitle = FormatSuiteTitle(SuiteCode);

            // 2. Resolve combined deduplicated library CDNs across all sections in the suite
            var sectionAssets = TemplatesInSuite.Select(t => new SectionAssetPayloadDto
            {
                VariantCode = t.VariantCode,
                ScopedCss = t.CssStyles,
                JsScript = t.JsScript,
                RequiredLibraries = new List<string> { "bootstrap", "swiper", "aos", "lucide" }
            }).ToList();

            HeadInjections = _libraryResolver.GenerateHeadHtml(sectionAssets);
            FooterInjections = _libraryResolver.GenerateFooterHtml(sectionAssets);

            return Page();
        }

        private static int GetCategoryOrder(string? cat) => (cat?.ToLowerInvariant()) switch
        {
            "menu" => 1,
            "hero" => 2,
            "body" or "features" or "feature" => 3,
            "services" => 4,
            "pricing" => 5,
            "testimonials" => 6,
            "blog" or "news" => 7,
            "contact" => 8,
            "footer" => 9,
            _ => 10
        };

        private static string FormatSuiteTitle(string code)
        {
            if (string.IsNullOrWhiteSpace(code)) return "Master Marketplace Theme";
            var parts = code.Replace('_', ' ').Replace('-', ' ').Split(' ');
            return string.Join(" ", parts.Select(p => p.Length > 0 ? char.ToUpper(p[0]) + p[1..] : p)) + " Suite";
        }
    }
}
