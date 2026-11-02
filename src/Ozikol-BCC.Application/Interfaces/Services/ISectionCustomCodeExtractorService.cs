using System.Threading;
using System.Threading.Tasks;
using Ozikol_BCC.Application.Dtos.Sections;

namespace Ozikol_BCC.Application.Interfaces.Services
{
    /// <summary>
    /// Contract for AI-powered section custom code extraction, scoping, and Ozikol tokenization.
    /// Resiliently executes via Gemini 2.5 Flash, with automatic failover to DeepSeek and local deterministic AST fallback.
    /// </summary>
    public interface ISectionCustomCodeExtractorService
    {
        /// <summary>
        /// Extracts author custom CSS, isolates JavaScript, replaces real content with canonical Ozikol tokens,
        /// and extracts original values into structured JSON.
        /// </summary>
        /// <param name="request">The extraction request payload.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Isolated section bundle with tokenized markup, scoped CSS, and extracted content JSON.</returns>
        Task<SectionCustomCodeExtractionResponseDto> ExtractAndIsolateAsync(
            SectionCustomCodeExtractionRequestDto request, 
            CancellationToken cancellationToken = default);
    }
}
