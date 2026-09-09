using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OzikolBCC.Persistence.EF.SQL.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AspNetRoles",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    RoleCategory = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BcpActivityLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ActionType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PerformedByProfileId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PerformedByFullName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TargetProfileId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TargetFullName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Module = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IpAddress = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    MetadataJson = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpActivityLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BcpApplicantAccounts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FirstName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    LastName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Phone = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpApplicantAccounts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BcpDonors",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ContactEmail = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    ContactPhone = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Address = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpDonors", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BcpElections",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ShortCode = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Instructions = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ElectionType = table.Column<int>(type: "int", nullable: false),
                    VotingStatus = table.Column<int>(type: "int", nullable: false),
                    ShowResults = table.Column<bool>(type: "bit", nullable: false),
                    EnableCandidateImages = table.Column<bool>(type: "bit", nullable: false),
                    RequireAllCategories = table.Column<bool>(type: "bit", nullable: false),
                    ElectionBannerUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ElectionBannerKey = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpElections", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BcpEquipmentCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpEquipmentCategories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BcpFeatures",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FeatureName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ModuleFolder = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CostPerDuration = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    BillingDuration = table.Column<int>(type: "int", nullable: false),
                    GracePeriodDays = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    NextBillingDate = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpFeatures", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BcpFinanceCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsCompulsory = table.Column<bool>(type: "bit", nullable: false),
                    Frequency = table.Column<int>(type: "int", nullable: false),
                    FixedAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpFinanceCategories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BcpForms",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ShortCode = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SchemaJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsPublished = table.Column<bool>(type: "bit", nullable: false),
                    RequireLogin = table.Column<bool>(type: "bit", nullable: false),
                    AllowMultipleSubmissions = table.Column<bool>(type: "bit", nullable: false),
                    AllowUserToViewResponses = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpForms", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BcpJobPostings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AmountOrSalary = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RequiredSkills = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Benefits = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    JobType = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ClosingDate = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpJobPostings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BcpKpiIndicators",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MaxScore = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Weight = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Category = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpKpiIndicators", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BcpKpiPeriods",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpKpiPeriods", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BcpLoginAuditLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Email = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    IpAddress = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    UserAgent = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    Timestamp = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpLoginAuditLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BcpManuals",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ModuleFolder = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Overview = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpManuals", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BcpMessageTemplates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EventType = table.Column<int>(type: "int", nullable: false),
                    Channel = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    SubjectTemplate = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    BodyTemplate = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AvailablePlaceholders = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedBy = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpMessageTemplates", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BcpNewsletterPlans",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Quota = table.Column<int>(type: "int", nullable: false),
                    DurationInMonths = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpNewsletterPlans", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BcpProductCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Icon = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    BannerUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    BannerKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ParentId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    Publish = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpProductCategories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpProductCategories_BcpProductCategories_ParentId",
                        column: x => x.ParentId,
                        principalTable: "BcpProductCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "BcpProjects",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpProjects", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BcpReportSchemas",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Frequency = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DeadlineTime = table.Column<TimeSpan>(type: "time", nullable: false),
                    DeadlineDayOfWeek = table.Column<int>(type: "int", nullable: true),
                    DeadlineDayOfMonth = table.Column<int>(type: "int", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    RequireTimeLog = table.Column<bool>(type: "bit", nullable: false),
                    WorkStartTime = table.Column<TimeSpan>(type: "time", nullable: true),
                    WorkEndTime = table.Column<TimeSpan>(type: "time", nullable: true),
                    BreakStartTime = table.Column<TimeSpan>(type: "time", nullable: true),
                    BreakEndTime = table.Column<TimeSpan>(type: "time", nullable: true),
                    TimeLogIntervalHours = table.Column<int>(type: "int", nullable: false),
                    Use24HourFormat = table.Column<bool>(type: "bit", nullable: false),
                    RequireAchievements = table.Column<bool>(type: "bit", nullable: false),
                    RequireChallenges = table.Column<bool>(type: "bit", nullable: false),
                    RequireNextDayPlan = table.Column<bool>(type: "bit", nullable: false),
                    RequireFileUpload = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpReportSchemas", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BcpScheduledJobQueues",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SourceId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    SourceModel = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ActionType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Payload = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ScheduledAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExecutedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Retries = table.Column<int>(type: "int", nullable: false),
                    MaxRetries = table.Column<int>(type: "int", nullable: false),
                    LastError = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TenantKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpScheduledJobQueues", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BcpSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    WebContactEnablePhone = table.Column<bool>(type: "bit", nullable: false),
                    WebContactEnableCategory = table.Column<bool>(type: "bit", nullable: false),
                    WebContactEnableFile = table.Column<bool>(type: "bit", nullable: false),
                    CategoryAlias = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SubCategoryAlias = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    GroupAlias = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AlumniAlias = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    EnableListDownload = table.Column<bool>(type: "bit", nullable: false),
                    EnableUserDeletion = table.Column<bool>(type: "bit", nullable: false),
                    EnablePaystack = table.Column<bool>(type: "bit", nullable: false),
                    PaystackPublicKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PaystackSecretKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PaystackWebhookSecret = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PaymentModuleActive = table.Column<bool>(type: "bit", nullable: false),
                    EnablePixelPay = table.Column<bool>(type: "bit", nullable: false),
                    PixelPayBaseUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PixelPayKeyId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PixelPaySecretKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PixelPaySignature = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CurrencyCode = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CurrencySymbol = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PixelPayCurrency = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PixelPayWebhookSecret = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RemitaTitle = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RemitaInstruction = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RemitaButton = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SmsCreditBalance = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    GlobalNewsletterQuota = table.Column<int>(type: "int", nullable: false),
                    GlobalNewsletterQuotaExpiry = table.Column<DateTime>(type: "datetime2", nullable: true),
                    EnableZeptoMail = table.Column<bool>(type: "bit", nullable: false),
                    ZeptoMailApiKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ZeptoMailSendMailId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ZeptoMailSenderEmail = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ZeptoMailSenderName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    EmailMaxRetries = table.Column<int>(type: "int", nullable: false),
                    ActiveAiProvider = table.Column<int>(type: "int", nullable: false),
                    GeminiApiKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    OpenAIApiKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AnthropicApiKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ActiveCaptcha = table.Column<int>(type: "int", nullable: false),
                    GoogleRecaptchaSiteKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    GoogleRecaptchaSecretKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    EncryptionNote = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    EncryptionUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    EncryptionKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DefaultAttendanceStartTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DefaultAttendanceCloseTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    EarlyMinute = table.Column<int>(type: "int", nullable: false),
                    OntimeMinute = table.Column<int>(type: "int", nullable: false),
                    LateMinute = table.Column<int>(type: "int", nullable: false),
                    VeryLateMinute = table.Column<int>(type: "int", nullable: false),
                    DefaultAttendanceStartTimeSaturday = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReportCloseTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    JobCardNote = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    JobCardTitleBackgroundUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    JobCardTitleBackgroundKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PasswordMinLength = table.Column<int>(type: "int", nullable: false),
                    PasswordRequireDigit = table.Column<bool>(type: "bit", nullable: false),
                    PasswordRequireLowercase = table.Column<bool>(type: "bit", nullable: false),
                    PasswordRequireUppercase = table.Column<bool>(type: "bit", nullable: false),
                    PasswordRequireNonAlphanumeric = table.Column<bool>(type: "bit", nullable: false),
                    PasswordExpirationDays = table.Column<int>(type: "int", nullable: false),
                    MaxFailedAccessAttempts = table.Column<int>(type: "int", nullable: false),
                    LockoutDurationMinutes = table.Column<int>(type: "int", nullable: false),
                    MfaRequiredGlobally = table.Column<bool>(type: "bit", nullable: false),
                    MfaRequiredForAdmins = table.Column<bool>(type: "bit", nullable: false),
                    RequireConfirmedEmailToLogin = table.Column<bool>(type: "bit", nullable: false),
                    MemberIdFormat = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MemberIdPrefix = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MemberIdNextNumber = table.Column<int>(type: "int", nullable: false),
                    MemberIdPadding = table.Column<int>(type: "int", nullable: false),
                    MemberIdDelimiter = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpSettings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BcpSmsSenderIds",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SenderId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SampleMessage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpSmsSenderIds", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BcpUserCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ColorCode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Icon = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpUserCategories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BcpWidgets",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    WidgetCode = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    ColSpan = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpWidgets", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BcpWizardSteps",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FeatureName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    StepOrder = table.Column<int>(type: "int", nullable: false),
                    TargetElement = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpWizardSteps", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BlogCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Publish = table.Column<bool>(type: "bit", nullable: false),
                    ParentId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BlogCategories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BlogCategories_BlogCategories_ParentId",
                        column: x => x.ParentId,
                        principalTable: "BlogCategories",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ConfigSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TemplateLayoutKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LoginTemplateKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ColorTemplateKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SliderTemplateKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ProductTemplateKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    BlogTemplateKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ReloaderTemplateKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PageHeaderTemplateKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    FooterTemplateKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    WebsiteTitle = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CompanyDescription = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CompanyName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CompanyNameAbbreviation = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CompanyWebsiteLink = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DashboardTitle = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CompanyLogoUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CompanyLogoKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CompanyWhiteLogoUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CompanyWhiteLogoKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CompanyIconUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CompanyIconKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ReloaderIconUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ReloaderIconKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    JustWebsite = table.Column<bool>(type: "bit", nullable: false),
                    ActivateLogin = table.Column<bool>(type: "bit", nullable: false),
                    ActivateLoginInMenu = table.Column<bool>(type: "bit", nullable: false),
                    ActivateComingSoon = table.Column<bool>(type: "bit", nullable: false),
                    LoginBackgroundImageUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LoginBackgroundImageKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UseNormalLogoInLogin = table.Column<bool>(type: "bit", nullable: false),
                    UseWhiteLogoInLogin = table.Column<bool>(type: "bit", nullable: false),
                    LoginTitle = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LoginNoteTitle = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LoginNote = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LoginNoteFooter = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    EmailTemplate = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SMSTemplate = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ProductTitle = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ProductTitleHome = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RemoveWatermark = table.Column<bool>(type: "bit", nullable: false),
                    SpecialMenuButtonText = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SpecialMenuButtonLink = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SpecialMenuButtonActivate = table.Column<bool>(type: "bit", nullable: false),
                    ActivateWorkWithUsFooter = table.Column<bool>(type: "bit", nullable: false),
                    TitleWorkWithUsFooter = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ActivateSubscribeFormOnFooter = table.Column<bool>(type: "bit", nullable: false),
                    CurrencySymbol = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CurrencyCode = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    OrganizationDisplayName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    OrganizationPaymentNote = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Qoute = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TopNote = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    GoogleMap = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ShowAddressOneInTop = table.Column<bool>(type: "bit", nullable: false),
                    AddressOne = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AddressTwo = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    FacebookPage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    InstagramPage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TwitterPage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TiktokPage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    YoutubeChannel = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    EmailOne = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ShowEmailOneInTop = table.Column<bool>(type: "bit", nullable: false),
                    ShowEmailOneInFooter = table.Column<bool>(type: "bit", nullable: false),
                    EmailTwo = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ShowEmailTwoInTop = table.Column<bool>(type: "bit", nullable: false),
                    ShowEmailTwoInFooter = table.Column<bool>(type: "bit", nullable: false),
                    EmailThree = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ShowEmailThreeInTop = table.Column<bool>(type: "bit", nullable: false),
                    ShowEmailThreeInFooter = table.Column<bool>(type: "bit", nullable: false),
                    PhoneOne = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ShowPhoneOneInTop = table.Column<bool>(type: "bit", nullable: false),
                    ShowPhoneOneInFooter = table.Column<bool>(type: "bit", nullable: false),
                    PhoneTwo = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ShowPhoneTwoInTop = table.Column<bool>(type: "bit", nullable: false),
                    ShowPhoneTwoInFooter = table.Column<bool>(type: "bit", nullable: false),
                    PhoneThree = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ShowPhoneThreeInTop = table.Column<bool>(type: "bit", nullable: false),
                    ShowPhoneThreeInFooter = table.Column<bool>(type: "bit", nullable: false),
                    WorkingHour = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AddFaqToHome = table.Column<bool>(type: "bit", nullable: false),
                    AddFaqToFooter = table.Column<bool>(type: "bit", nullable: false),
                    AddTestimonyToHome = table.Column<bool>(type: "bit", nullable: false),
                    AddTestimonyToFooter = table.Column<bool>(type: "bit", nullable: false),
                    AddPartnerToHome = table.Column<bool>(type: "bit", nullable: false),
                    DisableMainTopMenu = table.Column<bool>(type: "bit", nullable: false),
                    CustomMenuTop = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UseCustomMenuTop = table.Column<bool>(type: "bit", nullable: false),
                    ShowProductsInMenu = table.Column<bool>(type: "bit", nullable: false),
                    ShowProductsInFooter = table.Column<bool>(type: "bit", nullable: false),
                    ActivateProductsInHome = table.Column<bool>(type: "bit", nullable: false),
                    ShowThreeProducts = table.Column<bool>(type: "bit", nullable: false),
                    ShowSixProducts = table.Column<bool>(type: "bit", nullable: false),
                    ShowTwoProducts = table.Column<bool>(type: "bit", nullable: false),
                    ShowContactUsMenu = table.Column<bool>(type: "bit", nullable: false),
                    ShowContactUsFooter = table.Column<bool>(type: "bit", nullable: false),
                    DefaultTitleBackgroundUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DefaultTitleBackgroundKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AddBlogToHome = table.Column<bool>(type: "bit", nullable: false),
                    AddBlogToMenu = table.Column<bool>(type: "bit", nullable: false),
                    AddBlogToFooter = table.Column<bool>(type: "bit", nullable: false),
                    BlogDisplayTitle = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AddCareerToMenu = table.Column<bool>(type: "bit", nullable: false),
                    AddCareerToFooter = table.Column<bool>(type: "bit", nullable: false),
                    CareerDisplayTitle = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UseCategoryBlog = table.Column<bool>(type: "bit", nullable: false),
                    EnableBreakingNewsRibon = table.Column<bool>(type: "bit", nullable: false),
                    BreakingNewsRibonTitle = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RibonPosition = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConfigSettings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ContactUsCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ForwardEmail = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Publish = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContactUsCategories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "FAQCategories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    Publish = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FAQCategories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MailingSystems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Receipient = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Retries = table.Column<int>(type: "int", nullable: false),
                    NotificationStatus = table.Column<int>(type: "int", nullable: false),
                    NotificationType = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MailingSystems", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ManagementSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BucketName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MaximumUsers = table.Column<int>(type: "int", nullable: false),
                    ActivateOnlyAuthorizedDevice = table.Column<bool>(type: "bit", nullable: false),
                    ActivateSMS = table.Column<bool>(type: "bit", nullable: false),
                    LoginCSS = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LayoutCSS = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LayoutJavaScript = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DashboardCSS = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    BcpDashboardCSS = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    BcpJobBoardCSS = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ElectionCustomCss = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    BcpLayoutJavaScript = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RedirectTohttpswww = table.Column<bool>(type: "bit", nullable: false),
                    RedirectTohttps = table.Column<bool>(type: "bit", nullable: false),
                    Configuration = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LiveConfiguration = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    BankName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AccountNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AccountName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SignatureName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SignatureTitle = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SignatureUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SignatureKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    FileFolderName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ManagementSettings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "NewsLetter",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Email = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Active = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NewsLetter", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PageCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Publish = table.Column<bool>(type: "bit", nullable: false),
                    MenuSortOrder = table.Column<int>(type: "int", nullable: false),
                    HomeSortFrom = table.Column<int>(type: "int", nullable: false),
                    ParentId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Icon = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PageCategories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PageCategories_PageCategories_ParentId",
                        column: x => x.ParentId,
                        principalTable: "PageCategories",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "PostModal",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ImageUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ImageKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ModalTime = table.Column<int>(type: "int", nullable: false),
                    ModalOccurance = table.Column<int>(type: "int", nullable: false),
                    StartTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    StopTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ShowOnlyImage = table.Column<bool>(type: "bit", nullable: false),
                    ShowTitle = table.Column<bool>(type: "bit", nullable: false),
                    ShowDescription = table.Column<bool>(type: "bit", nullable: false),
                    ShowImage = table.Column<bool>(type: "bit", nullable: false),
                    Publish = table.Column<bool>(type: "bit", nullable: false),
                    ButtonLink = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PostModal", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Sliders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Url = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Key = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SecondUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SecondKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    YoutubeVideo = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsVideo = table.Column<bool>(type: "bit", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    Show = table.Column<bool>(type: "bit", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MiniTitle = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Text = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ButtonText = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ButtonLink = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DisableVideoButton = table.Column<bool>(type: "bit", nullable: false),
                    VideoLink = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    VideoButtonText = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sliders", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TemplateCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Layout = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LoginLayout = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TemplateName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TemplateColorPath = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    UniqueKey = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TemplateCategories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TenantInstalledTemplates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MasterTemplateId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    TemplateKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CategoryKey = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    VariantCode = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    HtmlTemplate = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CssStyles = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    JsScript = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    InstalledVersion = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    IsCustomized = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    InstalledUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastUpdatedUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TenantInstalledTemplates", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AspNetRoleClaims",
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
                    table.PrimaryKey("PK_AspNetRoleClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetRoleClaims_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpVoteCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BcpElectionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpVoteCategories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpVoteCategories_BcpElections_BcpElectionId",
                        column: x => x.BcpElectionId,
                        principalTable: "BcpElections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpFeatureInvoices",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BcpFeatureId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AmountDue = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    InvoiceDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DueDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsPaid = table.Column<bool>(type: "bit", nullable: false),
                    PaymentDate = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpFeatureInvoices", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpFeatureInvoices_BcpFeatures_BcpFeatureId",
                        column: x => x.BcpFeatureId,
                        principalTable: "BcpFeatures",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Venue = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    BannerImageUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    BcpFinanceCategoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpEvents_BcpFinanceCategories_BcpFinanceCategoryId",
                        column: x => x.BcpFinanceCategoryId,
                        principalTable: "BcpFinanceCategories",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "BcpJobApplicants",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BcpJobPostingId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FirstName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    LastName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Phone = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ProfessionalSummary = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    WorkExperience = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    BcpApplicantAccountId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Education = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Skills = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PassportFileUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ResumeFileUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpJobApplicants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpJobApplicants_BcpApplicantAccounts_BcpApplicantAccountId",
                        column: x => x.BcpApplicantAccountId,
                        principalTable: "BcpApplicantAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BcpJobApplicants_BcpJobPostings_BcpJobPostingId",
                        column: x => x.BcpJobPostingId,
                        principalTable: "BcpJobPostings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpManualPages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BcpManualId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RouteKey = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PageTitle = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PageDescription = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpManualPages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpManualPages_BcpManuals_BcpManualId",
                        column: x => x.BcpManualId,
                        principalTable: "BcpManuals",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpProducts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    ShortDescription = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    FullDescription = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Type = table.Column<int>(type: "int", nullable: false),
                    PublishStatus = table.Column<int>(type: "int", nullable: false),
                    Price = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    CompareAtPrice = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    Currency = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Sku = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Barcode = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CoverImageUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CoverImageKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    GalleryImagesJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DemoVideoUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsScheduled = table.Column<bool>(type: "bit", nullable: false),
                    ScheduledReleaseUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PublishedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DownloadFileUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    VersionTag = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    FileSize = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RequiresLicenseKey = table.Column<bool>(type: "bit", nullable: false),
                    LicenseKeyPattern = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DeliveryTimeframeDays = table.Column<int>(type: "int", nullable: true),
                    RequiresBookingSchedule = table.Column<bool>(type: "bit", nullable: false),
                    ConsultationDurationMinutes = table.Column<int>(type: "int", nullable: true),
                    DeliverablesSummary = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TrackInventory = table.Column<bool>(type: "bit", nullable: false),
                    StockQuantity = table.Column<int>(type: "int", nullable: false),
                    LowStockThreshold = table.Column<int>(type: "int", nullable: false),
                    WeightKg = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    RequiresShipping = table.Column<bool>(type: "bit", nullable: false),
                    BillingInterval = table.Column<int>(type: "int", nullable: true),
                    TrialPeriodDays = table.Column<int>(type: "int", nullable: true),
                    AutoRenew = table.Column<bool>(type: "bit", nullable: false),
                    BcpProductCategoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Tags = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsFeatured = table.Column<bool>(type: "bit", nullable: false),
                    MetaTitle = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MetaDescription = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpProducts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpProducts_BcpProductCategories_BcpProductCategoryId",
                        column: x => x.BcpProductCategoryId,
                        principalTable: "BcpProductCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "BcpProjectSprints",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BcpProjectId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SprintName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Goal = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpProjectSprints", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpProjectSprints_BcpProjects_BcpProjectId",
                        column: x => x.BcpProjectId,
                        principalTable: "BcpProjects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUsers",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    FirstName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MiddleName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DateOfBirth = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastLogin = table.Column<DateTime>(type: "datetime2", nullable: true),
                    BcpUserCategoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Gender = table.Column<int>(type: "int", nullable: false),
                    UserStatus = table.Column<int>(type: "int", nullable: false),
                    MemberId = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Designation = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    AvatarUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    JoinDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UserType = table.Column<int>(type: "int", nullable: false),
                    GuestCompanyName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    GuestAccessExpiry = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PreferredTwoFactorProvider = table.Column<int>(type: "int", nullable: false),
                    MustChangePassword = table.Column<bool>(type: "bit", nullable: false),
                    RegistrationSource = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
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
                    table.PrimaryKey("PK_AspNetUsers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetUsers_BcpUserCategories_BcpUserCategoryId",
                        column: x => x.BcpUserCategoryId,
                        principalTable: "BcpUserCategories",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Blogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    VideoUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    VideoKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Publish = table.Column<bool>(type: "bit", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    ImageUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ImageKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    BlogCategoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    FullDescription = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AddToRibon = table.Column<bool>(type: "bit", nullable: false),
                    RibonCustomDisplayTitle = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RibonSortOrder = table.Column<int>(type: "int", nullable: false),
                    ScheduledPublishDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsScheduled = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Blogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Blogs_BlogCategories_BlogCategoryId",
                        column: x => x.BlogCategoryId,
                        principalTable: "BlogCategories",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ContactUs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ContactUsCategoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Mail = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Phone = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CompanyName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Subject = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    FileUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    FileKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Report = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastUpdated = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContactUs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ContactUs_ContactUsCategories_ContactUsCategoryId",
                        column: x => x.ContactUsCategoryId,
                        principalTable: "ContactUsCategories",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "FAQs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Message = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    Show = table.Column<bool>(type: "bit", nullable: false),
                    FAQCategoryId = table.Column<int>(type: "int", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FAQs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FAQs_FAQCategories_FAQCategoryId",
                        column: x => x.FAQCategoryId,
                        principalTable: "FAQCategories",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "WebPages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    Publish = table.Column<bool>(type: "bit", nullable: false),
                    SecurityPage = table.Column<bool>(type: "bit", nullable: false),
                    PageCategoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ImageUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ImageKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ShowInMainTop = table.Column<bool>(type: "bit", nullable: false),
                    ShowInMenuDropDown = table.Column<bool>(type: "bit", nullable: false),
                    ShowInMainMenu = table.Column<bool>(type: "bit", nullable: false),
                    ShowInFooter = table.Column<bool>(type: "bit", nullable: false),
                    EnableDirectUrl = table.Column<bool>(type: "bit", nullable: false),
                    DirectUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    HomeSortFrom = table.Column<int>(type: "int", nullable: false),
                    MainPageId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    MetaTitle = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MetaDescription = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MetaKeywords = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ViewCount = table.Column<long>(type: "bigint", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WebPages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WebPages_PageCategories_PageCategoryId",
                        column: x => x.PageCategoryId,
                        principalTable: "PageCategories",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "TemplateTypes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Url = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Key = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TrackKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TemplateCategoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TemplateTypes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TemplateTypes_TemplateCategories_TemplateCategoryId",
                        column: x => x.TemplateCategoryId,
                        principalTable: "TemplateCategories",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "BcpTicketTypes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BcpEventId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Price = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalCapacity = table.Column<int>(type: "int", nullable: true),
                    SoldCount = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpTicketTypes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpTicketTypes_BcpEvents_BcpEventId",
                        column: x => x.BcpEventId,
                        principalTable: "BcpEvents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpJobApplicantDocuments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BcpJobApplicantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    FileUrl = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpJobApplicantDocuments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpJobApplicantDocuments_BcpJobApplicants_BcpJobApplicantId",
                        column: x => x.BcpJobApplicantId,
                        principalTable: "BcpJobApplicants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpJobInterviews",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BcpJobApplicantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    InterviewDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LocationOrLink = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    InterviewType = table.Column<int>(type: "int", nullable: false),
                    Score = table.Column<int>(type: "int", nullable: true),
                    AdminFeedback = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpJobInterviews", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpJobInterviews_BcpJobApplicants_BcpJobApplicantId",
                        column: x => x.BcpJobApplicantId,
                        principalTable: "BcpJobApplicants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpManualElements",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BcpManualPageId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ElementName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ElementType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RequiredRole = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpManualElements", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpManualElements_BcpManualPages_BcpManualPageId",
                        column: x => x.BcpManualPageId,
                        principalTable: "BcpManualPages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpMarketingCampaigns",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CampaignName = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    EmailSubject = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    BcpProductId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    TemplateType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    HtmlContent = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AudienceFilter = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TotalRecipients = table.Column<int>(type: "int", nullable: false),
                    SentCount = table.Column<int>(type: "int", nullable: false),
                    FailedCount = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ScheduledForUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CompletedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpMarketingCampaigns", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpMarketingCampaigns_BcpProducts_BcpProductId",
                        column: x => x.BcpProductId,
                        principalTable: "BcpProducts",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserClaims",
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
                    table.PrimaryKey("PK_AspNetUserClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetUserClaims_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserLogins",
                columns: table => new
                {
                    LoginProvider = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ProviderKey = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ProviderDisplayName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserLogins", x => new { x.LoginProvider, x.ProviderKey });
                    table.ForeignKey(
                        name: "FK_AspNetUserLogins_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserRoles",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    RoleId = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserRoles", x => new { x.UserId, x.RoleId });
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserTokens",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    LoginProvider = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Value = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserTokens", x => new { x.UserId, x.LoginProvider, x.Name });
                    table.ForeignKey(
                        name: "FK_AspNetUserTokens_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpAlumniPosts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserProfileId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PostType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpAlumniPosts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpAlumniPosts_AspNetUsers_UserProfileId",
                        column: x => x.UserProfileId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpAlumniProfiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserProfileId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ExitYear = table.Column<int>(type: "int", nullable: false),
                    CurrentProfession = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    Company = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    LinkedInUrl = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    IsAvailableForMentorship = table.Column<bool>(type: "bit", nullable: false),
                    Bio = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    VerificationStatus = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpAlumniProfiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpAlumniProfiles_AspNetUsers_UserProfileId",
                        column: x => x.UserProfileId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpBiographies",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Headline = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    ProfessionalSummary = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    WorkExperienceJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    EducationJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SkillsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CertificationsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LanguagesJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastUpdated = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpBiographies", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpBiographies_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpCandidates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BcpVoteCategoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProfileId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CandidateImageUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CandidateImageKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ShortProfile = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Manifesto = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpCandidates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpCandidates_AspNetUsers_ProfileId",
                        column: x => x.ProfileId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_BcpCandidates_BcpVoteCategories_BcpVoteCategoryId",
                        column: x => x.BcpVoteCategoryId,
                        principalTable: "BcpVoteCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpElectionVoters",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BcpElectionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    IsAccredited = table.Column<bool>(type: "bit", nullable: false),
                    HasVoted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpElectionVoters", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpElectionVoters_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_BcpElectionVoters_BcpElections_BcpElectionId",
                        column: x => x.BcpElectionId,
                        principalTable: "BcpElections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpEmailQueue",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RelatedUserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    RecipientEmail = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    RecipientName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    Subject = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    HtmlBody = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PlainBody = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Category = table.Column<int>(type: "int", nullable: false),
                    Priority = table.Column<int>(type: "int", nullable: false),
                    EventType = table.Column<int>(type: "int", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Retries = table.Column<int>(type: "int", nullable: false),
                    MaxRetries = table.Column<int>(type: "int", nullable: false),
                    LastError = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ScheduledAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    SentAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpEmailQueue", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpEmailQueue_AspNetUsers_RelatedUserId",
                        column: x => x.RelatedUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "BcpEquipments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SerialNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    BcpEquipmentCategoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ImageUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ImageKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PurchaseDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PurchasePrice = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    SalvageValue = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    LifespanMonths = table.Column<int>(type: "int", nullable: false),
                    CurrentStatus = table.Column<int>(type: "int", nullable: false),
                    AssignedToUserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    AdditionalDetails = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpEquipments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpEquipments_AspNetUsers_AssignedToUserId",
                        column: x => x.AssignedToUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_BcpEquipments_BcpEquipmentCategories_BcpEquipmentCategoryId",
                        column: x => x.BcpEquipmentCategoryId,
                        principalTable: "BcpEquipmentCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpFinanceTransactions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BcpFinanceCategoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UserId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UserProfileId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    DonorName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DonorEmail = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DonorPhone = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TransactionReference = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PaymentProvider = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Feature = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SourceId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PaidAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpFinanceTransactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpFinanceTransactions_AspNetUsers_UserProfileId",
                        column: x => x.UserProfileId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_BcpFinanceTransactions_BcpFinanceCategories_BcpFinanceCategoryId",
                        column: x => x.BcpFinanceCategoryId,
                        principalTable: "BcpFinanceCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "BcpFormResponses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BcpFormId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserProfileId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    SubmittedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ResponsesJson = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpFormResponses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpFormResponses_AspNetUsers_UserProfileId",
                        column: x => x.UserProfileId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_BcpFormResponses_BcpForms_BcpFormId",
                        column: x => x.BcpFormId,
                        principalTable: "BcpForms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpGroups",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    GroupType = table.Column<int>(type: "int", nullable: false),
                    Visibility = table.Column<int>(type: "int", nullable: false),
                    ChatMode = table.Column<int>(type: "int", nullable: false),
                    AvatarUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CoverImageUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    IsArchived = table.Column<bool>(type: "bit", nullable: false),
                    MaxMembers = table.Column<int>(type: "int", nullable: true),
                    AllowGuestAccess = table.Column<bool>(type: "bit", nullable: false),
                    IsAlwaysOpen = table.Column<bool>(type: "bit", nullable: false),
                    OperationalDays = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    OpenTime = table.Column<TimeSpan>(type: "time", nullable: true),
                    CloseTime = table.Column<TimeSpan>(type: "time", nullable: true),
                    ClosedMessage = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    EditWindowMinutes = table.Column<int>(type: "int", nullable: false),
                    DeleteWindowMinutes = table.Column<int>(type: "int", nullable: false),
                    MessageRetentionDays = table.Column<int>(type: "int", nullable: true),
                    AutoConvertThreshold = table.Column<int>(type: "int", nullable: false),
                    RateLimitPerMinute = table.Column<int>(type: "int", nullable: false),
                    ReadReceiptsEnabled = table.Column<bool>(type: "bit", nullable: false),
                    TypingIndicatorsEnabled = table.Column<bool>(type: "bit", nullable: false),
                    LastSeenEnabled = table.Column<bool>(type: "bit", nullable: false),
                    CloudinaryFolder = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpGroups", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpGroups_AspNetUsers_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "BcpKpiUserScores",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProfileId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    BcpKpiIndicatorId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Score = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Period = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    EvaluatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpKpiUserScores", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpKpiUserScores_AspNetUsers_ProfileId",
                        column: x => x.ProfileId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BcpKpiUserScores_BcpKpiIndicators_BcpKpiIndicatorId",
                        column: x => x.BcpKpiIndicatorId,
                        principalTable: "BcpKpiIndicators",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpLeaveRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Type = table.Column<int>(type: "int", nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Reason = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AttachmentUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AttachmentKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    DateSubmitted = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ReviewedById = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    DateReviewed = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReviewerRemarks = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpLeaveRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpLeaveRequests_AspNetUsers_ReviewedById",
                        column: x => x.ReviewedById,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_BcpLeaveRequests_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpNewsletterCampaigns",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Subject = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    HtmlBody = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ScheduledDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    SentAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    TotalRecipients = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpNewsletterCampaigns", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpNewsletterCampaigns_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpNewsletterLists",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpNewsletterLists", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpNewsletterLists_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpNewsletterPlanTransactions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    BcpNewsletterPlanId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Quota = table.Column<int>(type: "int", nullable: false),
                    Reference = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    PaymentProvider = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsGlobalPurchase = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PaidAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpNewsletterPlanTransactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpNewsletterPlanTransactions_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BcpNewsletterPlanTransactions_BcpNewsletterPlans_BcpNewsletterPlanId",
                        column: x => x.BcpNewsletterPlanId,
                        principalTable: "BcpNewsletterPlans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpNewsletterWallets",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    EmailQuotaBalance = table.Column<int>(type: "int", nullable: false),
                    ExpiryDate = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpNewsletterWallets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpNewsletterWallets_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpNotifications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    Title = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    Message = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ActionUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsRead = table.Column<bool>(type: "bit", nullable: false),
                    Module = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Icon = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Category = table.Column<int>(type: "int", nullable: false),
                    Priority = table.Column<int>(type: "int", nullable: false),
                    EventType = table.Column<int>(type: "int", nullable: true),
                    IsBroadcast = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpNotifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpNotifications_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "BcpPhoneBooks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpPhoneBooks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpPhoneBooks_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "BcpProductOrders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrderNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CustomerUserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    CustomerName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    CustomerEmail = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    CustomerPhone = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ShippingAddressLine1 = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ShippingAddressLine2 = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ShippingCity = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ShippingState = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ShippingCountry = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ShippingPostalCode = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Subtotal = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    DiscountAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    ShippingFee = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    TaxAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PaymentMethod = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PaymentReference = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PaymentStatus = table.Column<int>(type: "int", nullable: false),
                    OrderStatus = table.Column<int>(type: "int", nullable: false),
                    TrackingNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CourierName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AdminNotes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PaidAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    FulfilledAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpProductOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpProductOrders_AspNetUsers_CustomerUserId",
                        column: x => x.CustomerUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "BcpProjectTasks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BcpProjectId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BcpProjectSprintId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    AssignedToUserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    Title = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Type = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Priority = table.Column<int>(type: "int", nullable: false),
                    StoryPoints = table.Column<int>(type: "int", nullable: false),
                    DueDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpProjectTasks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpProjectTasks_AspNetUsers_AssignedToUserId",
                        column: x => x.AssignedToUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_BcpProjectTasks_BcpProjectSprints_BcpProjectSprintId",
                        column: x => x.BcpProjectSprintId,
                        principalTable: "BcpProjectSprints",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_BcpProjectTasks_BcpProjects_BcpProjectId",
                        column: x => x.BcpProjectId,
                        principalTable: "BcpProjects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpProjectUsers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BcpProjectId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    DateAdded = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Role = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpProjectUsers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpProjectUsers_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_BcpProjectUsers_BcpProjects_BcpProjectId",
                        column: x => x.BcpProjectId,
                        principalTable: "BcpProjects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpProposals",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    Title = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Address = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Note = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TypedProposal = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DateSubmitted = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DateApproved = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ExecutionDuration = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ProjectStartDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ProjectEndDate = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpProposals", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpProposals_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "BcpReportParticipants",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BcpReportSchemaId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserProfileId = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpReportParticipants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpReportParticipants_AspNetUsers_UserProfileId",
                        column: x => x.UserProfileId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BcpReportParticipants_BcpReportSchemas_BcpReportSchemaId",
                        column: x => x.BcpReportSchemaId,
                        principalTable: "BcpReportSchemas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpReportSubmissions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BcpReportSchemaId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserProfileId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TaskAssigned = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Achievements = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Challenges = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Impact = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PlansForNextPeriod = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AttachmentUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ManagerComment = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AdminComment = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PeriodDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    SubmittedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpReportSubmissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpReportSubmissions_AspNetUsers_UserProfileId",
                        column: x => x.UserProfileId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BcpReportSubmissions_BcpReportSchemas_BcpReportSchemaId",
                        column: x => x.BcpReportSchemaId,
                        principalTable: "BcpReportSchemas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpSmsCampaigns",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    SenderId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Subject = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Message = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CostIncurred = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalRecipients = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    ScheduledDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpSmsCampaigns", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpSmsCampaigns_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "BcpSmsQueue",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RelatedUserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    RecipientPhone = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Message = table.Column<string>(type: "nvarchar(480)", maxLength: 480, nullable: false),
                    Category = table.Column<int>(type: "int", nullable: false),
                    Priority = table.Column<int>(type: "int", nullable: false),
                    EventType = table.Column<int>(type: "int", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Retries = table.Column<int>(type: "int", nullable: false),
                    MaxRetries = table.Column<int>(type: "int", nullable: false),
                    LastError = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ScheduledAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    SentAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpSmsQueue", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpSmsQueue_AspNetUsers_RelatedUserId",
                        column: x => x.RelatedUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "BcpSmsTransactions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    TransactionType = table.Column<int>(type: "int", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Reference = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    PaymentProvider = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpSmsTransactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpSmsTransactions_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "BcpUserChatSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    DefaultPresence = table.Column<int>(type: "int", nullable: false),
                    AutoAwayMinutes = table.Column<int>(type: "int", nullable: false),
                    DefaultTone = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    DefaultVolume = table.Column<int>(type: "int", nullable: false),
                    GlobalMute = table.Column<bool>(type: "bit", nullable: false),
                    GlobalReadReceipts = table.Column<bool>(type: "bit", nullable: false),
                    GlobalTypingIndicator = table.Column<bool>(type: "bit", nullable: false),
                    GlobalLastSeen = table.Column<bool>(type: "bit", nullable: false),
                    AutoDownloadImages = table.Column<bool>(type: "bit", nullable: false),
                    AutoDownloadFiles = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpUserChatSettings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpUserChatSettings_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpUserDevices",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    DeviceName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    IpAddress = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    TrustToken = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    JwtId = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    IsTrusted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastUsedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsActiveSession = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpUserDevices", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpUserDevices_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpUserFeatureRoles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProfileId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    FeatureAreaKey = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ActionRole = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    AssignedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpUserFeatureRoles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpUserFeatureRoles_AspNetUsers_ProfileId",
                        column: x => x.ProfileId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpUserInvitations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Email = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Token = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RoleName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    BcpUserCategoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    InvitedByProfileId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsAccepted = table.Column<bool>(type: "bit", nullable: false),
                    AcceptedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpUserInvitations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpUserInvitations_AspNetUsers_InvitedByProfileId",
                        column: x => x.InvitedByProfileId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_BcpUserInvitations_BcpUserCategories_BcpUserCategoryId",
                        column: x => x.BcpUserCategoryId,
                        principalTable: "BcpUserCategories",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "BcpUserMfaBackupCodes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    HashedCode = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    IsUsed = table.Column<bool>(type: "bit", nullable: false),
                    UsedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpUserMfaBackupCodes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpUserMfaBackupCodes_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpUserNotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProfileId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsPrivate = table.Column<bool>(type: "bit", nullable: false),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpUserNotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpUserNotes_AspNetUsers_ProfileId",
                        column: x => x.ProfileId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpUserRecentVisits",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    ModuleFolder = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastVisitedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpUserRecentVisits", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpUserRecentVisits_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "BcpWallets",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    Balance = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    LastUpdated = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpWallets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpWallets_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "UserDeviceSessions",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ProfileId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    SessionKey = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DeviceType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DeviceName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    UserAgent = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IpAddress = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastActiveAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsRevoked = table.Column<bool>(type: "bit", nullable: false),
                    RevokedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserDeviceSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserDeviceSessions_AspNetUsers_ProfileId",
                        column: x => x.ProfileId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PageSections",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VideoUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    VideoKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ImageUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ImageKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SecondImageUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SecondImageKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    YoutubeUrlLink = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MiniTitle = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Qoute = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    FullDescription = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ButtonText = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ButtonLink = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DirectUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ShowInHome = table.Column<bool>(type: "bit", nullable: false),
                    DisableButton = table.Column<bool>(type: "bit", nullable: false),
                    Disable = table.Column<bool>(type: "bit", nullable: false),
                    FixedAfterFooter = table.Column<bool>(type: "bit", nullable: false),
                    HomePageSortOrder = table.Column<int>(type: "int", nullable: false),
                    HomeSortFrom = table.Column<int>(type: "int", nullable: false),
                    PageSortOrder = table.Column<int>(type: "int", nullable: false),
                    BlogSectionPosition = table.Column<int>(type: "int", nullable: false),
                    ShowSectionInBlog = table.Column<bool>(type: "bit", nullable: false),
                    WebPageId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    TemplateKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MasterTemplateId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    InstalledVersion = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsCustomized = table.Column<bool>(type: "bit", nullable: false),
                    HtmlTemplate = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CssStyles = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    JsScript = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CustomClass = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    BackgroundColor = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AddToRibon = table.Column<bool>(type: "bit", nullable: false),
                    RibonCustomDisplayTitle = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RibonSortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PageSections", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PageSections_WebPages_WebPageId",
                        column: x => x.WebPageId,
                        principalTable: "WebPages",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "WebPageViewLogs",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    WebPageId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    PageUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    PageTitle = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    DeviceType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Browser = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    UserAgent = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IpAddress = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    Referer = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    DurationSeconds = table.Column<int>(type: "int", nullable: false),
                    StatusCode = table.Column<int>(type: "int", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WebPageViewLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WebPageViewLogs_WebPages_WebPageId",
                        column: x => x.WebPageId,
                        principalTable: "WebPages",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "BcpEventTickets",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BcpTicketTypeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UserProfileId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    GuestName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    GuestEmail = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    GuestPhone = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    TransactionReference = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    QrCodeText = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    IsUsed = table.Column<bool>(type: "bit", nullable: false),
                    ScannedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ScannedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpEventTickets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpEventTickets_AspNetUsers_ScannedByUserId",
                        column: x => x.ScannedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_BcpEventTickets_AspNetUsers_UserProfileId",
                        column: x => x.UserProfileId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_BcpEventTickets_BcpTicketTypes_BcpTicketTypeId",
                        column: x => x.BcpTicketTypeId,
                        principalTable: "BcpTicketTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpUserVotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BcpVoteCategoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BcpCandidateId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EncryptCode = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DateCast = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpUserVotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpUserVotes_BcpCandidates_BcpCandidateId",
                        column: x => x.BcpCandidateId,
                        principalTable: "BcpCandidates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BcpUserVotes_BcpVoteCategories_BcpVoteCategoryId",
                        column: x => x.BcpVoteCategoryId,
                        principalTable: "BcpVoteCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "BcpMaintenanceLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BcpEquipmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Cost = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    PerformedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpMaintenanceLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpMaintenanceLogs_BcpEquipments_BcpEquipmentId",
                        column: x => x.BcpEquipmentId,
                        principalTable: "BcpEquipments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpChatAuditLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    MessageId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    Action = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    OriginalContent = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Details = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Timestamp = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpChatAuditLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpChatAuditLogs_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_BcpChatAuditLogs_BcpGroups_GroupId",
                        column: x => x.GroupId,
                        principalTable: "BcpGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "BcpGroupFiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BcpGroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UploadedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    FileName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    FileUrl = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FileSize = table.Column<long>(type: "bigint", nullable: false),
                    ContentType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    IsPinned = table.Column<bool>(type: "bit", nullable: false),
                    ThumbnailUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CloudinaryPublicId = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    UploadedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpGroupFiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpGroupFiles_AspNetUsers_UploadedByUserId",
                        column: x => x.UploadedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BcpGroupFiles_BcpGroups_BcpGroupId",
                        column: x => x.BcpGroupId,
                        principalTable: "BcpGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpGroupInvitations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    InvitedUserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    InvitedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpGroupInvitations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpGroupInvitations_AspNetUsers_InvitedByUserId",
                        column: x => x.InvitedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BcpGroupInvitations_AspNetUsers_InvitedUserId",
                        column: x => x.InvitedUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BcpGroupInvitations_BcpGroups_GroupId",
                        column: x => x.GroupId,
                        principalTable: "BcpGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpGroupMembers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BcpGroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserProfileId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    GroupRole = table.Column<int>(type: "int", nullable: false),
                    RolePosition = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    MembershipStatus = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsMuted = table.Column<bool>(type: "bit", nullable: false),
                    IsSuspended = table.Column<bool>(type: "bit", nullable: false),
                    LastReadMessageId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    NotificationTone = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    NotificationVolume = table.Column<int>(type: "int", nullable: false),
                    IsNotificationMuted = table.Column<bool>(type: "bit", nullable: false),
                    ShowMyReadReceipts = table.Column<bool>(type: "bit", nullable: false),
                    ShowMyTyping = table.Column<bool>(type: "bit", nullable: false),
                    ShowMyLastSeen = table.Column<bool>(type: "bit", nullable: false),
                    LastSeenAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PresenceStatus = table.Column<int>(type: "int", nullable: false),
                    DateJoined = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpGroupMembers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpGroupMembers_AspNetUsers_UserProfileId",
                        column: x => x.UserProfileId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BcpGroupMembers_BcpGroups_BcpGroupId",
                        column: x => x.BcpGroupId,
                        principalTable: "BcpGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpGroupPolls",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BcpGroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MessageId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Question = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    IsMultipleChoice = table.Column<bool>(type: "bit", nullable: false),
                    IsAnonymous = table.Column<bool>(type: "bit", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpGroupPolls", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpGroupPolls_AspNetUsers_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BcpGroupPolls_BcpGroups_BcpGroupId",
                        column: x => x.BcpGroupId,
                        principalTable: "BcpGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpNewsletterEmailLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EmailAddress = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Subject = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MailBody = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SentDatetime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ReceivedDatetime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CampaignId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    RetryCount = table.Column<int>(type: "int", nullable: false),
                    ErrorMessage = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpNewsletterEmailLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpNewsletterEmailLogs_BcpNewsletterCampaigns_CampaignId",
                        column: x => x.CampaignId,
                        principalTable: "BcpNewsletterCampaigns",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "BcpNewsletterRecipients",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BcpNewsletterCampaignId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EmailAddress = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DeliveryStatus = table.Column<int>(type: "int", nullable: false),
                    OpenedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    TrackingGuid = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpNewsletterRecipients", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpNewsletterRecipients_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BcpNewsletterRecipients_BcpNewsletterCampaigns_BcpNewsletterCampaignId",
                        column: x => x.BcpNewsletterCampaignId,
                        principalTable: "BcpNewsletterCampaigns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpNewsletterContacts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BcpNewsletterListId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Email = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DateAdded = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpNewsletterContacts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpNewsletterContacts_BcpNewsletterLists_BcpNewsletterListId",
                        column: x => x.BcpNewsletterListId,
                        principalTable: "BcpNewsletterLists",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpNewsletterWalletTransactions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BcpNewsletterWalletId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Amount = table.Column<int>(type: "int", nullable: false),
                    TransactionType = table.Column<int>(type: "int", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpNewsletterWalletTransactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpNewsletterWalletTransactions_BcpNewsletterWallets_BcpNewsletterWalletId",
                        column: x => x.BcpNewsletterWalletId,
                        principalTable: "BcpNewsletterWallets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpContacts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BcpPhoneBookId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PhoneNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpContacts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpContacts_BcpPhoneBooks_BcpPhoneBookId",
                        column: x => x.BcpPhoneBookId,
                        principalTable: "BcpPhoneBooks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpProductOrderItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BcpProductOrderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BcpProductId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProductTitle = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    ProductType = table.Column<int>(type: "int", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    TotalPrice = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    GeneratedLicenseKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DownloadAccessToken = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DownloadCount = table.Column<int>(type: "int", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpProductOrderItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpProductOrderItems_BcpProductOrders_BcpProductOrderId",
                        column: x => x.BcpProductOrderId,
                        principalTable: "BcpProductOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BcpProductOrderItems_BcpProducts_BcpProductId",
                        column: x => x.BcpProductId,
                        principalTable: "BcpProducts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpGrants",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BcpProposalId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Title = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    BcpDonorId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TotalAwardAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpGrants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpGrants_BcpDonors_BcpDonorId",
                        column: x => x.BcpDonorId,
                        principalTable: "BcpDonors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BcpGrants_BcpProposals_BcpProposalId",
                        column: x => x.BcpProposalId,
                        principalTable: "BcpProposals",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "BcpProposalFiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BcpProposalId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Url = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Key = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpProposalFiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpProposalFiles_BcpProposals_BcpProposalId",
                        column: x => x.BcpProposalId,
                        principalTable: "BcpProposals",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpProposalPhases",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BcpProposalId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReportSummary = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpProposalPhases", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpProposalPhases_BcpProposals_BcpProposalId",
                        column: x => x.BcpProposalId,
                        principalTable: "BcpProposals",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpReportTimeLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BcpReportSubmissionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StartTime = table.Column<TimeSpan>(type: "time", nullable: false),
                    EndTime = table.Column<TimeSpan>(type: "time", nullable: false),
                    ActivityDescription = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpReportTimeLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpReportTimeLogs_BcpReportSubmissions_BcpReportSubmissionId",
                        column: x => x.BcpReportSubmissionId,
                        principalTable: "BcpReportSubmissions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpSmsRecipients",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BcpSmsCampaignId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PhoneNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DeliveryStatus = table.Column<int>(type: "int", nullable: false),
                    Reference = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpSmsRecipients", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpSmsRecipients_BcpSmsCampaigns_BcpSmsCampaignId",
                        column: x => x.BcpSmsCampaignId,
                        principalTable: "BcpSmsCampaigns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpWalletTransactions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BcpWalletId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    TransactionType = table.Column<int>(type: "int", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Reference = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpWalletTransactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpWalletTransactions_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_BcpWalletTransactions_BcpWallets_BcpWalletId",
                        column: x => x.BcpWalletId,
                        principalTable: "BcpWallets",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "PageSectionLists",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VideoUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    VideoKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ImageUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ImageKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IconText = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MiniTitle = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MoreDescription = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ButtonText = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ButtonLink = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DirectUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Disable = table.Column<bool>(type: "bit", nullable: false),
                    PageSectionId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    AddToRibon = table.Column<bool>(type: "bit", nullable: false),
                    RibonCustomDisplayTitle = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RibonSortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PageSectionLists", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PageSectionLists_PageSections_PageSectionId",
                        column: x => x.PageSectionId,
                        principalTable: "PageSections",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "BcpDirectMessages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SenderUserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ReceiverUserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    GroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    MessageType = table.Column<int>(type: "int", nullable: false),
                    FileId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ReplyToMessageId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    IsRead = table.Column<bool>(type: "bit", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpDirectMessages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpDirectMessages_AspNetUsers_ReceiverUserId",
                        column: x => x.ReceiverUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BcpDirectMessages_AspNetUsers_SenderUserId",
                        column: x => x.SenderUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BcpDirectMessages_BcpDirectMessages_ReplyToMessageId",
                        column: x => x.ReplyToMessageId,
                        principalTable: "BcpDirectMessages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BcpDirectMessages_BcpGroupFiles_FileId",
                        column: x => x.FileId,
                        principalTable: "BcpGroupFiles",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_BcpDirectMessages_BcpGroups_GroupId",
                        column: x => x.GroupId,
                        principalTable: "BcpGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "BcpGroupPollOptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PollId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OptionText = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpGroupPollOptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpGroupPollOptions_BcpGroupPolls_PollId",
                        column: x => x.PollId,
                        principalTable: "BcpGroupPolls",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpGroupPosts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BcpGroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserProfileId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    MessageType = table.Column<int>(type: "int", nullable: false),
                    ReplyToMessageId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    FileId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    PollId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    IsPinned = table.Column<bool>(type: "bit", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    IsEdited = table.Column<bool>(type: "bit", nullable: false),
                    EditedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    MentionedUserIds = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    DeliveryStatus = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpGroupPosts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpGroupPosts_AspNetUsers_UserProfileId",
                        column: x => x.UserProfileId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BcpGroupPosts_BcpGroupFiles_FileId",
                        column: x => x.FileId,
                        principalTable: "BcpGroupFiles",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_BcpGroupPosts_BcpGroupPolls_PollId",
                        column: x => x.PollId,
                        principalTable: "BcpGroupPolls",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_BcpGroupPosts_BcpGroupPosts_ReplyToMessageId",
                        column: x => x.ReplyToMessageId,
                        principalTable: "BcpGroupPosts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BcpGroupPosts_BcpGroups_BcpGroupId",
                        column: x => x.BcpGroupId,
                        principalTable: "BcpGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpGrantMilestones",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BcpGrantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    ExpectedAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    AmountReceived = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    ExpectedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ReceivedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Note = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpGrantMilestones", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpGrantMilestones_BcpGrants_BcpGrantId",
                        column: x => x.BcpGrantId,
                        principalTable: "BcpGrants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpGroupPollVotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PollId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OptionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    VotedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpGroupPollVotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpGroupPollVotes_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BcpGroupPollVotes_BcpGroupPollOptions_OptionId",
                        column: x => x.OptionId,
                        principalTable: "BcpGroupPollOptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BcpGroupPollVotes_BcpGroupPolls_PollId",
                        column: x => x.PollId,
                        principalTable: "BcpGroupPolls",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "BcpBookmarkedMessages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    MessageId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BookmarkedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpBookmarkedMessages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpBookmarkedMessages_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BcpBookmarkedMessages_BcpGroupPosts_MessageId",
                        column: x => x.MessageId,
                        principalTable: "BcpGroupPosts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BcpBookmarkedMessages_BcpGroups_GroupId",
                        column: x => x.GroupId,
                        principalTable: "BcpGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "BcpMessageReadReceipts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MessageId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    DeliveredAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReadAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpMessageReadReceipts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpMessageReadReceipts_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BcpMessageReadReceipts_BcpGroupPosts_MessageId",
                        column: x => x.MessageId,
                        principalTable: "BcpGroupPosts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AspNetRoleClaims_RoleId",
                table: "AspNetRoleClaims",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "RoleNameIndex",
                table: "AspNetRoles",
                column: "NormalizedName",
                unique: true,
                filter: "[NormalizedName] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserClaims_UserId",
                table: "AspNetUserClaims",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserLogins_UserId",
                table: "AspNetUserLogins",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserRoles_RoleId",
                table: "AspNetUserRoles",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                table: "AspNetUsers",
                column: "NormalizedEmail");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_BcpUserCategoryId",
                table: "AspNetUsers",
                column: "BcpUserCategoryId");

            migrationBuilder.CreateIndex(
                name: "UserNameIndex",
                table: "AspNetUsers",
                column: "NormalizedUserName",
                unique: true,
                filter: "[NormalizedUserName] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_BcpAlumniPosts_UserProfileId",
                table: "BcpAlumniPosts",
                column: "UserProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpAlumniProfiles_UserProfileId",
                table: "BcpAlumniProfiles",
                column: "UserProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpBiographies_UserId",
                table: "BcpBiographies",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpBookmarkedMessages_GroupId",
                table: "BcpBookmarkedMessages",
                column: "GroupId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpBookmarkedMessages_MessageId",
                table: "BcpBookmarkedMessages",
                column: "MessageId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpBookmarkedMessages_UserId",
                table: "BcpBookmarkedMessages",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpCandidates_BcpVoteCategoryId",
                table: "BcpCandidates",
                column: "BcpVoteCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpCandidates_ProfileId",
                table: "BcpCandidates",
                column: "ProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpChatAuditLogs_GroupId",
                table: "BcpChatAuditLogs",
                column: "GroupId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpChatAuditLogs_UserId",
                table: "BcpChatAuditLogs",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpContacts_BcpPhoneBookId",
                table: "BcpContacts",
                column: "BcpPhoneBookId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpDirectMessages_FileId",
                table: "BcpDirectMessages",
                column: "FileId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpDirectMessages_GroupId",
                table: "BcpDirectMessages",
                column: "GroupId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpDirectMessages_ReceiverUserId",
                table: "BcpDirectMessages",
                column: "ReceiverUserId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpDirectMessages_ReplyToMessageId",
                table: "BcpDirectMessages",
                column: "ReplyToMessageId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpDirectMessages_SenderUserId",
                table: "BcpDirectMessages",
                column: "SenderUserId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpElectionVoters_BcpElectionId",
                table: "BcpElectionVoters",
                column: "BcpElectionId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpElectionVoters_UserId",
                table: "BcpElectionVoters",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpEmailQueue_RelatedUserId",
                table: "BcpEmailQueue",
                column: "RelatedUserId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpEquipments_AssignedToUserId",
                table: "BcpEquipments",
                column: "AssignedToUserId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpEquipments_BcpEquipmentCategoryId",
                table: "BcpEquipments",
                column: "BcpEquipmentCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpEvents_BcpFinanceCategoryId",
                table: "BcpEvents",
                column: "BcpFinanceCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpEventTickets_BcpTicketTypeId",
                table: "BcpEventTickets",
                column: "BcpTicketTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpEventTickets_ScannedByUserId",
                table: "BcpEventTickets",
                column: "ScannedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpEventTickets_UserProfileId",
                table: "BcpEventTickets",
                column: "UserProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpFeatureInvoices_BcpFeatureId",
                table: "BcpFeatureInvoices",
                column: "BcpFeatureId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpFinanceTransactions_BcpFinanceCategoryId",
                table: "BcpFinanceTransactions",
                column: "BcpFinanceCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpFinanceTransactions_UserProfileId",
                table: "BcpFinanceTransactions",
                column: "UserProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpFormResponses_BcpFormId",
                table: "BcpFormResponses",
                column: "BcpFormId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpFormResponses_UserProfileId",
                table: "BcpFormResponses",
                column: "UserProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpGrantMilestones_BcpGrantId",
                table: "BcpGrantMilestones",
                column: "BcpGrantId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpGrants_BcpDonorId",
                table: "BcpGrants",
                column: "BcpDonorId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpGrants_BcpProposalId",
                table: "BcpGrants",
                column: "BcpProposalId",
                unique: true,
                filter: "[BcpProposalId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_BcpGroupFiles_BcpGroupId",
                table: "BcpGroupFiles",
                column: "BcpGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpGroupFiles_UploadedByUserId",
                table: "BcpGroupFiles",
                column: "UploadedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpGroupInvitations_GroupId",
                table: "BcpGroupInvitations",
                column: "GroupId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpGroupInvitations_InvitedByUserId",
                table: "BcpGroupInvitations",
                column: "InvitedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpGroupInvitations_InvitedUserId",
                table: "BcpGroupInvitations",
                column: "InvitedUserId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpGroupMembers_BcpGroupId",
                table: "BcpGroupMembers",
                column: "BcpGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpGroupMembers_UserProfileId",
                table: "BcpGroupMembers",
                column: "UserProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpGroupPollOptions_PollId",
                table: "BcpGroupPollOptions",
                column: "PollId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpGroupPolls_BcpGroupId",
                table: "BcpGroupPolls",
                column: "BcpGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpGroupPolls_CreatedByUserId",
                table: "BcpGroupPolls",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpGroupPollVotes_OptionId",
                table: "BcpGroupPollVotes",
                column: "OptionId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpGroupPollVotes_PollId",
                table: "BcpGroupPollVotes",
                column: "PollId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpGroupPollVotes_UserId",
                table: "BcpGroupPollVotes",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpGroupPosts_BcpGroupId",
                table: "BcpGroupPosts",
                column: "BcpGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpGroupPosts_FileId",
                table: "BcpGroupPosts",
                column: "FileId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpGroupPosts_PollId",
                table: "BcpGroupPosts",
                column: "PollId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpGroupPosts_ReplyToMessageId",
                table: "BcpGroupPosts",
                column: "ReplyToMessageId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpGroupPosts_UserProfileId",
                table: "BcpGroupPosts",
                column: "UserProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpGroups_CreatedByUserId",
                table: "BcpGroups",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpJobApplicantDocuments_BcpJobApplicantId",
                table: "BcpJobApplicantDocuments",
                column: "BcpJobApplicantId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpJobApplicants_BcpApplicantAccountId",
                table: "BcpJobApplicants",
                column: "BcpApplicantAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpJobApplicants_BcpJobPostingId",
                table: "BcpJobApplicants",
                column: "BcpJobPostingId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpJobInterviews_BcpJobApplicantId",
                table: "BcpJobInterviews",
                column: "BcpJobApplicantId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpKpiUserScores_BcpKpiIndicatorId",
                table: "BcpKpiUserScores",
                column: "BcpKpiIndicatorId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpKpiUserScores_ProfileId",
                table: "BcpKpiUserScores",
                column: "ProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpLeaveRequests_ReviewedById",
                table: "BcpLeaveRequests",
                column: "ReviewedById");

            migrationBuilder.CreateIndex(
                name: "IX_BcpLeaveRequests_UserId",
                table: "BcpLeaveRequests",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpMaintenanceLogs_BcpEquipmentId",
                table: "BcpMaintenanceLogs",
                column: "BcpEquipmentId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpManualElements_BcpManualPageId",
                table: "BcpManualElements",
                column: "BcpManualPageId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpManualPages_BcpManualId",
                table: "BcpManualPages",
                column: "BcpManualId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpMarketingCampaigns_BcpProductId",
                table: "BcpMarketingCampaigns",
                column: "BcpProductId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpMessageReadReceipts_MessageId",
                table: "BcpMessageReadReceipts",
                column: "MessageId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpMessageReadReceipts_UserId",
                table: "BcpMessageReadReceipts",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpNewsletterCampaigns_UserId",
                table: "BcpNewsletterCampaigns",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpNewsletterContacts_BcpNewsletterListId",
                table: "BcpNewsletterContacts",
                column: "BcpNewsletterListId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpNewsletterEmailLogs_CampaignId",
                table: "BcpNewsletterEmailLogs",
                column: "CampaignId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpNewsletterLists_UserId",
                table: "BcpNewsletterLists",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpNewsletterPlanTransactions_BcpNewsletterPlanId",
                table: "BcpNewsletterPlanTransactions",
                column: "BcpNewsletterPlanId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpNewsletterPlanTransactions_UserId",
                table: "BcpNewsletterPlanTransactions",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpNewsletterRecipients_BcpNewsletterCampaignId",
                table: "BcpNewsletterRecipients",
                column: "BcpNewsletterCampaignId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpNewsletterRecipients_UserId",
                table: "BcpNewsletterRecipients",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpNewsletterWallets_UserId",
                table: "BcpNewsletterWallets",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpNewsletterWalletTransactions_BcpNewsletterWalletId",
                table: "BcpNewsletterWalletTransactions",
                column: "BcpNewsletterWalletId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpNotifications_UserId",
                table: "BcpNotifications",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpPhoneBooks_UserId",
                table: "BcpPhoneBooks",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpProductCategories_ParentId",
                table: "BcpProductCategories",
                column: "ParentId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpProductOrderItems_BcpProductId",
                table: "BcpProductOrderItems",
                column: "BcpProductId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpProductOrderItems_BcpProductOrderId",
                table: "BcpProductOrderItems",
                column: "BcpProductOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpProductOrders_CustomerUserId",
                table: "BcpProductOrders",
                column: "CustomerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpProducts_BcpProductCategoryId",
                table: "BcpProducts",
                column: "BcpProductCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpProjectSprints_BcpProjectId",
                table: "BcpProjectSprints",
                column: "BcpProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpProjectTasks_AssignedToUserId",
                table: "BcpProjectTasks",
                column: "AssignedToUserId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpProjectTasks_BcpProjectId",
                table: "BcpProjectTasks",
                column: "BcpProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpProjectTasks_BcpProjectSprintId",
                table: "BcpProjectTasks",
                column: "BcpProjectSprintId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpProjectUsers_BcpProjectId",
                table: "BcpProjectUsers",
                column: "BcpProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpProjectUsers_UserId",
                table: "BcpProjectUsers",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpProposalFiles_BcpProposalId",
                table: "BcpProposalFiles",
                column: "BcpProposalId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpProposalPhases_BcpProposalId",
                table: "BcpProposalPhases",
                column: "BcpProposalId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpProposals_UserId",
                table: "BcpProposals",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpReportParticipants_BcpReportSchemaId",
                table: "BcpReportParticipants",
                column: "BcpReportSchemaId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpReportParticipants_UserProfileId",
                table: "BcpReportParticipants",
                column: "UserProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpReportSubmissions_BcpReportSchemaId",
                table: "BcpReportSubmissions",
                column: "BcpReportSchemaId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpReportSubmissions_UserProfileId",
                table: "BcpReportSubmissions",
                column: "UserProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpReportTimeLogs_BcpReportSubmissionId",
                table: "BcpReportTimeLogs",
                column: "BcpReportSubmissionId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpSmsCampaigns_UserId",
                table: "BcpSmsCampaigns",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpSmsQueue_RelatedUserId",
                table: "BcpSmsQueue",
                column: "RelatedUserId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpSmsRecipients_BcpSmsCampaignId",
                table: "BcpSmsRecipients",
                column: "BcpSmsCampaignId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpSmsTransactions_UserId",
                table: "BcpSmsTransactions",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpTicketTypes_BcpEventId",
                table: "BcpTicketTypes",
                column: "BcpEventId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpUserChatSettings_UserId",
                table: "BcpUserChatSettings",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpUserDevices_UserId",
                table: "BcpUserDevices",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpUserFeatureRoles_ProfileId",
                table: "BcpUserFeatureRoles",
                column: "ProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpUserInvitations_BcpUserCategoryId",
                table: "BcpUserInvitations",
                column: "BcpUserCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpUserInvitations_InvitedByProfileId",
                table: "BcpUserInvitations",
                column: "InvitedByProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpUserMfaBackupCodes_UserId",
                table: "BcpUserMfaBackupCodes",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpUserNotes_ProfileId",
                table: "BcpUserNotes",
                column: "ProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpUserRecentVisits_UserId",
                table: "BcpUserRecentVisits",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpUserVotes_BcpCandidateId",
                table: "BcpUserVotes",
                column: "BcpCandidateId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpUserVotes_BcpVoteCategoryId",
                table: "BcpUserVotes",
                column: "BcpVoteCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpVoteCategories_BcpElectionId",
                table: "BcpVoteCategories",
                column: "BcpElectionId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpWallets_UserId",
                table: "BcpWallets",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpWalletTransactions_BcpWalletId",
                table: "BcpWalletTransactions",
                column: "BcpWalletId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpWalletTransactions_UserId",
                table: "BcpWalletTransactions",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_BlogCategories_ParentId",
                table: "BlogCategories",
                column: "ParentId");

            migrationBuilder.CreateIndex(
                name: "IX_Blogs_BlogCategoryId",
                table: "Blogs",
                column: "BlogCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_ContactUs_ContactUsCategoryId",
                table: "ContactUs",
                column: "ContactUsCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_FAQs_FAQCategoryId",
                table: "FAQs",
                column: "FAQCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_PageCategories_ParentId",
                table: "PageCategories",
                column: "ParentId");

            migrationBuilder.CreateIndex(
                name: "IX_PageSectionLists_PageSectionId",
                table: "PageSectionLists",
                column: "PageSectionId");

            migrationBuilder.CreateIndex(
                name: "IX_PageSections_WebPageId",
                table: "PageSections",
                column: "WebPageId");

            migrationBuilder.CreateIndex(
                name: "IX_TemplateTypes_TemplateCategoryId",
                table: "TemplateTypes",
                column: "TemplateCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_UserDeviceSessions_ProfileId",
                table: "UserDeviceSessions",
                column: "ProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_WebPages_PageCategoryId",
                table: "WebPages",
                column: "PageCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_WebPageViewLogs_WebPageId",
                table: "WebPageViewLogs",
                column: "WebPageId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AspNetRoleClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserLogins");

            migrationBuilder.DropTable(
                name: "AspNetUserRoles");

            migrationBuilder.DropTable(
                name: "AspNetUserTokens");

            migrationBuilder.DropTable(
                name: "BcpActivityLogs");

            migrationBuilder.DropTable(
                name: "BcpAlumniPosts");

            migrationBuilder.DropTable(
                name: "BcpAlumniProfiles");

            migrationBuilder.DropTable(
                name: "BcpBiographies");

            migrationBuilder.DropTable(
                name: "BcpBookmarkedMessages");

            migrationBuilder.DropTable(
                name: "BcpChatAuditLogs");

            migrationBuilder.DropTable(
                name: "BcpContacts");

            migrationBuilder.DropTable(
                name: "BcpDirectMessages");

            migrationBuilder.DropTable(
                name: "BcpElectionVoters");

            migrationBuilder.DropTable(
                name: "BcpEmailQueue");

            migrationBuilder.DropTable(
                name: "BcpEventTickets");

            migrationBuilder.DropTable(
                name: "BcpFeatureInvoices");

            migrationBuilder.DropTable(
                name: "BcpFinanceTransactions");

            migrationBuilder.DropTable(
                name: "BcpFormResponses");

            migrationBuilder.DropTable(
                name: "BcpGrantMilestones");

            migrationBuilder.DropTable(
                name: "BcpGroupInvitations");

            migrationBuilder.DropTable(
                name: "BcpGroupMembers");

            migrationBuilder.DropTable(
                name: "BcpGroupPollVotes");

            migrationBuilder.DropTable(
                name: "BcpJobApplicantDocuments");

            migrationBuilder.DropTable(
                name: "BcpJobInterviews");

            migrationBuilder.DropTable(
                name: "BcpKpiPeriods");

            migrationBuilder.DropTable(
                name: "BcpKpiUserScores");

            migrationBuilder.DropTable(
                name: "BcpLeaveRequests");

            migrationBuilder.DropTable(
                name: "BcpLoginAuditLogs");

            migrationBuilder.DropTable(
                name: "BcpMaintenanceLogs");

            migrationBuilder.DropTable(
                name: "BcpManualElements");

            migrationBuilder.DropTable(
                name: "BcpMarketingCampaigns");

            migrationBuilder.DropTable(
                name: "BcpMessageReadReceipts");

            migrationBuilder.DropTable(
                name: "BcpMessageTemplates");

            migrationBuilder.DropTable(
                name: "BcpNewsletterContacts");

            migrationBuilder.DropTable(
                name: "BcpNewsletterEmailLogs");

            migrationBuilder.DropTable(
                name: "BcpNewsletterPlanTransactions");

            migrationBuilder.DropTable(
                name: "BcpNewsletterRecipients");

            migrationBuilder.DropTable(
                name: "BcpNewsletterWalletTransactions");

            migrationBuilder.DropTable(
                name: "BcpNotifications");

            migrationBuilder.DropTable(
                name: "BcpProductOrderItems");

            migrationBuilder.DropTable(
                name: "BcpProjectTasks");

            migrationBuilder.DropTable(
                name: "BcpProjectUsers");

            migrationBuilder.DropTable(
                name: "BcpProposalFiles");

            migrationBuilder.DropTable(
                name: "BcpProposalPhases");

            migrationBuilder.DropTable(
                name: "BcpReportParticipants");

            migrationBuilder.DropTable(
                name: "BcpReportTimeLogs");

            migrationBuilder.DropTable(
                name: "BcpScheduledJobQueues");

            migrationBuilder.DropTable(
                name: "BcpSettings");

            migrationBuilder.DropTable(
                name: "BcpSmsQueue");

            migrationBuilder.DropTable(
                name: "BcpSmsRecipients");

            migrationBuilder.DropTable(
                name: "BcpSmsSenderIds");

            migrationBuilder.DropTable(
                name: "BcpSmsTransactions");

            migrationBuilder.DropTable(
                name: "BcpUserChatSettings");

            migrationBuilder.DropTable(
                name: "BcpUserDevices");

            migrationBuilder.DropTable(
                name: "BcpUserFeatureRoles");

            migrationBuilder.DropTable(
                name: "BcpUserInvitations");

            migrationBuilder.DropTable(
                name: "BcpUserMfaBackupCodes");

            migrationBuilder.DropTable(
                name: "BcpUserNotes");

            migrationBuilder.DropTable(
                name: "BcpUserRecentVisits");

            migrationBuilder.DropTable(
                name: "BcpUserVotes");

            migrationBuilder.DropTable(
                name: "BcpWalletTransactions");

            migrationBuilder.DropTable(
                name: "BcpWidgets");

            migrationBuilder.DropTable(
                name: "BcpWizardSteps");

            migrationBuilder.DropTable(
                name: "Blogs");

            migrationBuilder.DropTable(
                name: "ConfigSettings");

            migrationBuilder.DropTable(
                name: "ContactUs");

            migrationBuilder.DropTable(
                name: "FAQs");

            migrationBuilder.DropTable(
                name: "MailingSystems");

            migrationBuilder.DropTable(
                name: "ManagementSettings");

            migrationBuilder.DropTable(
                name: "NewsLetter");

            migrationBuilder.DropTable(
                name: "PageSectionLists");

            migrationBuilder.DropTable(
                name: "PostModal");

            migrationBuilder.DropTable(
                name: "Sliders");

            migrationBuilder.DropTable(
                name: "TemplateTypes");

            migrationBuilder.DropTable(
                name: "TenantInstalledTemplates");

            migrationBuilder.DropTable(
                name: "UserDeviceSessions");

            migrationBuilder.DropTable(
                name: "WebPageViewLogs");

            migrationBuilder.DropTable(
                name: "AspNetRoles");

            migrationBuilder.DropTable(
                name: "BcpPhoneBooks");

            migrationBuilder.DropTable(
                name: "BcpTicketTypes");

            migrationBuilder.DropTable(
                name: "BcpFeatures");

            migrationBuilder.DropTable(
                name: "BcpForms");

            migrationBuilder.DropTable(
                name: "BcpGrants");

            migrationBuilder.DropTable(
                name: "BcpGroupPollOptions");

            migrationBuilder.DropTable(
                name: "BcpJobApplicants");

            migrationBuilder.DropTable(
                name: "BcpKpiIndicators");

            migrationBuilder.DropTable(
                name: "BcpEquipments");

            migrationBuilder.DropTable(
                name: "BcpManualPages");

            migrationBuilder.DropTable(
                name: "BcpGroupPosts");

            migrationBuilder.DropTable(
                name: "BcpNewsletterLists");

            migrationBuilder.DropTable(
                name: "BcpNewsletterPlans");

            migrationBuilder.DropTable(
                name: "BcpNewsletterCampaigns");

            migrationBuilder.DropTable(
                name: "BcpNewsletterWallets");

            migrationBuilder.DropTable(
                name: "BcpProductOrders");

            migrationBuilder.DropTable(
                name: "BcpProducts");

            migrationBuilder.DropTable(
                name: "BcpProjectSprints");

            migrationBuilder.DropTable(
                name: "BcpReportSubmissions");

            migrationBuilder.DropTable(
                name: "BcpSmsCampaigns");

            migrationBuilder.DropTable(
                name: "BcpCandidates");

            migrationBuilder.DropTable(
                name: "BcpWallets");

            migrationBuilder.DropTable(
                name: "BlogCategories");

            migrationBuilder.DropTable(
                name: "ContactUsCategories");

            migrationBuilder.DropTable(
                name: "FAQCategories");

            migrationBuilder.DropTable(
                name: "PageSections");

            migrationBuilder.DropTable(
                name: "TemplateCategories");

            migrationBuilder.DropTable(
                name: "BcpEvents");

            migrationBuilder.DropTable(
                name: "BcpDonors");

            migrationBuilder.DropTable(
                name: "BcpProposals");

            migrationBuilder.DropTable(
                name: "BcpApplicantAccounts");

            migrationBuilder.DropTable(
                name: "BcpJobPostings");

            migrationBuilder.DropTable(
                name: "BcpEquipmentCategories");

            migrationBuilder.DropTable(
                name: "BcpManuals");

            migrationBuilder.DropTable(
                name: "BcpGroupFiles");

            migrationBuilder.DropTable(
                name: "BcpGroupPolls");

            migrationBuilder.DropTable(
                name: "BcpProductCategories");

            migrationBuilder.DropTable(
                name: "BcpProjects");

            migrationBuilder.DropTable(
                name: "BcpReportSchemas");

            migrationBuilder.DropTable(
                name: "BcpVoteCategories");

            migrationBuilder.DropTable(
                name: "WebPages");

            migrationBuilder.DropTable(
                name: "BcpFinanceCategories");

            migrationBuilder.DropTable(
                name: "BcpGroups");

            migrationBuilder.DropTable(
                name: "BcpElections");

            migrationBuilder.DropTable(
                name: "PageCategories");

            migrationBuilder.DropTable(
                name: "AspNetUsers");

            migrationBuilder.DropTable(
                name: "BcpUserCategories");
        }
    }
}
