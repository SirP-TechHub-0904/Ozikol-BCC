using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
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
    /// PageModel for authoring and registering a new UI Marketplace block template definition.
    /// Manages semantic HTML markup with Mustache tokens, scoped CSS stylesheets, and preview parameters.
    /// </summary>
    public class CreateModel : PageModel
    {
        private readonly MasterCatalogDbContext _dbContext;

        /// <summary>
        /// Initializes a new instance of the <see cref="CreateModel"/> class.
        /// </summary>
        /// <param name="dbContext">Master catalog database context.</param>
        public CreateModel(MasterCatalogDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        /// <summary>
        /// Input model carrying the new template parameters.
        /// </summary>
        [BindProperty]
        public TemplateInputModel Input { get; set; } = new();

        /// <summary>
        /// Available category options for selection.
        /// </summary>
        public List<SelectListItem> CategoryOptions { get; set; } = new();

        /// <summary>
        /// Handles HTTP GET requests to prepare the creation form.
        /// </summary>
        public async Task<IActionResult> OnGetAsync()
        {
            await PopulateCategoriesAsync();
            return Page();
        }

        /// <summary>
        /// Handles HTTP POST requests to validate and save the new template definition.
        /// </summary>
        public async Task<IActionResult> OnPostAsync()
        {
            if (!ModelState.IsValid)
            {
                await PopulateCategoriesAsync();
                return Page();
            }

            var cleanVariant = Input.VariantCode.Trim();

            // Verify unique variant code
            var variantExists = await _dbContext.MasterMarketplaceTemplates
                .AnyAsync(t => t.VariantCode.ToLower() == cleanVariant.ToLower());

            if (variantExists)
            {
                ModelState.AddModelError("Input.VariantCode", $"Variant code '{cleanVariant}' is already registered.");
                await PopulateCategoriesAsync();
                return Page();
            }

            var category = await _dbContext.MasterMarketplaceCategories.FindAsync(Input.CategoryId);
            if (category == null)
            {
                ModelState.AddModelError("Input.CategoryId", "Selected marketplace category was not found.");
                await PopulateCategoriesAsync();
                return Page();
            }

            var template = new MasterMarketplaceTemplate
            {
                Id = Guid.NewGuid(),
                CategoryId = category.Id,
                CategoryKey = category.CategoryKey,
                Name = Input.Name.Trim(),
                VariantCode = cleanVariant,
                Tag = string.IsNullOrWhiteSpace(Input.Tag) ? "modern" : Input.Tag.Trim().ToLowerInvariant(),
                Badge = string.IsNullOrWhiteSpace(Input.Badge) ? null : Input.Badge.Trim(),
                Description = Input.Description?.Trim(),
                ThumbnailGradient = string.IsNullOrWhiteSpace(Input.ThumbnailGradient) 
                    ? "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)" 
                    : Input.ThumbnailGradient.Trim(),
                PreviewIcon = string.IsNullOrWhiteSpace(Input.PreviewIcon) ? "widgets" : Input.PreviewIcon.Trim(),
                PreviewTitle = Input.PreviewTitle?.Trim(),
                PreviewSubtitle = Input.PreviewSubtitle?.Trim(),
                PreviewImageUrl = Input.PreviewImageUrl?.Trim(),
                HtmlTemplate = Input.HtmlTemplate,
                CssStyles = Input.CssStyles,
                JsScript = string.IsNullOrWhiteSpace(Input.JsScript) ? null : Input.JsScript,
                DefaultSectionListsJson = string.IsNullOrWhiteSpace(Input.DefaultSectionListsJson) ? null : Input.DefaultSectionListsJson,
                Version = string.IsNullOrWhiteSpace(Input.Version) ? "1.0.0" : Input.Version.Trim(),
                SortOrder = Input.SortOrder,
                IsActive = Input.IsActive,
                CreatedUtc = DateTime.UtcNow,
                UpdatedUtc = DateTime.UtcNow
            };

            _dbContext.MasterMarketplaceTemplates.Add(template);
            await _dbContext.SaveChangesAsync();

            TempData["StatusMessage"] = $"Template '{template.Name}' ({template.VariantCode}) created successfully.";
            return RedirectToPage("./Details", new { id = template.Id });
        }

        private async Task PopulateCategoriesAsync()
        {
            var categories = await _dbContext.MasterMarketplaceCategories
                .OrderBy(c => c.SortOrder)
                .ThenBy(c => c.Name)
                .ToListAsync();

            CategoryOptions = categories.Select(c => new SelectListItem
            {
                Value = c.Id.ToString(),
                Text = $"{c.Name} ({c.CategoryKey})"
            }).ToList();
        }

        /// <summary>
        /// Input model capturing form data for a new marketplace template.
        /// </summary>
        public class TemplateInputModel
        {
            /// <summary>
            /// Identifier of the marketplace category.
            /// </summary>
            [Required(ErrorMessage = "Please select a category.")]
            [Display(Name = "Category")]
            public Guid CategoryId { get; set; }

            /// <summary>
            /// Display name of the template.
            /// </summary>
            [Required(ErrorMessage = "Template name is required.")]
            [MaxLength(150)]
            [Display(Name = "Template Name")]
            public string Name { get; set; } = string.Empty;

            /// <summary>
            /// Unique programmatic variant code (e.g. Hero_SplitProduct).
            /// </summary>
            [Required(ErrorMessage = "Variant code is required.")]
            [MaxLength(100)]
            [Display(Name = "Variant Code")]
            public string VariantCode { get; set; } = string.Empty;

            /// <summary>
            /// Style classification tag (e.g. modern, dark, minimal, corporate).
            /// </summary>
            [MaxLength(50)]
            [Display(Name = "Style Tag")]
            public string Tag { get; set; } = "modern";

            /// <summary>
            /// Visual promotional badge (e.g. Popular, New, Trending).
            /// </summary>
            [MaxLength(50)]
            [Display(Name = "Badge Label")]
            public string? Badge { get; set; }

            /// <summary>
            /// Brief summary of what this template renders and its intended use case.
            /// </summary>
            [MaxLength(500)]
            [Display(Name = "Description")]
            public string? Description { get; set; }

            /// <summary>
            /// CSS gradient string used for thumbnail card preview.
            /// </summary>
            [MaxLength(150)]
            [Display(Name = "Thumbnail Gradient (CSS)")]
            public string ThumbnailGradient { get; set; } = "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)";

            /// <summary>
            /// Icon name or emoji displayed in preview card.
            /// </summary>
            [MaxLength(50)]
            [Display(Name = "Preview Icon")]
            public string PreviewIcon { get; set; } = "widgets";

            /// <summary>
            /// Mock header title for preview card.
            /// </summary>
            [MaxLength(200)]
            [Display(Name = "Preview Title")]
            public string? PreviewTitle { get; set; }

            /// <summary>
            /// Mock subtitle for preview card.
            /// </summary>
            [MaxLength(200)]
            [Display(Name = "Preview Subtitle")]
            public string? PreviewSubtitle { get; set; }

            /// <summary>
            /// Optional screenshot or demonstration image URL.
            /// </summary>
            [MaxLength(500)]
            [Display(Name = "Preview Image URL")]
            public string? PreviewImageUrl { get; set; }

            /// <summary>
            /// Pure semantic HTML markup with {{ Mustache }} tokens.
            /// </summary>
            [Required(ErrorMessage = "HTML markup template is required.")]
            [Display(Name = "HTML Template Markup")]
            public string HtmlTemplate { get; set; } = "<section class=\"oz-block\">\n    <div class=\"oz-container\">\n        <h2>{{ Title }}</h2>\n        <p>{{ Subtitle }}</p>\n    </div>\n</section>";

            /// <summary>
            /// Scoped CSS styles.
            /// </summary>
            [Required(ErrorMessage = "CSS styles are required.")]
            [Display(Name = "Scoped CSS Styles")]
            public string CssStyles { get; set; } = ".oz-block { padding: 80px 0; }\n.oz-container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }";

            /// <summary>
            /// Optional sandboxed JavaScript for client interactivity.
            /// </summary>
            [Display(Name = "Client JavaScript (Optional)")]
            public string? JsScript { get; set; }

            /// <summary>
            /// Optional JSON representation of default child list items.
            /// </summary>
            [Display(Name = "Default Section Lists (JSON)")]
            public string? DefaultSectionListsJson { get; set; }

            /// <summary>
            /// Semantic version tag.
            /// </summary>
            [MaxLength(20)]
            [Display(Name = "Version")]
            public string Version { get; set; } = "1.0.0";

            /// <summary>
            /// Presentation sort order.
            /// </summary>
            [Display(Name = "Sort Order")]
            public int SortOrder { get; set; } = 0;

            /// <summary>
            /// Whether template is published to public tenant catalog.
            /// </summary>
            [Display(Name = "Active & Published")]
            public bool IsActive { get; set; } = true;
        }
    }
}
