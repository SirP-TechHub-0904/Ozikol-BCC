using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
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
    /// Page model for authoring and submitting new UI component templates to the sovereign marketplace.
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
        /// Gets or sets template authoring input model.
        /// </summary>
        [BindProperty]
        public TemplateInputModel Input { get; set; } = new TemplateInputModel();

        /// <summary>
        /// Gets or sets available marketplace categories for selection.
        /// </summary>
        public IList<MasterMarketplaceCategory> Categories { get; set; } = new List<MasterMarketplaceCategory>();

        /// <summary>
        /// Input model for authoring a marketplace component template.
        /// </summary>
        public class TemplateInputModel
        {
            /// <summary>Gets or sets template display headline.</summary>
            [Required(ErrorMessage = "Template name is required.")]
            [MaxLength(150)]
            public string Name { get; set; } = string.Empty;

            /// <summary>Gets or sets unique variant permacode.</summary>
            [Required(ErrorMessage = "Variant code is required.")]
            [MaxLength(100)]
            public string VariantCode { get; set; } = string.Empty;

            /// <summary>Gets or sets parent category ID.</summary>
            [Required(ErrorMessage = "Please select a category.")]
            public Guid CategoryId { get; set; }

            /// <summary>Gets or sets design tag (e.g. modern, dark, corporate, ecommerce).</summary>
            [Required]
            [MaxLength(50)]
            public string Tag { get; set; } = "modern";

            /// <summary>Gets or sets optional marketing badge (e.g. Popular, New, Trending).</summary>
            [MaxLength(50)]
            public string? Badge { get; set; }

            /// <summary>Gets or sets template feature summary.</summary>
            [MaxLength(500)]
            public string? Description { get; set; }

            /// <summary>Gets or sets CSS thumbnail gradient background.</summary>
            [MaxLength(150)]
            public string ThumbnailGradient { get; set; } = "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)";

            /// <summary>Gets or sets semantic HTML markup with {{ Mustache }} placeholders.</summary>
            [Required(ErrorMessage = "Semantic HTML markup is required.")]
            public string HtmlTemplate { get; set; } = "<div class=\"oz-component\">\n  <h2>{{ Title }}</h2>\n  <p>{{ Description }}</p>\n</div>";

            /// <summary>Gets or sets scoped CSS stylesheet.</summary>
            [Required(ErrorMessage = "Scoped CSS stylesheet is required.")]
            public string CssStyles { get; set; } = ".oz-component {\n  padding: 40px 20px;\n  text-align: center;\n}\n.oz-component h2 {\n  font-size: 28px;\n  font-weight: 700;\n}";

            /// <summary>Gets or sets optional sandboxed JavaScript execution hook.</summary>
            public string? JsScript { get; set; }

            /// <summary>Gets or sets semantic version string.</summary>
            [MaxLength(20)]
            public string Version { get; set; } = "1.0.0";

            /// <summary>Gets or sets whether the template is immediately active.</summary>
            public bool IsActive { get; set; } = true;
        }

        /// <summary>
        /// Handles HTTP GET request to load category options.
        /// </summary>
        public async Task OnGetAsync()
        {
            Categories = await _context.MasterMarketplaceCategories
                .OrderBy(c => c.SortOrder)
                .ToListAsync();

            if (Categories.Any())
            {
                Input.CategoryId = Categories.First().Id;
            }
        }

        /// <summary>
        /// Handles HTTP POST request to store newly authored template.
        /// </summary>
        public async Task<IActionResult> OnPostAsync()
        {
            Categories = await _context.MasterMarketplaceCategories
                .OrderBy(c => c.SortOrder)
                .ToListAsync();

            if (!ModelState.IsValid)
            {
                return Page();
            }

            var category = await _context.MasterMarketplaceCategories.FindAsync(Input.CategoryId);
            if (category == null)
            {
                ModelState.AddModelError("Input.CategoryId", "Selected category does not exist.");
                return Page();
            }

            // Check variant code uniqueness
            var trimmedVariant = Input.VariantCode.Trim();
            if (await _context.MasterMarketplaceTemplates.AnyAsync(t => t.VariantCode == trimmedVariant))
            {
                ModelState.AddModelError("Input.VariantCode", "A template with this variant code already exists.");
                return Page();
            }

            var template = new MasterMarketplaceTemplate
            {
                Id = Guid.NewGuid(),
                CategoryId = category.Id,
                CategoryKey = category.CategoryKey,
                Name = Input.Name.Trim(),
                VariantCode = trimmedVariant,
                Tag = Input.Tag.Trim().ToLowerInvariant(),
                Badge = string.IsNullOrWhiteSpace(Input.Badge) ? null : Input.Badge.Trim(),
                Description = Input.Description?.Trim(),
                ThumbnailGradient = Input.ThumbnailGradient.Trim(),
                HtmlTemplate = Input.HtmlTemplate,
                CssStyles = Input.CssStyles,
                JsScript = string.IsNullOrWhiteSpace(Input.JsScript) ? null : Input.JsScript,
                Version = Input.Version.Trim(),
                IsActive = Input.IsActive,
                CreatedUtc = DateTime.UtcNow
            };

            _context.MasterMarketplaceTemplates.Add(template);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Creator authored new marketplace template {TemplateId} ({VariantCode})", template.Id, template.VariantCode);
            TempData["StatusMessage"] = $"Template '{template.Name}' submitted successfully.";

            return RedirectToPage("/Templates/Details", new { id = template.Id });
        }
    }
}
