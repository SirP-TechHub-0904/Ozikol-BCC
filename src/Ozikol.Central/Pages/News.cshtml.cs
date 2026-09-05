using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Localization;
using Ozikol.Central.Models.News;
using Ozikol.Central.Pages.Features;
using Ozikol.Central.Services;

namespace Ozikol.Central.Pages;

/// <summary>
/// Page model handling the dynamic Central newsroom, category filtering, keyword search,
/// and reCAPTCHA-protected press and newsletter subscriptions.
/// </summary>
public class NewsModel : FeatureDetailPageModel
{
    private readonly INewsService _newsService;
    private readonly IRecaptchaService _recaptchaService;
    private readonly IStringLocalizer<SharedResource> _localizer;

    /// <summary>
    /// Initializes a new instance of the <see cref="NewsModel"/> class.
    /// </summary>
    /// <param name="newsService">News content and release provider.</param>
    /// <param name="recaptchaService">Google reCAPTCHA verification provider.</param>
    /// <param name="localizer">Shared localization provider.</param>
    public NewsModel(
        INewsService newsService,
        IRecaptchaService recaptchaService,
        IStringLocalizer<SharedResource> localizer)
    {
        _newsService = newsService ?? throw new ArgumentNullException(nameof(newsService));
        _recaptchaService = recaptchaService ?? throw new ArgumentNullException(nameof(recaptchaService));
        _localizer = localizer ?? throw new ArgumentNullException(nameof(localizer));
    }

    /// <summary>
    /// Gets or sets the active category filter key from query string.
    /// </summary>
    [BindProperty(SupportsGet = true)]
    public string? Category { get; set; }

    /// <summary>
    /// Gets or sets the active keyword search string from query string.
    /// </summary>
    [BindProperty(SupportsGet = true)]
    public string? Query { get; set; }

    /// <summary>
    /// Gets or sets the newsletter subscription input model.
    /// </summary>
    [BindProperty]
    public NewsletterInput Newsletter { get; set; } = new();

    /// <summary>
    /// Gets the list of active editorial categories.
    /// </summary>
    public IReadOnlyList<NewsCategory> Categories { get; private set; } = Array.Empty<NewsCategory>();

    /// <summary>
    /// Gets the filtered list of news stories.
    /// </summary>
    public IReadOnlyList<NewsArticle> Articles { get; private set; } = Array.Empty<NewsArticle>();

    /// <summary>
    /// Gets the headline featured article.
    /// </summary>
    public NewsArticle? FeaturedArticle { get; private set; }

    /// <summary>
    /// Gets the public Google reCAPTCHA site key.
    /// </summary>
    public string RecaptchaSiteKey => _recaptchaService.SiteKey;

    /// <summary>
    /// Gets or sets an optional user notification message after subscription.
    /// </summary>
    [TempData]
    public string? StatusMessage { get; set; }

    /// <summary>
    /// Handles GET requests to query and render dynamic news categories and articles.
    /// </summary>
    public async Task OnGetAsync()
    {
        Categories = await _newsService.GetCategoriesAsync();
        Articles = await _newsService.GetArticlesAsync(Category, Query);
        FeaturedArticle = await _newsService.GetFeaturedArticleAsync();
    }

    /// <summary>
    /// Handles POST requests to subscribe an email to the newsroom newsletter with reCAPTCHA verification.
    /// </summary>
    /// <returns>Redirect back to news page with status message.</returns>
    public async Task<IActionResult> OnPostSubscribeAsync()
    {
        Categories = await _newsService.GetCategoriesAsync();
        Articles = await _newsService.GetArticlesAsync(Category, Query);
        FeaturedArticle = await _newsService.GetFeaturedArticleAsync();

        var recaptchaResponse = Request.Form["g-recaptcha-response"].ToString();
        var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString();

        var isCaptchaValid = await _recaptchaService.ValidateTokenAsync(recaptchaResponse, clientIp);
        if (!isCaptchaValid)
        {
            ModelState.AddModelError(string.Empty, "Security verification failed. Please check the reCAPTCHA box and try again.");
            return Page();
        }

        if (!ModelState.IsValid)
        {
            return Page();
        }

        StatusMessage = "Thank you for subscribing to the Ozikol Newsroom. You will receive updates directly to your inbox.";
        return RedirectToPage(new { culture = CurrentCulture, Category, Query });
    }

    /// <summary>
    /// Input binding model for press and newsletter subscriptions.
    /// </summary>
    public class NewsletterInput
    {
        /// <summary>
        /// Gets or sets the subscriber email address.
        /// </summary>
        [Required(ErrorMessage = "Please provide a valid email address.")]
        [EmailAddress(ErrorMessage = "Please provide a valid email address format.")]
        [MaxLength(150)]
        public string Email { get; set; } = string.Empty;
    }
}
