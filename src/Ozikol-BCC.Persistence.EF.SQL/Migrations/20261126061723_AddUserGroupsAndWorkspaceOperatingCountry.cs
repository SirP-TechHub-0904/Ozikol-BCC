using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OzikolBCC.Persistence.EF.SQL.Migrations
{
    /// <inheritdoc />
    public partial class AddUserGroupsAndWorkspaceOperatingCountry : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "OperatingCountry",
                table: "MisConfigurationSettings",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<Guid>(
                name: "BcpUserGroupId",
                table: "AspNetUsers",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "BcpUserGroups",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    BaseRole = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    IsDefault = table.Column<bool>(type: "bit", nullable: false),
                    IsSystem = table.Column<bool>(type: "bit", nullable: false),
                    ColorBadge = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Icon = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpUserGroups", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BcpUserGroupPermissions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BcpUserGroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FeatureAreaKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ActionRole = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpUserGroupPermissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpUserGroupPermissions_BcpUserGroups_BcpUserGroupId",
                        column: x => x.BcpUserGroupId,
                        principalTable: "BcpUserGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_BcpUserGroupId",
                table: "AspNetUsers",
                column: "BcpUserGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpUserGroupPermissions_BcpUserGroupId",
                table: "BcpUserGroupPermissions",
                column: "BcpUserGroupId");

            migrationBuilder.AddForeignKey(
                name: "FK_AspNetUsers_BcpUserGroups_BcpUserGroupId",
                table: "AspNetUsers",
                column: "BcpUserGroupId",
                principalTable: "BcpUserGroups",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AspNetUsers_BcpUserGroups_BcpUserGroupId",
                table: "AspNetUsers");

            migrationBuilder.DropTable(
                name: "BcpUserGroupPermissions");

            migrationBuilder.DropTable(
                name: "BcpUserGroups");

            migrationBuilder.DropIndex(
                name: "IX_AspNetUsers_BcpUserGroupId",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "OperatingCountry",
                table: "MisConfigurationSettings");

            migrationBuilder.DropColumn(
                name: "BcpUserGroupId",
                table: "AspNetUsers");
        }
    }
}
