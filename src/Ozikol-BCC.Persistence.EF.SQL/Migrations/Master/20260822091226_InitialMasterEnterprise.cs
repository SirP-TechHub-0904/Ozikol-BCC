using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace OzikolBCC.Persistence.EF.SQL.Migrations.Master
{
    /// <inheritdoc />
    public partial class InitialMasterEnterprise : Migration
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
                name: "CentralUsers",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    FirstName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Department = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastLoginUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
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
                });

            migrationBuilder.CreateTable(
                name: "MasterAffiliatePartners",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PartnerCode = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    FullName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Email = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    PhoneNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    WebsiteOrChannel = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CommissionRatePercentage = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: false),
                    TotalEarned = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    PendingBalance = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    PaidBalance = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ApprovedUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PayoutDetailsJson = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterAffiliatePartners", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MasterAffiliateReferrals",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AffiliatePartnerId = table.Column<int>(type: "int", nullable: false),
                    ReferredTenantKey = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ReferredOrganizationName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SubscriptionAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    CommissionEarned = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    CommissionStatus = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PaidUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterAffiliateReferrals", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MasterEmailLogs",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RecipientEmail = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Subject = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    BodyHtml = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Provider = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    SentAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ErrorMessage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MetadataJson = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterEmailLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MasterMarketplaceCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CategoryKey = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Icon = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterMarketplaceCategories", x => x.Id);
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
                    UpdatedUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterTenantCatalogs", x => x.Id);
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

            migrationBuilder.InsertData(
                table: "CentralRoles",
                columns: new[] { "Id", "ConcurrencyStamp", "CreatedUtc", "Description", "Name", "NormalizedName" },
                values: new object[,]
                {
                    { "role-admin-000000000002", "stamp-role-admin", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Tenant workspace governance, subscription status, support", "Admin", "ADMIN" },
                    { "role-referralmanager-000004", "stamp-role-referralmanager", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Affiliate partner network, commission tiers, payout tracking", "ReferralManager", "REFERRALMANAGER" },
                    { "role-superadmin-000000000001", "stamp-role-superadmin", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Full system governance, database fleet migrations, operator management", "SuperAdmin", "SUPERADMIN" },
                    { "role-templatemanager-000003", "stamp-role-templatemanager", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Marketplace templates, layout blueprints, review moderations", "TemplateManager", "TEMPLATEMANAGER" }
                });

            migrationBuilder.InsertData(
                table: "CentralUsers",
                columns: new[] { "Id", "AccessFailedCount", "ConcurrencyStamp", "CreatedUtc", "Department", "Email", "EmailConfirmed", "FirstName", "IsActive", "LastLoginUtc", "LastName", "LockoutEnabled", "LockoutEnd", "NormalizedEmail", "NormalizedUserName", "PasswordHash", "PhoneNumber", "PhoneNumberConfirmed", "SecurityStamp", "TwoFactorEnabled", "UserName" },
                values: new object[] { "user-superadmin-000000000001", 0, "concurrency-superadmin-0001", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Global Architecture & DevOps", "superadmin@ozikol.cloud", true, "Ozikol", true, null, "SuperAdmin", false, null, "SUPERADMIN@OZIKOL.CLOUD", "SUPERADMIN@OZIKOL.CLOUD", "AQAAAAIAAYagAAAAECWLTHWTpwjjiizONstAH/UwsUN2ELuSqWcGxybEMGcdq6dEQhZyVY+2A2JHr/pPVw==", null, false, "sec-stamp-superadmin-0001", false, "superadmin@ozikol.cloud" });

            migrationBuilder.InsertData(
                table: "CentralUserRoles",
                columns: new[] { "RoleId", "UserId" },
                values: new object[] { "role-superadmin-000000000001", "user-superadmin-000000000001" });

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
                name: "IX_MasterTenantCatalogs_CustomDomain",
                table: "MasterTenantCatalogs",
                column: "CustomDomain");

            migrationBuilder.CreateIndex(
                name: "IX_MasterTenantCatalogs_IsActive",
                table: "MasterTenantCatalogs",
                column: "IsActive");

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
                name: "MasterAffiliatePartners");

            migrationBuilder.DropTable(
                name: "MasterAffiliateReferrals");

            migrationBuilder.DropTable(
                name: "MasterEmailLogs");

            migrationBuilder.DropTable(
                name: "MasterMarketplaceTemplates");

            migrationBuilder.DropTable(
                name: "MasterTenantCatalogs");

            migrationBuilder.DropTable(
                name: "CentralRoles");

            migrationBuilder.DropTable(
                name: "CentralUsers");

            migrationBuilder.DropTable(
                name: "MasterMarketplaceCategories");
        }
    }
}
