using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OzikolBCC.Persistence.EF.SQL.Migrations
{
    /// <inheritdoc />
    public partial class AddSuiteCodeToSiteCodeInjectionTags : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SuiteCode",
                table: "SiteCodeInjectionTags",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true,
                defaultValue: "suite_corporate");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SuiteCode",
                table: "SiteCodeInjectionTags");
        }
    }
}
