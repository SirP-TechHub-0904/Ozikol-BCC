using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Ozikol.Central.Models.News;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Services;

/// <summary>
/// Database-backed provider for news articles, release notes, and category filters.
/// Connects directly to the Master Catalog database and provides automated initial seeding.
/// </summary>
public class NewsService : INewsService
{
    private readonly MasterCatalogDbContext _dbContext;

    /// <summary>
    /// Initializes a new instance of the <see cref="NewsService"/> class.
    /// </summary>
    /// <param name="dbContext">Central Master Catalog database context.</param>
    public NewsService(MasterCatalogDbContext dbContext)
    {
        _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<NewsCategory>> GetCategoriesAsync()
    {
        await EnsureSeedDataAsync();

        var categories = await _dbContext.MasterNewsCategories
            .AsNoTracking()
            .Where(c => c.IsActive)
            .OrderBy(c => c.SortOrder)
            .Select(c => new NewsCategory
            {
                Key = c.Key,
                Name = c.Name,
                Slug = c.Slug,
                Description = c.Description,
                BadgeClass = c.BadgeClass
            })
            .ToListAsync();

        return categories.AsReadOnly();
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<NewsArticle>> GetArticlesAsync(string? categoryKey = null, string? search = null)
    {
        await EnsureSeedDataAsync();

        var query = _dbContext.MasterNewsArticles
            .AsNoTracking()
            .Include(a => a.Category)
            .Where(a => a.IsPublished);

        if (!string.IsNullOrWhiteSpace(categoryKey))
        {
            var key = categoryKey.Trim();
            query = query.Where(a => a.CategoryKey == key);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(a =>
                a.Title.Contains(term) ||
                a.Excerpt.Contains(term) ||
                a.TagsJson.Contains(term));
        }

        var entities = await query
            .OrderByDescending(a => a.PublishedAtUtc)
            .ToListAsync();

        var result = entities.Select(MapToModel).ToList();
        return result.AsReadOnly();
    }

    /// <inheritdoc />
    public async Task<NewsArticle?> GetFeaturedArticleAsync()
    {
        await EnsureSeedDataAsync();

        var entity = await _dbContext.MasterNewsArticles
            .AsNoTracking()
            .Include(a => a.Category)
            .Where(a => a.IsPublished && a.IsFeatured)
            .OrderByDescending(a => a.PublishedAtUtc)
            .FirstOrDefaultAsync();

        if (entity == null)
        {
            entity = await _dbContext.MasterNewsArticles
                .AsNoTracking()
                .Include(a => a.Category)
                .Where(a => a.IsPublished)
                .OrderByDescending(a => a.PublishedAtUtc)
                .FirstOrDefaultAsync();
        }

        return entity != null ? MapToModel(entity) : null;
    }

    /// <inheritdoc />
    public async Task<NewsArticle?> GetArticleBySlugAsync(string slug)
    {
        if (string.IsNullOrWhiteSpace(slug))
        {
            return null;
        }

        await EnsureSeedDataAsync();

        var normalizedSlug = slug.Trim();
        var entity = await _dbContext.MasterNewsArticles
            .AsNoTracking()
            .Include(a => a.Category)
            .FirstOrDefaultAsync(a => a.Slug == normalizedSlug && a.IsPublished);

        return entity != null ? MapToModel(entity) : null;
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<NewsArticle>> GetRelatedArticlesAsync(string categoryKey, string currentSlug, int count = 3)
    {
        await EnsureSeedDataAsync();

        var normalizedSlug = currentSlug.Trim();
        var entities = await _dbContext.MasterNewsArticles
            .AsNoTracking()
            .Include(a => a.Category)
            .Where(a => a.IsPublished &&
                        a.CategoryKey == categoryKey &&
                        a.Slug != normalizedSlug)
            .OrderByDescending(a => a.PublishedAtUtc)
            .Take(count)
            .ToListAsync();

        if (entities.Count < count)
        {
            var needed = count - entities.Count;
            var existingIds = entities.Select(e => e.Id).ToList();

            var supplemental = await _dbContext.MasterNewsArticles
                .AsNoTracking()
                .Include(a => a.Category)
                .Where(a => a.IsPublished &&
                            a.Slug != normalizedSlug &&
                            !existingIds.Contains(a.Id))
                .OrderByDescending(a => a.PublishedAtUtc)
                .Take(needed)
                .ToListAsync();

            entities.AddRange(supplemental);
        }

        return entities.Select(MapToModel).ToList().AsReadOnly();
    }

    /// <summary>
    /// Maps a database news article entity to the presentation model.
    /// </summary>
    /// <param name="entity">Source database entity.</param>
    /// <returns>Presentation news article model.</returns>
    private static NewsArticle MapToModel(MasterNewsArticle entity)
    {
        List<string> tags;
        try
        {
            tags = JsonSerializer.Deserialize<List<string>>(entity.TagsJson) ?? new List<string>();
        }
        catch
        {
            tags = new List<string>();
        }

        return new NewsArticle
        {
            Id = entity.Id.ToString(),
            Slug = entity.Slug,
            Title = entity.Title,
            CategoryKey = entity.CategoryKey,
            CategoryName = entity.Category?.Name ?? entity.CategoryKey,
            Excerpt = entity.Excerpt,
            ContentHtml = entity.ContentHtml,
            AuthorName = entity.AuthorName,
            AuthorRole = entity.AuthorRole,
            PublishedAtUtc = entity.PublishedAtUtc,
            ReadTimeText = entity.ReadTimeText,
            IsFeatured = entity.IsFeatured,
            Tags = tags,
            CoverGradientClass = entity.CoverGradientClass
        };
    }

    /// <summary>
    /// Ensures that seed categories and articles exist in the Master Catalog database.
    /// </summary>
    private async Task EnsureSeedDataAsync()
    {
        if (await _dbContext.MasterNewsCategories.AnyAsync())
        {
            return;
        }

        var releasesCategory = new MasterNewsCategory
        {
            Id = Guid.NewGuid(),
            Key = "product-releases",
            Name = "Product Releases",
            Slug = "product-releases",
            Description = "Major platform updates, new cloud suites, and capability rollouts.",
            BadgeClass = "oz-badge-blue",
            SortOrder = 1,
            IsActive = true
        };

        var securityCategory = new MasterNewsCategory
        {
            Id = Guid.NewGuid(),
            Key = "engineering-security",
            Name = "Engineering & Security",
            Slug = "engineering-security",
            Description = "Deep-dives into dedicated system architecture, BYOK privacy, and MIS API access.",
            BadgeClass = "oz-badge-emerald",
            SortOrder = 2,
            IsActive = true
        };

        var marketplaceCategory = new MasterNewsCategory
        {
            Id = Guid.NewGuid(),
            Key = "marketplace-ecosystem",
            Name = "Marketplace & Creators",
            Slug = "marketplace-ecosystem",
            Description = "Modular UI templates, creator royalties, and layout blueprints.",
            BadgeClass = "oz-badge-amber",
            SortOrder = 3,
            IsActive = true
        };

        var pressCategory = new MasterNewsCategory
        {
            Id = Guid.NewGuid(),
            Key = "corporate-press",
            Name = "Corporate & Press",
            Slug = "corporate-press",
            Description = "Official corporate communications, alliances, and industry milestones.",
            BadgeClass = "oz-badge-crimson",
            SortOrder = 4,
            IsActive = true
        };

        _dbContext.MasterNewsCategories.AddRange(releasesCategory, securityCategory, marketplaceCategory, pressCategory);

        var article1 = new MasterNewsArticle
        {
            Id = Guid.NewGuid(),
            Slug = "unifying-modular-capabilities-across-cloud-suites",
            Title = "Unifying Modular Capabilities Across Eight Enterprise Cloud Suites",
            CategoryKey = releasesCategory.Key,
            MasterNewsCategoryId = releasesCategory.Id,
            Excerpt = "A significant architecture milestone unifying staff rotas, verifiable credentials, mobile bio links, mass communications, and private AI Smart Assist into a single platform.",
            ContentHtml = @"
                <p>Organizations worldwide face software fragmentation, often juggling multiple disconnected vendors for shift scheduling, incident management, public certificate verification, and executive communication. Today, Ozikol marks a transformative milestone by unifying these essential functions into a cohesive, modular operating platform.</p>
                <h3>Engineered for Dedicated Enterprise Flexibility</h3>
                <p>Each organization operates inside a cryptographically partitioned workspace with independent data persistence, custom branding, and localized multi-language support. From local charity trusts to large regional enterprises, administrators can activate exactly the capabilities their teams require without paying for unnecessary bloat.</p>
                <h3>Integrated Operations and Zero Fragmentation</h3>
                <p>With native synchronization between workforce rosters and mass notifications, managers can broadcast shift openings or emergency alerts instantly. By removing silos between field workers, desk staff, and leadership, operational productivity is increased while administrative friction is eliminated.</p>",
            AuthorName = "Platform Engineering Team",
            AuthorRole = "Core Architecture Group",
            PublishedAtUtc = DateTime.UtcNow.AddDays(-2),
            ReadTimeText = "5 min read",
            IsFeatured = true,
            TagsJson = JsonSerializer.Serialize(new[] { "Platform", "Cloud Suites", "Architecture", "Operations" }),
            CoverGradientClass = "oz-news-cover-indigo",
            IsPublished = true
        };

        var article2 = new MasterNewsArticle
        {
            Id = Guid.NewGuid(),
            Slug = "enabling-mis-api-secure-data-sharing-external-bodies",
            Title = "Enabling the MIS API: Controlled External Data Sharing Without Direct Login Credentials",
            CategoryKey = securityCategory.Key,
            MasterNewsCategoryId = securityCategory.Id,
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
            TagsJson = JsonSerializer.Serialize(new[] { "Developer API", "Webhooks", "MIS Integration", "Security" }),
            CoverGradientClass = "oz-news-cover-emerald",
            IsPublished = true
        };

        var article3 = new MasterNewsArticle
        {
            Id = Guid.NewGuid(),
            Slug = "creator-partner-program-monetizing-ui-blueprints",
            Title = "Empowering Designers and Front-End Engineers Through the Creator Partner Program",
            CategoryKey = marketplaceCategory.Key,
            MasterNewsCategoryId = marketplaceCategory.Id,
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
            TagsJson = JsonSerializer.Serialize(new[] { "Marketplace", "Creators", "Design Tokens", "Revenue Share" }),
            CoverGradientClass = "oz-news-cover-amber",
            IsPublished = true
        };

        var article4 = new MasterNewsArticle
        {
            Id = Guid.NewGuid(),
            Slug = "responsible-ai-architecture-byok-privacy-standard",
            Title = "Responsible Enterprise AI: Bring-Your-Own-Key Privacy and Cryptographic Auditing",
            CategoryKey = securityCategory.Key,
            MasterNewsCategoryId = securityCategory.Id,
            Excerpt = "How our Bring-Your-Own-Key (BYOK) architecture guarantees that organizational communications, ticket summaries, and internal documents are never used for third-party AI training.",
            ContentHtml = @"
                <p>As modern organizations adopt artificial intelligence to draft shift policies, summarize incident logs, and generate member communications, confidentiality remains the paramount priority. Ozikol has engineered its AI Smart Assist suite from the ground up on strict BYOK (Bring Your Own Key) privacy principles.</p>
                <h3>Total Data Sovereignty</h3>
                <p>All AI requests route through direct, stateless customer-owned API keys. Ozikol never stores prompt content on external servers, and customer data is strictly excluded from public foundation model training. Every transaction is signed and recorded in organization audit logs, giving compliance officers complete visibility over automated processing.</p>",
            AuthorName = "Information Security Office",
            AuthorRole = "Trust & Safety Architecture",
            PublishedAtUtc = DateTime.UtcNow.AddDays(-16),
            ReadTimeText = "3 min read",
            IsFeatured = false,
            TagsJson = JsonSerializer.Serialize(new[] { "AI Privacy", "BYOK", "Enterprise Compliance", "Security" }),
            CoverGradientClass = "oz-news-cover-crimson",
            IsPublished = true
        };

        var article5 = new MasterNewsArticle
        {
            Id = Guid.NewGuid(),
            Slug = "expanding-global-partner-network-enterprise-integrators",
            Title = "Ozikol Welcomes Enterprise Systems Integrators and Strategic Advocates to Partner Network",
            CategoryKey = pressCategory.Key,
            MasterNewsCategoryId = pressCategory.Id,
            Excerpt = "Expanding collaboration channels for IT consultancies, cloud migration specialists, and industry advocates with direct deal commissions and co-selling support.",
            ContentHtml = @"
                <p>To accelerate digital transformation across international enterprises and civic institutions, Ozikol has formally opened its three-track partnership network. Covering Enterprise Systems Integrators, UI Blueprint Creators, and Affiliate Advocates, the initiative provides comprehensive technical enablement and direct revenue share.</p>
                <h3>Accelerating Organization Onboarding</h3>
                <p>Systems integrators gain access to dedicated partner managers, sandbox testing environments for client demonstrations, and direct deal commissions on enterprise contracts. Strategic advocates can also share personalized referral links with real-time conversion telemetry, helping organizations of every size discover modernized business cloud operations.</p>",
            AuthorName = "Corporate Alliances",
            AuthorRole = "Global Partnerships",
            PublishedAtUtc = DateTime.UtcNow.AddDays(-24),
            ReadTimeText = "3 min read",
            IsFeatured = false,
            TagsJson = JsonSerializer.Serialize(new[] { "Partnerships", "Enterprise", "Integrators", "Alliances" }),
            CoverGradientClass = "oz-news-cover-indigo",
            IsPublished = true
        };

        _dbContext.MasterNewsArticles.AddRange(article1, article2, article3, article4, article5);
        await _dbContext.SaveChangesAsync();
    }
}
