using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

using Ozikol.MasterPersistence.EF.MasterSQL.Seeding;

namespace Ozikol.Central.Areas.Centralwks.Pages.Legal
{
    /// <summary>
    /// Page model for managing regulatory legal policies, terms of service, privacy notices,
    /// and compliance agreements in Centralwks.
    /// </summary>
    public class IndexModel : PageModel
    {
        private readonly MasterCatalogDbContext _context;
        private readonly ILogger<IndexModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="IndexModel"/> class.
        /// </summary>
        /// <param name="context">Master catalog database context.</param>
        /// <param name="logger">Structured logging service.</param>
        public IndexModel(MasterCatalogDbContext context, ILogger<IndexModel> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Gets or sets the list of legal documents.
        /// </summary>
        public IList<MasterLegalDocument> Documents { get; set; } = new List<MasterLegalDocument>();

        /// <summary>
        /// Gets or sets available categories for filtering.
        /// </summary>
        public IList<string> Categories { get; set; } = new List<string>();

        /// <summary>
        /// Gets or sets available cultures for filtering.
        /// </summary>
        public IList<string> Cultures { get; set; } = new List<string>();

        /// <summary>
        /// Gets or sets total documents count.
        /// </summary>
        public int TotalCount { get; set; }

        /// <summary>
        /// Gets or sets published documents count.
        /// </summary>
        public int PublishedCount { get; set; }

        /// <summary>
        /// Gets or sets search query.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Search { get; set; }

        /// <summary>
        /// Gets or sets category filter.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? CategoryFilter { get; set; }

        /// <summary>
        /// Gets or sets culture language filter.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? CultureFilter { get; set; }

        /// <summary>
        /// Gets or sets status notification message.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Handles HTTP GET request to list legal policy documents.
        /// </summary>
        public async Task OnGetAsync()
        {
            if (!await _context.MasterLegalDocuments.AnyAsync())
            {
                await MasterCatalogDataSeeder.SeedLegalDocumentsAsync(_context);
            }

            TotalCount = await _context.MasterLegalDocuments.CountAsync();
            PublishedCount = await _context.MasterLegalDocuments.CountAsync(d => d.IsPublished);

            Categories = await _context.MasterLegalDocuments
                .Select(d => d.Category)
                .Distinct()
                .OrderBy(c => c)
                .ToListAsync();

            Cultures = await _context.MasterLegalDocuments
                .Select(d => d.Culture)
                .Distinct()
                .OrderBy(c => c)
                .ToListAsync();

            var query = _context.MasterLegalDocuments
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(Search))
            {
                var term = Search.Trim().ToLowerInvariant();
                query = query.Where(d => d.Title.ToLower().Contains(term)
                                      || d.Slug.ToLower().Contains(term)
                                      || d.Summary.ToLower().Contains(term));
            }

            if (!string.IsNullOrWhiteSpace(CategoryFilter) && CategoryFilter != "All")
            {
                query = query.Where(d => d.Category == CategoryFilter);
            }

            if (!string.IsNullOrWhiteSpace(CultureFilter) && CultureFilter != "All")
            {
                query = query.Where(d => d.Culture == CultureFilter);
            }

            Documents = await query
                .OrderBy(d => d.Category)
                .ThenBy(d => d.SortOrder)
                .ThenBy(d => d.Title)
                .ToListAsync();
        }

        /// <summary>
        /// Toggles the public visibility of a legal document.
        /// </summary>
        /// <param name="id">The document unique identifier.</param>
        /// <returns>Redirect back to index.</returns>
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
                ? $"Document '{doc.Title}' is now published live."
                : $"Document '{doc.Title}' is now unlisted (draft).";

            _logger.LogInformation("Central operator toggled legal document {DocId} publish status to {IsPublished}", id, doc.IsPublished);
            return RedirectToPage();
        }

        /// <summary>
        /// Permanently deletes a legal document.
        /// </summary>
        /// <param name="id">The document unique identifier.</param>
        /// <returns>Redirect back to index.</returns>
        public async Task<IActionResult> OnPostDeleteAsync(Guid id)
        {
            var doc = await _context.MasterLegalDocuments.FindAsync(id);
            if (doc != null)
            {
                _context.MasterLegalDocuments.Remove(doc);
                await _context.SaveChangesAsync();
                _logger.LogWarning("Central operator deleted legal document {DocId} ({Title})", id, doc.Title);
            }

            TempData["StatusMessage"] = "Legal document deleted successfully.";
            return RedirectToPage();
        }
    }
}
