using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OzikolBCC.Persistence.EF.SQL.Migrations
{
    /// <inheritdoc />
    public partial class AddMenuPositionAndCustomClassToCategoriesAndWebPages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CustomClass",
                table: "WebPages",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MenuPosition",
                table: "WebPages",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "CustomClass",
                table: "PageCategories",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MenuPosition",
                table: "PageCategories",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CustomClass",
                table: "WebPages");

            migrationBuilder.DropColumn(
                name: "MenuPosition",
                table: "WebPages");

            migrationBuilder.DropColumn(
                name: "CustomClass",
                table: "PageCategories");

            migrationBuilder.DropColumn(
                name: "MenuPosition",
                table: "PageCategories");
        }
    }
}
