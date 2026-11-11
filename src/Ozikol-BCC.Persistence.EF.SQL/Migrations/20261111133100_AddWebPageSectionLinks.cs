using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OzikolBCC.Persistence.EF.SQL.Migrations
{
    /// <inheritdoc />
    public partial class AddWebPageSectionLinks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PreferredWorkingTime",
                table: "BcpShiftStaffProfiles",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "WeeklyAvailabilityJson",
                table: "BcpShiftStaffProfiles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WorkingAvailability",
                table: "BcpShiftStaffProfiles",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "FineAmount",
                table: "BcpShifts",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "FineAttached",
                table: "BcpShifts",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "FineAuthorizedBy",
                table: "BcpShifts",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FineReason",
                table: "BcpShifts",
                type: "nvarchar(250)",
                maxLength: 250,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FineStatus",
                table: "BcpShifts",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReportContent",
                table: "BcpShifts",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReportSubmissionUtc",
                table: "BcpShifts",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmergencyContactEmail",
                table: "BcpClientSites",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "WebPageSectionLinks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    WebPageId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PageSectionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PageSortOrder = table.Column<int>(type: "int", nullable: false),
                    IsVisible = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WebPageSectionLinks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WebPageSectionLinks_PageSections_PageSectionId",
                        column: x => x.PageSectionId,
                        principalTable: "PageSections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_WebPageSectionLinks_WebPages_WebPageId",
                        column: x => x.WebPageId,
                        principalTable: "WebPages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WebPageSectionLinks_PageSectionId",
                table: "WebPageSectionLinks",
                column: "PageSectionId");

            migrationBuilder.CreateIndex(
                name: "IX_WebPageSectionLinks_WebPageId_PageSectionId",
                table: "WebPageSectionLinks",
                columns: new[] { "WebPageId", "PageSectionId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WebPageSectionLinks");

            migrationBuilder.DropColumn(
                name: "PreferredWorkingTime",
                table: "BcpShiftStaffProfiles");

            migrationBuilder.DropColumn(
                name: "WeeklyAvailabilityJson",
                table: "BcpShiftStaffProfiles");

            migrationBuilder.DropColumn(
                name: "WorkingAvailability",
                table: "BcpShiftStaffProfiles");

            migrationBuilder.DropColumn(
                name: "FineAmount",
                table: "BcpShifts");

            migrationBuilder.DropColumn(
                name: "FineAttached",
                table: "BcpShifts");

            migrationBuilder.DropColumn(
                name: "FineAuthorizedBy",
                table: "BcpShifts");

            migrationBuilder.DropColumn(
                name: "FineReason",
                table: "BcpShifts");

            migrationBuilder.DropColumn(
                name: "FineStatus",
                table: "BcpShifts");

            migrationBuilder.DropColumn(
                name: "ReportContent",
                table: "BcpShifts");

            migrationBuilder.DropColumn(
                name: "ReportSubmissionUtc",
                table: "BcpShifts");

            migrationBuilder.DropColumn(
                name: "EmergencyContactEmail",
                table: "BcpClientSites");
        }
    }
}
