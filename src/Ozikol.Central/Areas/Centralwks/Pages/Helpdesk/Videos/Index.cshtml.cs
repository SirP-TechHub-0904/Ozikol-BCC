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

namespace Ozikol.Central.Areas.Centralwks.Pages.Helpdesk.Videos
{
    /// <summary>
    /// Page model for managing YouTube video walkthroughs, suite screencasts, and interactive tutorials in Centralwks.
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
        /// Gets or sets the list of video guides.
        /// </summary>
        public IList<MasterVideoGuide> Videos { get; set; } = new List<MasterVideoGuide>();

        /// <summary>
        /// Gets or sets available enterprise suite codes.
        /// </summary>
        public IList<string> Suites { get; set; } = new List<string>();

        /// <summary>
        /// Gets or sets available culture languages.
        /// </summary>
        public IList<string> Cultures { get; set; } = new List<string>();

        /// <summary>
        /// Gets or sets total video count.
        /// </summary>
        public int TotalCount { get; set; }

        /// <summary>
        /// Gets or sets published video count.
        /// </summary>
        public int PublishedCount { get; set; }

        /// <summary>
        /// Gets or sets total view count.
        /// </summary>
        public int TotalViews { get; set; }

        /// <summary>
        /// Gets or sets cumulative duration in minutes.
        /// </summary>
        public int TotalDurationMinutes { get; set; }

        /// <summary>
        /// Gets or sets search query.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Search { get; set; }

        /// <summary>
        /// Gets or sets suite filter.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? SuiteFilter { get; set; }

        /// <summary>
        /// Gets or sets culture filter.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? CultureFilter { get; set; }

        /// <summary>
        /// Gets or sets status notification message.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Handles HTTP GET request to query video tutorials.
        /// </summary>
        public async Task OnGetAsync()
        {
            TotalCount = await _context.MasterVideoGuides.CountAsync();
            PublishedCount = await _context.MasterVideoGuides.CountAsync(v => v.IsPublished);
            TotalViews = await _context.MasterVideoGuides.SumAsync(v => (int?)v.ViewCount) ?? 0;
            var totalSeconds = await _context.MasterVideoGuides.SumAsync(v => (int?)v.DurationSeconds) ?? 0;
            TotalDurationMinutes = totalSeconds / 60;

            Suites = await _context.MasterVideoGuides
                .Select(v => v.SuiteCode)
                .Distinct()
                .OrderBy(s => s)
                .ToListAsync();

            Cultures = await _context.MasterVideoGuides
                .Select(v => v.Culture)
                .Distinct()
                .OrderBy(c => c)
                .ToListAsync();

            var query = _context.MasterVideoGuides
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(Search))
            {
                var term = Search.Trim().ToLowerInvariant();
                query = query.Where(v => v.Title.ToLower().Contains(term)
                                      || v.Description.ToLower().Contains(term)
                                      || v.SuiteCode.ToLower().Contains(term)
                                      || v.YouTubeVideoId.ToLower().Contains(term));
            }

            if (!string.IsNullOrWhiteSpace(SuiteFilter) && SuiteFilter != "All")
            {
                query = query.Where(v => v.SuiteCode == SuiteFilter);
            }

            if (!string.IsNullOrWhiteSpace(CultureFilter) && CultureFilter != "All")
            {
                query = query.Where(v => v.Culture == CultureFilter);
            }

            Videos = await query
                .OrderBy(v => v.SuiteCode)
                .ThenBy(v => v.SortOrder)
                .ThenBy(v => v.Title)
                .ToListAsync();
        }

        /// <summary>
        /// Toggles the public visibility of the video guide.
        /// </summary>
        /// <param name="id">The video unique identifier.</param>
        /// <returns>Redirect back to index.</returns>
        public async Task<IActionResult> OnPostTogglePublishAsync(Guid id)
        {
            var video = await _context.MasterVideoGuides.FindAsync(id);
            if (video == null)
            {
                return NotFound();
            }

            video.IsPublished = !video.IsPublished;
            await _context.SaveChangesAsync();

            StatusMessage = video.IsPublished
                ? $"Video tutorial '{video.Title}' is now live on the portal."
                : $"Video tutorial '{video.Title}' unlisted (draft).";

            _logger.LogInformation("Central operator toggled video guide {VideoId} publish to {IsPublished}", id, video.IsPublished);
            return RedirectToPage();
        }

        /// <summary>
        /// Deletes a video guide record.
        /// </summary>
        /// <param name="id">The video unique identifier.</param>
        /// <returns>Redirect back to index.</returns>
        public async Task<IActionResult> OnPostDeleteAsync(Guid id)
        {
            var video = await _context.MasterVideoGuides.FindAsync(id);
            if (video != null)
            {
                _context.MasterVideoGuides.Remove(video);
                await _context.SaveChangesAsync();
                _logger.LogWarning("Central operator deleted video guide {VideoId} ({Title})", id, video.Title);
            }

            TempData["StatusMessage"] = "Video guide deleted.";
            return RedirectToPage();
        }
    }
}
