using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OzikolBCC.Persistence.EF.SQL.Migrations
{
    /// <inheritdoc />
    public partial class AddShiftDutyReportAndFines : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ReportSubmissionUtc",
                table: "BcpShifts",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReportContent",
                table: "BcpShifts",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "FineAttached",
                table: "BcpShifts",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "FineAmount",
                table: "BcpShifts",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FineReason",
                table: "BcpShifts",
                type: "nvarchar(250)",
                maxLength: 250,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FineAuthorizedBy",
                table: "BcpShifts",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FineStatus",
                table: "BcpShifts",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "ReportSubmissionUtc", table: "BcpShifts");
            migrationBuilder.DropColumn(name: "ReportContent", table: "BcpShifts");
            migrationBuilder.DropColumn(name: "FineAttached", table: "BcpShifts");
            migrationBuilder.DropColumn(name: "FineAmount", table: "BcpShifts");
            migrationBuilder.DropColumn(name: "FineReason", table: "BcpShifts");
            migrationBuilder.DropColumn(name: "FineAuthorizedBy", table: "BcpShifts");
            migrationBuilder.DropColumn(name: "FineStatus", table: "BcpShifts");
        }
    }
}
