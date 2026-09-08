using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Admin.Pages.Templates
{
    /// <summary>
    /// PageModel displaying the UI Marketplace template blueprints and block definitions.
    /// Provides search, category filtering, status toggling, and layout metrics.
    /// </summary>
    public class IndexModel : PageModel
    {
        private readonly MasterCatalogDbContext _dbContext;

        /// <summary>
        /// Initializes a new instance of the <see cref="IndexModel"/> class.
        /// </summary>
        /// <param name="dbContext">Master catalog database context.</param>
        public IndexModel(MasterCatalogDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        /// <summary>
        /// Search keyword filter for template name, variant code, or description.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Search { get; set; }

        /// <summary>
        /// Category key filter (e.g. "hero", "footer", "feature-grid").
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? CategoryKey { get; set; }

        /// <summary>
        /// Tag style filter (e.g. "modern", "dark", "corporate").
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Tag { get; set; }

        /// <summary>
        /// Active status filter.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Status { get; set; }

        /// <summary>
        /// 1-based page number for pagination.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public int PageNumber { get; set; } = 1;

        /// <summary>
        /// Retrieved list of marketplace templates.
        /// </summary>
        public List<MasterMarketplaceTemplate> Templates { get; set; } = new();

        /// <summary>
        /// Selectable category options for filtering.
        /// </summary>
        public List<SelectListItem> CategoryOptions { get; set; } = new();

        /// <summary>
        /// Total count matching filter criteria.
        /// </summary>
        public int TotalCount { get; set; }

        /// <summary>
        /// Count of active templates.
        /// </summary>
        public int ActiveCount { get; set; }

        /// <summary>
        /// Total categories count.
        /// </summary>
        public int TotalCategoriesCount { get; set; }

        /// <summary>
        /// Total number of pages.
        /// </summary>
        public int TotalPages { get; set; }

        /// <summary>
        /// Page size for pagination.
        /// </summary>
        public const int PageSize = 15;

        /// <summary>
        /// Status message from previous operations.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Handles HTTP GET requests to query and paginate marketplace templates.
        /// </summary>
        public async Task OnGetAsync()
        {
            TotalCategoriesCount = await _dbContext.MasterMarketplaceCategories.CountAsync();
            ActiveCount = await _dbContext.MasterMarketplaceTemplates.CountAsync(t => t.IsActive);

            var categories = await _dbContext.MasterMarketplaceCategories
                .OrderBy(c => c.SortOrder)
                .Select(c => new { c.CategoryKey, c.Name })
                .ToListAsync();

            CategoryOptions = categories.Select(c => new SelectListItem
            {
                Value = c.CategoryKey,
                Text = c.Name,
                Selected = c.CategoryKey.Equals(CategoryKey, StringComparison.OrdinalIgnoreCase)
            }).ToList();

            var query = _dbContext.MasterMarketplaceTemplates
                .Include(t => t.Category)
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(Search))
            {
                var term = Search.Trim().ToLower();
                query = query.Where(t =>
                    t.Name.ToLower().Contains(term) ||
                    t.VariantCode.ToLower().Contains(term) ||
                    (t.Description != null && t.Description.ToLower().Contains(term)) ||
                    (t.Tag != null && t.Tag.ToLower().Contains(term)));
            }

            if (!string.IsNullOrWhiteSpace(CategoryKey))
            {
                query = query.Where(t => t.CategoryKey == CategoryKey);
            }

            if (!string.IsNullOrWhiteSpace(Tag))
            {
                query = query.Where(t => t.Tag == Tag);
            }

            if (!string.IsNullOrWhiteSpace(Status))
            {
                if (Status.Equals("active", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(t => t.IsActive);
                }
                else if (Status.Equals("inactive", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(t => !t.IsActive);
                }
            }

            TotalCount = await query.CountAsync();
            TotalPages = (int)Math.Ceiling(TotalCount / (double)PageSize);
            if (PageNumber < 1) PageNumber = 1;

            Templates = await query
                .OrderBy(t => t.CategoryKey)
                .ThenBy(t => t.SortOrder)
                .ThenBy(t => t.Name)
                .Skip((PageNumber - 1) * PageSize)
                .Take(PageSize)
                .ToListAsync();
        }

        /// <summary>
        /// Toggles template active state in the central marketplace.
        /// </summary>
        /// <param name="id">Template unique identifier.</param>
        public async Task<IActionResult> OnPostToggleActiveAsync(Guid id)
        {
            var template = await _dbContext.MasterMarketplaceTemplates.FindAsync(id);
            if (template == null)
            {
                return NotFound();
            }

            template.IsActive = !template.IsActive;
            template.UpdatedUtc = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();

            StatusMessage = $"Template '{template.Name}' is now {(template.IsActive ? "active" : "hidden")} in the marketplace.";
            return RedirectToPage();
        }

        /// <summary>
        /// Deletes a template blueprint from the master catalog.
        /// </summary>
        /// <param name="id">Template unique identifier.</param>
        public async Task<IActionResult> OnPostDeleteAsync(Guid id)
        {
            var template = await _dbContext.MasterMarketplaceTemplates.FindAsync(id);
            if (template == null)
            {
                return NotFound();
            }

            _dbContext.MasterMarketplaceTemplates.Remove(template);
            await _dbContext.SaveChangesAsync();

            StatusMessage = $"Template '{template.Name}' was deleted.";
            return RedirectToPage();
        }
    }
}
