using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OzikolBCC.Persistence.EF.SQL.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkspaceInitializationTrackingToMisWebsiteSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsWorkspaceInitialized",
                table: "MisWebsiteSettings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "WorkspaceInitializationMode",
                table: "MisWebsiteSettings",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "WorkspaceInitializedUtc",
                table: "MisWebsiteSettings",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsWorkspaceInitialized",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "WorkspaceInitializationMode",
                table: "MisWebsiteSettings");

            migrationBuilder.DropColumn(
                name: "WorkspaceInitializedUtc",
                table: "MisWebsiteSettings");
        }
    }
}
