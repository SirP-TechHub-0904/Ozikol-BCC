using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ozikol.MasterPersistence.EF.MasterSQL.Migrations
{
    /// <inheritdoc />
    public partial class AddMailcowAndCloudflareDnsSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CloudflareDnsApiToken",
                table: "MasterPlatformSettings",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CloudflareZoneId",
                table: "MasterPlatformSettings",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MailcowApiKey",
                table: "MasterPlatformSettings",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MailcowApiUrl",
                table: "MasterPlatformSettings",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MailcowSmtpHost",
                table: "MasterPlatformSettings",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CloudflareDnsApiToken",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "CloudflareZoneId",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "MailcowApiKey",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "MailcowApiUrl",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "MailcowSmtpHost",
                table: "MasterPlatformSettings");
        }
    }
}
