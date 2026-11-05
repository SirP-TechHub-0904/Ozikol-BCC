using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ozikol.MasterPersistence.EF.MasterSQL.Migrations
{
    /// <inheritdoc />
    public partial class AddTenantCustomPricingAndAvailabilitySettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsAvailableForUseOverride",
                table: "MasterTenantFeatureSubscriptions",
                type: "bit",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "UseCustomAvailability",
                table: "MasterTenantCatalogs",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "UseCustomPricing",
                table: "MasterTenantCatalogs",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsAvailableForUseOverride",
                table: "MasterTenantFeatureSubscriptions");

            migrationBuilder.DropColumn(
                name: "UseCustomAvailability",
                table: "MasterTenantCatalogs");

            migrationBuilder.DropColumn(
                name: "UseCustomPricing",
                table: "MasterTenantCatalogs");
        }
    }
}
