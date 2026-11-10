using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Ozikol_BCC.Persistence.EF.SQL;

#nullable disable

namespace OzikolBCC.Persistence.EF.SQL.Migrations
{
    [DbContext(typeof(DashboardDbContext))]
    [Migration("20261110104000_AddSiteEmergencyContactEmail")]
    public partial class AddSiteEmergencyContactEmail : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "EmergencyContactEmail",
                table: "BcpClientSites",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EmergencyContactEmail",
                table: "BcpClientSites");
        }
    }
}

