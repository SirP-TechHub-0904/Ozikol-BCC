using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Services.Legal
{
    /// <summary>
    /// Implementation of <see cref="ILegalService"/> providing database-backed retrieval of legal documents
    /// with culture fallback and optimized read-only queries.
    /// </summary>
    public class LegalService : ILegalService
    {
        private readonly MasterCatalogDbContext _dbContext;
        private readonly ILogger<LegalService> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="LegalService"/> class.
        /// </summary>
        /// <param name="dbContext">The master catalog database context.</param>
        /// <param name="logger">The service logger.</param>
        public LegalService(MasterCatalogDbContext dbContext, ILogger<LegalService> logger)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Retrieves a published legal document by its unique slug identifier, with fallback to the default culture.
        /// </summary>
        /// <param name="slug">The unique URL slug (e.g., "privacy-notice", "terms-of-use", "cookies").</param>
        /// <param name="culture">The 2-letter ISO culture code (e.g. "en", "de", "fr", "es").</param>
        /// <param name="cancellationToken">Cancellation token for async operations.</param>
        /// <returns>The matching legal document, or null if not found.</returns>
        public async Task<MasterLegalDocument?> GetDocumentBySlugAsync(string slug, string culture = "en", CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(slug))
            {
                return null;
            }

            var normalizedSlug = slug.Trim().ToLowerInvariant();
            var targetCulture = string.IsNullOrWhiteSpace(culture) ? "en" : culture.Trim().ToLowerInvariant();

            try
            {
                // First attempt: match slug and requested culture
                var doc = await _dbContext.MasterLegalDocuments
                    .AsNoTracking()
                    .Where(d => d.IsPublished && d.Slug.ToLower() == normalizedSlug && d.Culture.ToLower() == targetCulture)
                    .FirstOrDefaultAsync(cancellationToken);

                if (doc != null)
                {
                    return doc;
                }

                // Fallback attempt: if requested culture wasn't "en", try English default
                if (targetCulture != "en")
                {
                    doc = await _dbContext.MasterLegalDocuments
                        .AsNoTracking()
                        .Where(d => d.IsPublished && d.Slug.ToLower() == normalizedSlug && d.Culture.ToLower() == "en")
                        .FirstOrDefaultAsync(cancellationToken);

                    if (doc != null)
                    {
                        return doc;
                    }
                }

                // Final fallback: any published document with matching slug
                return await _dbContext.MasterLegalDocuments
                    .AsNoTracking()
                    .Where(d => d.IsPublished && d.Slug.ToLower() == normalizedSlug)
                    .FirstOrDefaultAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to retrieve legal document for slug '{Slug}' and culture '{Culture}'.", slug, culture);
                return null;
            }
        }

        /// <summary>
        /// Retrieves all published legal documents, optionally filtered by category.
        /// </summary>
        /// <param name="category">Optional governance category (e.g., "Privacy", "Terms", "Compliance").</param>
        /// <param name="culture">The 2-letter ISO culture code.</param>
        /// <param name="cancellationToken">Cancellation token for async operations.</param>
        /// <returns>A read-only list of published legal documents ordered by sort order.</returns>
        public async Task<IReadOnlyList<MasterLegalDocument>> GetPublishedDocumentsAsync(string? category = null, string culture = "en", CancellationToken cancellationToken = default)
        {
            var targetCulture = string.IsNullOrWhiteSpace(culture) ? "en" : culture.Trim().ToLowerInvariant();

            try
            {
                var query = _dbContext.MasterLegalDocuments
                    .AsNoTracking()
                    .Where(d => d.IsPublished);

                if (!string.IsNullOrWhiteSpace(category))
                {
                    var normalizedCategory = category.Trim().ToLowerInvariant();
                    query = query.Where(d => d.Category.ToLower() == normalizedCategory);
                }

                var list = await query
                    .Where(d => d.Culture.ToLower() == targetCulture || d.Culture.ToLower() == "en")
                    .OrderBy(d => d.SortOrder)
                    .ThenBy(d => d.Title)
                    .ToListAsync(cancellationToken);

                return list;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to retrieve published legal documents for category '{Category}'.", category);
                return Array.Empty<MasterLegalDocument>();
            }
        }
    }
}
