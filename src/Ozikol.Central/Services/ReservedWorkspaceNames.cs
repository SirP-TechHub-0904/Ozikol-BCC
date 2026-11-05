using System.Collections.Frozen;

namespace Ozikol.Central.Services;

/// <summary>
/// Provides a centralized, high-performance registry of prohibited and reserved workspace subdomains.
/// Prevents tenants from hijacking platform routing, administrative portals, APIs, or infrastructure tokens.
/// </summary>
public static class ReservedWorkspaceNames
{
    private static readonly FrozenSet<string> ReservedSlugs = new[]
    {
        // 1. Administration & Privileged Roles
        "admin", "administrator", "superadmin", "supadmin", "root", "sysadmin", "system",
        "manager", "moderator", "security", "host", "master", "central", "portal",
        "console", "dashboard",

        // 2. Network, Infrastructure & Protocols
        "api", "apis", "gateway", "graphql", "rest", "webhook", "webhooks",
        "cdn", "dns", "ns", "ns1", "ns2", "mail", "email", "smtp", "imap", "pop",
        "ftp", "ssh", "ssl", "cert", "certs", "status", "health", "monitor", "ping", "metrics",

        // 3. Authentication & Core Platform Routes
        "auth", "oauth", "sso", "login", "signin", "signup", "logout", "register",
        "onboarding", "account", "accounts", "billing", "pay", "payment", "payments",
        "checkout", "cart", "internal", "dev", "development", "staging", "test",
        "prod", "production", "sandbox",

        // 4. Platform Branding & Corporate Hubs
        "ozikol", "ozikol-bcc", "ozikolcloud", "ozikol-cloud", "ozi", "ozi-ai", "oziai",
        "support", "help", "helpdesk", "docs", "documentation", "legal", "terms",
        "privacy", "compliance", "about", "contact", "marketplace", "store", "shop",

        // 5. AI Engines & Autonomous Agents
        "ai", "copilot", "assistant", "agent", "agents", "bot", "bots", "llm", "chat", "smart",

        // 6. System Tokens & Loopbacks
        "localhost", "127", "local", "null", "undefined", "default", "public",
        "private", "static", "assets", "media", "www", "web", "app"
    }.ToFrozenSet(StringComparer.OrdinalIgnoreCase);

    /// <summary>
    /// Checks whether the specified workspace identifier/slug is reserved by the platform.
    /// </summary>
    /// <param name="slug">The workspace slug to evaluate.</param>
    /// <returns>True if the slug is reserved and cannot be registered; otherwise false.</returns>
    public static bool IsReserved(string? slug)
    {
        if (string.IsNullOrWhiteSpace(slug))
        {
            return true;
        }

        var clean = slug.Trim().ToLowerInvariant();
        return ReservedSlugs.Contains(clean);
    }
}
