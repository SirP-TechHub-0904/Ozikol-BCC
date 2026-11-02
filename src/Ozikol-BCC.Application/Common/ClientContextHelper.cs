using System;
using System.Linq;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;

namespace Ozikol_BCC.Application.Common
{
    /// <summary>
    /// Encapsulates rich client diagnostic telemetry extracted from an active HTTP context.
    /// Used by both Central MongoDB logging and Tenant SQL relational audit trails.
    /// </summary>
    public class ClientContextInfo
    {
        /// <summary>
        /// Gets or sets the resolved real client IP address, handling Cloudflare and reverse proxy headers.
        /// </summary>
        public string IpAddress { get; set; } = "Unknown";

        /// <summary>
        /// Gets or sets the persistent client system or hardware identifier (from X-System-Id or X-Device-Id).
        /// </summary>
        public string? SystemId { get; set; }

        /// <summary>
        /// Gets or sets the authenticated user's unique profile or account identifier.
        /// </summary>
        public string? UserId { get; set; }

        /// <summary>
        /// Gets or sets the authenticated user's email address.
        /// </summary>
        public string? UserEmail { get; set; }

        /// <summary>
        /// Gets or sets the authenticated user's full name or display name.
        /// </summary>
        public string? UserName { get; set; }

        /// <summary>
        /// Gets or sets the raw User-Agent header string.
        /// </summary>
        public string? UserAgent { get; set; }

        /// <summary>
        /// Gets or sets the client operating system or runtime platform (e.g., "windows", "android", "web").
        /// </summary>
        public string? Platform { get; set; }

        /// <summary>
        /// Gets or sets the active tenant routing key if present.
        /// </summary>
        public string? TenantKey { get; set; }
    }

    /// <summary>
    /// Utility for robustly resolving caller context, genuine client IP addresses,
    /// persistent hardware/system identifiers, and authenticated claims from <see cref="HttpContext"/>.
    /// </summary>
    public static class ClientContextHelper
    {
        /// <summary>
        /// Extracts a populated <see cref="ClientContextInfo"/> from the active HTTP request.
        /// </summary>
        /// <param name="httpContext">The current HTTP context (may be null in background jobs).</param>
        /// <returns>A populated client context container.</returns>
        public static ClientContextInfo Resolve(HttpContext? httpContext)
        {
            var info = new ClientContextInfo();

            if (httpContext == null)
            {
                return info;
            }

            var request = httpContext.Request;

            // 1. Resolve Genuine IP Address (traversing reverse proxies and Cloudflare)
            string? ip = request.Headers["CF-Connecting-IP"].FirstOrDefault();
            if (string.IsNullOrWhiteSpace(ip))
            {
                var forwarded = request.Headers["X-Forwarded-For"].FirstOrDefault();
                if (!string.IsNullOrWhiteSpace(forwarded))
                {
                    // In X-Forwarded-For: client, proxy1, proxy2. Take the leftmost (originating client)
                    ip = forwarded.Split(',')[0].Trim();
                }
            }
            if (string.IsNullOrWhiteSpace(ip))
            {
                ip = request.Headers["X-Real-IP"].FirstOrDefault();
            }
            if (string.IsNullOrWhiteSpace(ip))
            {
                ip = httpContext.Connection?.RemoteIpAddress?.ToString();
            }
            info.IpAddress = !string.IsNullOrWhiteSpace(ip) ? ip : "Unknown";

            // 2. Resolve Unique System/Device Identifier
            string? systemId = request.Headers["X-System-Id"].FirstOrDefault();
            if (string.IsNullOrWhiteSpace(systemId))
            {
                systemId = request.Headers["X-Device-Id"].FirstOrDefault();
            }
            info.SystemId = string.IsNullOrWhiteSpace(systemId) ? null : systemId.Trim();

            // 3. Resolve Client Platform
            string? platform = request.Headers["X-Platform"].FirstOrDefault();
            info.Platform = string.IsNullOrWhiteSpace(platform) ? null : platform.Trim();

            // 4. Resolve User-Agent
            string? userAgent = request.Headers["User-Agent"].FirstOrDefault();
            info.UserAgent = string.IsNullOrWhiteSpace(userAgent) ? null : userAgent.Trim();

            // 5. Resolve Tenant Key
            string? tenantKey = request.Headers["X-Tenant-Key"].FirstOrDefault();
            info.TenantKey = string.IsNullOrWhiteSpace(tenantKey) ? null : tenantKey.Trim();

            // 6. Resolve Authenticated Identity Claims
            var user = httpContext.User;
            if (user?.Identity?.IsAuthenticated == true)
            {
                info.UserId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? user.FindFirst("sub")?.Value;

                info.UserEmail = user.FindFirst(ClaimTypes.Email)?.Value
                    ?? user.FindFirst("email")?.Value
                    ?? (user.Identity.Name?.Contains('@') == true ? user.Identity.Name : null);

                info.UserName = user.FindFirst(ClaimTypes.Name)?.Value
                    ?? user.FindFirst("name")?.Value
                    ?? user.Identity.Name;
            }

            return info;
        }
    }
}
