using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Ozikol.MasterDomain.Models;

namespace Ozikol.Central.Services.Legal
{
    /// <summary>
    /// Service contract for retrieving dynamic, database-driven legal agreements,
    /// privacy notices, cookie policies, and compliance documents.
    /// </summary>
    public interface ILegalService
    {
        /// <summary>
        /// Retrieves a published legal document by its unique slug identifier, with fallback to the default culture.
        /// </summary>
        /// <param name="slug">The unique URL slug (e.g., "privacy-notice", "terms-of-use", "cookies").</param>
        /// <param name="culture">The 2-letter ISO culture code (e.g. "en", "de", "fr", "es").</param>
        /// <param name="cancellationToken">Cancellation token for async operations.</param>
        /// <returns>The matching legal document, or null if not found.</returns>
        Task<MasterLegalDocument?> GetDocumentBySlugAsync(string slug, string culture = "en", CancellationToken cancellationToken = default);

        /// <summary>
        /// Retrieves all published legal documents, optionally filtered by category.
        /// </summary>
        /// <param name="category">Optional governance category (e.g., "Privacy", "Terms", "Compliance").</param>
        /// <param name="culture">The 2-letter ISO culture code.</param>
        /// <param name="cancellationToken">Cancellation token for async operations.</param>
        /// <returns>A read-only list of published legal documents ordered by sort order.</returns>
        Task<IReadOnlyList<MasterLegalDocument>> GetPublishedDocumentsAsync(string? category = null, string culture = "en", CancellationToken cancellationToken = default);
    }
}
