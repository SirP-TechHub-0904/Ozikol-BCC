using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ozikol.MasterPersistence.EF.MasterSQL.Migrations
{
    /// <inheritdoc />
    public partial class AddCentralPaystackSettingsAndInvoiceFeatureCodes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "EnablePaystack",
                table: "MasterPlatformSettings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "PaystackPublicKey",
                table: "MasterPlatformSettings",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaystackSecretKey",
                table: "MasterPlatformSettings",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaystackWebhookSecret",
                table: "MasterPlatformSettings",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BillingCadence",
                table: "MasterBillingTransactions",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FeatureCodesCsv",
                table: "MasterBillingTransactions",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.InsertData(
                table: "MasterFeatureSuites",
                columns: new[] { "Id", "CreatedUtc", "Description", "Icon", "IsActive", "IsPublished", "MenuTitle", "Name", "SortOrder", "SuiteCode", "SuiteLetter" },
                values: new object[] { new Guid("11111111-0011-0000-0000-000000000011"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Desktop application workspace and workplace management suite.", "desktop_windows", true, true, "Workspace", "Workspace", 11, "suite-workspace", "K" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "MasterFeatureSuites",
                keyColumn: "Id",
                keyValue: new Guid("11111111-0011-0000-0000-000000000011"));

            migrationBuilder.DropColumn(
                name: "EnablePaystack",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "PaystackPublicKey",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "PaystackSecretKey",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "PaystackWebhookSecret",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "BillingCadence",
                table: "MasterBillingTransactions");

            migrationBuilder.DropColumn(
                name: "FeatureCodesCsv",
                table: "MasterBillingTransactions");
        }
    }
}
