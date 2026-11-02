using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Templates
{
    /// <summary>
    /// Index page model for the Modular Website Template &amp; Section Catalog.
    /// Displays installed templates, categorizes sections, and enables direct management and previewing.
    /// </summary>
    public class IndexModel : PageModel
    {
        private readonly MasterCatalogDbContext _masterDb;
        private readonly ILogger<IndexModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="IndexModel"/> class.
        /// </summary>
        public IndexModel(MasterCatalogDbContext masterDb, ILogger<IndexModel> logger)
        {
            _masterDb = masterDb ?? throw new ArgumentNullException(nameof(masterDb));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        #region Properties

        /// <summary>
        /// Gets or sets the list of published marketplace templates.
        /// </summary>
        public List<MasterMarketplaceTemplate> Templates { get; set; } = new();

        /// <summary>
        /// Gets or sets the list of available categories for filtering.
        /// </summary>
        public List<MasterMarketplaceCategory> Categories { get; set; } = new();

        /// <summary>
        /// Gets or sets the active category filter key.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Category { get; set; }

        /// <summary>
        /// Gets or sets the search query term.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Search { get; set; }

        /// <summary>
        /// Total template count across all categories.
        /// </summary>
        public int TotalTemplatesCount { get; set; }

        #endregion

        /// <summary>
        /// Handles HTTP GET requests to populate the template catalog.
        /// </summary>
        public async Task<IActionResult> OnGetAsync(CancellationToken cancellationToken = default)
        {
            Categories = await _masterDb.MasterMarketplaceCategories
                .Where(c => c.IsActive)
                .OrderBy(c => c.SortOrder)
                .ToListAsync(cancellationToken);

            var query = _masterDb.MasterMarketplaceTemplates
                .Include(t => t.Category)
                .AsNoTracking();

            if (!string.IsNullOrWhiteSpace(Category) && !string.Equals(Category, "all", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(t => t.CategoryKey == Category.Trim());
            }

            if (!string.IsNullOrWhiteSpace(Search))
            {
                var term = Search.Trim().ToLower();
                query = query.Where(t => t.Name.ToLower().Contains(term) || t.VariantCode.ToLower().Contains(term) || (t.Description != null && t.Description.ToLower().Contains(term)));
            }

            TotalTemplatesCount = await query.CountAsync(cancellationToken);
            Templates = await query.OrderByDescending(t => t.CreatedUtc).ToListAsync(cancellationToken);

            return Page();
        }

        /// <summary>
        /// Handles deletion of a template section.
        /// </summary>
        public async Task<IActionResult> OnPostDeleteAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var template = await _masterDb.MasterMarketplaceTemplates.FindAsync(new object[] { id }, cancellationToken);
            if (template == null)
            {
                return new JsonResult(new { success = false, message = "Template not found." });
            }

            _masterDb.MasterMarketplaceTemplates.Remove(template);
            await _masterDb.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Deleted template {Id} ({VariantCode})", template.Id, template.VariantCode);
            return new JsonResult(new { success = true, message = "Template successfully deleted." });
        }
    }
}
