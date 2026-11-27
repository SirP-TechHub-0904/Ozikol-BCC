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
            // Safely drop index if it exists (prevents SQL 3701 error when index was not physically created)
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_BcpShifts_TenantKey_AssignedUserId_StartsAtUtc' AND object_id = OBJECT_ID('BcpShifts'))
                BEGIN
                    DROP INDEX [IX_BcpShifts_TenantKey_AssignedUserId_StartsAtUtc] ON [BcpShifts];
                END
            ");

            // Safely drop any other indexes referencing AssignedUserId and drop the column
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.columns WHERE name = 'AssignedUserId' AND object_id = OBJECT_ID('BcpShifts'))
                BEGIN
                    DECLARE @idxName NVARCHAR(256);
                    DECLARE idx_cursor CURSOR FOR
                    SELECT i.name
                    FROM sys.indexes i
                    JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
                    JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
                    WHERE i.object_id = OBJECT_ID('BcpShifts') AND c.name = 'AssignedUserId' AND i.is_primary_key = 0;

                    OPEN idx_cursor;
                    FETCH NEXT FROM idx_cursor INTO @idxName;
                    WHILE @@FETCH_STATUS = 0
                    BEGIN
                        EXEC('DROP INDEX [' + @idxName + '] ON [BcpShifts]');
                        FETCH NEXT FROM idx_cursor INTO @idxName;
                    END
                    CLOSE idx_cursor;
                    DEALLOCATE idx_cursor;

                    ALTER TABLE [BcpShifts] DROP COLUMN [AssignedUserId];
                END
            ");

            // Safely drop AssignedUserName if it exists
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.columns WHERE name = 'AssignedUserName' AND object_id = OBJECT_ID('BcpShifts'))
                BEGIN
                    ALTER TABLE [BcpShifts] DROP COLUMN [AssignedUserName];
                END
            ");

            // Safely drop legacy PostName if it exists
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.columns WHERE name = 'PostName' AND object_id = OBJECT_ID('BcpShifts'))
                BEGIN
                    ALTER TABLE [BcpShifts] DROP COLUMN [PostName];
                END
            ");

            migrationBuilder.AddColumn<int>(
                name: "RequiredStaffCount",
                table: "BcpShifts",
                type: "int",
                nullable: false,
                defaultValue: 1);

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
                name: "PostName",
                table: "BcpShifts",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: false,
                defaultValue: "General Post");

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
