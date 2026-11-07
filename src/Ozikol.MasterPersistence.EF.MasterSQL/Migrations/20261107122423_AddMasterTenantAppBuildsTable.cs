using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ozikol.MasterPersistence.EF.MasterSQL.Migrations
{
    /// <inheritdoc />
    public partial class AddMasterTenantAppBuildsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AppBuilderDownloadBaseUrl",
                table: "MasterPlatformSettings",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CloudflareR2AccessKeyId",
                table: "MasterPlatformSettings",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CloudflareR2AccountId",
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

            migrationBuilder.AddColumn<string>(
                name: "CloudflareR2SecretAccessKey",
                table: "MasterPlatformSettings",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GitHubAppBuilderOwner",
                table: "MasterPlatformSettings",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GitHubAppBuilderRepo",
                table: "MasterPlatformSettings",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GitHubAppBuilderToken",
                table: "MasterPlatformSettings",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GitHubAppBuilderWorkflow",
                table: "MasterPlatformSettings",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "MasterTenantAppBuilds",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AppMode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    TenantKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    BrandName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Platform = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Version = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    BuildNumber = table.Column<int>(type: "int", nullable: false),
                    ApiBaseUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    PrimaryDomain = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    IconUrl = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    LogoUrl = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    PrimaryColor = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    DownloadUrl = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    StoragePath = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    FileSizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    Sha256Checksum = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    GitHubRunId = table.Column<long>(type: "bigint", nullable: true),
                    GitHubRunUrl = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ErrorMessage = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    BuildLog = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TriggeredBy = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    StartedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CompletedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterTenantAppBuilds", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MasterTenantAppBuilds");

            migrationBuilder.DropColumn(
                name: "AppBuilderDownloadBaseUrl",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "CloudflareR2AccessKeyId",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "CloudflareR2AccountId",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "CloudflareR2BucketName",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "CloudflareR2PublicCdnUrl",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "CloudflareR2SecretAccessKey",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "GitHubAppBuilderOwner",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "GitHubAppBuilderRepo",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "GitHubAppBuilderToken",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "GitHubAppBuilderWorkflow",
                table: "MasterPlatformSettings");
        }
    }
}
