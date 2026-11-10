using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Ozikol_BCC.Persistence.EF.SQL;

#nullable disable

namespace OzikolBCC.Persistence.EF.SQL.Migrations
{
    [DbContext(typeof(DashboardDbContext))]
    [Migration("20261110115000_AddStaffWorkingTimeAndAvailability")]
    public partial class AddStaffWorkingTimeAndAvailability : Migration
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
                defaultValue: "Any");

            migrationBuilder.AddColumn<string>(
                name: "WorkingAvailability",
                table: "BcpShiftStaffProfiles",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "Available");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PreferredWorkingTime",
                table: "BcpShiftStaffProfiles");

            migrationBuilder.DropColumn(
                name: "WorkingAvailability",
                table: "BcpShiftStaffProfiles");
        }
    }
}

