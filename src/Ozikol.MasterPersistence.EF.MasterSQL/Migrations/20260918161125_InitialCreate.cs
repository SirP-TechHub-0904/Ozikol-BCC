using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ozikol.MasterPersistence.EF.MasterSQL.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CentralRoles",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CentralRoles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MasterAffiliatePartners",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PartnerCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    FullName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    PhoneNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    WebsiteOrChannel = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    CommissionRatePercentage = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: false),
                    TotalEarned = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    PendingBalance = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    PaidBalance = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    PayoutDetailsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ApprovedUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterAffiliatePartners", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MasterAuditLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: true),
                    UserName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Action = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    EntityType = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    EntityId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: true),
                    Summary = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    OldValues = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NewValues = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IpAddress = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    UserAgent = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterAuditLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MasterCreatorApplications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatorCode = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    FullName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    StudioOrBrandName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    Email = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    PhoneNumber = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    PortfolioUrl = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    Specialization = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ProposalPitch = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    TermsAgreed = table.Column<bool>(type: "bit", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ReviewNotes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterCreatorApplications", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MasterCurrencyRates",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CurrencyCode = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    CurrencySymbol = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    DisplayName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CultureName = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    PillLabel = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    RateFromUsd = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    IsBaseCurrency = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    AssociatedCountryCodes = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterCurrencyRates", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MasterEmailLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RecipientEmail = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    Subject = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    BodyHtml = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Provider = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ErrorMessage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SentAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterEmailLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MasterFeatureCatalogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FeatureCode = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Category = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Icon = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: true),
                    RoutePrefix = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    IsCompulsory = table.Column<bool>(type: "bit", nullable: false),
                    BillingType = table.Column<int>(type: "int", nullable: false),
                    MonthlyPrice = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    QuarterlyPrice = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    YearlyPrice = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    IsMetered = table.Column<bool>(type: "bit", nullable: false),
                    MeterUnitName = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    MeterUnitPrice = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    MeterBlockSize = table.Column<int>(type: "int", nullable: false),
                    IncludedFreeUnits = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    IsInBeta = table.Column<bool>(type: "bit", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterFeatureCatalogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MasterHelpdeskArticles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SuiteCode = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    FeatureCode = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Summary = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    ContentHtml = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Category = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    Culture = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    EstimatedReadMinutes = table.Column<int>(type: "int", nullable: false),
                    ViewCount = table.Column<int>(type: "int", nullable: false),
                    HelpfulCount = table.Column<int>(type: "int", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsPublished = table.Column<bool>(type: "bit", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterHelpdeskArticles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MasterJobOpenings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Department = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Location = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    EmploymentType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ExperienceLevel = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    LanguageRequirements = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Summary = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    DescriptionHtml = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ResponsibilitiesJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    QualificationsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    BenefitsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterJobOpenings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MasterLegalDocuments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Category = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    Summary = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    ContentHtml = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Version = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    EffectiveDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastUpdatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Culture = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    IsPublished = table.Column<bool>(type: "bit", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterLegalDocuments", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MasterMarketplaceCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CategoryKey = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    Icon = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterMarketplaceCategories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MasterMediaAssets",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CategoryKey = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ImageUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    ThumbnailUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    AspectRatio = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Tags = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    WidthPx = table.Column<int>(type: "int", nullable: false),
                    HeightPx = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterMediaAssets", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MasterNewsCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Key = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    BadgeClass = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterNewsCategories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MasterPlatformSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    PlatformName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    SupportContactEmail = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    DefaultFromEmail = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    EnableAdminNotifications = table.Column<bool>(type: "bit", nullable: false),
                    SupportAdminEmails = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PartnerAdminEmails = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatorAdminEmails = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CareersAdminEmails = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CertificationAdminEmails = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TicketAutoCloseHours = table.Column<int>(type: "int", nullable: false),
                    EnableTicketAutoClose = table.Column<bool>(type: "bit", nullable: false),
                    DefaultTrialDays = table.Column<int>(type: "int", nullable: false),
                    DefaultCurrencyCode = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    SupportCategories = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    UpdatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterPlatformSettings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MasterSupportFaqs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Question = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    Answer = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    Category = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: true),
                    SuiteCode = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    Culture = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsPublished = table.Column<bool>(type: "bit", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterSupportFaqs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MasterSupportInquiries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReferenceNumber = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    FullName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Phone = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    Organization = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    JobTitle = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    InquiryType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SuiteCode = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    FeatureCode = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    Subject = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Message = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Culture = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    IpAddress = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastActivityUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ClosedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    AutoClosedReason = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterSupportInquiries", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MasterTenantCatalogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenantKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    OrganizationName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    PrimaryDomain = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    CustomDomain = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    ApiUrl = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    WebsiteUrl = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    DatabaseName = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    ConnectionString = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AdminEmail = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    ReferredByPartnerCode = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastAccessedUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    UpdatedUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastUpdatedBy = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    IsSuspended = table.Column<bool>(type: "bit", nullable: false),
                    SuspendedUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    SuspendedBy = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    SuspensionReason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedBy = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    DeletionReason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterTenantCatalogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MasterVideoGuides",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SuiteCode = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    FeatureCode = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    YouTubeVideoId = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    ThumbnailUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    DurationSeconds = table.Column<int>(type: "int", nullable: false),
                    Culture = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    ViewCount = table.Column<int>(type: "int", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsPublished = table.Column<bool>(type: "bit", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterVideoGuides", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MasterVoucherApplications",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ReferenceNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    FullName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    WorkEmail = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    PhoneNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    OrganizationName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    WorkspaceSlug = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CountryCode = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    TwitterHandle = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    LinkedInProfile = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    YouTubeHandle = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    FacebookProfile = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    InstagramHandle = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    SnapchatHandle = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    IsNewsletterSubscribed = table.Column<bool>(type: "bit", nullable: false),
                    RequestedFeaturesJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Remarks = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    IssuedCouponCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    IssuedCouponId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    GrantedDurationDays = table.Column<int>(type: "int", nullable: false),
                    GrantedDiscountPercentage = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    GrantedFeaturesSummary = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    AdminNotes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ReviewedByAdminId = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ReviewedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterVoucherApplications", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CentralRoleClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RoleId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ClaimType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ClaimValue = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CentralRoleClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CentralRoleClaims_CentralRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "CentralRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MasterAffiliateReferrals",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AffiliatePartnerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReferredTenantKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ReferredOrganizationName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    SubscriptionAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    CommissionEarned = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    CommissionStatus = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PaidUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterAffiliateReferrals", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MasterAffiliateReferrals_MasterAffiliatePartners_AffiliatePartnerId",
                        column: x => x.AffiliatePartnerId,
                        principalTable: "MasterAffiliatePartners",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CentralUsers",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    FirstName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Department = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastLoginUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    AvatarUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    AffiliatePartnerId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatorApplicationId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UserName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedUserName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedEmail = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    EmailConfirmed = table.Column<bool>(type: "bit", nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SecurityStamp = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PhoneNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PhoneNumberConfirmed = table.Column<bool>(type: "bit", nullable: false),
                    TwoFactorEnabled = table.Column<bool>(type: "bit", nullable: false),
                    LockoutEnd = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LockoutEnabled = table.Column<bool>(type: "bit", nullable: false),
                    AccessFailedCount = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CentralUsers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CentralUsers_MasterAffiliatePartners_AffiliatePartnerId",
                        column: x => x.AffiliatePartnerId,
                        principalTable: "MasterAffiliatePartners",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_CentralUsers_MasterCreatorApplications_CreatorApplicationId",
                        column: x => x.CreatorApplicationId,
                        principalTable: "MasterCreatorApplications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "MasterCoupons",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    IsPercentage = table.Column<bool>(type: "bit", nullable: false),
                    DiscountPercentage = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    DiscountAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    SpecificFeatureId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    AllowedFeatureIdsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DurationDays = table.Column<int>(type: "int", nullable: false),
                    GrantedFeaturesSummary = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    MaxRedemptions = table.Column<int>(type: "int", nullable: false),
                    TimesRedeemed = table.Column<int>(type: "int", nullable: false),
                    StartsAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExpiresAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterCoupons", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MasterCoupons_MasterFeatureCatalogs_SpecificFeatureId",
                        column: x => x.SpecificFeatureId,
                        principalTable: "MasterFeatureCatalogs",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "MasterJobApplications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MasterJobOpeningId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ApplicationReference = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    FullName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    PhoneNumber = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    City = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Country = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    LinkedInOrPortfolioUrl = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    CoverLetter = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CvFileName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    CvUrl = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    CvFileSizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    PassportFileName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    PassportUrl = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    PassportFileSizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ReviewNotes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    TermsAgreed = table.Column<bool>(type: "bit", nullable: false),
                    ClientIp = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    SubmittedUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterJobApplications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MasterJobApplications_MasterJobOpenings_MasterJobOpeningId",
                        column: x => x.MasterJobOpeningId,
                        principalTable: "MasterJobOpenings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MasterMarketplaceTemplates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CategoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CategoryKey = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    VariantCode = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Tag = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Badge = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ThumbnailGradient = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    PreviewIcon = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    PreviewTitle = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    PreviewSubtitle = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    PreviewBody = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PreviewImageUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    HtmlTemplate = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CssStyles = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    JsScript = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DefaultSectionListsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Version = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterMarketplaceTemplates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MasterMarketplaceTemplates_MasterMarketplaceCategories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "MasterMarketplaceCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MasterNewsArticles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    CategoryKey = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    MasterNewsCategoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Excerpt = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    ContentHtml = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AuthorName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    AuthorRole = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    PublishedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ReadTimeText = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    IsFeatured = table.Column<bool>(type: "bit", nullable: false),
                    TagsJson = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    CoverGradientClass = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    IsPublished = table.Column<bool>(type: "bit", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterNewsArticles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MasterNewsArticles_MasterNewsCategories_MasterNewsCategoryId",
                        column: x => x.MasterNewsCategoryId,
                        principalTable: "MasterNewsCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MasterTicketReplies",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MasterSupportInquiryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SenderName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    SenderEmail = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    IsStaffReply = table.Column<bool>(type: "bit", nullable: false),
                    Message = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterTicketReplies", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MasterTicketReplies_MasterSupportInquiries_MasterSupportInquiryId",
                        column: x => x.MasterSupportInquiryId,
                        principalTable: "MasterSupportInquiries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MasterTenantFeatureSubscriptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MasterTenantCatalogId = table.Column<int>(type: "int", nullable: false),
                    MasterFeatureCatalogId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DurationType = table.Column<int>(type: "int", nullable: false),
                    RecurringPrice = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    StartsAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExpiresAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AutoRenew = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    CustomPriceOverride = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastRenewedUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterTenantFeatureSubscriptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MasterTenantFeatureSubscriptions_MasterFeatureCatalogs_MasterFeatureCatalogId",
                        column: x => x.MasterFeatureCatalogId,
                        principalTable: "MasterFeatureCatalogs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MasterTenantFeatureSubscriptions_MasterTenantCatalogs_MasterTenantCatalogId",
                        column: x => x.MasterTenantCatalogId,
                        principalTable: "MasterTenantCatalogs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CentralUserClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ClaimType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ClaimValue = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CentralUserClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CentralUserClaims_CentralUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "CentralUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CentralUserLogins",
                columns: table => new
                {
                    LoginProvider = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ProviderKey = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ProviderDisplayName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CentralUserLogins", x => new { x.LoginProvider, x.ProviderKey });
                    table.ForeignKey(
                        name: "FK_CentralUserLogins_CentralUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "CentralUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CentralUserRoles",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    RoleId = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CentralUserRoles", x => new { x.UserId, x.RoleId });
                    table.ForeignKey(
                        name: "FK_CentralUserRoles_CentralRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "CentralRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CentralUserRoles_CentralUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "CentralUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CentralUserTokens",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    LoginProvider = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Value = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CentralUserTokens", x => new { x.UserId, x.LoginProvider, x.Name });
                    table.ForeignKey(
                        name: "FK_CentralUserTokens_CentralUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "CentralUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MasterCouponRedemptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MasterCouponId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MasterTenantCatalogId = table.Column<int>(type: "int", nullable: false),
                    MasterFeatureCatalogId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    OriginalPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    DiscountApplied = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    FinalPricePaid = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    RedeemedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterCouponRedemptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MasterCouponRedemptions_MasterCoupons_MasterCouponId",
                        column: x => x.MasterCouponId,
                        principalTable: "MasterCoupons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MasterCouponRedemptions_MasterFeatureCatalogs_MasterFeatureCatalogId",
                        column: x => x.MasterFeatureCatalogId,
                        principalTable: "MasterFeatureCatalogs",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_MasterCouponRedemptions_MasterTenantCatalogs_MasterTenantCatalogId",
                        column: x => x.MasterTenantCatalogId,
                        principalTable: "MasterTenantCatalogs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MasterBlogContents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MasterMarketplaceTemplateId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MiniTitle = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Title = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    SubTitle = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    ViewAllButtonText = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ViewAllButtonUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterBlogContents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MasterBlogContents_MasterMarketplaceTemplates_MasterMarketplaceTemplateId",
                        column: x => x.MasterMarketplaceTemplateId,
                        principalTable: "MasterMarketplaceTemplates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MasterBodySectionContents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MasterMarketplaceTemplateId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SectionSubType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    MiniTitle = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Title = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    SubTitle = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PrimaryImageUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    SecondaryImageUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    VideoUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    PrimaryButtonText = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    PrimaryButtonUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    SecondaryButtonText = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    SecondaryButtonUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterBodySectionContents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MasterBodySectionContents_MasterMarketplaceTemplates_MasterMarketplaceTemplateId",
                        column: x => x.MasterMarketplaceTemplateId,
                        principalTable: "MasterMarketplaceTemplates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MasterContactContents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MasterMarketplaceTemplateId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MiniTitle = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Title = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    SubTitle = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SubmitButtonText = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    MapEmbedUrl = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterContactContents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MasterContactContents_MasterMarketplaceTemplates_MasterMarketplaceTemplateId",
                        column: x => x.MasterMarketplaceTemplateId,
                        principalTable: "MasterMarketplaceTemplates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MasterFooterContents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MasterMarketplaceTemplateId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LogoUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    BrandMissionText = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    CopyrightText = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    NewsletterTitle = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    NewsletterPlaceholder = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    NewsletterButtonText = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    TwitterUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    LinkedInUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    GitHubUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    YouTubeUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    FacebookUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterFooterContents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MasterFooterContents_MasterMarketplaceTemplates_MasterMarketplaceTemplateId",
                        column: x => x.MasterMarketplaceTemplateId,
                        principalTable: "MasterMarketplaceTemplates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MasterHeroContents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MasterMarketplaceTemplateId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MiniTitle = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Title = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    SubTitle = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PrimaryImageUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    SecondaryImageUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    VideoUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    VideoPosterUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    PrimaryButtonText = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    PrimaryButtonUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    SecondaryButtonText = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    SecondaryButtonUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterHeroContents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MasterHeroContents_MasterMarketplaceTemplates_MasterMarketplaceTemplateId",
                        column: x => x.MasterMarketplaceTemplateId,
                        principalTable: "MasterMarketplaceTemplates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MasterMarqueeContents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MasterMarketplaceTemplateId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    KickerText = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterMarqueeContents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MasterMarqueeContents_MasterMarketplaceTemplates_MasterMarketplaceTemplateId",
                        column: x => x.MasterMarketplaceTemplateId,
                        principalTable: "MasterMarketplaceTemplates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MasterMenuContents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MasterMarketplaceTemplateId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LogoUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    DarkLogoUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    BrandName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    PrimaryButtonText = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    PrimaryButtonUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    SecondaryButtonText = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    SecondaryButtonUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterMenuContents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MasterMenuContents_MasterMarketplaceTemplates_MasterMarketplaceTemplateId",
                        column: x => x.MasterMarketplaceTemplateId,
                        principalTable: "MasterMarketplaceTemplates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MasterTemplatePlaceholders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MasterMarketplaceTemplateId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FieldKey = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    Label = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    FieldType = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    DefaultValue = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    HelperText = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RecommendedDimensions = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: true),
                    IsRequired = table.Column<bool>(type: "bit", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterTemplatePlaceholders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MasterTemplatePlaceholders_MasterMarketplaceTemplates_MasterMarketplaceTemplateId",
                        column: x => x.MasterMarketplaceTemplateId,
                        principalTable: "MasterMarketplaceTemplates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MasterTemplateSections",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MasterMarketplaceTemplateId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CategoryKey = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SectionSubType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SectionKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    SubTitle = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    MiniTitle = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PrimaryImageUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    SecondaryImageUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    BackgroundType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    BackgroundValue = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ButtonText = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ButtonUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    SecondaryButtonText = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    SecondaryButtonUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CustomCss = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterTemplateSections", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MasterTemplateSections_MasterMarketplaceTemplates_MasterMarketplaceTemplateId",
                        column: x => x.MasterMarketplaceTemplateId,
                        principalTable: "MasterMarketplaceTemplates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MasterBillingTransactions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MasterTenantCatalogId = table.Column<int>(type: "int", nullable: false),
                    MasterTenantFeatureSubscriptionId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    InvoiceNumber = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    PaymentProvider = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    TransactionRef = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterBillingTransactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MasterBillingTransactions_MasterTenantCatalogs_MasterTenantCatalogId",
                        column: x => x.MasterTenantCatalogId,
                        principalTable: "MasterTenantCatalogs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MasterBillingTransactions_MasterTenantFeatureSubscriptions_MasterTenantFeatureSubscriptionId",
                        column: x => x.MasterTenantFeatureSubscriptionId,
                        principalTable: "MasterTenantFeatureSubscriptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "MasterBlogPostItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MasterBlogContentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    Excerpt = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ThumbnailUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CategoryTag = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    AuthorName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    AuthorAvatarUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    PublishDateText = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ReadTimeText = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    ArticleUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterBlogPostItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MasterBlogPostItems_MasterBlogContents_MasterBlogContentId",
                        column: x => x.MasterBlogContentId,
                        principalTable: "MasterBlogContents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MasterBodySectionLists",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MasterBodySectionContentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ItemType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    SubTitle = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ImageUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IconClass = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    BadgeText = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    PriceAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    PricePeriod = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    Rating = table.Column<decimal>(type: "decimal(3,2)", precision: 3, scale: 2, nullable: true),
                    ButtonText = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ButtonLink = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterBodySectionLists", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MasterBodySectionLists_MasterBodySectionContents_MasterBodySectionContentId",
                        column: x => x.MasterBodySectionContentId,
                        principalTable: "MasterBodySectionContents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MasterContactChannelItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MasterContactContentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ValueText = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IconClass = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ActionUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterContactChannelItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MasterContactChannelItems_MasterContactContents_MasterContactContentId",
                        column: x => x.MasterContactContentId,
                        principalTable: "MasterContactContents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MasterFooterColumns",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MasterFooterContentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ColumnName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterFooterColumns", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MasterFooterColumns_MasterFooterContents_MasterFooterContentId",
                        column: x => x.MasterFooterContentId,
                        principalTable: "MasterFooterContents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MasterHeroSlideItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MasterHeroContentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MiniTitle = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    SubTitle = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ImageUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ButtonText = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ButtonUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterHeroSlideItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MasterHeroSlideItems_MasterHeroContents_MasterHeroContentId",
                        column: x => x.MasterHeroContentId,
                        principalTable: "MasterHeroContents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MasterMarqueeItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MasterMarqueeContentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BrandName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    LogoUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    DarkLogoUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    WebsiteUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterMarqueeItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MasterMarqueeItems_MasterMarqueeContents_MasterMarqueeContentId",
                        column: x => x.MasterMarqueeContentId,
                        principalTable: "MasterMarqueeContents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MasterMenuNavItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MasterMenuContentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ParentId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Title = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Url = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IconClass = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    BadgeText = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    HierarchyLevel = table.Column<int>(type: "int", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterMenuNavItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MasterMenuNavItems_MasterMenuContents_MasterMenuContentId",
                        column: x => x.MasterMenuContentId,
                        principalTable: "MasterMenuContents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MasterMenuNavItems_MasterMenuNavItems_ParentId",
                        column: x => x.ParentId,
                        principalTable: "MasterMenuNavItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MasterTemplateSectionLists",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MasterTemplateSectionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ItemType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    SubTitle = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ImageUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IconClass = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    BadgeText = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ButtonText = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ButtonLink = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    PriceAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    PricePeriod = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    Rating = table.Column<decimal>(type: "decimal(3,2)", precision: 3, scale: 2, nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterTemplateSectionLists", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MasterTemplateSectionLists_MasterTemplateSections_MasterTemplateSectionId",
                        column: x => x.MasterTemplateSectionId,
                        principalTable: "MasterTemplateSections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MasterFooterLinks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MasterFooterColumnId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Url = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterFooterLinks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MasterFooterLinks_MasterFooterColumns_MasterFooterColumnId",
                        column: x => x.MasterFooterColumnId,
                        principalTable: "MasterFooterColumns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CentralRoleClaims_RoleId",
                table: "CentralRoleClaims",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "RoleNameIndex",
                table: "CentralRoles",
                column: "NormalizedName",
                unique: true,
                filter: "[NormalizedName] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_CentralUserClaims_UserId",
                table: "CentralUserClaims",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_CentralUserLogins_UserId",
                table: "CentralUserLogins",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_CentralUserRoles_RoleId",
                table: "CentralUserRoles",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                table: "CentralUsers",
                column: "NormalizedEmail");

            migrationBuilder.CreateIndex(
                name: "IX_CentralUsers_AffiliatePartnerId",
                table: "CentralUsers",
                column: "AffiliatePartnerId");

            migrationBuilder.CreateIndex(
                name: "IX_CentralUsers_CreatorApplicationId",
                table: "CentralUsers",
                column: "CreatorApplicationId");

            migrationBuilder.CreateIndex(
                name: "UserNameIndex",
                table: "CentralUsers",
                column: "NormalizedUserName",
                unique: true,
                filter: "[NormalizedUserName] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_MasterAffiliatePartners_Email",
                table: "MasterAffiliatePartners",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MasterAffiliatePartners_PartnerCode",
                table: "MasterAffiliatePartners",
                column: "PartnerCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MasterAffiliatePartners_Status",
                table: "MasterAffiliatePartners",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_MasterAffiliateReferrals_AffiliatePartnerId",
                table: "MasterAffiliateReferrals",
                column: "AffiliatePartnerId");

            migrationBuilder.CreateIndex(
                name: "IX_MasterAffiliateReferrals_CommissionStatus",
                table: "MasterAffiliateReferrals",
                column: "CommissionStatus");

            migrationBuilder.CreateIndex(
                name: "IX_MasterAffiliateReferrals_ReferredTenantKey",
                table: "MasterAffiliateReferrals",
                column: "ReferredTenantKey");

            migrationBuilder.CreateIndex(
                name: "IX_MasterAuditLogs_Action",
                table: "MasterAuditLogs",
                column: "Action");

            migrationBuilder.CreateIndex(
                name: "IX_MasterAuditLogs_CreatedUtc",
                table: "MasterAuditLogs",
                column: "CreatedUtc");

            migrationBuilder.CreateIndex(
                name: "IX_MasterAuditLogs_EntityType",
                table: "MasterAuditLogs",
                column: "EntityType");

            migrationBuilder.CreateIndex(
                name: "IX_MasterAuditLogs_EntityType_CreatedUtc",
                table: "MasterAuditLogs",
                columns: new[] { "EntityType", "CreatedUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_MasterAuditLogs_UserId",
                table: "MasterAuditLogs",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_MasterBillingTransactions_CreatedUtc",
                table: "MasterBillingTransactions",
                column: "CreatedUtc");

            migrationBuilder.CreateIndex(
                name: "IX_MasterBillingTransactions_InvoiceNumber",
                table: "MasterBillingTransactions",
                column: "InvoiceNumber",
                unique: true,
                filter: "[InvoiceNumber] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_MasterBillingTransactions_MasterTenantCatalogId",
                table: "MasterBillingTransactions",
                column: "MasterTenantCatalogId");

            migrationBuilder.CreateIndex(
                name: "IX_MasterBillingTransactions_MasterTenantFeatureSubscriptionId",
                table: "MasterBillingTransactions",
                column: "MasterTenantFeatureSubscriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_MasterBillingTransactions_Status",
                table: "MasterBillingTransactions",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_MasterBlogContents_MasterMarketplaceTemplateId",
                table: "MasterBlogContents",
                column: "MasterMarketplaceTemplateId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MasterBlogPostItems_CategoryTag",
                table: "MasterBlogPostItems",
                column: "CategoryTag");

            migrationBuilder.CreateIndex(
                name: "IX_MasterBlogPostItems_MasterBlogContentId",
                table: "MasterBlogPostItems",
                column: "MasterBlogContentId");

            migrationBuilder.CreateIndex(
                name: "IX_MasterBodySectionContents_MasterMarketplaceTemplateId",
                table: "MasterBodySectionContents",
                column: "MasterMarketplaceTemplateId");

            migrationBuilder.CreateIndex(
                name: "IX_MasterBodySectionContents_SectionSubType",
                table: "MasterBodySectionContents",
                column: "SectionSubType");

            migrationBuilder.CreateIndex(
                name: "IX_MasterBodySectionLists_ItemType",
                table: "MasterBodySectionLists",
                column: "ItemType");

            migrationBuilder.CreateIndex(
                name: "IX_MasterBodySectionLists_MasterBodySectionContentId",
                table: "MasterBodySectionLists",
                column: "MasterBodySectionContentId");

            migrationBuilder.CreateIndex(
                name: "IX_MasterContactChannelItems_MasterContactContentId",
                table: "MasterContactChannelItems",
                column: "MasterContactContentId");

            migrationBuilder.CreateIndex(
                name: "IX_MasterContactContents_MasterMarketplaceTemplateId",
                table: "MasterContactContents",
                column: "MasterMarketplaceTemplateId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MasterCouponRedemptions_MasterCouponId",
                table: "MasterCouponRedemptions",
                column: "MasterCouponId");

            migrationBuilder.CreateIndex(
                name: "IX_MasterCouponRedemptions_MasterFeatureCatalogId",
                table: "MasterCouponRedemptions",
                column: "MasterFeatureCatalogId");

            migrationBuilder.CreateIndex(
                name: "IX_MasterCouponRedemptions_MasterTenantCatalogId",
                table: "MasterCouponRedemptions",
                column: "MasterTenantCatalogId");

            migrationBuilder.CreateIndex(
                name: "IX_MasterCoupons_SpecificFeatureId",
                table: "MasterCoupons",
                column: "SpecificFeatureId");

            migrationBuilder.CreateIndex(
                name: "IX_MasterCreatorApplications_CreatedUtc",
                table: "MasterCreatorApplications",
                column: "CreatedUtc");

            migrationBuilder.CreateIndex(
                name: "IX_MasterCreatorApplications_CreatorCode",
                table: "MasterCreatorApplications",
                column: "CreatorCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MasterCreatorApplications_Email",
                table: "MasterCreatorApplications",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_MasterCreatorApplications_Status",
                table: "MasterCreatorApplications",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_MasterCurrencyRates_CurrencyCode",
                table: "MasterCurrencyRates",
                column: "CurrencyCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MasterCurrencyRates_IsActive",
                table: "MasterCurrencyRates",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_MasterCurrencyRates_SortOrder",
                table: "MasterCurrencyRates",
                column: "SortOrder");

            migrationBuilder.CreateIndex(
                name: "IX_MasterEmailLogs_RecipientEmail",
                table: "MasterEmailLogs",
                column: "RecipientEmail");

            migrationBuilder.CreateIndex(
                name: "IX_MasterEmailLogs_SentAtUtc",
                table: "MasterEmailLogs",
                column: "SentAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_MasterEmailLogs_Status",
                table: "MasterEmailLogs",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_MasterFeatureCatalogs_Category",
                table: "MasterFeatureCatalogs",
                column: "Category");

            migrationBuilder.CreateIndex(
                name: "IX_MasterFeatureCatalogs_FeatureCode",
                table: "MasterFeatureCatalogs",
                column: "FeatureCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MasterFeatureCatalogs_IsActive",
                table: "MasterFeatureCatalogs",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_MasterFeatureCatalogs_IsCompulsory",
                table: "MasterFeatureCatalogs",
                column: "IsCompulsory");

            migrationBuilder.CreateIndex(
                name: "IX_MasterFooterColumns_MasterFooterContentId",
                table: "MasterFooterColumns",
                column: "MasterFooterContentId");

            migrationBuilder.CreateIndex(
                name: "IX_MasterFooterContents_MasterMarketplaceTemplateId",
                table: "MasterFooterContents",
                column: "MasterMarketplaceTemplateId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MasterFooterLinks_MasterFooterColumnId",
                table: "MasterFooterLinks",
                column: "MasterFooterColumnId");

            migrationBuilder.CreateIndex(
                name: "IX_MasterHelpdeskArticles_Category",
                table: "MasterHelpdeskArticles",
                column: "Category");

            migrationBuilder.CreateIndex(
                name: "IX_MasterHelpdeskArticles_Culture",
                table: "MasterHelpdeskArticles",
                column: "Culture");

            migrationBuilder.CreateIndex(
                name: "IX_MasterHelpdeskArticles_FeatureCode",
                table: "MasterHelpdeskArticles",
                column: "FeatureCode");

            migrationBuilder.CreateIndex(
                name: "IX_MasterHelpdeskArticles_IsPublished",
                table: "MasterHelpdeskArticles",
                column: "IsPublished");

            migrationBuilder.CreateIndex(
                name: "IX_MasterHelpdeskArticles_Slug",
                table: "MasterHelpdeskArticles",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MasterHelpdeskArticles_SortOrder",
                table: "MasterHelpdeskArticles",
                column: "SortOrder");

            migrationBuilder.CreateIndex(
                name: "IX_MasterHelpdeskArticles_SuiteCode",
                table: "MasterHelpdeskArticles",
                column: "SuiteCode");

            migrationBuilder.CreateIndex(
                name: "IX_MasterHeroContents_MasterMarketplaceTemplateId",
                table: "MasterHeroContents",
                column: "MasterMarketplaceTemplateId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MasterHeroSlideItems_MasterHeroContentId",
                table: "MasterHeroSlideItems",
                column: "MasterHeroContentId");

            migrationBuilder.CreateIndex(
                name: "IX_MasterJobApplications_ApplicationReference",
                table: "MasterJobApplications",
                column: "ApplicationReference",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MasterJobApplications_Email",
                table: "MasterJobApplications",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_MasterJobApplications_MasterJobOpeningId",
                table: "MasterJobApplications",
                column: "MasterJobOpeningId");

            migrationBuilder.CreateIndex(
                name: "IX_MasterJobApplications_Status",
                table: "MasterJobApplications",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_MasterJobApplications_SubmittedUtc",
                table: "MasterJobApplications",
                column: "SubmittedUtc");

            migrationBuilder.CreateIndex(
                name: "IX_MasterJobOpenings_Department",
                table: "MasterJobOpenings",
                column: "Department");

            migrationBuilder.CreateIndex(
                name: "IX_MasterJobOpenings_IsActive",
                table: "MasterJobOpenings",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_MasterJobOpenings_LanguageRequirements",
                table: "MasterJobOpenings",
                column: "LanguageRequirements");

            migrationBuilder.CreateIndex(
                name: "IX_MasterJobOpenings_Location",
                table: "MasterJobOpenings",
                column: "Location");

            migrationBuilder.CreateIndex(
                name: "IX_MasterJobOpenings_Slug",
                table: "MasterJobOpenings",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MasterJobOpenings_SortOrder",
                table: "MasterJobOpenings",
                column: "SortOrder");

            migrationBuilder.CreateIndex(
                name: "IX_MasterLegalDocuments_Category",
                table: "MasterLegalDocuments",
                column: "Category");

            migrationBuilder.CreateIndex(
                name: "IX_MasterLegalDocuments_IsPublished",
                table: "MasterLegalDocuments",
                column: "IsPublished");

            migrationBuilder.CreateIndex(
                name: "IX_MasterLegalDocuments_Slug_Culture",
                table: "MasterLegalDocuments",
                columns: new[] { "Slug", "Culture" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MasterLegalDocuments_SortOrder",
                table: "MasterLegalDocuments",
                column: "SortOrder");

            migrationBuilder.CreateIndex(
                name: "IX_MasterMarketplaceCategories_CategoryKey",
                table: "MasterMarketplaceCategories",
                column: "CategoryKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MasterMarketplaceCategories_IsActive",
                table: "MasterMarketplaceCategories",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_MasterMarketplaceTemplates_CategoryId",
                table: "MasterMarketplaceTemplates",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_MasterMarketplaceTemplates_CategoryKey",
                table: "MasterMarketplaceTemplates",
                column: "CategoryKey");

            migrationBuilder.CreateIndex(
                name: "IX_MasterMarketplaceTemplates_IsActive",
                table: "MasterMarketplaceTemplates",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_MasterMarketplaceTemplates_Tag",
                table: "MasterMarketplaceTemplates",
                column: "Tag");

            migrationBuilder.CreateIndex(
                name: "IX_MasterMarketplaceTemplates_VariantCode",
                table: "MasterMarketplaceTemplates",
                column: "VariantCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MasterMarqueeContents_MasterMarketplaceTemplateId",
                table: "MasterMarqueeContents",
                column: "MasterMarketplaceTemplateId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MasterMarqueeItems_MasterMarqueeContentId",
                table: "MasterMarqueeItems",
                column: "MasterMarqueeContentId");

            migrationBuilder.CreateIndex(
                name: "IX_MasterMediaAssets_AspectRatio",
                table: "MasterMediaAssets",
                column: "AspectRatio");

            migrationBuilder.CreateIndex(
                name: "IX_MasterMediaAssets_CategoryKey",
                table: "MasterMediaAssets",
                column: "CategoryKey");

            migrationBuilder.CreateIndex(
                name: "IX_MasterMediaAssets_IsActive",
                table: "MasterMediaAssets",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_MasterMenuContents_MasterMarketplaceTemplateId",
                table: "MasterMenuContents",
                column: "MasterMarketplaceTemplateId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MasterMenuNavItems_MasterMenuContentId",
                table: "MasterMenuNavItems",
                column: "MasterMenuContentId");

            migrationBuilder.CreateIndex(
                name: "IX_MasterMenuNavItems_ParentId",
                table: "MasterMenuNavItems",
                column: "ParentId");

            migrationBuilder.CreateIndex(
                name: "IX_MasterNewsArticles_CategoryKey",
                table: "MasterNewsArticles",
                column: "CategoryKey");

            migrationBuilder.CreateIndex(
                name: "IX_MasterNewsArticles_IsFeatured",
                table: "MasterNewsArticles",
                column: "IsFeatured");

            migrationBuilder.CreateIndex(
                name: "IX_MasterNewsArticles_IsPublished",
                table: "MasterNewsArticles",
                column: "IsPublished");

            migrationBuilder.CreateIndex(
                name: "IX_MasterNewsArticles_MasterNewsCategoryId",
                table: "MasterNewsArticles",
                column: "MasterNewsCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_MasterNewsArticles_PublishedAtUtc",
                table: "MasterNewsArticles",
                column: "PublishedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_MasterNewsArticles_Slug",
                table: "MasterNewsArticles",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MasterNewsCategories_IsActive",
                table: "MasterNewsCategories",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_MasterNewsCategories_Key",
                table: "MasterNewsCategories",
                column: "Key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MasterNewsCategories_Slug",
                table: "MasterNewsCategories",
                column: "Slug");

            migrationBuilder.CreateIndex(
                name: "IX_MasterSupportFaqs_Category",
                table: "MasterSupportFaqs",
                column: "Category");

            migrationBuilder.CreateIndex(
                name: "IX_MasterSupportFaqs_Culture",
                table: "MasterSupportFaqs",
                column: "Culture");

            migrationBuilder.CreateIndex(
                name: "IX_MasterSupportFaqs_IsPublished",
                table: "MasterSupportFaqs",
                column: "IsPublished");

            migrationBuilder.CreateIndex(
                name: "IX_MasterSupportFaqs_SortOrder",
                table: "MasterSupportFaqs",
                column: "SortOrder");

            migrationBuilder.CreateIndex(
                name: "IX_MasterSupportFaqs_SuiteCode",
                table: "MasterSupportFaqs",
                column: "SuiteCode");

            migrationBuilder.CreateIndex(
                name: "IX_MasterSupportInquiries_CreatedUtc",
                table: "MasterSupportInquiries",
                column: "CreatedUtc");

            migrationBuilder.CreateIndex(
                name: "IX_MasterSupportInquiries_Culture",
                table: "MasterSupportInquiries",
                column: "Culture");

            migrationBuilder.CreateIndex(
                name: "IX_MasterSupportInquiries_Email",
                table: "MasterSupportInquiries",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_MasterSupportInquiries_InquiryType",
                table: "MasterSupportInquiries",
                column: "InquiryType");

            migrationBuilder.CreateIndex(
                name: "IX_MasterSupportInquiries_LastActivityUtc",
                table: "MasterSupportInquiries",
                column: "LastActivityUtc");

            migrationBuilder.CreateIndex(
                name: "IX_MasterSupportInquiries_ReferenceNumber",
                table: "MasterSupportInquiries",
                column: "ReferenceNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MasterSupportInquiries_Status",
                table: "MasterSupportInquiries",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_MasterTemplatePlaceholders_FieldKey",
                table: "MasterTemplatePlaceholders",
                column: "FieldKey");

            migrationBuilder.CreateIndex(
                name: "IX_MasterTemplatePlaceholders_MasterMarketplaceTemplateId",
                table: "MasterTemplatePlaceholders",
                column: "MasterMarketplaceTemplateId");

            migrationBuilder.CreateIndex(
                name: "IX_MasterTemplateSectionLists_IsActive",
                table: "MasterTemplateSectionLists",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_MasterTemplateSectionLists_ItemType",
                table: "MasterTemplateSectionLists",
                column: "ItemType");

            migrationBuilder.CreateIndex(
                name: "IX_MasterTemplateSectionLists_MasterTemplateSectionId",
                table: "MasterTemplateSectionLists",
                column: "MasterTemplateSectionId");

            migrationBuilder.CreateIndex(
                name: "IX_MasterTemplateSections_CategoryKey",
                table: "MasterTemplateSections",
                column: "CategoryKey");

            migrationBuilder.CreateIndex(
                name: "IX_MasterTemplateSections_IsActive",
                table: "MasterTemplateSections",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_MasterTemplateSections_MasterMarketplaceTemplateId",
                table: "MasterTemplateSections",
                column: "MasterMarketplaceTemplateId");

            migrationBuilder.CreateIndex(
                name: "IX_MasterTemplateSections_SectionKey",
                table: "MasterTemplateSections",
                column: "SectionKey");

            migrationBuilder.CreateIndex(
                name: "IX_MasterTemplateSections_SectionSubType",
                table: "MasterTemplateSections",
                column: "SectionSubType");

            migrationBuilder.CreateIndex(
                name: "IX_MasterTenantCatalogs_CustomDomain",
                table: "MasterTenantCatalogs",
                column: "CustomDomain");

            migrationBuilder.CreateIndex(
                name: "IX_MasterTenantCatalogs_IsActive",
                table: "MasterTenantCatalogs",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_MasterTenantCatalogs_IsDeleted",
                table: "MasterTenantCatalogs",
                column: "IsDeleted");

            migrationBuilder.CreateIndex(
                name: "IX_MasterTenantCatalogs_IsSuspended",
                table: "MasterTenantCatalogs",
                column: "IsSuspended");

            migrationBuilder.CreateIndex(
                name: "IX_MasterTenantCatalogs_PrimaryDomain",
                table: "MasterTenantCatalogs",
                column: "PrimaryDomain",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MasterTenantCatalogs_TenantKey",
                table: "MasterTenantCatalogs",
                column: "TenantKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MasterTenantFeatureSubscriptions_ExpiresAtUtc",
                table: "MasterTenantFeatureSubscriptions",
                column: "ExpiresAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_MasterTenantFeatureSubscriptions_IsActive",
                table: "MasterTenantFeatureSubscriptions",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_MasterTenantFeatureSubscriptions_MasterFeatureCatalogId",
                table: "MasterTenantFeatureSubscriptions",
                column: "MasterFeatureCatalogId");

            migrationBuilder.CreateIndex(
                name: "IX_MasterTenantFeatureSubscriptions_MasterTenantCatalogId",
                table: "MasterTenantFeatureSubscriptions",
                column: "MasterTenantCatalogId");

            migrationBuilder.CreateIndex(
                name: "IX_MasterTicketReplies_CreatedUtc",
                table: "MasterTicketReplies",
                column: "CreatedUtc");

            migrationBuilder.CreateIndex(
                name: "IX_MasterTicketReplies_MasterSupportInquiryId",
                table: "MasterTicketReplies",
                column: "MasterSupportInquiryId");

            migrationBuilder.CreateIndex(
                name: "IX_MasterVideoGuides_Culture",
                table: "MasterVideoGuides",
                column: "Culture");

            migrationBuilder.CreateIndex(
                name: "IX_MasterVideoGuides_FeatureCode",
                table: "MasterVideoGuides",
                column: "FeatureCode");

            migrationBuilder.CreateIndex(
                name: "IX_MasterVideoGuides_IsPublished",
                table: "MasterVideoGuides",
                column: "IsPublished");

            migrationBuilder.CreateIndex(
                name: "IX_MasterVideoGuides_SortOrder",
                table: "MasterVideoGuides",
                column: "SortOrder");

            migrationBuilder.CreateIndex(
                name: "IX_MasterVideoGuides_SuiteCode",
                table: "MasterVideoGuides",
                column: "SuiteCode");

            migrationBuilder.CreateIndex(
                name: "IX_MasterVoucherApplications_CreatedAtUtc",
                table: "MasterVoucherApplications",
                column: "CreatedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_MasterVoucherApplications_ReferenceNumber",
                table: "MasterVoucherApplications",
                column: "ReferenceNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MasterVoucherApplications_Status",
                table: "MasterVoucherApplications",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_MasterVoucherApplications_WorkEmail",
                table: "MasterVoucherApplications",
                column: "WorkEmail");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CentralRoleClaims");

            migrationBuilder.DropTable(
                name: "CentralUserClaims");

            migrationBuilder.DropTable(
                name: "CentralUserLogins");

            migrationBuilder.DropTable(
                name: "CentralUserRoles");

            migrationBuilder.DropTable(
                name: "CentralUserTokens");

            migrationBuilder.DropTable(
                name: "MasterAffiliateReferrals");

            migrationBuilder.DropTable(
                name: "MasterAuditLogs");

            migrationBuilder.DropTable(
                name: "MasterBillingTransactions");

            migrationBuilder.DropTable(
                name: "MasterBlogPostItems");

            migrationBuilder.DropTable(
                name: "MasterBodySectionLists");

            migrationBuilder.DropTable(
                name: "MasterContactChannelItems");

            migrationBuilder.DropTable(
                name: "MasterCouponRedemptions");

            migrationBuilder.DropTable(
                name: "MasterCurrencyRates");

            migrationBuilder.DropTable(
                name: "MasterEmailLogs");

            migrationBuilder.DropTable(
                name: "MasterFooterLinks");

            migrationBuilder.DropTable(
                name: "MasterHelpdeskArticles");

            migrationBuilder.DropTable(
                name: "MasterHeroSlideItems");

            migrationBuilder.DropTable(
                name: "MasterJobApplications");

            migrationBuilder.DropTable(
                name: "MasterLegalDocuments");

            migrationBuilder.DropTable(
                name: "MasterMarqueeItems");

            migrationBuilder.DropTable(
                name: "MasterMediaAssets");

            migrationBuilder.DropTable(
                name: "MasterMenuNavItems");

            migrationBuilder.DropTable(
                name: "MasterNewsArticles");

            migrationBuilder.DropTable(
                name: "MasterPlatformSettings");

            migrationBuilder.DropTable(
                name: "MasterSupportFaqs");

            migrationBuilder.DropTable(
                name: "MasterTemplatePlaceholders");

            migrationBuilder.DropTable(
                name: "MasterTemplateSectionLists");

            migrationBuilder.DropTable(
                name: "MasterTicketReplies");

            migrationBuilder.DropTable(
                name: "MasterVideoGuides");

            migrationBuilder.DropTable(
                name: "MasterVoucherApplications");

            migrationBuilder.DropTable(
                name: "CentralRoles");

            migrationBuilder.DropTable(
                name: "CentralUsers");

            migrationBuilder.DropTable(
                name: "MasterTenantFeatureSubscriptions");

            migrationBuilder.DropTable(
                name: "MasterBlogContents");

            migrationBuilder.DropTable(
                name: "MasterBodySectionContents");

            migrationBuilder.DropTable(
                name: "MasterContactContents");

            migrationBuilder.DropTable(
                name: "MasterCoupons");

            migrationBuilder.DropTable(
                name: "MasterFooterColumns");

            migrationBuilder.DropTable(
                name: "MasterHeroContents");

            migrationBuilder.DropTable(
                name: "MasterJobOpenings");

            migrationBuilder.DropTable(
                name: "MasterMarqueeContents");

            migrationBuilder.DropTable(
                name: "MasterMenuContents");

            migrationBuilder.DropTable(
                name: "MasterNewsCategories");

            migrationBuilder.DropTable(
                name: "MasterTemplateSections");

            migrationBuilder.DropTable(
                name: "MasterSupportInquiries");

            migrationBuilder.DropTable(
                name: "MasterAffiliatePartners");

            migrationBuilder.DropTable(
                name: "MasterCreatorApplications");

            migrationBuilder.DropTable(
                name: "MasterTenantCatalogs");

            migrationBuilder.DropTable(
                name: "MasterFeatureCatalogs");

            migrationBuilder.DropTable(
                name: "MasterFooterContents");

            migrationBuilder.DropTable(
                name: "MasterMarketplaceTemplates");

            migrationBuilder.DropTable(
                name: "MasterMarketplaceCategories");
        }
    }
}
