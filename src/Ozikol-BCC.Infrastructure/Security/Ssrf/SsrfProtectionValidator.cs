using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Infrastructure.Security.Ssrf;

/// <summary>
/// Production-grade implementation of <see cref="ISsrfProtectionValidator"/>.
/// Inspects outbound destination URIs, TCP ports, and multi-record DNS resolutions to safeguard the
/// Ozikol platform against Server-Side Request Forgery, loopback probing, and cloud instance metadata theft.
/// </summary>
public class SsrfProtectionValidator : ISsrfProtectionValidator
{
    private static readonly HashSet<int> AllowedPorts = new() { 80, 443 };
    private static readonly HashSet<string> AllowedSchemes = new(StringComparer.OrdinalIgnoreCase) { "http", "https" };

    /// <inheritdoc/>
    public async Task<SsrfValidationResult> ValidateUrlAsync(string url, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(url))
        {
            return SsrfValidationResult.Blocked("InvalidInput", "The destination URL cannot be empty or whitespace.");
        }

        // Detect control characters / CRLF injection attempts in raw URL
        if (url.Any(c => char.IsControl(c) || c == '\r' || c == '\n' || c == '\0'))
        {
            return SsrfValidationResult.Blocked("ProtocolSmuggling", "The destination URL contains illegal control characters or CRLF signatures.");
        }

        if (!Uri.TryCreate(url.Trim(), UriKind.Absolute, out var uri))
        {
            return SsrfValidationResult.Blocked("MalformedUri", $"The provided destination '{url}' is not a valid absolute URI.");
        }

        return await ValidateUriAsync(uri, cancellationToken);
    }

    /// <inheritdoc/>
    public async Task<SsrfValidationResult> ValidateUriAsync(Uri uri, CancellationToken cancellationToken = default)
    {
        if (uri == null)
        {
            return SsrfValidationResult.Blocked("InvalidInput", "Destination URI reference cannot be null.");
        }

        // 1. Audit Protocol / Scheme
        if (!IsAllowedScheme(uri.Scheme))
        {
            return SsrfValidationResult.Blocked(
                "ProhibitedProtocol",
                $"Outbound protocol scheme '{uri.Scheme}' is prohibited. Only standard web protocols (HTTP/HTTPS) are permitted.",
                uri);
        }

        // 2. Audit TCP Port
        int port = uri.Port > 0 ? uri.Port : (uri.Scheme.Equals("https", StringComparison.OrdinalIgnoreCase) ? 443 : 80);
        if (!IsAllowedPort(port))
        {
            return SsrfValidationResult.Blocked(
                "ProhibitedPort",
                $"Outbound TCP port '{port}' is prohibited. External fetching is restricted exclusively to standard web ports (80 and 443).",
                uri);
        }

        // 3. Extract and sanitize host
        string host = uri.DnsSafeHost;
        if (string.IsNullOrWhiteSpace(host))
        {
            return SsrfValidationResult.Blocked("EmptyHost", "The destination URI does not define a valid network host.", uri);
        }

        // 4. Resolve DNS to physical IP addresses
        IPAddress[] resolvedAddresses;
        try
        {
            // Direct IP literal or domain hostname resolution
            resolvedAddresses = await Dns.GetHostAddressesAsync(host, cancellationToken);
        }
        catch (SocketException ex)
        {
            return SsrfValidationResult.Blocked(
                "DnsResolutionFailure",
                $"Unable to resolve destination domain '{host}' via DNS: {ex.Message}",
                uri);
        }
        catch (Exception ex)
        {
            return SsrfValidationResult.Blocked(
                "DnsResolutionError",
                $"Unexpected error resolving destination host '{host}': {ex.Message}",
                uri);
        }

        if (resolvedAddresses == null || resolvedAddresses.Length == 0)
        {
            return SsrfValidationResult.Blocked(
                "NoDnsRecords",
                $"Domain host '{host}' produced zero routable IP address records.",
                uri);
        }

        // 5. Audit EVERY resolved IP address. Zero tolerance for dual-homed / split-DNS deception.
        var allIps = resolvedAddresses.ToList();
        IPAddress? selectedSafeIp = null;

        foreach (var ip in allIps)
        {
            if (!IsAllowedIp(ip))
            {
                return SsrfValidationResult.Blocked(
                    "HazardousTargetIp",
                    $"Destination host '{host}' resolved to restricted or private IP address '{ip}'. Outbound connection terminated by security policy.",
                    uri);
            }

            // Prefer IPv4 if available for broader CDN socket compatibility, otherwise use first clean IPv6
            if (selectedSafeIp == null || (selectedSafeIp.AddressFamily == AddressFamily.InterNetworkV6 && ip.AddressFamily == AddressFamily.InterNetwork))
            {
                selectedSafeIp = ip;
            }
        }

        return SsrfValidationResult.Success(uri, selectedSafeIp ?? allIps[0], allIps);
    }

    /// <inheritdoc/>
    public bool IsAllowedPort(int port)
    {
        return AllowedPorts.Contains(port);
    }

    /// <inheritdoc/>
    public bool IsAllowedScheme(string scheme)
    {
        return !string.IsNullOrWhiteSpace(scheme) && AllowedSchemes.Contains(scheme);
    }

    /// <inheritdoc/>
    public bool IsAllowedIp(IPAddress ip)
    {
        if (ip == null) return false;

        // Automatically unmap IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1) so inner bytes are inspected cleanly
        if (ip.IsIPv4MappedToIPv6)
        {
            ip = ip.MapToIPv4();
        }

        // 1. Loopback addresses (127.0.0.0/8, ::1)
        if (IPAddress.IsLoopback(ip))
        {
            return false;
        }

        // 2. IPv4 Address Range Auditing
        if (ip.AddressFamily == AddressFamily.InterNetwork)
        {
            byte[] bytes = ip.GetAddressBytes();

            // 0.0.0.0/8 (Current network / default route)
            if (bytes[0] == 0) return false;

            // 10.0.0.0/8 (RFC 1918 Private class A)
            if (bytes[0] == 10) return false;

            // 100.64.0.0/10 (Carrier-Grade NAT RFC 6598)
            if (bytes[0] == 100 && bytes[1] >= 64 && bytes[1] <= 127) return false;

            // 127.0.0.0/8 (Loopback class A)
            if (bytes[0] == 127) return false;

            // 169.254.0.0/16 (Link-Local & Cloud Instance Metadata e.g. 169.254.169.254)
            if (bytes[0] == 169 && bytes[1] == 254) return false;

            // 172.16.0.0/12 (RFC 1918 Private class B: 172.16.0.0 to 172.31.255.255)
            if (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31) return false;

            // 192.0.0.0/24 (IETF Protocol Assignments)
            if (bytes[0] == 192 && bytes[1] == 0 && bytes[2] == 0) return false;

            // 192.0.2.0/24 (TEST-NET-1 Documentation)
            if (bytes[0] == 192 && bytes[1] == 0 && bytes[2] == 2) return false;

            // 192.88.99.0/24 (6to4 Relay Anycast)
            if (bytes[0] == 192 && bytes[1] == 88 && bytes[2] == 99) return false;

            // 192.168.0.0/16 (RFC 1918 Private class C)
            if (bytes[0] == 192 && bytes[1] == 168) return false;

            // 198.18.0.0/15 (Network Interconnect Benchmark Testing: 198.18.0.0 - 198.19.255.255)
            if (bytes[0] == 198 && (bytes[1] == 18 || bytes[1] == 19)) return false;

            // 198.51.100.0/24 (TEST-NET-2 Documentation)
            if (bytes[0] == 198 && bytes[1] == 51 && bytes[2] == 100) return false;

            // 203.0.113.0/24 (TEST-NET-3 Documentation)
            if (bytes[0] == 203 && bytes[1] == 0 && bytes[2] == 113) return false;

            // 224.0.0.0/4 (Multicast class D: 224.0.0.0 - 239.255.255.255)
            if (bytes[0] >= 224 && bytes[0] <= 239) return false;

            // 240.0.0.0/4 (Reserved class E & Broadcast 255.255.255.255)
            if (bytes[0] >= 240) return false;

            return true;
        }

        // 3. IPv6 Address Range Auditing
        if (ip.AddressFamily == AddressFamily.InterNetworkV6)
        {
            if (ip.Equals(IPAddress.IPv6None) || ip.Equals(IPAddress.IPv6Any) || ip.Equals(IPAddress.IPv6Loopback))
            {
                return false;
            }

            if (ip.IsIPv6LinkLocal || ip.IsIPv6SiteLocal || ip.IsIPv6Multicast)
            {
                return false;
            }

            byte[] bytes = ip.GetAddressBytes();

            // fc00::/7 (Unique Local Address RFC 4193 - starts with fc00:: or fd00::)
            if ((bytes[0] & 0xfe) == 0xfc) return false;

            // fe80::/10 (Link-Local unicast - starts with fe80, fe90, fea0, feb0)
            if (bytes[0] == 0xfe && (bytes[1] & 0xc0) == 0x80) return false;

            // ff00::/8 (IPv6 Multicast)
            if (bytes[0] == 0xff) return false;

            // 2001:db8::/32 (Documentation)
            if (bytes[0] == 0x20 && bytes[1] == 0x01 && bytes[2] == 0x0d && bytes[3] == 0xb8) return false;

            return true;
        }

        return false;
    }
}
