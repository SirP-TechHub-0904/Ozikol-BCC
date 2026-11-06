using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ozikol.MasterPersistence.EF.MasterSQL.Migrations
{
    /// <inheritdoc />
    public partial class AddCloudflareR2PlatformSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CloudflareR2AccountId",
                table: "MasterPlatformSettings",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CloudflareR2AccessKeyId",
                table: "MasterPlatformSettings",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CloudflareR2SecretAccessKey",
                table: "MasterPlatformSettings",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CloudflareR2BucketName",
                table: "MasterPlatformSettings",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true,
                defaultValue: "ozikol-assets");

            migrationBuilder.AddColumn<string>(
                name: "CloudflareR2PublicCdnUrl",
                table: "MasterPlatformSettings",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CloudflareR2AccountId",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "CloudflareR2AccessKeyId",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "CloudflareR2SecretAccessKey",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "CloudflareR2BucketName",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "CloudflareR2PublicCdnUrl",
                table: "MasterPlatformSettings");
        }
    }
}
