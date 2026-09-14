using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OzikolBCC.Persistence.EF.SQL.Migrations
{
    /// <inheritdoc />
    public partial class AddIsMenuCTAToWebPages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsMenuCTA",
                table: "WebPages",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsMenuCTA",
                table: "WebPages");
        }
    }
}
