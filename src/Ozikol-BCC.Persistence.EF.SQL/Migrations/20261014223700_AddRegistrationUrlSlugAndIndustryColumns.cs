using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OzikolBCC.Persistence.EF.SQL.Migrations
{
    /// <inheritdoc />
    public partial class AddRegistrationUrlSlugAndIndustryColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DefaultIndustrySector",
                table: "MisConfigurationSettings",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "EnableAffiliateReferralCode",
                table: "MisConfigurationSettings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "RegistrationUrlSlug",
                table: "MisConfigurationSettings",
                type: "nvarchar(80)",
                maxLength: 80,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DefaultIndustrySector",
                table: "MisConfigurationSettings");

            migrationBuilder.DropColumn(
                name: "EnableAffiliateReferralCode",
                table: "MisConfigurationSettings");

            migrationBuilder.DropColumn(
                name: "RegistrationUrlSlug",
                table: "MisConfigurationSettings");
        }
    }
}
