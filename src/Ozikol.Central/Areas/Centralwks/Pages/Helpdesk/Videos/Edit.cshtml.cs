using System;
using System.ComponentModel.DataAnnotations;
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
    /// Page model for editing an existing video tutorial or screencast in Centralwks.
    /// </summary>
    public class EditModel : PageModel
    {
        private readonly MasterCatalogDbContext _context;
        private readonly ILogger<EditModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="EditModel"/> class.
        /// </summary>
        /// <param name="context">Master catalog database context.</param>
        /// <param name="logger">Structured logging service.</param>
        public EditModel(MasterCatalogDbContext context, ILogger<EditModel> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Gets or sets the target video ID.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public Guid Id { get; set; }

        /// <summary>
        /// Gets or sets the video edit form input model.
        /// </summary>
        [BindProperty]
        public VideoEditModel Input { get; set; } = new VideoEditModel();

        /// <summary>
        /// Form input model for editing an existing video walkthrough.
        /// </summary>
        public class VideoEditModel
        {
            /// <summary>Gets or sets video title.</summary>
            [Required(ErrorMessage = "Title is required.")]
            [MaxLength(200)]
            public string Title { get; set; } = string.Empty;

            /// <summary>Gets or sets parent enterprise suite code.</summary>
            [Required(ErrorMessage = "Suite code is required.")]
            [MaxLength(80)]
            public string SuiteCode { get; set; } = "suite-operations";

            /// <summary>Gets or sets optional feature code.</summary>
            [MaxLength(80)]
            public string? FeatureCode { get; set; }

            /// <summary>Gets or sets YouTube video ID (e.g. dQw4w9WgXcQ).</summary>
            [Required(ErrorMessage = "YouTube Video ID is required.")]
            [MaxLength(30)]
            public string YouTubeVideoId { get; set; } = string.Empty;

            /// <summary>Gets or sets video description and learning objectives.</summary>
            [Required(ErrorMessage = "Description is required.")]
            public string Description { get; set; } = string.Empty;

            /// <summary>Gets or sets custom poster thumbnail URL (optional).</summary>
            [MaxLength(500)]
            public string? ThumbnailUrl { get; set; }

            /// <summary>Gets or sets total duration in seconds.</summary>
            [Range(1, 86400, ErrorMessage = "Duration must be greater than 0 seconds.")]
            public int DurationSeconds { get; set; } = 180;

            /// <summary>Gets or sets language culture code.</summary>
            [Required(ErrorMessage = "Culture is required.")]
            [MaxLength(10)]
            public string Culture { get; set; } = "en";

            /// <summary>Gets or sets display sort order.</summary>
            public int SortOrder { get; set; } = 1;

            /// <summary>Gets or sets whether the video is published live.</summary>
            public bool IsPublished { get; set; } = true;
        }

        /// <summary>
        /// Handles HTTP GET request to load existing video guide data.
        /// </summary>
        /// <param name="id">The unique identifier of the video guide.</param>
        /// <returns>Page result or NotFound.</returns>
        public async Task<IActionResult> OnGetAsync(Guid id)
        {
            var video = await _context.MasterVideoGuides.FindAsync(id);
            if (video == null)
            {
                return NotFound();
            }

            Id = id;
            Input = new VideoEditModel
            {
                Title = video.Title,
                SuiteCode = video.SuiteCode,
                FeatureCode = video.FeatureCode,
                YouTubeVideoId = video.YouTubeVideoId,
                Description = video.Description,
                ThumbnailUrl = video.ThumbnailUrl,
                DurationSeconds = video.DurationSeconds,
                Culture = video.Culture,
                SortOrder = video.SortOrder,
                IsPublished = video.IsPublished
            };

            return Page();
        }

        /// <summary>
        /// Handles HTTP POST request to save modifications.
        /// </summary>
        /// <param name="id">The unique identifier of the video guide.</param>
        /// <returns>Redirect to details or page on validation error.</returns>
        public async Task<IActionResult> OnPostAsync(Guid id)
        {
            if (!ModelState.IsValid)
            {
                return Page();
            }

            var video = await _context.MasterVideoGuides.FindAsync(id);
            if (video == null)
            {
                return NotFound();
            }

            video.Title = Input.Title.Trim();
            video.SuiteCode = Input.SuiteCode.Trim().ToLowerInvariant();
            video.FeatureCode = string.IsNullOrWhiteSpace(Input.FeatureCode) ? null : Input.FeatureCode.Trim().ToLowerInvariant();
            video.YouTubeVideoId = ExtractYouTubeId(Input.YouTubeVideoId);
            video.Description = Input.Description.Trim();
            video.ThumbnailUrl = string.IsNullOrWhiteSpace(Input.ThumbnailUrl) ? null : Input.ThumbnailUrl.Trim();
            video.DurationSeconds = Input.DurationSeconds;
            video.Culture = Input.Culture.Trim().ToLowerInvariant();
            video.SortOrder = Input.SortOrder;
            video.IsPublished = Input.IsPublished;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Central operator updated video guide {VideoId} ({Title})", id, video.Title);
            TempData["StatusMessage"] = $"Video guide '{video.Title}' updated successfully.";

            return RedirectToPage("/Helpdesk/Videos/Details", new { id });
        }

        private static string ExtractYouTubeId(string input)
        {
            input = input.Trim();
            if (input.Contains("youtube.com/watch?v="))
            {
                var idx = input.IndexOf("v=");
                var sub = input.Substring(idx + 2);
                var amp = sub.IndexOf('&');
                return amp > 0 ? sub.Substring(0, amp) : sub;
            }
            if (input.Contains("youtu.be/"))
            {
                var idx = input.IndexOf("youtu.be/");
                var sub = input.Substring(idx + 9);
                var q = sub.IndexOf('?');
                return q > 0 ? sub.Substring(0, q) : sub;
            }
            return input;
        }
    }
}
