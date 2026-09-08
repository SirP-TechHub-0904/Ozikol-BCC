using System;
using System.ComponentModel.DataAnnotations;
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
    /// Page model for editing an existing news editorial category in Centralwks.
    /// </summary>
    public class EditModel : PageModel
    {
        private readonly MasterCatalogDbContext _context;
        private readonly ILogger<EditModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="EditModel"/> class.
        /// </summary>
        /// <param name="context">Master catalog database context.</param>
        /// <param name="logger">Structured logging service.</param>
        public EditModel(MasterCatalogDbContext context, ILogger<EditModel> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Gets or sets the category ID.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public Guid Id { get; set; }

        /// <summary>
        /// Gets or sets the edit form input model.
        /// </summary>
        [BindProperty]
        public CategoryEditModel Input { get; set; } = new CategoryEditModel();

        /// <summary>
        /// Input model for editing an existing news category.
        /// </summary>
        public class CategoryEditModel
        {
            /// <summary>Gets or sets the display name.</summary>
            [Required(ErrorMessage = "Category name is required.")]
            [MaxLength(100)]
            public string Name { get; set; } = string.Empty;

            /// <summary>Gets or sets the programmatic unique key.</summary>
            [Required(ErrorMessage = "Category key is required.")]
            [MaxLength(50)]
            public string Key { get; set; } = string.Empty;

            /// <summary>Gets or sets the URL permalink slug.</summary>
            [Required(ErrorMessage = "Category slug is required.")]
            [MaxLength(100)]
            public string Slug { get; set; } = string.Empty;

            /// <summary>Gets or sets the category description.</summary>
            [MaxLength(300)]
            public string Description { get; set; } = string.Empty;

            /// <summary>Gets or sets the badge styling class.</summary>
            [MaxLength(50)]
            public string BadgeClass { get; set; } = "oz-badge-blue";

            /// <summary>Gets or sets the display sort order.</summary>
            public int SortOrder { get; set; } = 1;

            /// <summary>Gets or sets whether the category is active.</summary>
            public bool IsActive { get; set; } = true;
        }

        /// <summary>
        /// Handles HTTP GET request to load category data.
        /// </summary>
        /// <param name="id">The unique identifier of the category.</param>
        /// <returns>Page result or NotFound.</returns>
        public async Task<IActionResult> OnGetAsync(Guid id)
        {
            var category = await _context.MasterNewsCategories.FindAsync(id);
            if (category == null)
            {
                return NotFound();
            }

            Id = id;
            Input = new CategoryEditModel
            {
                Name = category.Name,
                Key = category.Key,
                Slug = category.Slug,
                Description = category.Description,
                BadgeClass = category.BadgeClass,
                SortOrder = category.SortOrder,
                IsActive = category.IsActive
            };

            return Page();
        }

        /// <summary>
        /// Handles HTTP POST request to persist category modifications.
        /// </summary>
        /// <param name="id">The unique identifier of the category.</param>
        /// <returns>Redirect to categories index on success, or page on error.</returns>
        public async Task<IActionResult> OnPostAsync(Guid id)
        {
            if (!ModelState.IsValid)
            {
                return Page();
            }

            var category = await _context.MasterNewsCategories.FindAsync(id);
            if (category == null)
            {
                return NotFound();
            }

            var normalizedKey = Input.Key.Trim().ToLowerInvariant();
            var normalizedSlug = Input.Slug.Trim().ToLowerInvariant();

            var keyExists = await _context.MasterNewsCategories
                .AnyAsync(c => c.Key == normalizedKey && c.Id != id);
            if (keyExists)
            {
                ModelState.AddModelError("Input.Key", "Another category already uses this programmatic key.");
                return Page();
            }

            var slugExists = await _context.MasterNewsCategories
                .AnyAsync(c => c.Slug == normalizedSlug && c.Id != id);
            if (slugExists)
            {
                ModelState.AddModelError("Input.Slug", "Another category already uses this permalink slug.");
                return Page();
            }

            category.Name = Input.Name.Trim();
            category.Key = normalizedKey;
            category.Slug = normalizedSlug;
            category.Description = Input.Description?.Trim() ?? string.Empty;
            category.BadgeClass = Input.BadgeClass?.Trim() ?? "oz-badge-blue";
            category.SortOrder = Input.SortOrder;
            category.IsActive = Input.IsActive;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Central operator updated news category {CategoryId} ({Name})", id, category.Name);
            TempData["StatusMessage"] = $"Category '{category.Name}' updated successfully.";

            return RedirectToPage("/News/Categories/Index");
        }
    }
}
