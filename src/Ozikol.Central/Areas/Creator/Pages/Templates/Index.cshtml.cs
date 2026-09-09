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

namespace Ozikol.Central.Areas.Creator.Pages.Templates
{
    /// <summary>
    /// Page model for browsing, filtering, and managing authored component templates in the Creator Studio.
    /// </summary>
    public class IndexModel : PageModel
    {
        private readonly MasterCatalogDbContext _context;
        private readonly ILogger<IndexModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="IndexModel"/> class.
        /// </summary>
        /// <param name="context">Master catalog database context.</param>
        /// <param name="logger">Structured logging service.</param>
        public IndexModel(MasterCatalogDbContext context, ILogger<IndexModel> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Gets or sets the list of authored templates.
        /// </summary>
        public IList<MasterMarketplaceTemplate> Templates { get; set; } = new List<MasterMarketplaceTemplate>();

        /// <summary>
        /// Gets or sets available category keys.
        /// </summary>
        public IList<string> Categories { get; set; } = new List<string>();

        /// <summary>
        /// Gets or sets total templates count.
        /// </summary>
        public int TotalCount { get; set; }

        /// <summary>
        /// Gets or sets published live templates count.
        /// </summary>
        public int LiveCount { get; set; }

        /// <summary>
        /// Gets or sets draft templates count.
        /// </summary>
        public int DraftCount { get; set; }

        /// <summary>
        /// Gets or sets search query.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Search { get; set; }

        /// <summary>
        /// Gets or sets category filter.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? CategoryFilter { get; set; }

        /// <summary>
        /// Gets or sets status filter (All, Live, Draft).
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? StatusFilter { get; set; }

        /// <summary>
        /// Gets or sets status notification message.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Handles HTTP GET request to query creator's templates.
        /// </summary>
        public async Task OnGetAsync()
        {
            TotalCount = await _context.MasterMarketplaceTemplates.CountAsync();
            LiveCount = await _context.MasterMarketplaceTemplates.CountAsync(t => t.IsActive);
            DraftCount = TotalCount - LiveCount;

            Categories = await _context.MasterMarketplaceTemplates
                .Select(t => t.CategoryKey)
                .Distinct()
                .OrderBy(c => c)
                .ToListAsync();

            var query = _context.MasterMarketplaceTemplates
                .Include(t => t.Category)
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(Search))
            {
                var term = Search.Trim().ToLowerInvariant();
                query = query.Where(t => t.Name.ToLower().Contains(term)
                                      || t.VariantCode.ToLower().Contains(term)
                                      || (t.Description != null && t.Description.ToLower().Contains(term))
                                      || t.CategoryKey.ToLower().Contains(term));
            }

            if (!string.IsNullOrWhiteSpace(CategoryFilter) && CategoryFilter != "All")
            {
                query = query.Where(t => t.CategoryKey == CategoryFilter);
            }

            if (!string.IsNullOrWhiteSpace(StatusFilter) && StatusFilter != "All")
            {
                if (StatusFilter == "Live")
                {
                    query = query.Where(t => t.IsActive);
                }
                else if (StatusFilter == "Draft")
                {
                    query = query.Where(t => !t.IsActive);
                }
            }

            Templates = await query
                .OrderByDescending(t => t.CreatedUtc)
                .ToListAsync();
        }

        /// <summary>
        /// Toggles template active publication status.
        /// </summary>
        /// <param name="id">Template unique identifier.</param>
        /// <returns>Redirect back to index.</returns>
        public async Task<IActionResult> OnPostToggleActiveAsync(Guid id)
        {
            var template = await _context.MasterMarketplaceTemplates.FindAsync(id);
            if (template == null)
            {
                return NotFound();
            }

            template.IsActive = !template.IsActive;
            template.UpdatedUtc = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            StatusMessage = template.IsActive
                ? $"Template '{template.Name}' is now published live in the marketplace."
                : $"Template '{template.Name}' reverted to draft.";

            _logger.LogInformation("Creator toggled template {TemplateId} active state to {IsActive}", id, template.IsActive);
            return RedirectToPage();
        }

        /// <summary>
        /// Deletes an authored template.
        /// </summary>
        /// <param name="id">Template unique identifier.</param>
        /// <returns>Redirect back to index.</returns>
        public async Task<IActionResult> OnPostDeleteAsync(Guid id)
        {
            var template = await _context.MasterMarketplaceTemplates.FindAsync(id);
            if (template != null)
            {
                _context.MasterMarketplaceTemplates.Remove(template);
                await _context.SaveChangesAsync();
                _logger.LogWarning("Creator deleted template {TemplateId} ({Name})", id, template.Name);
                StatusMessage = $"Template '{template.Name}' deleted.";
            }

            return RedirectToPage();
        }
    }
}
