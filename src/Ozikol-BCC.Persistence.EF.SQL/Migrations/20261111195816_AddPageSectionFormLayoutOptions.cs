using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OzikolBCC.Persistence.EF.SQL.Migrations
{
    /// <inheritdoc />
    public partial class AddPageSectionFormLayoutOptions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "FormCustomWidthPercent",
                table: "PageSections",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FormPlacementMode",
                table: "PageSections",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FormWidthPreset",
                table: "PageSections",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "HideSectionImageWhenFormActive",
                table: "PageSections",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FormCustomWidthPercent",
                table: "PageSections");

            migrationBuilder.DropColumn(
                name: "FormPlacementMode",
                table: "PageSections");

            migrationBuilder.DropColumn(
                name: "FormWidthPreset",
                table: "PageSections");

            migrationBuilder.DropColumn(
                name: "HideSectionImageWhenFormActive",
                table: "PageSections");
        }
    }
}
