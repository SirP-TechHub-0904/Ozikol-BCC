using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Sockets;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Infrastructure.Security.Ssrf;

/// <summary>
/// Hardened factory producing SSRF-immune <see cref="HttpClient"/> instances.
/// Enforces socket-level IP address pinning via <see cref="SocketsHttpHandler.ConnectCallback"/> to prevent
/// DNS rebinding attacks, manual per-hop redirect re-validation, and payload size capping.
/// </summary>
public class SafeHttpClientFactory : ISafeHttpClientFactory
{
    private const int DefaultMaxRedirects = 3;
    private const int DefaultTimeoutSeconds = 15;
    private const int DefaultConnectTimeoutSeconds = 5;
    private const string DefaultUserAgent = "Ozikol-BCC/1.0 (+https://ozikol.cloud/robot-policy)";

    private readonly ISsrfProtectionValidator _validator;

    /// <summary>
    /// Initializes a new instance of the <see cref="SafeHttpClientFactory"/> class.
    /// </summary>
    /// <param name="validator">The SSRF protection validator.</param>
    public SafeHttpClientFactory(ISsrfProtectionValidator validator)
    {
        _validator = validator ?? throw new ArgumentNullException(nameof(validator));
    }

    /// <inheritdoc/>
    public HttpClient CreateClient(string clientName = "SafeSsrfClient")
    {
        var handler = CreateSafeSocketsHandler();
        var client = new HttpClient(handler, disposeHandler: true)
        {
            Timeout = TimeSpan.FromSeconds(DefaultTimeoutSeconds)
        };

        client.DefaultRequestHeaders.UserAgent.ParseAdd(DefaultUserAgent);
        return client;
    }

    /// <inheritdoc/>
    public async Task<HttpResponseMessage> GetSafeAsync(string url, CancellationToken cancellationToken = default)
    {
        var currentUrl = url;
        int redirectCount = 0;

        using var client = CreateClient();

        while (true)
        {
            // 1. Validate the current URL before executing any network request
            var validation = await _validator.ValidateUrlAsync(currentUrl, cancellationToken);
            if (!validation.IsSafe)
            {
                throw new SsrfSecurityException(
                    $"Outbound request blocked by SSRF policy: {validation.Message}",
                    validation.ViolationCategory ?? "SsrfViolation",
                    currentUrl);
            }

            using var request = new HttpRequestMessage(HttpMethod.Get, validation.DestinationUri);
            // Explicitly strip any internal authentication headers from outbound requests
            request.Headers.Remove("Authorization");
            request.Headers.Remove("Cookie");

            var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);

            // 2. Intercept and re-validate HTTP redirects
            if (IsRedirectStatusCode(response.StatusCode))
            {
                redirectCount++;
                if (redirectCount > DefaultMaxRedirects)
                {
                    response.Dispose();
                    throw new SsrfSecurityException(
                        $"Too many consecutive redirects (exceeded maximum of {DefaultMaxRedirects} hops).",
                        "ExcessiveRedirects",
                        currentUrl);
                }

                var location = response.Headers.Location;
                response.Dispose();

                if (location == null)
                {
                    throw new SsrfSecurityException(
                        "Received HTTP redirect status code without a valid Location header.",
                        "MalformedRedirect",
                        currentUrl);
                }

                // Resolve relative redirect URI against base
                if (!location.IsAbsoluteUri)
                {
                    location = new Uri(validation.DestinationUri!, location);
                }

                currentUrl = location.ToString();
                continue;
            }

            return response;
        }
    }

    /// <inheritdoc/>
    public async Task<string> GetSafeStringAsync(string url, CancellationToken cancellationToken = default)
    {
        using var response = await GetSafeAsync(url, cancellationToken);
        response.EnsureSuccessStatusCode();

        var bytes = await ReadContentWithLimitAsync(response.Content, 10 * 1024 * 1024, cancellationToken);
        return System.Text.Encoding.UTF8.GetString(bytes);
    }

    /// <inheritdoc/>
    public async Task<byte[]> GetSafeByteArrayAsync(string url, int maxBytes = 10 * 1024 * 1024, CancellationToken cancellationToken = default)
    {
        using var response = await GetSafeAsync(url, cancellationToken);
        response.EnsureSuccessStatusCode();

        return await ReadContentWithLimitAsync(response.Content, maxBytes, cancellationToken);
    }

    private SocketsHttpHandler CreateSafeSocketsHandler()
    {
        return new SocketsHttpHandler
        {
            // Disable automated redirects so each hop is manually intercepted and re-validated
            AllowAutoRedirect = false,
            ConnectTimeout = TimeSpan.FromSeconds(DefaultConnectTimeoutSeconds),
            PooledConnectionLifetime = TimeSpan.FromMinutes(2),
            ConnectCallback = async (context, ct) =>
            {
                string host = context.DnsEndPoint.Host;
                int port = context.DnsEndPoint.Port;

                // 1. Audit destination port
                if (!_validator.IsAllowedPort(port))
                {
                    throw new SsrfSecurityException(
                        $"Destination port '{port}' is prohibited for external asset fetching.",
                        "ProhibitedPort",
                        $"{host}:{port}");
                }

                // 2. Resolve DNS host once
                var addresses = await Dns.GetHostAddressesAsync(host, ct);
                if (addresses == null || addresses.Length == 0)
                {
                    throw new SocketException((int)SocketError.HostNotFound);
                }

                // 3. Audit every resolved IP address
                IPAddress? pinnedIp = null;
                foreach (var ip in addresses)
                {
                    if (!_validator.IsAllowedIp(ip))
                    {
                        throw new SsrfSecurityException(
                            $"DNS resolution for host '{host}' yielded restricted or private IP address '{ip}'. Connection terminated.",
                            "HazardousTargetIp",
                            ip.ToString());
                    }

                    if (pinnedIp == null || (pinnedIp.AddressFamily == AddressFamily.InterNetworkV6 && ip.AddressFamily == AddressFamily.InterNetwork))
                    {
                        pinnedIp = ip;
                    }
                }

                // 4. Connect the socket DIRECTLY to the pinned IP address (defeating DNS rebinding completely)
                var socket = new Socket(pinnedIp!.AddressFamily, SocketType.Stream, ProtocolType.Tcp)
                {
                    NoDelay = true
                };

                try
                {
                    await socket.ConnectAsync(new IPEndPoint(pinnedIp, port), ct);
                    return new NetworkStream(socket, ownsSocket: true);
                }
                catch
                {
                    socket.Dispose();
                    throw;
                }
            }
        };
    }

    private static bool IsRedirectStatusCode(HttpStatusCode statusCode)
    {
        return statusCode switch
        {
            HttpStatusCode.MovedPermanently => true,
            HttpStatusCode.Found => true,
            HttpStatusCode.SeeOther => true,
            HttpStatusCode.TemporaryRedirect => true,
            HttpStatusCode.PermanentRedirect => true,
            _ => false
        };
    }

    private static async Task<byte[]> ReadContentWithLimitAsync(HttpContent content, int maxBytes, CancellationToken cancellationToken)
    {
        if (content.Headers.ContentLength.HasValue && content.Headers.ContentLength.Value > maxBytes)
        {
            throw new SsrfSecurityException(
                $"Content-Length ({content.Headers.ContentLength.Value} bytes) exceeds maximum allowable threshold of {maxBytes} bytes.",
                "PayloadSizeExceeded");
        }

        using var stream = await content.ReadAsStreamAsync(cancellationToken);
        using var memoryStream = new MemoryStream();
        var buffer = new byte[8192];
        int totalBytes = 0;
        int bytesRead;

        while ((bytesRead = await stream.ReadAsync(buffer.AsMemory(0, buffer.Length), cancellationToken)) > 0)
        {
            totalBytes += bytesRead;
            if (totalBytes > maxBytes)
            {
                throw new SsrfSecurityException(
                    $"Payload exceeded maximum allowable threshold of {maxBytes} bytes during stream transfer.",
                    "PayloadSizeExceeded");
            }

            await memoryStream.WriteAsync(buffer.AsMemory(0, bytesRead), cancellationToken);
        }

        return memoryStream.ToArray();
    }
}
