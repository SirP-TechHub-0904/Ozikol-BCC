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
    /// PageModel for editing an existing UI Marketplace template blueprint, its HTML tokens, scoped CSS, and preview card parameters.
    /// </summary>
    public class EditModel : PageModel
    {
        private readonly MasterCatalogDbContext _dbContext;

        /// <summary>
        /// Initializes a new instance of the <see cref="EditModel"/> class.
        /// </summary>
        /// <param name="dbContext">Master catalog database context.</param>
        public EditModel(MasterCatalogDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        /// <summary>
        /// The unique primary key identifier of the template being edited.
        /// </summary>
        [FromRoute]
        public Guid Id { get; set; }

        /// <summary>
        /// Input model carrying template changes.
        /// </summary>
        [BindProperty]
        public TemplateEditInputModel Input { get; set; } = new();

        /// <summary>
        /// Available category options for selection.
        /// </summary>
        public List<SelectListItem> CategoryOptions { get; set; } = new();

        /// <summary>
        /// Handles HTTP GET requests to load existing template definition.
        /// </summary>
        public async Task<IActionResult> OnGetAsync(Guid id)
        {
            var template = await _dbContext.MasterMarketplaceTemplates.FindAsync(id);
            if (template == null)
            {
                return NotFound($"Template with ID {id} was not found.");
            }

            Id = template.Id;
            Input = new TemplateEditInputModel
            {
                CategoryId = template.CategoryId,
                Name = template.Name,
                VariantCode = template.VariantCode,
                Tag = template.Tag,
                Badge = template.Badge,
                Description = template.Description,
                ThumbnailGradient = template.ThumbnailGradient,
                PreviewIcon = template.PreviewIcon,
                PreviewTitle = template.PreviewTitle,
                PreviewSubtitle = template.PreviewSubtitle,
                PreviewImageUrl = template.PreviewImageUrl,
                HtmlTemplate = template.HtmlTemplate,
                CssStyles = template.CssStyles,
                JsScript = template.JsScript,
                DefaultSectionListsJson = template.DefaultSectionListsJson,
                Version = template.Version,
                SortOrder = template.SortOrder,
                IsActive = template.IsActive
            };

            await PopulateCategoriesAsync();
            return Page();
        }

        /// <summary>
        /// Handles HTTP POST requests to validate and save modifications to the template.
        /// </summary>
        public async Task<IActionResult> OnPostAsync(Guid id)
        {
            if (!ModelState.IsValid)
            {
                await PopulateCategoriesAsync();
                return Page();
            }

            var template = await _dbContext.MasterMarketplaceTemplates.FindAsync(id);
            if (template == null)
            {
                return NotFound();
            }

            var cleanVariant = Input.VariantCode.Trim();

            // Verify unique variant code on other templates
            var duplicateVariant = await _dbContext.MasterMarketplaceTemplates
                .AnyAsync(t => t.Id != id && t.VariantCode.ToLower() == cleanVariant.ToLower());

            if (duplicateVariant)
            {
                ModelState.AddModelError("Input.VariantCode", $"Variant code '{cleanVariant}' is already in use by another template.");
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

            template.CategoryId = category.Id;
            template.CategoryKey = category.CategoryKey;
            template.Name = Input.Name.Trim();
            template.VariantCode = cleanVariant;
            template.Tag = string.IsNullOrWhiteSpace(Input.Tag) ? "modern" : Input.Tag.Trim().ToLowerInvariant();
            template.Badge = string.IsNullOrWhiteSpace(Input.Badge) ? null : Input.Badge.Trim();
            template.Description = Input.Description?.Trim();
            template.ThumbnailGradient = string.IsNullOrWhiteSpace(Input.ThumbnailGradient) 
                ? "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)" 
                : Input.ThumbnailGradient.Trim();
            template.PreviewIcon = string.IsNullOrWhiteSpace(Input.PreviewIcon) ? "widgets" : Input.PreviewIcon.Trim();
            template.PreviewTitle = Input.PreviewTitle?.Trim();
            template.PreviewSubtitle = Input.PreviewSubtitle?.Trim();
            template.PreviewImageUrl = Input.PreviewImageUrl?.Trim();
            template.HtmlTemplate = Input.HtmlTemplate;
            template.CssStyles = Input.CssStyles;
            template.JsScript = string.IsNullOrWhiteSpace(Input.JsScript) ? null : Input.JsScript;
            template.DefaultSectionListsJson = string.IsNullOrWhiteSpace(Input.DefaultSectionListsJson) ? null : Input.DefaultSectionListsJson;
            template.Version = string.IsNullOrWhiteSpace(Input.Version) ? "1.0.0" : Input.Version.Trim();
            template.SortOrder = Input.SortOrder;
            template.IsActive = Input.IsActive;
            template.UpdatedUtc = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync();

            TempData["StatusMessage"] = $"Template '{template.Name}' updated successfully.";
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
        /// Input model carrying edited template parameters.
        /// </summary>
        public class TemplateEditInputModel
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
            /// Unique programmatic variant code.
            /// </summary>
            [Required(ErrorMessage = "Variant code is required.")]
            [MaxLength(100)]
            [Display(Name = "Variant Code")]
            public string VariantCode { get; set; } = string.Empty;

            /// <summary>
            /// Style classification tag.
            /// </summary>
            [MaxLength(50)]
            [Display(Name = "Style Tag")]
            public string Tag { get; set; } = "modern";

            /// <summary>
            /// Promotional badge.
            /// </summary>
            [MaxLength(50)]
            [Display(Name = "Badge Label")]
            public string? Badge { get; set; }

            /// <summary>
            /// Description and usage guidance.
            /// </summary>
            [MaxLength(500)]
            [Display(Name = "Description")]
            public string? Description { get; set; }

            /// <summary>
            /// CSS gradient string for thumbnail.
            /// </summary>
            [MaxLength(150)]
            [Display(Name = "Thumbnail Gradient")]
            public string ThumbnailGradient { get; set; } = string.Empty;

            /// <summary>
            /// Preview icon.
            /// </summary>
            [MaxLength(50)]
            [Display(Name = "Preview Icon")]
            public string PreviewIcon { get; set; } = "widgets";

            /// <summary>
            /// Preview title.
            /// </summary>
            [MaxLength(200)]
            [Display(Name = "Preview Title")]
            public string? PreviewTitle { get; set; }

            /// <summary>
            /// Preview subtitle.
            /// </summary>
            [MaxLength(200)]
            [Display(Name = "Preview Subtitle")]
            public string? PreviewSubtitle { get; set; }

            /// <summary>
            /// Demo image URL.
            /// </summary>
            [MaxLength(500)]
            [Display(Name = "Preview Image URL")]
            public string? PreviewImageUrl { get; set; }

            /// <summary>
            /// Semantic HTML template markup.
            /// </summary>
            [Required(ErrorMessage = "HTML template markup is required.")]
            [Display(Name = "HTML Template Markup")]
            public string HtmlTemplate { get; set; } = string.Empty;

            /// <summary>
            /// Scoped CSS styles.
            /// </summary>
            [Required(ErrorMessage = "CSS styles are required.")]
            [Display(Name = "Scoped CSS Styles")]
            public string CssStyles { get; set; } = string.Empty;

            /// <summary>
            /// Sandboxed client script.
            /// </summary>
            [Display(Name = "Client JavaScript (Optional)")]
            public string? JsScript { get; set; }

            /// <summary>
            /// Default section list items JSON.
            /// </summary>
            [Display(Name = "Default Section Lists (JSON)")]
            public string? DefaultSectionListsJson { get; set; }

            /// <summary>
            /// Version tag.
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
            /// Whether template is published.
            /// </summary>
            [Display(Name = "Active & Published")]
            public bool IsActive { get; set; } = true;
        }
    }
}
