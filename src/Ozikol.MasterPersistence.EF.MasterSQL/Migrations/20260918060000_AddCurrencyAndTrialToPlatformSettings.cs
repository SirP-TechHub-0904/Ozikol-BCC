using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ozikol.MasterPersistence.EF.MasterSQL.Migrations
{
    /// <inheritdoc />
    public partial class AddCurrencyAndTrialToPlatformSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DefaultCurrencyCode",
                table: "MasterPlatformSettings",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "USD");

            migrationBuilder.AddColumn<int>(
                name: "DefaultTrialDays",
                table: "MasterPlatformSettings",
                type: "int",
                nullable: false,
                defaultValue: 14);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DefaultCurrencyCode",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "DefaultTrialDays",
                table: "MasterPlatformSettings");
        }
    }
}
