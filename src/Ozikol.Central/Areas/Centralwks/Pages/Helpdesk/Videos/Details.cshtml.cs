using System;
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
    /// Page model for viewing embedded video walkthroughs, player analytics, and publishing status in Centralwks.
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
        /// Gets or sets the target video guide.
        /// </summary>
        public MasterVideoGuide Video { get; set; } = null!;

        /// <summary>
        /// Gets or sets status notification message.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Handles HTTP GET request to load video guide details.
        /// </summary>
        /// <param name="id">The unique identifier of the video guide.</param>
        /// <returns>Page result or NotFound.</returns>
        public async Task<IActionResult> OnGetAsync(Guid id)
        {
            var video = await _context.MasterVideoGuides
                .AsNoTracking()
                .FirstOrDefaultAsync(v => v.Id == id);

            if (video == null)
            {
                return NotFound();
            }

            Video = video;
            return Page();
        }

        /// <summary>
        /// Toggles the public visibility of the video guide.
        /// </summary>
        /// <param name="id">The unique identifier of the video guide.</param>
        /// <returns>Redirect back to details page.</returns>
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
                ? $"Video guide '{video.Title}' is now live on the portal."
                : $"Video guide '{video.Title}' reverted to draft (unlisted).";

            _logger.LogInformation("Central operator toggled video guide {VideoId} publish status to {IsPublished}", id, video.IsPublished);
            return RedirectToPage(new { id });
        }

        /// <summary>
        /// Permanently deletes the video guide.
        /// </summary>
        /// <param name="id">The unique identifier of the video guide.</param>
        /// <returns>Redirect to video guides index page.</returns>
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
            return RedirectToPage("/Helpdesk/Videos/Index");
        }
    }
}
