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
    /// Page model for editing an existing marketplace component template in the Creator Studio.
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
        /// Gets or sets the template unique identifier.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public Guid Id { get; set; }

        /// <summary>
        /// Gets or sets the template edit input model.
        /// </summary>
        [BindProperty]
        public TemplateEditModel Input { get; set; } = new TemplateEditModel();

        /// <summary>
        /// Gets or sets available marketplace categories for selection.
        /// </summary>
        public IList<MasterMarketplaceCategory> Categories { get; set; } = new List<MasterMarketplaceCategory>();

        /// <summary>
        /// Input model for modifying an existing marketplace template.
        /// </summary>
        public class TemplateEditModel
        {
            /// <summary>Gets or sets template headline.</summary>
            [Required(ErrorMessage = "Template name is required.")]
            [MaxLength(150)]
            public string Name { get; set; } = string.Empty;

            /// <summary>Gets or sets variant permacode.</summary>
            [Required(ErrorMessage = "Variant code is required.")]
            [MaxLength(100)]
            public string VariantCode { get; set; } = string.Empty;

            /// <summary>Gets or sets category ID.</summary>
            [Required(ErrorMessage = "Please select a category.")]
            public Guid CategoryId { get; set; }

            /// <summary>Gets or sets theme tag.</summary>
            [Required]
            [MaxLength(50)]
            public string Tag { get; set; } = "modern";

            /// <summary>Gets or sets marketing badge.</summary>
            [MaxLength(50)]
            public string? Badge { get; set; }

            /// <summary>Gets or sets feature summary.</summary>
            [MaxLength(500)]
            public string? Description { get; set; }

            /// <summary>Gets or sets CSS thumbnail gradient.</summary>
            [MaxLength(150)]
            public string ThumbnailGradient { get; set; } = "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)";

            /// <summary>Gets or sets semantic HTML markup.</summary>
            [Required(ErrorMessage = "Semantic HTML markup is required.")]
            public string HtmlTemplate { get; set; } = string.Empty;

            /// <summary>Gets or sets scoped CSS stylesheet.</summary>
            [Required(ErrorMessage = "Scoped CSS stylesheet is required.")]
            public string CssStyles { get; set; } = string.Empty;

            /// <summary>Gets or sets sandboxed JavaScript hook.</summary>
            public string? JsScript { get; set; }

            /// <summary>Gets or sets semantic version.</summary>
            [MaxLength(20)]
            public string Version { get; set; } = "1.0.0";

            /// <summary>Gets or sets whether the template is published live.</summary>
            public bool IsActive { get; set; }
        }

        /// <summary>
        /// Handles HTTP GET request to prefill template editing fields.
        /// </summary>
        /// <param name="id">Template unique identifier.</param>
        /// <returns>Page result or NotFound.</returns>
        public async Task<IActionResult> OnGetAsync(Guid id)
        {
            var template = await _context.MasterMarketplaceTemplates
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.Id == id);

            if (template == null)
            {
                return NotFound();
            }

            Id = id;
            Categories = await _context.MasterMarketplaceCategories
                .OrderBy(c => c.SortOrder)
                .ToListAsync();

            Input = new TemplateEditModel
            {
                Name = template.Name,
                VariantCode = template.VariantCode,
                CategoryId = template.CategoryId,
                Tag = template.Tag,
                Badge = template.Badge,
                Description = template.Description,
                ThumbnailGradient = template.ThumbnailGradient,
                HtmlTemplate = template.HtmlTemplate,
                CssStyles = template.CssStyles,
                JsScript = template.JsScript,
                Version = template.Version,
                IsActive = template.IsActive
            };

            return Page();
        }

        /// <summary>
        /// Handles HTTP POST request to update template specifications.
        /// </summary>
        /// <param name="id">Template unique identifier.</param>
        /// <returns>Redirect to details on success or page on validation error.</returns>
        public async Task<IActionResult> OnPostAsync(Guid id)
        {
            Categories = await _context.MasterMarketplaceCategories
                .OrderBy(c => c.SortOrder)
                .ToListAsync();

            if (!ModelState.IsValid)
            {
                return Page();
            }

            var template = await _context.MasterMarketplaceTemplates.FindAsync(id);
            if (template == null)
            {
                return NotFound();
            }

            var category = await _context.MasterMarketplaceCategories.FindAsync(Input.CategoryId);
            if (category == null)
            {
                ModelState.AddModelError("Input.CategoryId", "Selected category does not exist.");
                return Page();
            }

            // Check variant code uniqueness if changed
            var trimmedVariant = Input.VariantCode.Trim();
            if (trimmedVariant != template.VariantCode && await _context.MasterMarketplaceTemplates.AnyAsync(t => t.VariantCode == trimmedVariant && t.Id != id))
            {
                ModelState.AddModelError("Input.VariantCode", "A template with this variant code already exists.");
                return Page();
            }

            template.Name = Input.Name.Trim();
            template.VariantCode = trimmedVariant;
            template.CategoryId = category.Id;
            template.CategoryKey = category.CategoryKey;
            template.Tag = Input.Tag.Trim().ToLowerInvariant();
            template.Badge = string.IsNullOrWhiteSpace(Input.Badge) ? null : Input.Badge.Trim();
            template.Description = Input.Description?.Trim();
            template.ThumbnailGradient = Input.ThumbnailGradient.Trim();
            template.HtmlTemplate = Input.HtmlTemplate;
            template.CssStyles = Input.CssStyles;
            template.JsScript = string.IsNullOrWhiteSpace(Input.JsScript) ? null : Input.JsScript;
            template.Version = Input.Version.Trim();
            template.IsActive = Input.IsActive;
            template.UpdatedUtc = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Creator updated marketplace template {TemplateId} ({VariantCode})", id, template.VariantCode);
            TempData["StatusMessage"] = $"Template '{template.Name}' updated successfully.";

            return RedirectToPage("/Templates/Details", new { id });
        }
    }
}
