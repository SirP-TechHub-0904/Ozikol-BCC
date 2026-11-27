using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OzikolBCC.Persistence.EF.SQL.Migrations
{
    /// <inheritdoc />
    public partial class AddShiftJobRoleAndStaffPayRateOverride : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Safely drop legacy PostName if it still exists
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.columns WHERE name = 'PostName' AND object_id = OBJECT_ID('BcpShifts'))
                BEGIN
                    ALTER TABLE [BcpShifts] DROP COLUMN [PostName];
                END
            ");

            // Safely add JobRoleId column
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE name = 'JobRoleId' AND object_id = OBJECT_ID('BcpShifts'))
                BEGIN
                    ALTER TABLE [BcpShifts] ADD [JobRoleId] UNIQUEIDENTIFIER NULL;
                END
            ");

            // Safely add JobRoleTitle column
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE name = 'JobRoleTitle' AND object_id = OBJECT_ID('BcpShifts'))
                BEGIN
                    ALTER TABLE [BcpShifts] ADD [JobRoleTitle] NVARCHAR(150) NULL;
                END
            ");

            // Safely add HourlyPayRateOverride column to BcpShiftAssignments
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE name = 'HourlyPayRateOverride' AND object_id = OBJECT_ID('BcpShiftAssignments'))
                BEGIN
                    ALTER TABLE [BcpShiftAssignments] ADD [HourlyPayRateOverride] DECIMAL(18,2) NULL;
                END
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "JobRoleId",
                table: "BcpShifts");

            migrationBuilder.DropColumn(
                name: "JobRoleTitle",
                table: "BcpShifts");

            migrationBuilder.DropColumn(
                name: "HourlyPayRateOverride",
                table: "BcpShiftAssignments");

            migrationBuilder.AddColumn<string>(
                name: "PostName",
                table: "BcpShifts",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: false,
                defaultValue: "");
        }
    }
}
