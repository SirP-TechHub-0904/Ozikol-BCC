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

namespace Ozikol.Central.Areas.Centralwks.Pages.Support
{
    /// <summary>
    /// Page model for managing knowledge base frequently asked questions (FAQs) in Centralwks.
    /// </summary>
    public class FaqsModel : PageModel
    {
        private readonly MasterCatalogDbContext _context;
        private readonly ILogger<FaqsModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="FaqsModel"/> class.
        /// </summary>
        /// <param name="context">Master catalog database context.</param>
        /// <param name="logger">Structured logging service.</param>
        public FaqsModel(MasterCatalogDbContext context, ILogger<FaqsModel> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Gets or sets the list of FAQ entries matching query filters.
        /// </summary>
        public IList<MasterSupportFaq> Faqs { get; set; } = new List<MasterSupportFaq>();

        /// <summary>
        /// Gets or sets the search term filtering questions and answers.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Search { get; set; }

        /// <summary>
        /// Gets or sets the category filter (e.g. General, Support, Billing, Security).
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? CategoryFilter { get; set; }

        /// <summary>
        /// Gets or sets the publication status filter (All, Published, Draft).
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? PublishFilter { get; set; }

        /// <summary>
        /// Gets or sets the list of distinct categories currently present in the database.
        /// </summary>
        public IList<string> Categories { get; set; } = new List<string>();

        /// <summary>
        /// Gets or sets feedback or notification message for user action.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Handles HTTP GET requests to query and render FAQ entries.
        /// </summary>
        /// <returns>A task representing asynchronous execution.</returns>
        public async Task OnGetAsync()
        {
            Categories = await _context.MasterSupportFaqs
                .Where(f => !string.IsNullOrEmpty(f.Category))
                .Select(f => f.Category!)
                .Distinct()
                .OrderBy(c => c)
                .ToListAsync();

            var query = _context.MasterSupportFaqs.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(Search))
            {
                var term = Search.Trim().ToLower();
                query = query.Where(f => f.Question.ToLower().Contains(term) || f.Answer.ToLower().Contains(term));
            }

            if (!string.IsNullOrWhiteSpace(CategoryFilter) && CategoryFilter != "All")
            {
                query = query.Where(f => f.Category == CategoryFilter);
            }

            if (!string.IsNullOrWhiteSpace(PublishFilter) && PublishFilter != "All")
            {
                var isPublished = PublishFilter == "Published";
                query = query.Where(f => f.IsPublished == isPublished);
            }

            Faqs = await query
                .OrderBy(f => f.Category)
                .ThenBy(f => f.SortOrder)
                .ThenByDescending(f => f.CreatedUtc)
                .ToListAsync();
        }

        /// <summary>
        /// Handles toggling the published status of an FAQ entry.
        /// </summary>
        /// <param name="id">Unique identifier of the FAQ.</param>
        /// <returns>Redirects back to the FAQs list.</returns>
        public async Task<IActionResult> OnPostTogglePublishAsync(Guid id)
        {
            var faq = await _context.MasterSupportFaqs.FirstOrDefaultAsync(f => f.Id == id);
            if (faq == null)
            {
                StatusMessage = "Error: FAQ entry not found.";
                return RedirectToPage();
            }

            faq.IsPublished = !faq.IsPublished;
            faq.UpdatedUtc = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _logger.LogInformation("FAQ {Id} publication status changed to {IsPublished}", faq.Id, faq.IsPublished);
            StatusMessage = $"FAQ publication status updated to {(faq.IsPublished ? "Published" : "Draft")}.";
            return RedirectToPage();
        }

        /// <summary>
        /// Handles deleting an FAQ entry.
        /// </summary>
        /// <param name="id">Unique identifier of the FAQ to delete.</param>
        /// <returns>Redirects back to the FAQs list.</returns>
        public async Task<IActionResult> OnPostDeleteAsync(Guid id)
        {
            var faq = await _context.MasterSupportFaqs.FirstOrDefaultAsync(f => f.Id == id);
            if (faq == null)
            {
                StatusMessage = "Error: FAQ entry not found.";
                return RedirectToPage();
            }

            _context.MasterSupportFaqs.Remove(faq);
            await _context.SaveChangesAsync();

            _logger.LogInformation("FAQ {Id} deleted by operator.", faq.Id);
            StatusMessage = "FAQ entry has been permanently deleted.";
            return RedirectToPage();
        }
    }
}
