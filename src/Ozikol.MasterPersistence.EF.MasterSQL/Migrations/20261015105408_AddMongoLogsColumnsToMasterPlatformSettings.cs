using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ozikol.MasterPersistence.EF.MasterSQL.Migrations
{
    /// <inheritdoc />
    public partial class AddMongoLogsColumnsToMasterPlatformSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "MongoLogsCollectionName",
                table: "MasterPlatformSettings",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "MongoLogsConnectionString",
                table: "MasterPlatformSettings",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MongoLogsDatabaseName",
                table: "MasterPlatformSettings",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MongoLogsCollectionName",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "MongoLogsConnectionString",
                table: "MasterPlatformSettings");

            migrationBuilder.DropColumn(
                name: "MongoLogsDatabaseName",
                table: "MasterPlatformSettings");
        }
    }
}
