using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Ozikol_BCC.Persistence.EF.SQL;

#nullable disable

namespace OzikolBCC.Persistence.EF.SQL.Migrations
{
    [DbContext(typeof(DashboardDbContext))]
    [Migration("20261110123000_AddWeeklyAvailabilityJson")]
    public partial class AddWeeklyAvailabilityJson : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "WeeklyAvailabilityJson",
                table: "BcpShiftStaffProfiles",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "WeeklyAvailabilityJson",
                table: "BcpShiftStaffProfiles");
        }
    }
}

