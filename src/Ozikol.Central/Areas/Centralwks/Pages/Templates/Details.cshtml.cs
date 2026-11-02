using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.Central.Services.Extraction;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Templates
{
    /// <summary>
    /// Details page model for deep inspection of a specific Master Marketplace Section/Template.
    /// Displays standalone sandbox preview, scoped CSS, tokenized HTML, and mock content schema.
    /// </summary>
    public class DetailsModel : PageModel
    {
        private readonly MasterCatalogDbContext _masterDb;
        private readonly INativeSectionExtractorService _nativeExtractor;
        private readonly ILogger<DetailsModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="DetailsModel"/> class.
        /// </summary>
        public DetailsModel(
            MasterCatalogDbContext masterDb,
            INativeSectionExtractorService nativeExtractor,
            ILogger<DetailsModel> logger)
        {
            _masterDb = masterDb ?? throw new ArgumentNullException(nameof(masterDb));
            _nativeExtractor = nativeExtractor ?? throw new ArgumentNullException(nameof(nativeExtractor));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        #region Properties

        /// <summary>
        /// Gets or sets the target marketplace template.
        /// </summary>
        public MasterMarketplaceTemplate Template { get; set; } = null!;

        /// <summary>
        /// Self-contained standalone HTML sandbox string for live iframe preview.
        /// </summary>
        public string SandboxPreviewHtml { get; set; } = string.Empty;

        #endregion

        /// <summary>
        /// Handles HTTP GET requests to inspect template details.
        /// </summary>
        /// <param name="id">Template unique identifier.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Razor Page result.</returns>
        public async Task<IActionResult> OnGetAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var template = await _masterDb.MasterMarketplaceTemplates
                .Include(t => t.Category)
                .Include(t => t.Placeholders)
                .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

            if (template == null)
            {
                return RedirectToPage("./Index");
            }

            Template = template;

            // Generate self-contained standalone HTML sandbox
            var secDto = new Ozikol.Central.Services.ExtractedSectionDto
            {
                Name = template.Name,
                VariantCode = template.VariantCode,
                CategoryKey = template.CategoryKey,
                HtmlTemplate = template.HtmlTemplate,
                ScopedCss = template.CssStyles,
                JsScript = template.JsScript,
                SampleContentJson = template.DefaultSectionListsJson
            };

            SandboxPreviewHtml = _nativeExtractor.BuildStandaloneSectionPreviewHtml(secDto, template.Name);

            return Page();
        }
    }
}
