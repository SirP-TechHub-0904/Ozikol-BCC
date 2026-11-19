using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ozikol.MasterPersistence.EF.MasterSQL.Migrations
{
    /// <inheritdoc />
    public partial class AddMasterPageHelpDocumentationTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MasterPageHelps",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RouteKey = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    FeatureSuite = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    PageTitle = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ShortSummary = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    OverviewMarkdown = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ActionsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RelatedRoutesJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TourStepsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Category = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    IsPublished = table.Column<bool>(type: "bit", nullable: false),
                    LastUpdatedBy = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterPageHelps", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MasterPageHelps_Category",
                table: "MasterPageHelps",
                column: "Category");

            migrationBuilder.CreateIndex(
                name: "IX_MasterPageHelps_FeatureSuite",
                table: "MasterPageHelps",
                column: "FeatureSuite");

            migrationBuilder.CreateIndex(
                name: "IX_MasterPageHelps_IsPublished",
                table: "MasterPageHelps",
                column: "IsPublished");

            migrationBuilder.CreateIndex(
                name: "IX_MasterPageHelps_RouteKey",
                table: "MasterPageHelps",
                column: "RouteKey",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MasterPageHelps");
        }
    }
}
