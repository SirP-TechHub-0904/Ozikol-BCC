using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OzikolBCC.Persistence.EF.SQL.Migrations
{
    /// <inheritdoc />
    public partial class SyncTenantPendingModelChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "EstimatedTaxWithholdingPercent",
                table: "BcpWorkforcePolicySettings",
                type: "decimal(5,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "PaydayFrequency",
                table: "BcpWorkforcePolicySettings",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "PaydaySpecificDay",
                table: "BcpWorkforcePolicySettings",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "StaffEarningsDisplayMode",
                table: "BcpWorkforcePolicySettings",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EstimatedTaxWithholdingPercent",
                table: "BcpWorkforcePolicySettings");

            migrationBuilder.DropColumn(
                name: "PaydayFrequency",
                table: "BcpWorkforcePolicySettings");

            migrationBuilder.DropColumn(
                name: "PaydaySpecificDay",
                table: "BcpWorkforcePolicySettings");

            migrationBuilder.DropColumn(
                name: "StaffEarningsDisplayMode",
                table: "BcpWorkforcePolicySettings");
        }
    }
}
