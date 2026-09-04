using System;
using System.IO;
using System.Net;
using MaxMind.GeoIP2;
using MaxMind.GeoIP2.Exceptions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Logging;

namespace Ozikol.Central.Services;

/// <summary>
/// Thread-safe singleton service resolving client country codes from an offline MaxMind GeoLite2-Country database.
/// Provides sub-millisecond in-memory lookups with 0ms network latency and zero recurring API costs.
/// </summary>
public class GeoLocationService : IGeoLocationService, IDisposable
{
    private readonly ILogger<GeoLocationService> _logger;
    private readonly DatabaseReader? _reader;
    private bool _disposed;

    /// <inheritdoc />
    public bool IsDatabaseAvailable => _reader != null;

    /// <summary>
    /// Initializes a new instance of the <see cref="GeoLocationService"/> class.
    /// Attempts to locate and open the MaxMind GeoLite2-Country.mmdb database file.
    /// </summary>
    /// <param name="env">The web host environment for resolving content root paths.</param>
    /// <param name="logger">The diagnostic logger instance.</param>
    public GeoLocationService(IWebHostEnvironment env, ILogger<GeoLocationService> logger)
    {
        _logger = logger;

        // Search common paths for the database file
        var candidatePaths = new[]
        {
            Path.Combine(env.ContentRootPath, "Data", "GeoLite2-Country.mmdb"),
            Path.Combine(AppContext.BaseDirectory, "Data", "GeoLite2-Country.mmdb"),
            Path.Combine(env.ContentRootPath, "GeoLite2-Country.mmdb")
        };

        foreach (var path in candidatePaths)
        {
            if (File.Exists(path))
            {
                try
                {
                    _reader = new DatabaseReader(path);
                    _logger.LogInformation("MaxMind GeoLite2 database loaded successfully from {Path}", path);
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to load MaxMind GeoLite2 database from {Path}", path);
                }
            }
        }

        if (_reader == null)
        {
            _logger.LogWarning(
                "MaxMind GeoLite2-Country.mmdb was not found in candidate paths. " +
                "GeoIP resolution will fall back to Cloudflare edge headers, browser locale, or platform default.");
        }
    }

    /// <inheritdoc />
    public string? ResolveCountryCode(IPAddress? clientIp)
    {
        if (clientIp == null || _reader == null)
        {
            return null;
        }

        // Ignore private / loopback IP addresses (127.0.0.1, ::1, 10.x, 192.168.x)
        if (IPAddress.IsLoopback(clientIp) || IsPrivateIp(clientIp))
        {
            return null;
        }

        try
        {
            var response = _reader.Country(clientIp);
            var isoCode = response.Country.IsoCode;

            if (!string.IsNullOrWhiteSpace(isoCode))
            {
                return isoCode.ToUpperInvariant();
            }
        }
        catch (AddressNotFoundException)
        {
            // Normal when IP is not in public database
        }
        catch (GeoIP2Exception ex)
        {
            _logger.LogDebug(ex, "MaxMind GeoIP lookup error for {Ip}", clientIp);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during GeoIP lookup for {Ip}", clientIp);
        }

        return null;
    }

    /// <summary>
    /// Checks whether an IP address belongs to RFC 1918 private subnets.
    /// </summary>
    private static bool IsPrivateIp(IPAddress ip)
    {
        var bytes = ip.GetAddressBytes();
        if (bytes.Length == 4) // IPv4
        {
            return bytes[0] switch
            {
                10 => true,                                               // 10.0.0.0/8
                172 when bytes[1] >= 16 && bytes[1] <= 31 => true,        // 172.16.0.0/12
                192 when bytes[1] == 168 => true,                         // 192.168.0.0/16
                _ => false
            };
        }

        // IPv6 Unique Local Addresses (fc00::/7) or Link Local (fe80::/10)
        return ip.IsIPv6LinkLocal || ip.IsIPv6SiteLocal;
    }

    /// <summary>
    /// Disposes the underlying DatabaseReader instance.
    /// </summary>
    public void Dispose()
    {
        if (!_disposed)
        {
            _reader?.Dispose();
            _disposed = true;
        }
        GC.SuppressFinalize(this);
    }
}
