using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OzikolBCC.Persistence.EF.SQL.Migrations
{
    /// <inheritdoc />
    public partial class AddUiSettingsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "UiSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BrandName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    SiteTitle = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    Tagline = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    LogoUrl = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    LogoKey = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    WhiteLogoUrl = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    WhiteLogoKey = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    FaviconUrl = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    FaviconKey = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    EnableComingSoon = table.Column<bool>(type: "bit", nullable: false),
                    ComingSoonTitle = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    ComingSoonMessage = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    RemovePlatformWatermark = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UiSettings", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UiSettings");
        }
    }
}
