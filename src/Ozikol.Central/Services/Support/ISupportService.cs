using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Ozikol.MasterDomain.Models;

namespace Ozikol.Central.Services.Support
{
    /// <summary>
    /// View model representing an enterprise suite and its child features for support navigation.
    /// </summary>
    public class SuiteSupportViewModel
    {
        /// <summary>
        /// Gets or sets the unique suite identifier code (e.g. suite-workforce).
        /// </summary>
        public string SuiteCode { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the display title of the suite.
        /// </summary>
        public string Title { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the localized narrative description.
        /// </summary>
        public string Description { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the visual icon CSS class or SVG badge identifier.
        /// </summary>
        public string Icon { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the list of features included in this suite.
        /// </summary>
        public List<FeatureSupportItemViewModel> Features { get; set; } = new();

        /// <summary>
        /// Gets or sets the total count of video guides available for this suite.
        /// </summary>
        public int VideoCount { get; set; }

        /// <summary>
        /// Gets or sets the total count of help articles available for this suite.
        /// </summary>
        public int ArticleCount { get; set; }
    }

    /// <summary>
    /// View model representing an individual feature within a suite for support navigation.
    /// </summary>
    public class FeatureSupportItemViewModel
    {
        /// <summary>
        /// Gets or sets the feature permalink code (e.g. staff-rota).
        /// </summary>
        public string FeatureCode { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the feature display name.
        /// </summary>
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the marketing route link (e.g. /features/staff-rota).
        /// </summary>
        public string Route { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the count of video tutorials for this feature.
        /// </summary>
        public int VideoCount { get; set; }

        /// <summary>
        /// Gets or sets the count of knowledge base articles for this feature.
        /// </summary>
        public int ArticleCount { get; set; }
    }

    /// <summary>
    /// Provides enterprise support, knowledge base querying, video guides, and inquiry routing services.
    /// </summary>
    public interface ISupportService
    {
        /// <summary>
        /// Resolves the comprehensive suite and feature hierarchy with resource counts for the specified culture.
        /// </summary>
        /// <param name="culture">The active 2-letter ISO culture code.</param>
        /// <returns>A list of suite view models with child features and counts.</returns>
        Task<IReadOnlyList<SuiteSupportViewModel>> GetSuitesWithHierarchyAsync(string culture);

        /// <summary>
        /// Retrieves published knowledge base articles filtered by suite, feature, search keyword, and culture.
        /// </summary>
        /// <param name="suiteCode">Optional suite filter.</param>
        /// <param name="featureCode">Optional feature filter.</param>
        /// <param name="search">Optional keyword search query.</param>
        /// <param name="culture">The active culture code.</param>
        /// <returns>A list of matching helpdesk articles.</returns>
        Task<IReadOnlyList<MasterHelpdeskArticle>> GetArticlesAsync(string? suiteCode, string? featureCode, string? search, string culture);

        /// <summary>
        /// Retrieves a single helpdesk article by its unique ID and increments its view count.
        /// </summary>
        /// <param name="articleId">The unique article GUID.</param>
        /// <returns>The article entity or null if not found.</returns>
        Task<MasterHelpdeskArticle?> GetArticleByIdAsync(Guid articleId);

        /// <summary>
        /// Retrieves published YouTube video tutorials filtered by suite, feature, and culture.
        /// </summary>
        /// <param name="suiteCode">Optional suite filter.</param>
        /// <param name="featureCode">Optional feature filter.</param>
        /// <param name="culture">The active culture code.</param>
        /// <returns>A list of matching video guides.</returns>
        Task<IReadOnlyList<MasterVideoGuide>> GetVideosAsync(string? suiteCode, string? featureCode, string culture);

        /// <summary>
        /// Retrieves a single video guide by its unique ID and increments its view count.
        /// </summary>
        /// <param name="videoId">The unique video GUID.</param>
        /// <returns>The video guide entity or null if not found.</returns>
        Task<MasterVideoGuide?> GetVideoByIdAsync(Guid videoId);

        /// <summary>
        /// Submits and persists an enterprise support inquiry or helpdesk ticket.
        /// </summary>
        /// <param name="inquiry">The inquiry entity with submitted details.</param>
        /// <returns>The generated human-readable tracking reference number.</returns>
        Task<string> SubmitInquiryAsync(MasterSupportInquiry inquiry);

        /// <summary>
        /// Records user helpfulness feedback on a knowledge base article.
        /// </summary>
        /// <param name="articleId">The unique article GUID.</param>
        /// <param name="helpful">True if voted helpful, false otherwise.</param>
        Task RecordArticleVoteAsync(Guid articleId, bool helpful);

        /// <summary>
        /// Retrieves published support frequently asked questions filtered by culture, category, and suite.
        /// </summary>
        /// <param name="culture">The active 2-letter ISO culture code.</param>
        /// <param name="category">Optional category grouping filter.</param>
        /// <param name="suiteCode">Optional suite filter.</param>
        /// <returns>A list of published FAQ entities ordered by SortOrder.</returns>
        Task<IReadOnlyList<MasterSupportFaq>> GetFaqsAsync(string culture, string? category = null, string? suiteCode = null);

        /// <summary>
        /// Ensures initial demonstration videos and articles exist in the database for all 9 enterprise suites.
        /// </summary>
        Task EnsureSeedDataAsync();

        /// <summary>
        /// Retrieves a support inquiry by its public reference tracking code, including its chronological conversation replies.
        /// </summary>
        /// <param name="referenceNumber">The reference code (e.g. OZK-SUP-20260905-XXXX).</param>
        /// <param name="cancellationToken">Cancellation token for async operations.</param>
        /// <returns>The inquiry entity with replies populated, or null if not found.</returns>
        Task<MasterSupportInquiry?> GetInquiryByReferenceAsync(string referenceNumber, System.Threading.CancellationToken cancellationToken = default);

        /// <summary>
        /// Posts a follow-up reply message to a support ticket thread, updates ticket activity and status,
        /// and dispatches email notifications to the counterparty.
        /// </summary>
        /// <param name="inquiryId">The unique identifier of the ticket.</param>
        /// <param name="senderName">The display name of the respondent.</param>
        /// <param name="senderEmail">The email address of the respondent.</param>
        /// <param name="message">The text content of the reply.</param>
        /// <param name="isStaff">True if submitted by a support specialist; false if submitted by the customer.</param>
        /// <param name="cancellationToken">Cancellation token for async operations.</param>
        /// <returns>The newly created ticket reply record.</returns>
        Task<MasterTicketReply> AddTicketReplyAsync(Guid inquiryId, string senderName, string senderEmail, string message, bool isStaff, System.Threading.CancellationToken cancellationToken = default);

        /// <summary>
        /// Marks a support ticket as resolved and closed with an audit explanation.
        /// </summary>
        /// <param name="inquiryId">The unique identifier of the ticket.</param>
        /// <param name="reason">The closure rationale.</param>
        /// <param name="cancellationToken">Cancellation token for async operations.</param>
        /// <returns>True if successfully closed; false if the ticket was not found.</returns>
        Task<bool> CloseTicketAsync(Guid inquiryId, string reason, System.Threading.CancellationToken cancellationToken = default);

        /// <summary>
        /// Evaluates open tickets against the configured inactivity threshold (default: 24 hours)
        /// and automatically closes eligible tickets with an audit reason.
        /// </summary>
        /// <param name="cancellationToken">Cancellation token for async operations.</param>
        /// <returns>The number of tickets automatically closed.</returns>
        Task<int> AutoCloseInactiveTicketsAsync(System.Threading.CancellationToken cancellationToken = default);
    }
}
