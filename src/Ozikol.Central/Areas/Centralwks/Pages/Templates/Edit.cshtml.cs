using System;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.Central.Services;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Templates
{
    /// <summary>
    /// Edit page model for modifying an existing Master Marketplace Template Section.
    /// Supports direct code editing and live AI-powered conversational section tweaking.
    /// </summary>
    public class EditModel : PageModel
    {
        private readonly MasterCatalogDbContext _masterDb;
        private readonly ISectionAiStudioService _aiStudioService;
        private readonly ILogger<EditModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="EditModel"/> class.
        /// </summary>
        public EditModel(
            MasterCatalogDbContext masterDb,
            ISectionAiStudioService aiStudioService,
            ILogger<EditModel> logger)
        {
            _masterDb = masterDb ?? throw new ArgumentNullException(nameof(masterDb));
            _aiStudioService = aiStudioService ?? throw new ArgumentNullException(nameof(aiStudioService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        #region Input Model

        /// <summary>
        /// Edit form input model.
        /// </summary>
        public class InputModel
        {
            [Required]
            public Guid Id { get; set; }

            [Required]
            [MaxLength(150)]
            public string Name { get; set; } = string.Empty;

            [Required]
            [MaxLength(100)]
            public string VariantCode { get; set; } = string.Empty;

            [Required]
            [MaxLength(50)]
            public string CategoryKey { get; set; } = "bodysections";

            [MaxLength(50)]
            public string? Badge { get; set; }

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

        public MasterMarketplaceTemplate Template { get; set; } = null!;

        #endregion

        /// <summary>
        /// Handles HTTP GET requests to populate the edit form.
        /// </summary>
        public async Task<IActionResult> OnGetAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var template = await _masterDb.MasterMarketplaceTemplates
                .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

            if (template == null)
            {
                return RedirectToPage("./Index");
            }

            Template = template;
            Input = new InputModel
            {
                Id = template.Id,
                Name = template.Name,
                VariantCode = template.VariantCode,
                CategoryKey = template.CategoryKey,
                Badge = template.Badge,
                Description = template.Description,
                HtmlTemplate = template.HtmlTemplate,
                CssStyles = template.CssStyles,
                JsScript = template.JsScript,
                DefaultSectionListsJson = template.DefaultSectionListsJson
            };

            return Page();
        }

        /// <summary>
        /// Handles HTTP POST requests to save template modifications.
        /// </summary>
        public async Task<IActionResult> OnPostAsync(CancellationToken cancellationToken = default)
        {
            if (!ModelState.IsValid)
            {
                return Page();
            }

            var template = await _masterDb.MasterMarketplaceTemplates
                .FirstOrDefaultAsync(t => t.Id == Input.Id, cancellationToken);

            if (template == null)
            {
                return RedirectToPage("./Index");
            }

            template.Name = Input.Name.Trim();
            template.VariantCode = Input.VariantCode.Trim();
            template.CategoryKey = Input.CategoryKey.Trim();
            template.Badge = Input.Badge?.Trim();
            template.Description = Input.Description?.Trim();
            template.HtmlTemplate = Input.HtmlTemplate;
            template.CssStyles = Input.CssStyles;
            template.JsScript = Input.JsScript;
            template.DefaultSectionListsJson = Input.DefaultSectionListsJson;
            template.UpdatedUtc = DateTime.UtcNow;

            await _masterDb.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Updated Master Marketplace Template {Id} ({VariantCode})", template.Id, template.VariantCode);
            return RedirectToPage("./Details", new { id = template.Id });
        }

        /// <summary>
        /// Handles AJAX AI Tweak requests for conversational refinement.
        /// </summary>
        public async Task<IActionResult> OnPostAiTweakAsync([FromBody] SectionAiTweakRequestDto request, CancellationToken cancellationToken = default)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.UserPrompt))
            {
                return new JsonResult(new { success = false, message = "Prompt is required." });
            }

            var result = await _aiStudioService.TweakSectionAsync(request, cancellationToken);
            return new JsonResult(result);
        }
    }
}
