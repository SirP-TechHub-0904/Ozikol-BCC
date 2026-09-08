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

namespace Ozikol.Central.Areas.Centralwks.Pages.News.Categories
{
    /// <summary>
    /// Page model for managing editorial news and announcement categories in Centralwks.
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
        /// Category item view model with computed article counts.
        /// </summary>
        public class CategoryItemViewModel
        {
            /// <summary>Gets or sets the category ID.</summary>
            public Guid Id { get; set; }

            /// <summary>Gets or sets programmatic unique key.</summary>
            public string Key { get; set; } = string.Empty;

            /// <summary>Gets or sets display name.</summary>
            public string Name { get; set; } = string.Empty;

            /// <summary>Gets or sets slug.</summary>
            public string Slug { get; set; } = string.Empty;

            /// <summary>Gets or sets description.</summary>
            public string Description { get; set; } = string.Empty;

            /// <summary>Gets or sets badge styling class.</summary>
            public string BadgeClass { get; set; } = string.Empty;

            /// <summary>Gets or sets sort order.</summary>
            public int SortOrder { get; set; }

            /// <summary>Gets or sets active status.</summary>
            public bool IsActive { get; set; }

            /// <summary>Gets or sets total article count in category.</summary>
            public int ArticleCount { get; set; }
        }

        /// <summary>
        /// Gets or sets the list of news categories.
        /// </summary>
        public IList<CategoryItemViewModel> Categories { get; set; } = new List<CategoryItemViewModel>();

        /// <summary>
        /// Gets or sets status notification message.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Handles HTTP GET request to list all editorial categories.
        /// </summary>
        public async Task OnGetAsync()
        {
            Categories = await _context.MasterNewsCategories
                .OrderBy(c => c.SortOrder)
                .ThenBy(c => c.Name)
                .Select(c => new CategoryItemViewModel
                {
                    Id = c.Id,
                    Key = c.Key,
                    Name = c.Name,
                    Slug = c.Slug,
                    Description = c.Description,
                    BadgeClass = c.BadgeClass,
                    SortOrder = c.SortOrder,
                    IsActive = c.IsActive,
                    ArticleCount = c.Articles.Count
                })
                .AsNoTracking()
                .ToListAsync();
        }

        /// <summary>
        /// Toggles the active status of a category.
        /// </summary>
        /// <param name="id">The unique identifier of the category.</param>
        /// <returns>Redirect back to category index.</returns>
        public async Task<IActionResult> OnPostToggleActiveAsync(Guid id)
        {
            var category = await _context.MasterNewsCategories.FindAsync(id);
            if (category == null)
            {
                return NotFound();
            }

            category.IsActive = !category.IsActive;
            await _context.SaveChangesAsync();

            StatusMessage = category.IsActive
                ? $"Category '{category.Name}' activated."
                : $"Category '{category.Name}' deactivated.";

            _logger.LogInformation("Central operator toggled category {CategoryId} active status to {IsActive}", id, category.IsActive);
            return RedirectToPage();
        }

        /// <summary>
        /// Deletes a category if it has no associated articles.
        /// </summary>
        /// <param name="id">The unique identifier of the category.</param>
        /// <returns>Redirect back to category index.</returns>
        public async Task<IActionResult> OnPostDeleteAsync(Guid id)
        {
            var category = await _context.MasterNewsCategories
                .Include(c => c.Articles)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (category == null)
            {
                return NotFound();
            }

            if (category.Articles.Any())
            {
                StatusMessage = $"Cannot delete category '{category.Name}' because it has {category.Articles.Count} associated article(s). Please reassign or delete them first.";
                return RedirectToPage();
            }

            _context.MasterNewsCategories.Remove(category);
            await _context.SaveChangesAsync();

            StatusMessage = $"Category '{category.Name}' deleted.";
            _logger.LogInformation("Central operator deleted category {CategoryId} ({Name})", id, category.Name);
            return RedirectToPage();
        }
    }
}
