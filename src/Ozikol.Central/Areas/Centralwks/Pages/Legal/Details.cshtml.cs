using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Legal
{
    /// <summary>
    /// Page model for viewing full legal policy clauses, inspecting versioning metadata,
    /// and managing publication toggles in Centralwks.
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
        /// Gets or sets the target legal policy document.
        /// </summary>
        public MasterLegalDocument Document { get; set; } = null!;

        /// <summary>
        /// Gets or sets status notification message.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Handles HTTP GET request to load legal document details.
        /// </summary>
        /// <param name="id">The unique identifier of the legal document.</param>
        /// <returns>Page result or NotFound.</returns>
        public async Task<IActionResult> OnGetAsync(Guid id)
        {
            var doc = await _context.MasterLegalDocuments
                .AsNoTracking()
                .FirstOrDefaultAsync(d => d.Id == id);

            if (doc == null)
            {
                return NotFound();
            }

            Document = doc;
            return Page();
        }

        /// <summary>
        /// Toggles the public visibility of the legal policy.
        /// </summary>
        /// <param name="id">The unique identifier of the legal document.</param>
        /// <returns>Redirect back to details page.</returns>
        public async Task<IActionResult> OnPostTogglePublishAsync(Guid id)
        {
            var doc = await _context.MasterLegalDocuments.FindAsync(id);
            if (doc == null)
            {
                return NotFound();
            }

            doc.IsPublished = !doc.IsPublished;
            doc.LastUpdatedUtc = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            StatusMessage = doc.IsPublished
                ? $"Policy '{doc.Title}' is now live and public."
                : $"Policy '{doc.Title}' reverted to draft (unlisted).";

            _logger.LogInformation("Central operator toggled legal policy {DocId} publish status to {IsPublished}", id, doc.IsPublished);
            return RedirectToPage(new { id });
        }

        /// <summary>
        /// Permanently deletes the legal document.
        /// </summary>
        /// <param name="id">The unique identifier of the legal document.</param>
        /// <returns>Redirect to legal index page.</returns>
        public async Task<IActionResult> OnPostDeleteAsync(Guid id)
        {
            var doc = await _context.MasterLegalDocuments.FindAsync(id);
            if (doc != null)
            {
                _context.MasterLegalDocuments.Remove(doc);
                await _context.SaveChangesAsync();
                _logger.LogWarning("Central operator deleted legal document {DocId} ({Title})", id, doc.Title);
            }

            TempData["StatusMessage"] = "Legal document deleted.";
            return RedirectToPage("/Legal/Index");
        }
    }
}
