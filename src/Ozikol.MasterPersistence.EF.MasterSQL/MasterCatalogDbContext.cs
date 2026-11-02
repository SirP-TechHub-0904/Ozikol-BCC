using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL.Security;

namespace Ozikol.MasterPersistence.EF.MasterSQL;

/// <summary>
/// Dedicated EF Core DbContext for the central Master Catalog Database.
/// Stores Central Identity (CentralUser, CentralRole), tenant registrations (MasterTenantCatalog),
/// feature catalog (MasterFeatureCatalog), subscriptions, marketplace blueprints, affiliate network, and email logs.
/// </summary>
public class MasterCatalogDbContext : IdentityDbContext<CentralUser, CentralRole, string>
{
    public DbSet<MasterTenantCatalog> MasterTenantCatalogs { get; set; } = null!;
    public DbSet<MasterMarketplaceCategory> MasterMarketplaceCategories { get; set; } = null!;
    public DbSet<MasterMarketplaceTemplate> MasterMarketplaceTemplates { get; set; } = null!;
    public DbSet<MasterMarketplaceDraftSection> MasterMarketplaceDraftSections { get; set; } = null!;
    public DbSet<MasterTemplateSection> MasterTemplateSections { get; set; } = null!;
    public DbSet<MasterTemplateSectionList> MasterTemplateSectionLists { get; set; } = null!;
    public DbSet<MasterTemplatePlaceholder> MasterTemplatePlaceholders { get; set; } = null!;
    public DbSet<MasterMediaAsset> MasterMediaAssets { get; set; } = null!;

    // Category Content DbSets
    public DbSet<MasterMenuContent> MasterMenuContents { get; set; } = null!;
    public DbSet<MasterMenuNavItem> MasterMenuNavItems { get; set; } = null!;
    public DbSet<MasterHeroContent> MasterHeroContents { get; set; } = null!;
    public DbSet<MasterHeroSlideItem> MasterHeroSlideItems { get; set; } = null!;
    public DbSet<MasterBodySectionContent> MasterBodySectionContents { get; set; } = null!;
    public DbSet<MasterBodySectionList> MasterBodySectionLists { get; set; } = null!;
    public DbSet<MasterBlogContent> MasterBlogContents { get; set; } = null!;
    public DbSet<MasterBlogPostItem> MasterBlogPostItems { get; set; } = null!;
    public DbSet<MasterMarqueeContent> MasterMarqueeContents { get; set; } = null!;
    public DbSet<MasterMarqueeItem> MasterMarqueeItems { get; set; } = null!;
    public DbSet<MasterContactContent> MasterContactContents { get; set; } = null!;
    public DbSet<MasterContactChannelItem> MasterContactChannelItems { get; set; } = null!;
    public DbSet<MasterFooterContent> MasterFooterContents { get; set; } = null!;
    public DbSet<MasterFooterColumn> MasterFooterColumns { get; set; } = null!;
    public DbSet<MasterFooterLink> MasterFooterLinks { get; set; } = null!;

    public DbSet<MasterFeatureSuite> MasterFeatureSuites { get; set; } = null!;
    public DbSet<MasterFeatureCatalog> MasterFeatureCatalogs { get; set; } = null!;
    public DbSet<MasterTenantFeatureSubscription> MasterTenantFeatureSubscriptions { get; set; } = null!;
    public DbSet<MasterEmailLog> MasterEmailLogs { get; set; } = null!;
    public DbSet<MasterAffiliatePartner> MasterAffiliatePartners { get; set; } = null!;
    public DbSet<MasterAffiliateReferral> MasterAffiliateReferrals { get; set; } = null!;
    public DbSet<MasterCurrencyRate> MasterCurrencyRates { get; set; } = null!;
    public DbSet<MasterNewsCategory> MasterNewsCategories { get; set; } = null!;
    public DbSet<MasterNewsArticle> MasterNewsArticles { get; set; } = null!;
    public DbSet<MasterCreatorApplication> MasterCreatorApplications { get; set; } = null!;
    public DbSet<MasterJobOpening> MasterJobOpenings { get; set; } = null!;
    public DbSet<MasterJobApplication> MasterJobApplications { get; set; } = null!;
    public DbSet<MasterSupportInquiry> MasterSupportInquiries { get; set; } = null!;
    public DbSet<MasterHelpdeskArticle> MasterHelpdeskArticles { get; set; } = null!;
    public DbSet<MasterVideoGuide> MasterVideoGuides { get; set; } = null!;
    public DbSet<MasterSupportFaq> MasterSupportFaqs { get; set; } = null!;
    public DbSet<MasterPlatformSetting> MasterPlatformSettings { get; set; } = null!;
    public DbSet<MasterTicketReply> MasterTicketReplies { get; set; } = null!;
    public DbSet<MasterLegalDocument> MasterLegalDocuments { get; set; } = null!;
    public DbSet<MasterCoupon> MasterCoupons { get; set; } = null!;
    public DbSet<MasterCouponRedemption> MasterCouponRedemptions { get; set; } = null!;
    public DbSet<MasterVoucherApplication> MasterVoucherApplications { get; set; } = null!;

    /// <summary>
    /// Master client application release records powering in-app OTA updates and distribution.
    /// </summary>
    public DbSet<MasterClientRelease> MasterClientReleases { get; set; } = null!;


    /// <summary>
    /// Audit log entries tracking all administrative actions across the platform.
    /// </summary>
    public DbSet<MasterAuditLog> MasterAuditLogs { get; set; } = null!;

    /// <summary>
    /// Billing transaction records for tenant subscription payments, refunds, and manual adjustments.
    /// </summary>
    public DbSet<MasterBillingTransaction> MasterBillingTransactions { get; set; } = null!;

    /// <summary>
    /// Registered background jobs for Central platform and Tenant automation.
    /// </summary>
    public DbSet<MasterBackgroundJob> MasterBackgroundJobs { get; set; } = null!;

    /// <summary>
    /// Execution logs for background jobs.
    /// </summary>
    public DbSet<MasterBackgroundJobLog> MasterBackgroundJobLogs { get; set; } = null!;

    /// <summary>
    /// Central platform notifications and alerts.
    /// </summary>
    public DbSet<MasterNotification> MasterNotifications { get; set; } = null!;

    /// <summary>
    /// Registered AI provider API keys for Central key rotation pool and telemetry.
    /// </summary>
    public DbSet<MasterAiApiKey> MasterAiApiKeys { get; set; } = null!;

    /// <summary>
    /// Telemetry and audit log entries for all AI requests processed through the key pool.
    /// </summary>
    public DbSet<MasterAiApiKeyUsageLog> MasterAiApiKeyUsageLogs { get; set; } = null!;

    /// <summary>
    /// Central diagnostic error logs storing CustomError + RealError + ErrorCode for tenant and platform API failures.
    /// </summary>
    public DbSet<MasterApiErrorLog> MasterApiErrorLogs { get; set; } = null!;

    public MasterCatalogDbContext(DbContextOptions<MasterCatalogDbContext> options) : base(options)
    {
    }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        base.OnConfiguring(optionsBuilder);
        optionsBuilder.ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Customize Identity Table Names for Master DB Clarity
        modelBuilder.Entity<CentralUser>(b =>
        {
            b.ToTable("CentralUsers");

            // FK to MasterAffiliatePartner — optional link for affiliate-provisioned accounts
            b.HasIndex(e => e.AffiliatePartnerId);
            b.HasOne(e => e.AffiliatePartner)
                .WithMany()
                .HasForeignKey(e => e.AffiliatePartnerId)
                .OnDelete(DeleteBehavior.SetNull);

            // FK to MasterCreatorApplication — optional link for creator-provisioned accounts
            b.HasIndex(e => e.CreatorApplicationId);
            b.HasOne(e => e.CreatorApplication)
                .WithMany()
                .HasForeignKey(e => e.CreatorApplicationId)
                .OnDelete(DeleteBehavior.SetNull);
        });
        modelBuilder.Entity<CentralRole>(b => b.ToTable("CentralRoles"));
        modelBuilder.Entity<IdentityUserRole<string>>(b => b.ToTable("CentralUserRoles"));
        modelBuilder.Entity<IdentityUserClaim<string>>(b => b.ToTable("CentralUserClaims"));
        modelBuilder.Entity<IdentityUserLogin<string>>(b => b.ToTable("CentralUserLogins"));
        modelBuilder.Entity<IdentityRoleClaim<string>>(b => b.ToTable("CentralRoleClaims"));
        modelBuilder.Entity<IdentityUserToken<string>>(b => b.ToTable("CentralUserTokens"));

        modelBuilder.Entity<MasterTenantCatalog>(entity =>
        {
            entity.HasIndex(e => e.TenantKey).IsUnique();
            entity.HasIndex(e => e.PrimaryDomain).IsUnique();
            entity.HasIndex(e => e.CustomDomain);
            entity.HasIndex(e => e.IsActive);
            entity.HasIndex(e => e.IsSuspended);
            entity.HasIndex(e => e.IsDeleted);

            // Transparent AES-256-GCM encryption at rest for tenant database connection strings
            entity.Property(e => e.ConnectionString)
                .HasConversion(EncryptedStringValueConverter.Instance);
        });

        var suiteSeedCreatedUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        modelBuilder.Entity<MasterFeatureSuite>(entity =>
        {
            entity.ToTable("MasterFeatureSuites");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.SuiteCode).IsUnique();
            entity.HasIndex(e => e.SortOrder);
            entity.HasIndex(e => e.IsPublished);
            entity.HasIndex(e => e.IsActive);

            entity.HasData(
                new MasterFeatureSuite
                {
                    Id = Guid.Parse("11111111-0001-0000-0000-000000000001"),
                    SuiteCode = "suite-people-community",
                    SuiteLetter = "A",
                    Name = "People, Community & Collaboration",
                    MenuTitle = "People & Community",
                    Description = "Real-time team messaging, committees, sub-groups, alumni directories, and confidential whistleblowing channels.",
                    Icon = "groups",
                    SortOrder = 1,
                    IsPublished = true,
                    IsActive = true,
                    CreatedUtc = suiteSeedCreatedUtc
                },
                new MasterFeatureSuite
                {
                    Id = Guid.Parse("11111111-0002-0000-0000-000000000002"),
                    SuiteCode = "suite-workforce-rota",
                    SuiteLetter = "B",
                    Name = "Workforce, Rota & Scheduling",
                    MenuTitle = "Workforce & Shifts",
                    Description = "Staff and volunteer shift scheduling, shift swaps, leave approvals, biometric/QR attendance, and appointment booking.",
                    Icon = "calendar_month",
                    SortOrder = 2,
                    IsPublished = true,
                    IsActive = true,
                    CreatedUtc = suiteSeedCreatedUtc
                },
                new MasterFeatureSuite
                {
                    Id = Guid.Parse("11111111-0003-0000-0000-000000000003"),
                    SuiteCode = "suite-reports-forms",
                    SuiteLetter = "C",
                    Name = "Reports, Forms & Analytics",
                    MenuTitle = "Reports & Forms",
                    Description = "Dynamic form builders, periodic operational reports, opinion poll surveys, and confidential referee verification.",
                    Icon = "assessment",
                    SortOrder = 3,
                    IsPublished = true,
                    IsActive = true,
                    CreatedUtc = suiteSeedCreatedUtc
                },
                new MasterFeatureSuite
                {
                    Id = Guid.Parse("11111111-0004-0000-0000-000000000004"),
                    SuiteCode = "suite-events-training",
                    SuiteLetter = "D",
                    Name = "Events & Training Management",
                    MenuTitle = "Events & Ticketing",
                    Description = "Event registration, multi-tier ticketing, speaker session tracks, and QR badge check-in kiosks.",
                    Icon = "confirmation_number",
                    SortOrder = 4,
                    IsPublished = true,
                    IsActive = true,
                    CreatedUtc = suiteSeedCreatedUtc
                },
                new MasterFeatureSuite
                {
                    Id = Guid.Parse("11111111-0005-0000-0000-000000000005"),
                    SuiteCode = "suite-finance-revenue",
                    SuiteLetter = "E",
                    Name = "Finance & Commercial Revenue",
                    MenuTitle = "Finance & Commerce",
                    Description = "Membership dues, e-commerce storefront, commercial proposals, grant ledgers, and virtual treasury wallets.",
                    Icon = "account_balance_wallet",
                    SortOrder = 5,
                    IsPublished = true,
                    IsActive = true,
                    CreatedUtc = suiteSeedCreatedUtc
                },
                new MasterFeatureSuite
                {
                    Id = Guid.Parse("11111111-0006-0000-0000-000000000006"),
                    SuiteCode = "suite-operations-workflows",
                    SuiteLetter = "F",
                    Name = "Operations & Workflows",
                    MenuTitle = "Operations & Workflows",
                    Description = "Applicant tracking, tamper-evident e-voting, equipment logistics, asset inventory, and project Kanban boards.",
                    Icon = "work",
                    SortOrder = 6,
                    IsPublished = true,
                    IsActive = true,
                    CreatedUtc = suiteSeedCreatedUtc
                },
                new MasterFeatureSuite
                {
                    Id = Guid.Parse("11111111-0007-0000-0000-000000000007"),
                    SuiteCode = "suite-communication-ai",
                    SuiteLetter = "G",
                    Name = "Communication, AI & Support",
                    MenuTitle = "Communication & AI",
                    Description = "Ozi AI Studio assistant, bulk SMS/Email broadcast studio, helpdesk ticketing, live chat, and video rooms.",
                    Icon = "campaign",
                    SortOrder = 7,
                    IsPublished = true,
                    IsActive = true,
                    CreatedUtc = suiteSeedCreatedUtc
                },
                new MasterFeatureSuite
                {
                    Id = Guid.Parse("11111111-0008-0000-0000-000000000008"),
                    SuiteCode = "suite-compliance-learning",
                    SuiteLetter = "H",
                    Name = "Compliance, Learning & Certification",
                    MenuTitle = "Compliance & Learning",
                    Description = "Encrypted document vaults, LMS training courses, verifiable certificates, visitor gate passes, and KYC vetting.",
                    Icon = "verified_user",
                    SortOrder = 8,
                    IsPublished = true,
                    IsActive = true,
                    CreatedUtc = suiteSeedCreatedUtc
                },
                new MasterFeatureSuite
                {
                    Id = Guid.Parse("11111111-0009-0000-0000-000000000009"),
                    SuiteCode = "suite-demographics-census",
                    SuiteLetter = "I",
                    Name = "Demographics & Civic Census",
                    MenuTitle = "Demographics & Census",
                    Description = "Household census registries, offline field enumeration, printable digital ID cards, and population intelligence.",
                    Icon = "map",
                    SortOrder = 9,
                    IsPublished = true,
                    IsActive = true,
                    CreatedUtc = suiteSeedCreatedUtc
                },
                new MasterFeatureSuite
                {
                    Id = Guid.Parse("11111111-0010-0000-0000-000000000010"),
                    SuiteCode = "suite-life-events",
                    SuiteLetter = "J",
                    Name = "Life Events & Publications",
                    MenuTitle = "Life Events & Media",
                    Description = "Digital memorials, wedding and celebration RSVP portals, and interactive 3D page-flip brochures.",
                    Icon = "celebration",
                    SortOrder = 10,
                    IsPublished = true,
                    IsActive = true,
                    CreatedUtc = suiteSeedCreatedUtc
                },
                new MasterFeatureSuite
                {
                    Id = Guid.Parse("11111111-0011-0000-0000-000000000011"),
                    SuiteCode = "suite-workspace",
                    SuiteLetter = "K",
                    Name = "Workspace",
                    MenuTitle = "Workspace",
                    Description = "Desktop application workspace and workplace management suite.",
                    Icon = "desktop_windows",
                    SortOrder = 11,
                    IsPublished = true,
                    IsActive = true,
                    CreatedUtc = suiteSeedCreatedUtc
                }
            );
        });

        modelBuilder.Entity<MasterFeatureCatalog>(entity =>
        {
            entity.HasIndex(e => e.FeatureCode).IsUnique();
            entity.HasIndex(e => e.MasterFeatureSuiteId);
            entity.HasIndex(e => e.Category);
            entity.HasIndex(e => e.IsCompulsory);
            entity.HasIndex(e => e.IsActive);
            entity.Property(e => e.MonthlyPrice).HasPrecision(18, 2);
            entity.Property(e => e.QuarterlyPrice).HasPrecision(18, 2);
            entity.Property(e => e.YearlyPrice).HasPrecision(18, 2);
            entity.Property(e => e.MeterUnitPrice).HasPrecision(18, 4);
            entity.HasOne(e => e.Suite)
                .WithMany(s => s.Features)
                .HasForeignKey(e => e.MasterFeatureSuiteId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<MasterTenantFeatureSubscription>(entity =>
        {
            entity.HasIndex(e => e.MasterTenantCatalogId);
            entity.HasIndex(e => e.MasterFeatureCatalogId);
            entity.HasIndex(e => e.IsActive);
            entity.HasIndex(e => e.ExpiresAtUtc);
            entity.Property(e => e.RecurringPrice).HasPrecision(18, 2);
            entity.Property(e => e.CustomPriceOverride).HasPrecision(18, 2);
        });

        modelBuilder.Entity<MasterMarketplaceCategory>(entity =>
        {
            entity.HasIndex(e => e.CategoryKey).IsUnique();
            entity.HasIndex(e => e.IsActive);
        });

        modelBuilder.Entity<MasterMarketplaceTemplate>(entity =>
        {
            entity.HasIndex(e => e.VariantCode).IsUnique();
            entity.HasIndex(e => e.CategoryKey);
            entity.HasIndex(e => e.Tag);
            entity.HasIndex(e => e.IsActive);
        });

        modelBuilder.Entity<MasterTemplatePlaceholder>(entity =>
        {
            entity.HasIndex(e => e.MasterMarketplaceTemplateId);
            entity.HasIndex(e => e.FieldKey);
        });

        modelBuilder.Entity<MasterTemplateSection>(entity =>
        {
            entity.HasIndex(e => e.MasterMarketplaceTemplateId);
            entity.HasIndex(e => e.CategoryKey);
            entity.HasIndex(e => e.SectionSubType);
            entity.HasIndex(e => e.SectionKey);
            entity.HasIndex(e => e.IsActive);
            entity.HasOne(e => e.MasterMarketplaceTemplate)
                .WithMany(t => t.Sections)
                .HasForeignKey(e => e.MasterMarketplaceTemplateId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<MasterTemplateSectionList>(entity =>
        {
            entity.HasIndex(e => e.MasterTemplateSectionId);
            entity.HasIndex(e => e.ItemType);
            entity.HasIndex(e => e.IsActive);
            entity.Property(e => e.PriceAmount).HasPrecision(18, 2);
            entity.Property(e => e.Rating).HasPrecision(3, 2);
            entity.HasOne(e => e.MasterTemplateSection)
                .WithMany(s => s.SectionLists)
                .HasForeignKey(e => e.MasterTemplateSectionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // 1. Menu Content Configurations
        modelBuilder.Entity<MasterMenuContent>(entity =>
        {
            entity.HasIndex(e => e.MasterMarketplaceTemplateId).IsUnique();
            entity.HasOne(e => e.MasterMarketplaceTemplate)
                .WithOne(t => t.MenuContent)
                .HasForeignKey<MasterMenuContent>(e => e.MasterMarketplaceTemplateId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<MasterMenuNavItem>(entity =>
        {
            entity.HasIndex(e => e.MasterMenuContentId);
            entity.HasIndex(e => e.ParentId);
            entity.HasOne(e => e.MenuContent)
                .WithMany(m => m.NavItems)
                .HasForeignKey(e => e.MasterMenuContentId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Parent)
                .WithMany(p => p.Children)
                .HasForeignKey(e => e.ParentId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // 2. Hero Content Configurations
        modelBuilder.Entity<MasterHeroContent>(entity =>
        {
            entity.HasIndex(e => e.MasterMarketplaceTemplateId).IsUnique();
            entity.HasOne(e => e.MasterMarketplaceTemplate)
                .WithOne(t => t.HeroContent)
                .HasForeignKey<MasterHeroContent>(e => e.MasterMarketplaceTemplateId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<MasterHeroSlideItem>(entity =>
        {
            entity.HasIndex(e => e.MasterHeroContentId);
            entity.HasOne(e => e.HeroContent)
                .WithMany(h => h.Slides)
                .HasForeignKey(e => e.MasterHeroContentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // 3. BodySection Content Configurations
        modelBuilder.Entity<MasterBodySectionContent>(entity =>
        {
            entity.HasIndex(e => e.MasterMarketplaceTemplateId);
            entity.HasIndex(e => e.SectionSubType);
            entity.HasOne(e => e.MasterMarketplaceTemplate)
                .WithMany(t => t.BodySections)
                .HasForeignKey(e => e.MasterMarketplaceTemplateId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<MasterBodySectionList>(entity =>
        {
            entity.HasIndex(e => e.MasterBodySectionContentId);
            entity.HasIndex(e => e.ItemType);
            entity.Property(e => e.PriceAmount).HasPrecision(18, 2);
            entity.Property(e => e.Rating).HasPrecision(3, 2);
            entity.HasOne(e => e.BodySectionContent)
                .WithMany(b => b.SectionLists)
                .HasForeignKey(e => e.MasterBodySectionContentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // 4. Blog Content Configurations
        modelBuilder.Entity<MasterBlogContent>(entity =>
        {
            entity.HasIndex(e => e.MasterMarketplaceTemplateId).IsUnique();
            entity.HasOne(e => e.MasterMarketplaceTemplate)
                .WithOne(t => t.BlogContent)
                .HasForeignKey<MasterBlogContent>(e => e.MasterMarketplaceTemplateId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<MasterBlogPostItem>(entity =>
        {
            entity.HasIndex(e => e.MasterBlogContentId);
            entity.HasIndex(e => e.CategoryTag);
            entity.HasOne(e => e.BlogContent)
                .WithMany(b => b.Posts)
                .HasForeignKey(e => e.MasterBlogContentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // 5. Marquee Content Configurations
        modelBuilder.Entity<MasterMarqueeContent>(entity =>
        {
            entity.HasIndex(e => e.MasterMarketplaceTemplateId).IsUnique();
            entity.HasOne(e => e.MasterMarketplaceTemplate)
                .WithOne(t => t.MarqueeContent)
                .HasForeignKey<MasterMarqueeContent>(e => e.MasterMarketplaceTemplateId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<MasterMarqueeItem>(entity =>
        {
            entity.HasIndex(e => e.MasterMarqueeContentId);
            entity.HasOne(e => e.MarqueeContent)
                .WithMany(m => m.Items)
                .HasForeignKey(e => e.MasterMarqueeContentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // 6. Contact Content Configurations
        modelBuilder.Entity<MasterContactContent>(entity =>
        {
            entity.HasIndex(e => e.MasterMarketplaceTemplateId).IsUnique();
            entity.HasOne(e => e.MasterMarketplaceTemplate)
                .WithOne(t => t.ContactContent)
                .HasForeignKey<MasterContactContent>(e => e.MasterMarketplaceTemplateId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<MasterContactChannelItem>(entity =>
        {
            entity.HasIndex(e => e.MasterContactContentId);
            entity.HasOne(e => e.ContactContent)
                .WithMany(c => c.Channels)
                .HasForeignKey(e => e.MasterContactContentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // 7. Footer Content Configurations
        modelBuilder.Entity<MasterFooterContent>(entity =>
        {
            entity.HasIndex(e => e.MasterMarketplaceTemplateId).IsUnique();
            entity.HasOne(e => e.MasterMarketplaceTemplate)
                .WithOne(t => t.FooterContent)
                .HasForeignKey<MasterFooterContent>(e => e.MasterMarketplaceTemplateId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<MasterFooterColumn>(entity =>
        {
            entity.HasIndex(e => e.MasterFooterContentId);
            entity.HasOne(e => e.FooterContent)
                .WithMany(f => f.Columns)
                .HasForeignKey(e => e.MasterFooterContentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<MasterFooterLink>(entity =>
        {
            entity.HasIndex(e => e.MasterFooterColumnId);
            entity.HasOne(e => e.FooterColumn)
                .WithMany(c => c.Links)
                .HasForeignKey(e => e.MasterFooterColumnId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<MasterMediaAsset>(entity =>
        {
            entity.HasIndex(e => e.CategoryKey);
            entity.HasIndex(e => e.AspectRatio);
            entity.HasIndex(e => e.IsActive);
        });

        modelBuilder.Entity<MasterEmailLog>(entity =>
        {
            entity.HasIndex(e => e.RecipientEmail);
            entity.HasIndex(e => e.SentAtUtc);
            entity.HasIndex(e => e.Status);
        });

        modelBuilder.Entity<MasterAffiliatePartner>(entity =>
        {
            entity.HasIndex(e => e.PartnerCode).IsUnique();
            entity.HasIndex(e => e.Email).IsUnique();
            entity.HasIndex(e => e.Status);
            entity.Property(e => e.CommissionRatePercentage).HasPrecision(5, 2);
            entity.Property(e => e.TotalEarned).HasPrecision(18, 2);
            entity.Property(e => e.PendingBalance).HasPrecision(18, 2);
            entity.Property(e => e.PaidBalance).HasPrecision(18, 2);
        });

        modelBuilder.Entity<MasterAffiliateReferral>(entity =>
        {
            entity.HasIndex(e => e.AffiliatePartnerId);
            entity.HasIndex(e => e.ReferredTenantKey);
            entity.HasIndex(e => e.CommissionStatus);
            entity.Property(e => e.SubscriptionAmount).HasPrecision(18, 2);
            entity.Property(e => e.CommissionEarned).HasPrecision(18, 2);
        });

        modelBuilder.Entity<MasterCurrencyRate>(entity =>
        {
            entity.ToTable("MasterCurrencyRates");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.CurrencyCode).IsUnique();
            entity.HasIndex(e => e.IsActive);
            entity.HasIndex(e => e.SortOrder);
            entity.Property(e => e.CurrencyCode).HasMaxLength(10).IsRequired();
            entity.Property(e => e.CurrencySymbol).HasMaxLength(10).IsRequired();
            entity.Property(e => e.DisplayName).HasMaxLength(100).IsRequired();
            entity.Property(e => e.CultureName).HasMaxLength(20).IsRequired();
            entity.Property(e => e.PillLabel).HasMaxLength(30).IsRequired();
            entity.Property(e => e.RateFromUsd).HasPrecision(18, 4);
            entity.Property(e => e.VatPercentage).HasPrecision(5, 2).HasDefaultValue(0m);
            entity.Property(e => e.AssociatedCountryCodes).HasMaxLength(250);
        });

        modelBuilder.Entity<MasterNewsCategory>(entity =>
        {
            entity.HasIndex(e => e.Key).IsUnique();
            entity.HasIndex(e => e.Slug);
            entity.HasIndex(e => e.IsActive);
        });

        modelBuilder.Entity<MasterNewsArticle>(entity =>
        {
            entity.HasIndex(e => e.Slug).IsUnique();
            entity.HasIndex(e => e.CategoryKey);
            entity.HasIndex(e => e.IsFeatured);
            entity.HasIndex(e => e.IsPublished);
            entity.HasIndex(e => e.PublishedAtUtc);
            entity.HasOne(e => e.Category)
                  .WithMany(c => c.Articles)
                  .HasForeignKey(e => e.MasterNewsCategoryId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<MasterCreatorApplication>(entity =>
        {
            entity.HasIndex(e => e.CreatorCode).IsUnique();
            entity.HasIndex(e => e.Email);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.CreatedUtc);
        });

        modelBuilder.Entity<MasterJobOpening>(entity =>
        {
            entity.HasIndex(e => e.Slug).IsUnique();
            entity.HasIndex(e => e.Department);
            entity.HasIndex(e => e.Location);
            entity.HasIndex(e => e.LanguageRequirements);
            entity.HasIndex(e => e.IsActive);
            entity.HasIndex(e => e.SortOrder);
        });

        modelBuilder.Entity<MasterJobApplication>(entity =>
        {
            entity.HasIndex(e => e.ApplicationReference).IsUnique();
            entity.HasIndex(e => e.Email);
            entity.HasIndex(e => e.MasterJobOpeningId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.SubmittedUtc);
            entity.HasOne(e => e.JobOpening)
                  .WithMany(j => j.Applications)
                  .HasForeignKey(e => e.MasterJobOpeningId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<MasterSupportInquiry>(entity =>
        {
            entity.HasIndex(e => e.ReferenceNumber).IsUnique();
            entity.HasIndex(e => e.Email);
            entity.HasIndex(e => e.InquiryType);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.Culture);
            entity.HasIndex(e => e.CreatedUtc);
            entity.HasIndex(e => e.LastActivityUtc);
            entity.HasMany(e => e.Replies)
                  .WithOne(r => r.Inquiry)
                  .HasForeignKey(r => r.MasterSupportInquiryId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<MasterTicketReply>(entity =>
        {
            entity.HasIndex(e => e.MasterSupportInquiryId);
            entity.HasIndex(e => e.CreatedUtc);
        });

        modelBuilder.Entity<MasterPlatformSetting>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.PlatformName).HasMaxLength(100).IsRequired();
            entity.Property(e => e.SupportContactEmail).HasMaxLength(150);
            entity.Property(e => e.DefaultFromEmail).HasMaxLength(150);
            entity.Property(e => e.SupportCategories).HasMaxLength(1000);
            entity.Property(e => e.DefaultCurrencyCode).HasMaxLength(10).HasDefaultValue("USD");
            entity.Property(e => e.DefaultExchangeRateCurrencyCode).HasMaxLength(10).HasDefaultValue("USD");

            // Transparent AES-256-GCM encryption at rest for Central payment gateway, storage, and log secrets
            entity.Property(e => e.PaystackSecretKey).HasConversion(NullableEncryptedStringValueConverter.Instance);
            entity.Property(e => e.PaystackWebhookSecret).HasConversion(NullableEncryptedStringValueConverter.Instance);
            entity.Property(e => e.FlutterwaveSecretKey).HasConversion(NullableEncryptedStringValueConverter.Instance);
            entity.Property(e => e.FlutterwaveWebhookSecret).HasConversion(NullableEncryptedStringValueConverter.Instance);
            entity.Property(e => e.StripeSecretKey).HasConversion(NullableEncryptedStringValueConverter.Instance);
            entity.Property(e => e.StripeWebhookSecret).HasConversion(NullableEncryptedStringValueConverter.Instance);
            entity.Property(e => e.CloudinaryApiSecret).HasConversion(NullableEncryptedStringValueConverter.Instance);
            entity.Property(e => e.MongoLogsConnectionString).HasConversion(NullableEncryptedStringValueConverter.Instance);
        });

        modelBuilder.Entity<MasterHelpdeskArticle>(entity =>
        {
            entity.HasIndex(e => e.Slug).IsUnique();
            entity.HasIndex(e => e.SuiteCode);
            entity.HasIndex(e => e.FeatureCode);
            entity.HasIndex(e => e.Category);
            entity.HasIndex(e => e.Culture);
            entity.HasIndex(e => e.IsPublished);
            entity.HasIndex(e => e.SortOrder);
        });

        modelBuilder.Entity<MasterVideoGuide>(entity =>
        {
            entity.HasIndex(e => e.SuiteCode);
            entity.HasIndex(e => e.FeatureCode);
            entity.HasIndex(e => e.Culture);
            entity.HasIndex(e => e.IsPublished);
            entity.HasIndex(e => e.SortOrder);
        });

        modelBuilder.Entity<MasterSupportFaq>(entity =>
        {
            entity.HasIndex(e => e.Culture);
            entity.HasIndex(e => e.Category);
            entity.HasIndex(e => e.SuiteCode);
            entity.HasIndex(e => e.IsPublished);
            entity.HasIndex(e => e.SortOrder);
        });

        modelBuilder.Entity<MasterLegalDocument>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.Slug, e.Culture }).IsUnique();
            entity.HasIndex(e => e.Category);
            entity.HasIndex(e => e.IsPublished);
            entity.HasIndex(e => e.SortOrder);
            entity.Property(e => e.Slug).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Title).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Category).HasMaxLength(80).IsRequired();
            entity.Property(e => e.Summary).HasMaxLength(500).IsRequired();
            entity.Property(e => e.Version).HasMaxLength(20).IsRequired();
            entity.Property(e => e.Culture).HasMaxLength(10).IsRequired();
        });

        // ── Audit Log Configurations ──
        modelBuilder.Entity<MasterAuditLog>(entity =>
        {
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.Action);
            entity.HasIndex(e => e.EntityType);
            entity.HasIndex(e => e.CreatedUtc);
            // Composite index for common admin console queries: filter by entity type + date range
            entity.HasIndex(e => new { e.EntityType, e.CreatedUtc });
        });

        // ── Billing Transaction Configurations ──
        modelBuilder.Entity<MasterBillingTransaction>(entity =>
        {
            entity.HasIndex(e => e.MasterTenantCatalogId);
            entity.HasIndex(e => e.MasterTenantFeatureSubscriptionId);
            entity.HasIndex(e => e.InvoiceNumber).IsUnique().HasFilter("[InvoiceNumber] IS NOT NULL");
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.CreatedUtc);
            entity.Property(e => e.Amount).HasPrecision(18, 2);

            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.MasterTenantCatalogId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.FeatureSubscription)
                .WithMany()
                .HasForeignKey(e => e.MasterTenantFeatureSubscriptionId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // ── Voucher Application Configurations ──
        modelBuilder.Entity<MasterVoucherApplication>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ReferenceNumber).IsUnique();
            entity.HasIndex(e => e.WorkEmail);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.CreatedAtUtc);
        });

        // ── Background Jobs Hub Configurations ──
        modelBuilder.Entity<MasterBackgroundJob>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.JobKey).IsUnique();
            entity.HasIndex(e => e.Scope);
            entity.HasIndex(e => e.IsEnabled);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.NextRunUtc);
            entity.HasIndex(e => e.TargetTenantCatalogId);

            entity.HasOne(e => e.TargetTenantCatalog)
                .WithMany()
                .HasForeignKey(e => e.TargetTenantCatalogId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasMany(e => e.ExecutionLogs)
                .WithOne(e => e.Job)
                .HasForeignKey(e => e.JobId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<MasterBackgroundJobLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.JobId);
            entity.HasIndex(e => e.StartedAtUtc);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.TenantKey);
            entity.HasIndex(e => e.TargetTenantCatalogId);

            entity.HasOne(e => e.TargetTenantCatalog)
                .WithMany()
                .HasForeignKey(e => e.TargetTenantCatalogId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<MasterAiApiKey>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Provider);
            entity.HasIndex(e => e.IsActive);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.RateLimitCooldownUntilUtc);

            // Transparent AES-256-GCM encryption at rest for AI provider API keys
            entity.Property(e => e.ApiKey)
                .HasConversion(EncryptedStringValueConverter.Instance);

            entity.HasMany(e => e.UsageLogs)
                .WithOne(e => e.MasterAiApiKey)
                .HasForeignKey(e => e.MasterAiApiKeyId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<MasterAiApiKeyUsageLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.MasterAiApiKeyId);
            entity.HasIndex(e => e.RequestTimestampUtc);
            entity.HasIndex(e => e.StatusCode);
            entity.HasIndex(e => e.ActionName);
        });

        modelBuilder.Entity<MasterApiErrorLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.MasterTenantCatalogId);
            entity.HasIndex(e => e.TenantKey);
            entity.HasIndex(e => e.SourceScope);
            entity.HasIndex(e => e.ErrorCode);
            entity.HasIndex(e => e.CreatedUtc);
            entity.HasIndex(e => e.TraceId);

            entity.HasOne(e => e.TenantCatalog)
                .WithMany()
                .HasForeignKey(e => e.MasterTenantCatalogId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }
}
