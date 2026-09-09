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
    /// Page model for inspecting a template's authored markup, scoped styling rules,
    /// metadata properties, and live canvas rendering in the Creator Studio.
    /// </summary>
    public class DetailsModel : PageModel
    {
        private readonly MasterCatalogDbContext _context;
        private readonly ILogger<DetailsModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="DetailsModel"/> class.
        /// </summary>
        /// <param name="context">Master catalog database context.</param>
        /// <param name="logger">Structured logging service.</param>
        public DetailsModel(MasterCatalogDbContext context, ILogger<DetailsModel> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Gets or sets the target component template.
        /// </summary>
        public MasterMarketplaceTemplate Template { get; set; } = null!;

        /// <summary>
        /// Gets or sets notification message.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Handles HTTP GET request to load template details.
        /// </summary>
        /// <param name="id">Template unique identifier.</param>
        /// <returns>Page result or NotFound.</returns>
        public async Task<IActionResult> OnGetAsync(Guid id)
        {
            var template = await _context.MasterMarketplaceTemplates
                .Include(t => t.Category)
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.Id == id);

            if (template == null)
            {
                return NotFound();
            }

            Template = template;
            return Page();
        }

        /// <summary>
        /// Toggles active publication status.
        /// </summary>
        /// <param name="id">Template unique identifier.</param>
        /// <returns>Redirect back to details.</returns>
        public async Task<IActionResult> OnPostToggleActiveAsync(Guid id)
        {
            var template = await _context.MasterMarketplaceTemplates.FindAsync(id);
            if (template == null)
            {
                return NotFound();
            }

            template.IsActive = !template.IsActive;
            template.UpdatedUtc = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            StatusMessage = template.IsActive
                ? $"Template '{template.Name}' is now published live in the marketplace."
                : $"Template '{template.Name}' reverted to draft.";

            _logger.LogInformation("Creator toggled template {TemplateId} active state to {IsActive}", id, template.IsActive);
            return RedirectToPage(new { id });
        }

        /// <summary>
        /// Deletes the template.
        /// </summary>
        /// <param name="id">Template unique identifier.</param>
        /// <returns>Redirect to templates index.</returns>
        public async Task<IActionResult> OnPostDeleteAsync(Guid id)
        {
            var template = await _context.MasterMarketplaceTemplates.FindAsync(id);
            if (template != null)
            {
                _context.MasterMarketplaceTemplates.Remove(template);
                await _context.SaveChangesAsync();
                _logger.LogWarning("Creator deleted template {TemplateId} ({Name})", id, template.Name);
                TempData["StatusMessage"] = $"Template '{template.Name}' deleted.";
                return RedirectToPage("/Templates/Index");
            }

            return RedirectToPage(new { id });
        }
    }
}
