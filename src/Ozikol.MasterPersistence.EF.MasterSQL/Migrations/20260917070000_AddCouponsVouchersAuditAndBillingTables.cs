using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ozikol.MasterPersistence.EF.MasterSQL.Migrations
{
    /// <inheritdoc />
    public partial class AddCouponsVouchersAuditAndBillingTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Add extra columns to MasterTenantCatalogs if not existing
            migrationBuilder.AddColumn<string>(
                name: "LastAccessedFromIp",
                table: "MasterTenantCatalogs",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ActiveCouponCode",
                table: "MasterTenantCatalogs",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CouponDiscountPercent",
                table: "MasterTenantCatalogs",
                type: "decimal(5,2)",
                nullable: true);

            // 2. Create MasterCoupons Table
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
                    CreatedBy = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterCoupons", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MasterCoupons_MasterFeatureCatalogs_SpecificFeatureId",
                        column: x => x.SpecificFeatureId,
                        principalTable: "MasterFeatureCatalogs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            // 3. Create MasterCouponRedemptions Table
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
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_MasterCouponRedemptions_MasterTenantCatalogs_MasterTenantCatalogId",
                        column: x => x.MasterTenantCatalogId,
                        principalTable: "MasterTenantCatalogs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // 4. Create MasterVoucherApplications Table
            migrationBuilder.CreateTable(
                name: "MasterVoucherApplications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReferenceNumber = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    FullName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    WorkEmail = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    OrganizationName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    PhoneNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    WorkspaceSlug = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    TwitterHandle = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    LinkedInProfile = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    YouTubeHandle = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    FacebookProfile = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    InstagramHandle = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    SnapchatHandle = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Remarks = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    IsNewsletterSubscribed = table.Column<bool>(type: "bit", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    IssuedCouponCode = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    ReviewedBy = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    ReviewedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RejectionReason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterVoucherApplications", x => x.Id);
                });

            // 5. Create MasterAuditLogs Table
            migrationBuilder.CreateTable(
                name: "MasterAuditLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: true),
                    UserEmail = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    UserName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    Action = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EntityType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EntityId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    OldValuesJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NewValuesJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IpAddress = table.Column<string>(type: "nvarchar(45)", maxLength: 45, nullable: true),
                    UserAgent = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterAuditLogs", x => x.Id);
                });

            // 6. Create MasterBillingTransactions Table
            migrationBuilder.CreateTable(
                name: "MasterBillingTransactions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MasterTenantCatalogId = table.Column<int>(type: "int", nullable: false),
                    MasterTenantFeatureSubscriptionId = table.Column<int>(type: "int", nullable: true),
                    InvoiceNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    TransactionReference = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    PaymentProvider = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    CurrencyCode = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    BillingPeriodStartUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    BillingPeriodEndUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PaidAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
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

            // ── Create Indexes ──
            migrationBuilder.CreateIndex(
                name: "IX_MasterCoupons_Code",
                table: "MasterCoupons",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MasterCoupons_SpecificFeatureId",
                table: "MasterCoupons",
                column: "SpecificFeatureId");

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
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "MasterBillingTransactions");
            migrationBuilder.DropTable(name: "MasterAuditLogs");
            migrationBuilder.DropTable(name: "MasterVoucherApplications");
            migrationBuilder.DropTable(name: "MasterCouponRedemptions");
            migrationBuilder.DropTable(name: "MasterCoupons");

            migrationBuilder.DropColumn(name: "CouponDiscountPercent", table: "MasterTenantCatalogs");
            migrationBuilder.DropColumn(name: "ActiveCouponCode", table: "MasterTenantCatalogs");
            migrationBuilder.DropColumn(name: "LastAccessedFromIp", table: "MasterTenantCatalogs");
        }
    }
}
