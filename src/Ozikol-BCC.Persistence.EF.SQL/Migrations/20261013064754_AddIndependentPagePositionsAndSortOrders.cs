using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OzikolBCC.Persistence.EF.SQL.Migrations
{
    /// <inheritdoc />
    public partial class AddIndependentPagePositionsAndSortOrders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DropdownSortOrder",
                table: "WebPages",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "FooterBottomSortOrder",
                table: "WebPages",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "MainMenuSortOrder",
                table: "WebPages",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "ShowInFooterBottom",
                table: "WebPages",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ShowInTopBar",
                table: "WebPages",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "TopBarSortOrder",
                table: "WebPages",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "FooterSortOrder",
                table: "PageCategories",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "ShowInMenu",
                table: "PageCategories",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DropdownSortOrder",
                table: "WebPages");

            migrationBuilder.DropColumn(
                name: "FooterBottomSortOrder",
                table: "WebPages");

            migrationBuilder.DropColumn(
                name: "MainMenuSortOrder",
                table: "WebPages");

            migrationBuilder.DropColumn(
                name: "ShowInFooterBottom",
                table: "WebPages");

            migrationBuilder.DropColumn(
                name: "ShowInTopBar",
                table: "WebPages");

            migrationBuilder.DropColumn(
                name: "TopBarSortOrder",
                table: "WebPages");

            migrationBuilder.DropColumn(
                name: "FooterSortOrder",
                table: "PageCategories");

            migrationBuilder.DropColumn(
                name: "ShowInMenu",
                table: "PageCategories");
        }
    }
}
