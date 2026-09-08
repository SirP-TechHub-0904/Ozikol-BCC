using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ozikol.MasterPersistence.EF.MasterSQL.Migrations
{
    /// <inheritdoc />
    public partial class AddAdminFoundationTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "AffiliatePartnerId",
                table: "CentralUsers",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AvatarUrl",
                table: "CentralUsers",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatorApplicationId",
                table: "CentralUsers",
                type: "uniqueidentifier",
                nullable: true);

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

            migrationBuilder.CreateIndex(
                name: "IX_CentralUsers_AffiliatePartnerId",
                table: "CentralUsers",
                column: "AffiliatePartnerId");

            migrationBuilder.CreateIndex(
                name: "IX_CentralUsers_CreatorApplicationId",
                table: "CentralUsers",
                column: "CreatorApplicationId");

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

            migrationBuilder.AddForeignKey(
                name: "FK_CentralUsers_MasterAffiliatePartners_AffiliatePartnerId",
                table: "CentralUsers",
                column: "AffiliatePartnerId",
                principalTable: "MasterAffiliatePartners",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_CentralUsers_MasterCreatorApplications_CreatorApplicationId",
                table: "CentralUsers",
                column: "CreatorApplicationId",
                principalTable: "MasterCreatorApplications",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CentralUsers_MasterAffiliatePartners_AffiliatePartnerId",
                table: "CentralUsers");

            migrationBuilder.DropForeignKey(
                name: "FK_CentralUsers_MasterCreatorApplications_CreatorApplicationId",
                table: "CentralUsers");

            migrationBuilder.DropTable(
                name: "MasterAuditLogs");

            migrationBuilder.DropTable(
                name: "MasterBillingTransactions");

            migrationBuilder.DropIndex(
                name: "IX_CentralUsers_AffiliatePartnerId",
                table: "CentralUsers");

            migrationBuilder.DropIndex(
                name: "IX_CentralUsers_CreatorApplicationId",
                table: "CentralUsers");

            migrationBuilder.DropColumn(
                name: "AffiliatePartnerId",
                table: "CentralUsers");

            migrationBuilder.DropColumn(
                name: "AvatarUrl",
                table: "CentralUsers");

            migrationBuilder.DropColumn(
                name: "CreatorApplicationId",
                table: "CentralUsers");
        }
    }
}
