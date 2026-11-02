using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ozikol.MasterPersistence.EF.MasterSQL.Migrations
{
    /// <inheritdoc />
    public partial class AddDraftSectionCssAndJsLibraryColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "RequiredCssLibrariesJson",
                table: "MasterMarketplaceDraftSections",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RequiredJsLibrariesJson",
                table: "MasterMarketplaceDraftSections",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RequiredCssLibrariesJson",
                table: "MasterMarketplaceDraftSections");

            migrationBuilder.DropColumn(
                name: "RequiredJsLibrariesJson",
                table: "MasterMarketplaceDraftSections");
        }
    }
}
