using System;
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
    /// Page model for the sandboxed fullscreen template canvas renderer,
    /// compiling raw HTML markup, scoped CSS rules, and client-side JavaScript execution hooks.
    /// </summary>
    public class PreviewModel : PageModel
    {
        private readonly MasterCatalogDbContext _context;
        private readonly ILogger<PreviewModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="PreviewModel"/> class.
        /// </summary>
        /// <param name="context">Master catalog database context.</param>
        /// <param name="logger">Structured logging service.</param>
        public PreviewModel(MasterCatalogDbContext context, ILogger<PreviewModel> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Gets or sets the target marketplace template.
        /// </summary>
        public MasterMarketplaceTemplate Template { get; set; } = null!;

        /// <summary>
        /// Gets or sets the compiled HTML markup with sample placeholder replacements.
        /// </summary>
        public string CompiledHtml { get; set; } = string.Empty;

        /// <summary>
        /// Handles HTTP GET request to compile and render the template canvas.
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

            Template = template;

            // Replace standard Mustache mock data placeholders
            var html = template.HtmlTemplate
                .Replace("{{ Title }}", template.Name)
                .Replace("{{ Title}}", template.Name)
                .Replace("{{ MiniTitle }}", template.CategoryKey.ToUpperInvariant())
                .Replace("{{ MiniTitle}}", template.CategoryKey.ToUpperInvariant())
                .Replace("{{ Description }}", template.Description ?? "High-performance sovereign enterprise multi-tenant cloud architecture.")
                .Replace("{{ Description}}", template.Description ?? "High-performance sovereign enterprise multi-tenant cloud architecture.")
                .Replace("{{ ImageUrl }}", template.PreviewImageUrl ?? "/images/oz-logo.png")
                .Replace("{{ ImageUrl}}", template.PreviewImageUrl ?? "/images/oz-logo.png");

            CompiledHtml = html;
            return Page();
        }
    }
}
