using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ozikol.MasterPersistence.EF.MasterSQL.Migrations
{
    /// <inheritdoc />
    public partial class AddCentralPlatformServicesAndSecrets : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AiGatewayUrl",
                table: "MasterPlatformSettings",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmailFromName",
                table: "MasterPlatformSettings",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: false,
                defaultValue: "Ozikol Cloud Security");

            migrationBuilder.AddColumn<string>(
                name: "EmailProvider",
                table: "MasterPlatformSettings",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "Postmark");

            migrationBuilder.AddColumn<string>(
                name: "GoogleReCaptchaSecretKey",
                table: "MasterPlatformSettings",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GoogleReCaptchaSiteKey",
                table: "MasterPlatformSettings",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HtmlExtractorApiUrl",
                table: "MasterPlatformSettings",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OneSignalRestApiKey",
                table: "MasterPlatformSettings",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PostmarkDefaultFrom",
                table: "MasterPlatformSettings",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PostmarkServerToken",
                table: "MasterPlatformSettings",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AiGatewayUrl",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "EmailFromName",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "EmailProvider",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "GoogleReCaptchaSecretKey",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "GoogleReCaptchaSiteKey",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "HtmlExtractorApiUrl",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "OneSignalRestApiKey",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "PostmarkDefaultFrom",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "PostmarkServerToken",
                table: "MasterPlatformSettings");
        }
    }
}
