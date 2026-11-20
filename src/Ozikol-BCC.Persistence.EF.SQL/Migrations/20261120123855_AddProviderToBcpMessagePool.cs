using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OzikolBCC.Persistence.EF.SQL.Migrations
{
    /// <inheritdoc />
    public partial class AddProviderToBcpMessagePool : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Provider",
                table: "BcpMessagePools",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_BcpMessagePools_Channel_Provider_Status",
                table: "BcpMessagePools",
                columns: new[] { "Channel", "Provider", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_BcpMessagePools_Provider",
                table: "BcpMessagePools",
                column: "Provider");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_BcpMessagePools_Channel_Provider_Status",
                table: "BcpMessagePools");

            migrationBuilder.DropIndex(
                name: "IX_BcpMessagePools_Provider",
                table: "BcpMessagePools");

            migrationBuilder.DropColumn(
                name: "Provider",
                table: "BcpMessagePools");
        }
    }
}
