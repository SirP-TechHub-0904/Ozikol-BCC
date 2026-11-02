using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ozikol.MasterPersistence.EF.MasterSQL.Migrations
{
    /// <inheritdoc />
    public partial class AddClientIntegrationKeysToMasterPlatformSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CloudflareTurnstileSiteKey",
                table: "MasterPlatformSettings",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsMaintenanceMode",
                table: "MasterPlatformSettings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "MaintenanceMessage",
                table: "MasterPlatformSettings",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MinimumAppVersion",
                table: "MasterPlatformSettings",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "OneSignalAppId",
                table: "MasterPlatformSettings",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SentryDsn",
                table: "MasterPlatformSettings",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CloudflareTurnstileSiteKey",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "IsMaintenanceMode",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "MaintenanceMessage",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "MinimumAppVersion",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "OneSignalAppId",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "SentryDsn",
                table: "MasterPlatformSettings");
        }
    }
}
