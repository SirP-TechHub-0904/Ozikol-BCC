using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OzikolBCC.Persistence.EF.SQL.Migrations
{
    /// <inheritdoc />
    public partial class AddIsDefaultToTemplatesAndSections : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsDefault",
                table: "TenantInstalledTemplates",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsDefault",
                table: "SiteCodeInjectionTags",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsDefault",
                table: "PageSections",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsDefault",
                table: "TenantInstalledTemplates");

            migrationBuilder.DropColumn(
                name: "IsDefault",
                table: "SiteCodeInjectionTags");

            migrationBuilder.DropColumn(
                name: "IsDefault",
                table: "PageSections");
        }
    }
}
