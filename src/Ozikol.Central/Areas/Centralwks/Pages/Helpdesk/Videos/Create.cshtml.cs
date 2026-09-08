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
    /// Page model for registering and embedding new YouTube video guides and feature screencasts.
    /// </summary>
    public class CreateModel : PageModel
    {
        private readonly MasterCatalogDbContext _context;
        private readonly ILogger<CreateModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="CreateModel"/> class.
        /// </summary>
        /// <param name="context">Master catalog database context.</param>
        /// <param name="logger">Structured logging service.</param>
        public CreateModel(MasterCatalogDbContext context, ILogger<CreateModel> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Gets or sets the video guide creation form input model.
        /// </summary>
        [BindProperty]
        public VideoInputModel Input { get; set; } = new VideoInputModel();

        /// <summary>
        /// Form input model for authoring a new video walkthrough guide.
        /// </summary>
        public class VideoInputModel
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
        /// Handles HTTP GET request.
        /// </summary>
        public void OnGet()
        {
        }

        /// <summary>
        /// Handles HTTP POST request to persist new video guide.
        /// </summary>
        /// <returns>Redirect to video guides index or page on validation error.</returns>
        public async Task<IActionResult> OnPostAsync()
        {
            if (!ModelState.IsValid)
            {
                return Page();
            }

            var videoId = ExtractYouTubeId(Input.YouTubeVideoId);

            var video = new MasterVideoGuide
            {
                Id = Guid.NewGuid(),
                Title = Input.Title.Trim(),
                SuiteCode = Input.SuiteCode.Trim().ToLowerInvariant(),
                FeatureCode = string.IsNullOrWhiteSpace(Input.FeatureCode) ? null : Input.FeatureCode.Trim().ToLowerInvariant(),
                YouTubeVideoId = videoId,
                Description = Input.Description.Trim(),
                ThumbnailUrl = string.IsNullOrWhiteSpace(Input.ThumbnailUrl) ? null : Input.ThumbnailUrl.Trim(),
                DurationSeconds = Input.DurationSeconds,
                Culture = Input.Culture.Trim().ToLowerInvariant(),
                SortOrder = Input.SortOrder,
                IsPublished = Input.IsPublished,
                CreatedUtc = DateTime.UtcNow
            };

            _context.MasterVideoGuides.Add(video);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Central operator created video guide {VideoId} ({Title})", video.Id, video.Title);
            TempData["StatusMessage"] = $"Video guide '{video.Title}' registered successfully.";

            return RedirectToPage("/Helpdesk/Videos/Index");
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
