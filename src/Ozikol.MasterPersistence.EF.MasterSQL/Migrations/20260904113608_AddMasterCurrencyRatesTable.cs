using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ozikol.MasterPersistence.EF.MasterSQL.Migrations
{
    /// <inheritdoc />
    public partial class AddMasterCurrencyRatesTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MasterCurrencyRates",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CurrencyCode = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    CurrencySymbol = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    DisplayName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CultureName = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    PillLabel = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    RateFromUsd = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    IsBaseCurrency = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    AssociatedCountryCodes = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterCurrencyRates", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MasterCurrencyRates_CurrencyCode",
                table: "MasterCurrencyRates",
                column: "CurrencyCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MasterCurrencyRates_IsActive",
                table: "MasterCurrencyRates",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_MasterCurrencyRates_SortOrder",
                table: "MasterCurrencyRates",
                column: "SortOrder");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MasterCurrencyRates");
        }
    }
}
