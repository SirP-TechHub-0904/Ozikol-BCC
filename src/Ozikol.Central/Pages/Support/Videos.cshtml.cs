using System;
using System.Collections.Generic;
using System.Globalization;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Localization;
using Microsoft.Extensions.Logging;
using Ozikol.Central.Services.Support;
using Ozikol.MasterDomain.Models;

namespace Ozikol.Central.Pages.Support
{
    /// <summary>
    /// PageModel presenting the dedicated YouTube video tutorials library across all 9 enterprise suites and features.
    /// </summary>
    public class VideosModel : PageModel
    {
        private readonly ISupportService _supportService;
        private readonly IStringLocalizer<SharedResource> _localizer;
        private readonly ILogger<VideosModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="VideosModel"/> class.
        /// </summary>
        /// <param name="supportService">Support service providing video tutorials.</param>
        /// <param name="localizer">Shared localizer instance.</param>
        /// <param name="logger">Logger instance.</param>
        public VideosModel(
            ISupportService supportService,
            IStringLocalizer<SharedResource> localizer,
            ILogger<VideosModel> logger)
        {
            _supportService = supportService ?? throw new ArgumentNullException(nameof(supportService));
            _localizer = localizer ?? throw new ArgumentNullException(nameof(localizer));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Gets the active 2-letter ISO culture code.
        /// </summary>
        public string CurrentCulture { get; private set; } = "en";

        /// <summary>
        /// Gets the list of 9 enterprise suites and their feature hierarchies.
        /// </summary>
        public IReadOnlyList<SuiteSupportViewModel> Suites { get; private set; } = new List<SuiteSupportViewModel>();

        /// <summary>
        /// Gets the filtered list of YouTube video tutorials.
        /// </summary>
        public IReadOnlyList<MasterVideoGuide> Videos { get; private set; } = new List<MasterVideoGuide>();

        /// <summary>
        /// Gets or sets the active suite filter.
        /// </summary>
        public string? ActiveSuiteCode { get; set; }

        /// <summary>
        /// Gets or sets the active feature filter.
        /// </summary>
        public string? ActiveFeatureCode { get; set; }

        /// <summary>
        /// Gets or sets the search keyword.
        /// </summary>
        public string? SearchQuery { get; set; }

        /// <summary>
        /// Handles GET requests to load video guides and suite navigation.
        /// </summary>
        /// <param name="suite">Optional suite filter.</param>
        /// <param name="feature">Optional feature filter.</param>
        /// <param name="q">Optional search term.</param>
        public async Task OnGetAsync(string? suite, string? feature, string? q)
        {
            ResolveCulture();
            ActiveSuiteCode = suite;
            ActiveFeatureCode = feature;
            SearchQuery = q;

            Suites = await _supportService.GetSuitesWithHierarchyAsync(CurrentCulture);
            var allVideos = await _supportService.GetVideosAsync(ActiveSuiteCode, ActiveFeatureCode, CurrentCulture);

            if (!string.IsNullOrWhiteSpace(SearchQuery))
            {
                var term = SearchQuery.Trim().ToLower();
                Videos = allVideos
                    .Where(v => v.Title.ToLower().Contains(term) ||
                                v.Description.ToLower().Contains(term) ||
                                (v.FeatureCode != null && v.FeatureCode.ToLower().Contains(term)))
                    .ToList();
            }
            else
            {
                Videos = allVideos;
            }
        }

        /// <summary>
        /// AJAX endpoint returning video metadata and embed parameters for the video player modal.
        /// </summary>
        /// <param name="id">The unique video GUID.</param>
        public async Task<IActionResult> OnGetVideoDetailsAsync(Guid id)
        {
            var video = await _supportService.GetVideoByIdAsync(id);
            if (video == null)
            {
                return NotFound(new { message = "Video tutorial not found." });
            }

            return new JsonResult(new
            {
                id = video.Id,
                title = video.Title,
                description = video.Description,
                youtubeId = video.YouTubeVideoId,
                durationSeconds = video.DurationSeconds,
                suiteCode = video.SuiteCode,
                featureCode = video.FeatureCode,
                viewCount = video.ViewCount
            });
        }

        private void ResolveCulture()
        {
            var routeCulture = RouteData.Values["culture"]?.ToString()?.ToLowerInvariant();
            if (routeCulture is "en" or "fr" or "es" or "de")
            {
                CurrentCulture = routeCulture;
                return;
            }

            var current = CultureInfo.CurrentUICulture.TwoLetterISOLanguageName.ToLowerInvariant();
            CurrentCulture = current is "en" or "fr" or "es" or "de" ? current : "en";
        }
    }
}
