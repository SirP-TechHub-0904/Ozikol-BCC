using System.Net;

namespace Ozikol.Central.Services;

/// <summary>
/// Service interface governing offline geographic location resolution from client IP addresses.
/// Utilizes local MaxMind GeoLite2 in-memory databases with zero external network dependencies.
/// </summary>
public interface IGeoLocationService
{
    /// <summary>
    /// Resolves the 2-letter ISO 3166-1 alpha-2 country code (e.g. "NG", "GB", "GH", "US") for a given IP address.
    /// </summary>
    /// <param name="clientIp">The client IP address to resolve.</param>
    /// <returns>The 2-letter uppercase ISO country code, or null if unresolvable, private, or local.</returns>
    string? ResolveCountryCode(IPAddress? clientIp);

    /// <summary>
    /// Indicates whether the offline MaxMind database reader is currently loaded and available.
    /// </summary>
    bool IsDatabaseAvailable { get; }
}
