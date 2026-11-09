using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ozikol.MasterPersistence.EF.MasterSQL.Migrations
{
    /// <inheritdoc />
    public partial class AddTenantFlatRateMasterPlan : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "FlatRateAutoRenew",
                table: "MasterTenantCatalogs",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "FlatRateCadence",
                table: "MasterTenantCatalogs",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "FlatRateExpiresAtUtc",
                table: "MasterTenantCatalogs",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FlatRatePlanName",
                table: "MasterTenantCatalogs",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "FlatRatePrice",
                table: "MasterTenantCatalogs",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "HasFlatRatePlan",
                table: "MasterTenantCatalogs",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FlatRateAutoRenew",
                table: "MasterTenantCatalogs");

            migrationBuilder.DropColumn(
                name: "FlatRateCadence",
                table: "MasterTenantCatalogs");

            migrationBuilder.DropColumn(
                name: "FlatRateExpiresAtUtc",
                table: "MasterTenantCatalogs");

            migrationBuilder.DropColumn(
                name: "FlatRatePlanName",
                table: "MasterTenantCatalogs");

            migrationBuilder.DropColumn(
                name: "FlatRatePrice",
                table: "MasterTenantCatalogs");

            migrationBuilder.DropColumn(
                name: "HasFlatRatePlan",
                table: "MasterTenantCatalogs");
        }
    }
}
