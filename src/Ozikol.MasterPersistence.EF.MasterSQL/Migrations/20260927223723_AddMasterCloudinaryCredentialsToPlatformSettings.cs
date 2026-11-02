using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ozikol.MasterPersistence.EF.MasterSQL.Migrations
{
    /// <inheritdoc />
    public partial class AddMasterCloudinaryCredentialsToPlatformSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "IconText",
                table: "MasterTemplateSections",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CloudinaryApiKey",
                table: "MasterPlatformSettings",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CloudinaryApiSecret",
                table: "MasterPlatformSettings",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CloudinaryCloudName",
                table: "MasterPlatformSettings",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IconText",
                table: "MasterTemplateSections");

            migrationBuilder.DropColumn(
                name: "CloudinaryApiKey",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "CloudinaryApiSecret",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "CloudinaryCloudName",
                table: "MasterPlatformSettings");
        }
    }
}
