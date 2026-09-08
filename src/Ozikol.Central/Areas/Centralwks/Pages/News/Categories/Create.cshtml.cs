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
    /// Page model for creating a new editorial news taxonomy category in Centralwks.
    /// </summary>
    public class CreateModel : PageModel
    {
        private readonly MasterCatalogDbContext _context;
        private readonly ILogger<CreateModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="CreateModel"/> class.
        /// </summary>
        /// <param name="context">Master catalog database context.</param>
        /// <param name="logger">Structured logging service.</param>
        public CreateModel(MasterCatalogDbContext context, ILogger<CreateModel> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Gets or sets the category creation form input model.
        /// </summary>
        [BindProperty]
        public CategoryInputModel Input { get; set; } = new CategoryInputModel();

        /// <summary>
        /// Input model for new category submission.
        /// </summary>
        public class CategoryInputModel
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
        /// Handles HTTP GET request.
        /// </summary>
        public void OnGet()
        {
        }

        /// <summary>
        /// Handles HTTP POST request to persist new news category.
        /// </summary>
        /// <returns>Redirect to categories index on success, or page on error.</returns>
        public async Task<IActionResult> OnPostAsync()
        {
            if (!ModelState.IsValid)
            {
                return Page();
            }

            var normalizedKey = Input.Key.Trim().ToLowerInvariant();
            var normalizedSlug = Input.Slug.Trim().ToLowerInvariant();

            var keyExists = await _context.MasterNewsCategories.AnyAsync(c => c.Key == normalizedKey);
            if (keyExists)
            {
                ModelState.AddModelError("Input.Key", "A category with this programmatic key already exists.");
                return Page();
            }

            var slugExists = await _context.MasterNewsCategories.AnyAsync(c => c.Slug == normalizedSlug);
            if (slugExists)
            {
                ModelState.AddModelError("Input.Slug", "A category with this permalink slug already exists.");
                return Page();
            }

            var category = new MasterNewsCategory
            {
                Id = Guid.NewGuid(),
                Name = Input.Name.Trim(),
                Key = normalizedKey,
                Slug = normalizedSlug,
                Description = Input.Description?.Trim() ?? string.Empty,
                BadgeClass = Input.BadgeClass?.Trim() ?? "oz-badge-blue",
                SortOrder = Input.SortOrder,
                IsActive = Input.IsActive
            };

            _context.MasterNewsCategories.Add(category);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Central operator created news category {CategoryId} ({Name})", category.Id, category.Name);
            TempData["StatusMessage"] = $"Category '{category.Name}' created successfully.";

            return RedirectToPage("/News/Categories/Index");
        }
    }
}
