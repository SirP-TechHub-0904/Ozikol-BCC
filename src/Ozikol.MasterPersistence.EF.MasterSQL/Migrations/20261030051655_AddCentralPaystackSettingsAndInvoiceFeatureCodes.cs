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
                defaultValue: true);

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
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
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
