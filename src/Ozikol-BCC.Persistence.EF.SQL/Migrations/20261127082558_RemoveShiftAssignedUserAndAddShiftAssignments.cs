using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OzikolBCC.Persistence.EF.SQL.Migrations
{
    /// <inheritdoc />
    public partial class RemoveShiftAssignedUserAndAddShiftAssignments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_BcpShifts_TenantKey_AssignedUserId_StartsAtUtc",
                table: "BcpShifts");

            migrationBuilder.DropColumn(
                name: "AssignedUserId",
                table: "BcpShifts");

            migrationBuilder.DropColumn(
                name: "AssignedUserName",
                table: "BcpShifts");

            migrationBuilder.AddColumn<int>(
                name: "RequiredStaffCount",
                table: "BcpShifts",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "BcpShiftAssignments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ShiftId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    StaffProfileId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    StaffFullName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    DutyPosition = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    DutyRole = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    IsLeadOfficer = table.Column<bool>(type: "bit", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    IsConfirmedByGuard = table.Column<bool>(type: "bit", nullable: false),
                    ConfirmedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    AssignedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    AssignedByUserId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    IsClaimed = table.Column<bool>(type: "bit", nullable: false),
                    ClaimApproved = table.Column<bool>(type: "bit", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpShiftAssignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpShiftAssignments_BcpShiftStaffProfiles_StaffProfileId",
                        column: x => x.StaffProfileId,
                        principalTable: "BcpShiftStaffProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_BcpShiftAssignments_BcpShifts_ShiftId",
                        column: x => x.ShiftId,
                        principalTable: "BcpShifts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BcpShiftAssignments_ShiftId",
                table: "BcpShiftAssignments",
                column: "ShiftId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpShiftAssignments_StaffProfileId",
                table: "BcpShiftAssignments",
                column: "StaffProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpShiftAssignments_TenantKey_ShiftId_UserId",
                table: "BcpShiftAssignments",
                columns: new[] { "TenantKey", "ShiftId", "UserId" });

            migrationBuilder.CreateIndex(
                name: "IX_BcpShiftAssignments_TenantKey_UserId_Status",
                table: "BcpShiftAssignments",
                columns: new[] { "TenantKey", "UserId", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BcpShiftAssignments");

            migrationBuilder.DropColumn(
                name: "RequiredStaffCount",
                table: "BcpShifts");

            migrationBuilder.AddColumn<string>(
                name: "AssignedUserId",
                table: "BcpShifts",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AssignedUserName",
                table: "BcpShifts",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_BcpShifts_TenantKey_AssignedUserId_StartsAtUtc",
                table: "BcpShifts",
                columns: new[] { "TenantKey", "AssignedUserId", "StartsAtUtc" });
        }
    }
}
