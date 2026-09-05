using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Ozikol.Central.Models.News;

namespace Ozikol.Central.Services;

/// <summary>
/// In-memory and database-backed provider for news articles, release notes, and category filters.
/// </summary>
public class NewsService : INewsService
{
    private static readonly List<NewsCategory> Categories = new()
    {
        new NewsCategory
        {
            Key = "product-releases",
            Name = "Product Releases",
            Slug = "product-releases",
            Description = "Major platform updates, new cloud suites, and capability rollouts.",
            BadgeClass = "oz-badge-blue"
        },
        new NewsCategory
        {
            Key = "engineering-security",
            Name = "Engineering & Security",
            Slug = "engineering-security",
            Description = "Deep-dives into multi-tenant infrastructure, BYOK privacy, and MIS API access.",
            BadgeClass = "oz-badge-emerald"
        },
        new NewsCategory
        {
            Key = "marketplace-ecosystem",
            Name = "Marketplace & Creators",
            Slug = "marketplace-ecosystem",
            Description = "Modular UI templates, creator royalties, and layout blueprints.",
            BadgeClass = "oz-badge-amber"
        },
        new NewsCategory
        {
            Key = "corporate-press",
            Name = "Corporate & Press",
            Slug = "corporate-press",
            Description = "Official corporate communications, alliances, and industry milestones.",
            BadgeClass = "oz-badge-crimson"
        }
    };

    private static readonly List<NewsArticle> Articles = new()
    {
        new NewsArticle
        {
            Id = "art-01",
            Slug = "unifying-modular-capabilities-across-cloud-suites",
            Title = "Unifying Modular Capabilities Across Eight Enterprise Cloud Suites",
            CategoryKey = "product-releases",
            CategoryName = "Product Releases",
            Excerpt = "A significant architecture milestone unifying staff rotas, verifiable credentials, mobile bio links, mass communications, and private AI Smart Assist into a single platform.",
            ContentHtml = @"
                <p>Organizations worldwide face software fragmentation, often juggling multiple disconnected vendors for shift scheduling, incident management, public certificate verification, and executive communication. Today, Ozikol marks a transformative milestone by unifying these essential functions into a cohesive, modular operating platform.</p>
                <h3>Engineered for Multi-Tenant Flexibility</h3>
                <p>Each organization operates inside a cryptographically partitioned workspace with independent data persistence, custom branding, and localized multi-language support. From local charity trusts to large regional enterprises, administrators can activate exactly the capabilities their teams require without paying for unnecessary bloat.</p>
                <h3>Integrated Operations and Zero Fragmentation</h3>
                <p>With native synchronization between workforce rosters and mass notifications, managers can broadcast shift openings or emergency alerts instantly. By removing silos between field workers, desk staff, and leadership, operational productivity is increased while administrative friction is eliminated.</p>",
            AuthorName = "Platform Engineering Team",
            AuthorRole = "Core Architecture Group",
            PublishedAtUtc = DateTime.UtcNow.AddDays(-2),
            ReadTimeText = "5 min read",
            IsFeatured = true,
            Tags = new() { "Platform", "Cloud Suites", "Architecture", "Operations" },
            CoverGradientClass = "oz-news-cover-indigo"
        },
        new NewsArticle
        {
            Id = "art-02",
            Slug = "enabling-mis-api-secure-data-sharing-external-bodies",
            Title = "Enabling the MIS API: Controlled External Data Sharing Without Direct Login Credentials",
            CategoryKey = "engineering-security",
            CategoryName = "Engineering & Security",
            Excerpt = "Learn how organizations enable scoped MIS endpoints to allow government census bureaus, incident contractors, and independent auditors to query live data securely.",
            ContentHtml = @"
                <p>One of the most frequent governance challenges for institutions is granting external partners, regional bodies, and regulators access to specific operational figures without compromising the security of their internal management information system (MIS).</p>
                <h3>The Principle of Scoped Least Privilege</h3>
                <p>Traditionally, organizations were forced to choose between manually exporting spreadsheets or creating full user login accounts for outside contractors and auditors. Ozikol solves this through the Developer MIS API: tenant administrators can generate fine-grained, tokenized API keys restricted strictly to designated resource endpoints, such as census demographic surveys, maintenance ticketing, or revenue audit logs.</p>
                <h3>Automating Event Notifications with Webhooks</h3>
                <p>In addition to pull-based REST queries, external systems can subscribe to real-time webhook events. When an incident ticket is submitted or a demographic survey is verified, an HMAC-signed payload is dispatched directly to the partner agency, guaranteeing immediate synchronization without ever giving external entities portal credentials.</p>",
            AuthorName = "Security Alliances Group",
            AuthorRole = "Data Protection & Compliance",
            PublishedAtUtc = DateTime.UtcNow.AddDays(-6),
            ReadTimeText = "4 min read",
            IsFeatured = false,
            Tags = new() { "Developer API", "Webhooks", "MIS Integration", "Security" },
            CoverGradientClass = "oz-news-cover-emerald"
        },
        new NewsArticle
        {
            Id = "art-03",
            Slug = "creator-partner-program-monetizing-ui-blueprints",
            Title = "Empowering Designers and Front-End Engineers Through the Creator Partner Program",
            CategoryKey = "marketplace-ecosystem",
            CategoryName = "Marketplace & Creators",
            Excerpt = "Designers and UI agencies can now craft modular landing suites, navigation headers, and operational dashboards to earn recurring creator revenue share on the Marketplace.",
            ContentHtml = @"
                <p>The Ozikol UI Marketplace is expanding its ecosystem by welcoming independent designers, UI/UX studios, and front-end developers to build and distribute sectional layout blueprints directly to tenant organizations.</p>
                <h3>Native Design Tokens and Seamless Theme Integration</h3>
                <p>Every blueprint created for the Marketplace utilizes Ozikol's native CSS variable architecture and tokenized grid layout. This ensures that any page section, whether a modern split hero or a responsive metrics banner, inherits the tenant's brand color, dark mode styling, and typography automatically upon installation.</p>
                <h3>Sustainable Creator Monetization</h3>
                <p>Creators receive ongoing recurring revenue share whenever tenants license or subscribe to their template collections. With automated licensing, royalty payouts, and a verified creator badge, our program provides a transparent, lucrative channel for talented interface designers to reach global business audiences.</p>",
            AuthorName = "Marketplace Ecosystem Team",
            AuthorRole = "Developer Relations",
            PublishedAtUtc = DateTime.UtcNow.AddDays(-10),
            ReadTimeText = "4 min read",
            IsFeatured = false,
            Tags = new() { "Marketplace", "Creators", "Design Tokens", "Revenue Share" },
            CoverGradientClass = "oz-news-cover-amber"
        },
        new NewsArticle
        {
            Id = "art-04",
            Slug = "responsible-ai-architecture-byok-privacy-standard",
            Title = "Responsible Enterprise AI: Bring-Your-Own-Key Privacy and Cryptographic Auditing",
            CategoryKey = "engineering-security",
            CategoryName = "Engineering & Security",
            Excerpt = "How our Bring-Your-Own-Key (BYOK) architecture guarantees that organizational communications, ticket summaries, and internal documents are never used for third-party AI training.",
            ContentHtml = @"
                <p>As modern organizations adopt artificial intelligence to draft shift policies, summarize incident logs, and generate member communications, confidentiality remains the paramount priority. Ozikol has engineered its AI Smart Assist suite from the ground up on strict BYOK (Bring Your Own Key) privacy principles.</p>
                <h3>Total Data Sovereignty</h3>
                <p>All AI requests route through direct, stateless customer-owned API keys. Ozikol never stores prompt content on external servers, and tenant data is strictly excluded from public foundation model training. Every transaction is signed and recorded in tenant audit logs, giving compliance officers complete visibility over automated processing.</p>",
            AuthorName = "Information Security Office",
            AuthorRole = "Trust & Safety Architecture",
            PublishedAtUtc = DateTime.UtcNow.AddDays(-16),
            ReadTimeText = "3 min read",
            IsFeatured = false,
            Tags = new() { "AI Privacy", "BYOK", "Enterprise Compliance", "Security" },
            CoverGradientClass = "oz-news-cover-crimson"
        },
        new NewsArticle
        {
            Id = "art-05",
            Slug = "expanding-global-partner-network-enterprise-integrators",
            Title = "Ozikol Welcomes Enterprise Systems Integrators and Strategic Advocates to Partner Network",
            CategoryKey = "corporate-press",
            CategoryName = "Corporate & Press",
            Excerpt = "Expanding collaboration channels for IT consultancies, cloud migration specialists, and industry advocates with direct deal commissions and co-selling support.",
            ContentHtml = @"
                <p>To accelerate digital transformation across international enterprises and civic institutions, Ozikol has formally opened its three-track partnership network. Covering Enterprise Systems Integrators, UI Blueprint Creators, and Affiliate Advocates, the initiative provides comprehensive technical enablement and direct revenue share.</p>
                <h3>Accelerating Tenant Onboarding</h3>
                <p>Systems integrators gain access to dedicated partner managers, sandbox testing environments for client demonstrations, and direct deal commissions on enterprise contracts. Strategic advocates can also share personalized referral links with real-time conversion telemetry, helping organizations of every size discover modernized business cloud operations.</p>",
            AuthorName = "Corporate Alliances",
            AuthorRole = "Global Partnerships",
            PublishedAtUtc = DateTime.UtcNow.AddDays(-24),
            ReadTimeText = "3 min read",
            IsFeatured = false,
            Tags = new() { "Partnerships", "Enterprise", "Integrators", "Alliances" },
            CoverGradientClass = "oz-news-cover-indigo"
        }
    };

    /// <inheritdoc />
    public Task<IReadOnlyList<NewsCategory>> GetCategoriesAsync()
    {
        return Task.FromResult<IReadOnlyList<NewsCategory>>(Categories.AsReadOnly());
    }

    /// <inheritdoc />
    public Task<IReadOnlyList<NewsArticle>> GetArticlesAsync(string? categoryKey = null, string? search = null)
    {
        IEnumerable<NewsArticle> query = Articles;

        if (!string.IsNullOrWhiteSpace(categoryKey))
        {
            query = query.Where(a => a.CategoryKey.Equals(categoryKey.Trim(), StringComparison.OrdinalIgnoreCase));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(a =>
                a.Title.Contains(term, StringComparison.OrdinalIgnoreCase) ||
                a.Excerpt.Contains(term, StringComparison.OrdinalIgnoreCase) ||
                a.Tags.Any(t => t.Contains(term, StringComparison.OrdinalIgnoreCase)));
        }

        var ordered = query.OrderByDescending(a => a.PublishedAtUtc).ToList();
        return Task.FromResult<IReadOnlyList<NewsArticle>>(ordered.AsReadOnly());
    }

    /// <inheritdoc />
    public Task<NewsArticle?> GetFeaturedArticleAsync()
    {
        var featured = Articles.FirstOrDefault(a => a.IsFeatured) ?? Articles.OrderByDescending(a => a.PublishedAtUtc).FirstOrDefault();
        return Task.FromResult(featured);
    }

    /// <inheritdoc />
    public Task<NewsArticle?> GetArticleBySlugAsync(string slug)
    {
        if (string.IsNullOrWhiteSpace(slug))
        {
            return Task.FromResult<NewsArticle?>(null);
        }

        var article = Articles.FirstOrDefault(a => a.Slug.Equals(slug.Trim(), StringComparison.OrdinalIgnoreCase));
        return Task.FromResult(article);
    }

    /// <inheritdoc />
    public Task<IReadOnlyList<NewsArticle>> GetRelatedArticlesAsync(string categoryKey, string currentSlug, int count = 3)
    {
        var related = Articles
            .Where(a => a.CategoryKey.Equals(categoryKey, StringComparison.OrdinalIgnoreCase) &&
                        !a.Slug.Equals(currentSlug, StringComparison.OrdinalIgnoreCase))
            .OrderByDescending(a => a.PublishedAtUtc)
            .Take(count)
            .ToList();

        // If not enough in same category, supplement with latest other articles
        if (related.Count < count)
        {
            var remaining = Articles
                .Where(a => !a.Slug.Equals(currentSlug, StringComparison.OrdinalIgnoreCase) && !related.Contains(a))
                .OrderByDescending(a => a.PublishedAtUtc)
                .Take(count - related.Count);
            related.AddRange(remaining);
        }

        return Task.FromResult<IReadOnlyList<NewsArticle>>(related.AsReadOnly());
    }
}
