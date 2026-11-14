using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ozikol.MasterPersistence.EF.MasterSQL.Migrations
{
    /// <inheritdoc />
    public partial class AddMailcowSmtpCredentialsToMasterPlatformSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "MailcowSmtpPassword",
                table: "MasterPlatformSettings",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MailcowSmtpPort",
                table: "MasterPlatformSettings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "MailcowSmtpUser",
                table: "MasterPlatformSettings",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MailcowSmtpPassword",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "MailcowSmtpPort",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "MailcowSmtpUser",
                table: "MasterPlatformSettings");
        }
    }
}
