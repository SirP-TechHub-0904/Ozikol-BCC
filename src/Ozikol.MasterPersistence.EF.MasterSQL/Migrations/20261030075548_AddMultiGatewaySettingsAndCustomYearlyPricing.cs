using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ozikol.MasterPersistence.EF.MasterSQL.Migrations
{
    /// <inheritdoc />
    public partial class AddMultiGatewaySettingsAndCustomYearlyPricing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "CustomYearlyPriceOverride",
                table: "MasterTenantFeatureSubscriptions",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BankDepositAccountName",
                table: "MasterPlatformSettings",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BankDepositAccountNumber",
                table: "MasterPlatformSettings",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BankDepositBankName",
                table: "MasterPlatformSettings",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BankDepositInstructions",
                table: "MasterPlatformSettings",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BankDepositSortCodeOrSwift",
                table: "MasterPlatformSettings",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "EnableBankDeposit",
                table: "MasterPlatformSettings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "EnableFlutterwave",
                table: "MasterPlatformSettings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "EnableStripe",
                table: "MasterPlatformSettings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "FlutterwavePublicKey",
                table: "MasterPlatformSettings",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FlutterwaveSecretKey",
                table: "MasterPlatformSettings",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FlutterwaveWebhookSecret",
                table: "MasterPlatformSettings",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StripePublishableKey",
                table: "MasterPlatformSettings",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StripeSecretKey",
                table: "MasterPlatformSettings",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StripeWebhookSecret",
                table: "MasterPlatformSettings",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LineItemsJson",
                table: "MasterBillingTransactions",
                type: "nvarchar(4000)",
                maxLength: 4000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentProofRef",
                table: "MasterBillingTransactions",
                type: "nvarchar(250)",
                maxLength: 250,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CustomYearlyPriceOverride",
                table: "MasterTenantFeatureSubscriptions");

            migrationBuilder.DropColumn(
                name: "BankDepositAccountName",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "BankDepositAccountNumber",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "BankDepositBankName",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "BankDepositInstructions",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "BankDepositSortCodeOrSwift",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "EnableBankDeposit",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "EnableFlutterwave",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "EnableStripe",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "FlutterwavePublicKey",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "FlutterwaveSecretKey",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "FlutterwaveWebhookSecret",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "StripePublishableKey",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "StripeSecretKey",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "StripeWebhookSecret",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "LineItemsJson",
                table: "MasterBillingTransactions");

            migrationBuilder.DropColumn(
                name: "PaymentProofRef",
                table: "MasterBillingTransactions");
        }
    }
}
