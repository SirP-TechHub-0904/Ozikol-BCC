using System;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Infrastructure.Security.Ssrf;

/// <summary>
/// Factory service producing hardened, SSRF-immune <see cref="HttpClient"/> instances.
/// Features socket-level IP address pinning (preventing DNS rebinding), manual per-hop redirect re-validation,
/// and authentication header stripping for safe interaction with third-party web assets.
/// </summary>
public interface ISafeHttpClientFactory
{
    /// <summary>
    /// Creates a hardened, SSRF-immune <see cref="HttpClient"/> instance configured with socket IP pinning.
    /// </summary>
    /// <param name="clientName">Optional contextual client identifier.</param>
    /// <returns>A configured <see cref="HttpClient"/>.</returns>
    HttpClient CreateClient(string clientName = "SafeSsrfClient");

    /// <summary>
    /// Securely fetches an HTTP resource from a remote URL, validating every resolved IP and redirect target.
    /// </summary>
    /// <param name="url">The remote URL to request.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The remote <see cref="HttpResponseMessage"/>.</returns>
    Task<HttpResponseMessage> GetSafeAsync(string url, CancellationToken cancellationToken = default);

    /// <summary>
    /// Securely downloads a remote web resource as a string payload, validating against SSRF and response size caps.
    /// </summary>
    /// <param name="url">The remote URL to download.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The decoded string contents.</returns>
    Task<string> GetSafeStringAsync(string url, CancellationToken cancellationToken = default);

    /// <summary>
    /// Securely downloads a remote binary asset (such as an image or stylesheet) up to the specified byte cap.
    /// </summary>
    /// <param name="url">The remote URL to download.</param>
    /// <param name="maxBytes">Maximum allowable download size in bytes (default 10 MB).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The raw binary bytes.</returns>
    Task<byte[]> GetSafeByteArrayAsync(string url, int maxBytes = 10 * 1024 * 1024, CancellationToken cancellationToken = default);
}
