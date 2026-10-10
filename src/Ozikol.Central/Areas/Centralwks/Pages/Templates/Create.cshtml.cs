using System;
using System.ComponentModel.DataAnnotations;
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
    /// Create page model for authoring a new Master Marketplace Template / Section from scratch.
    /// </summary>
    public class CreateModel : PageModel
    {
        private readonly MasterCatalogDbContext _masterDb;
        private readonly ILogger<CreateModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="CreateModel"/> class.
        /// </summary>
        public CreateModel(MasterCatalogDbContext masterDb, ILogger<CreateModel> logger)
        {
            _masterDb = masterDb ?? throw new ArgumentNullException(nameof(masterDb));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        #region Input Model

        /// <summary>
        /// Form input model for template creation.
        /// </summary>
        public class InputModel
        {
            [Required]
            [MaxLength(150)]
            public string Name { get; set; } = string.Empty;

            [Required]
            [MaxLength(100)]
            public string VariantCode { get; set; } = string.Empty;

            [Required]
            [MaxLength(50)]
            public string CategoryKey { get; set; } = "hero";

            [MaxLength(50)]
            public string? Badge { get; set; } = "New";

            [MaxLength(500)]
            public string? Description { get; set; }

            [Required]
            public string HtmlTemplate { get; set; } = string.Empty;

            [Required]
            public string CssStyles { get; set; } = string.Empty;

            public string? JsScript { get; set; }

            public string? DefaultSectionListsJson { get; set; }
        }

        [BindProperty]
        public InputModel Input { get; set; } = new();

        #endregion

        /// <summary>
        /// Handles HTTP GET requests.
        /// </summary>
        public void OnGet()
        {
            // Provide clean initial template starter
            Input = new InputModel
            {
                Name = "Hero Feature Showcase",
                VariantCode = $"hero_{DateTime.UtcNow.Ticks % 10000:D4}",
                CategoryKey = "hero",
                Badge = "New",
                Description = "High-impact hero section with dual action buttons and background gradient.",
                HtmlTemplate = @"<section class=""py-5 bg-dark text-white position-relative overflow-hidden"">
  <div class=""container py-5"">
    <div class=""row align-items-center g-5"">
      <div class=""col-lg-6"">
        <span class=""badge bg-primary-subtle text-primary rounded-pill px-3 py-2 fw-medium mb-3"">{{BadgeText}}</span>
        <h1 class=""display-4 fw-bold mb-3"">{{Title}}</h1>
        <p class=""lead text-muted mb-4"">{{Description}}</p>
        <div class=""d-flex flex-wrap gap-3"">
          <a href=""{{ButtonLink}}"" class=""btn btn-primary btn-lg rounded-pill px-4 fw-bold"">{{ButtonText}}</a>
          <a href=""{{SecondaryButtonLink}}"" class=""btn btn-outline-light btn-lg rounded-pill px-4"">{{SecondaryButtonText}}</a>
        </div>
      </div>
      <div class=""col-lg-6 text-center"">
        <img src=""{{ImageUrl}}"" alt=""{{Title}}"" class=""img-fluid rounded-4 shadow-lg"" />
      </div>
    </div>
  </div>
</section>",
                CssStyles = @".hero-banner-area section {
  background: radial-gradient(circle at top right, #1e1b4b, #0f172a);
}",
                DefaultSectionListsJson = @"[
  { ""Title"": ""High Performance"", ""Description"": ""Sub-second load times"" },
  { ""Title"": ""Modular Design"", ""Description"": ""Seamlessly swappable components"" }
]"
            };
        }

        /// <summary>
        /// Handles HTTP POST requests to create a new template section.
        /// </summary>
        public async Task<IActionResult> OnPostAsync(CancellationToken cancellationToken = default)
        {
            if (!ModelState.IsValid)
            {
                return Page();
            }

            var category = await _masterDb.MasterMarketplaceCategories
                .FirstOrDefaultAsync(c => c.CategoryKey.ToLower() == Input.CategoryKey.ToLower(), cancellationToken);

            if (category == null)
            {
                category = await _masterDb.MasterMarketplaceCategories.FirstOrDefaultAsync(cancellationToken);
                if (category == null)
                {
                    ModelState.AddModelError(string.Empty, "No marketplace categories configured.");
                    return Page();
                }
            }

            var cleanVariant = Input.VariantCode.Trim();

            var exists = await _masterDb.MasterMarketplaceTemplates
                .AnyAsync(t => t.VariantCode == cleanVariant, cancellationToken);

            if (exists)
            {
                ModelState.AddModelError("Input.VariantCode", "A section with this variant code already exists.");
                return Page();
            }

            var newTemplate = new MasterMarketplaceTemplate
            {
                Id = Guid.NewGuid(),
                CategoryId = category.Id,
                CategoryKey = category.CategoryKey,
                Name = Input.Name.Trim(),
                VariantCode = cleanVariant,
                Tag = "modern",
                Badge = Input.Badge?.Trim() ?? "New",
                Description = Input.Description?.Trim(),
                HtmlTemplate = Input.HtmlTemplate,
                CssStyles = Input.CssStyles,
                JsScript = Input.JsScript,
                DefaultSectionListsJson = Input.DefaultSectionListsJson,
                IsActive = true,
                CreatedUtc = DateTime.UtcNow
            };

            _masterDb.MasterMarketplaceTemplates.Add(newTemplate);
            await _masterDb.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Created new Master Marketplace Template {Id} ({VariantCode})", newTemplate.Id, newTemplate.VariantCode);
            return RedirectToPage("./Details", new { id = newTemplate.Id });
        }
    }
}
