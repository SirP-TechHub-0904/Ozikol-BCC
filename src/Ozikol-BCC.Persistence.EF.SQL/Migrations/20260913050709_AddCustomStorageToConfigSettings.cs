using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OzikolBCC.Persistence.EF.SQL.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomStorageToConfigSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CustomCloudinaryApiKey",
                table: "ConfigSettings",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CustomCloudinaryApiSecret",
                table: "ConfigSettings",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CustomCloudinaryCloudName",
                table: "ConfigSettings",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "UseCustomStorage",
                table: "ConfigSettings",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CustomCloudinaryApiKey",
                table: "ConfigSettings");

            migrationBuilder.DropColumn(
                name: "CustomCloudinaryApiSecret",
                table: "ConfigSettings");

            migrationBuilder.DropColumn(
                name: "CustomCloudinaryCloudName",
                table: "ConfigSettings");

            migrationBuilder.DropColumn(
                name: "UseCustomStorage",
                table: "ConfigSettings");
        }
    }
}
