using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OzikolBCC.Persistence.EF.SQL.Migrations
{
    /// <inheritdoc />
    public partial class AddDisableAiAutoFillToWebPage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "DisableAiAutoFill",
                table: "WebPages",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "BcpClientSites",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    SiteCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SiteName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Address = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    City = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    PostalCode = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Latitude = table.Column<double>(type: "float", nullable: true),
                    Longitude = table.Column<double>(type: "float", nullable: true),
                    GeofenceRadiusMeters = table.Column<int>(type: "int", nullable: false),
                    EmergencyContactName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    EmergencyContactPhone = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    SiteAssignmentInstructions = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RequiredSiaLicenceType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpClientSites", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BcpShiftLeaveRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    UserName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    LeaveType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    TotalDays = table.Column<decimal>(type: "decimal(5,1)", precision: 18, scale: 2, nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    AttachmentUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ReviewedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ReviewedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RejectionReason = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpShiftLeaveRequests", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BcpShifts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ShiftCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ClientSiteId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AssignedUserId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    AssignedUserName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    PostName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    StartsAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndsAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsOvernight = table.Column<bool>(type: "bit", nullable: false),
                    BreakMinutes = table.Column<int>(type: "int", nullable: false),
                    PlannedDurationHours = table.Column<decimal>(type: "decimal(6,2)", precision: 18, scale: 2, nullable: false),
                    RequiredWorkspaceStationId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    RequiredWorkspaceStationName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    HourlyPayRate = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    HourlyChargeRate = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    IsConfirmedByGuard = table.Column<bool>(type: "bit", nullable: false),
                    ConfirmedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpShifts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpShifts_BcpClientSites_ClientSiteId",
                        column: x => x.ClientSiteId,
                        principalTable: "BcpClientSites",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "BcpShiftAttendances",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ShiftId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ClockInUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ClockInLatitude = table.Column<double>(type: "float", nullable: true),
                    ClockInLongitude = table.Column<double>(type: "float", nullable: true),
                    ClockInAccuracyMeters = table.Column<double>(type: "float", nullable: true),
                    ClockInDistanceFromSiteMeters = table.Column<double>(type: "float", nullable: true),
                    IsClockInGeofenceVerified = table.Column<bool>(type: "bit", nullable: false),
                    ClockInMethod = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ClockOutUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ClockOutLatitude = table.Column<double>(type: "float", nullable: true),
                    ClockOutLongitude = table.Column<double>(type: "float", nullable: true),
                    ClockOutAccuracyMeters = table.Column<double>(type: "float", nullable: true),
                    ClockOutDistanceFromSiteMeters = table.Column<double>(type: "float", nullable: true),
                    IsClockOutGeofenceVerified = table.Column<bool>(type: "bit", nullable: false),
                    ClockOutMethod = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ActualDurationHours = table.Column<decimal>(type: "decimal(6,2)", precision: 18, scale: 2, nullable: true),
                    BillableHours = table.Column<decimal>(type: "decimal(6,2)", precision: 18, scale: 2, nullable: true),
                    OvertimeHours = table.Column<decimal>(type: "decimal(6,2)", precision: 18, scale: 2, nullable: true),
                    LateArrivalMinutes = table.Column<int>(type: "int", nullable: false),
                    IsFlagged = table.Column<bool>(type: "bit", nullable: false),
                    FlagReason = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    LastWelfareCheckAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    WelfareChecksCompletedCount = table.Column<int>(type: "int", nullable: false),
                    SupervisorApproved = table.Column<bool>(type: "bit", nullable: false),
                    SupervisorApprovedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    SupervisorApprovedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    SupervisorNotes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpShiftAttendances", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpShiftAttendances_BcpShifts_ShiftId",
                        column: x => x.ShiftId,
                        principalTable: "BcpShifts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BcpShiftSwapRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ShiftId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RequestingUserId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    RequestingUserName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    OfferedToUserId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    OfferedToUserName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    TargetShiftId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Reason = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SupervisorApprovedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    SupervisorApprovedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    SupervisorRejectionReason = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpShiftSwapRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpShiftSwapRequests_BcpShifts_ShiftId",
                        column: x => x.ShiftId,
                        principalTable: "BcpShifts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BcpClientSites_TenantKey_IsActive",
                table: "BcpClientSites",
                columns: new[] { "TenantKey", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_BcpClientSites_TenantKey_SiteCode",
                table: "BcpClientSites",
                columns: new[] { "TenantKey", "SiteCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BcpShiftAttendances_ShiftId",
                table: "BcpShiftAttendances",
                column: "ShiftId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BcpShiftAttendances_TenantKey_IsFlagged",
                table: "BcpShiftAttendances",
                columns: new[] { "TenantKey", "IsFlagged" });

            migrationBuilder.CreateIndex(
                name: "IX_BcpShiftAttendances_TenantKey_UserId_ClockInUtc",
                table: "BcpShiftAttendances",
                columns: new[] { "TenantKey", "UserId", "ClockInUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_BcpShiftLeaveRequests_TenantKey_Status",
                table: "BcpShiftLeaveRequests",
                columns: new[] { "TenantKey", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_BcpShiftLeaveRequests_TenantKey_UserId_StartDate_EndDate",
                table: "BcpShiftLeaveRequests",
                columns: new[] { "TenantKey", "UserId", "StartDate", "EndDate" });

            migrationBuilder.CreateIndex(
                name: "IX_BcpShifts_ClientSiteId",
                table: "BcpShifts",
                column: "ClientSiteId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpShifts_TenantKey_AssignedUserId_StartsAtUtc",
                table: "BcpShifts",
                columns: new[] { "TenantKey", "AssignedUserId", "StartsAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_BcpShifts_TenantKey_ClientSiteId_StartsAtUtc",
                table: "BcpShifts",
                columns: new[] { "TenantKey", "ClientSiteId", "StartsAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_BcpShifts_TenantKey_StartsAtUtc_EndsAtUtc",
                table: "BcpShifts",
                columns: new[] { "TenantKey", "StartsAtUtc", "EndsAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_BcpShifts_TenantKey_Status",
                table: "BcpShifts",
                columns: new[] { "TenantKey", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_BcpShiftSwapRequests_ShiftId",
                table: "BcpShiftSwapRequests",
                column: "ShiftId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpShiftSwapRequests_TenantKey_OfferedToUserId_Status",
                table: "BcpShiftSwapRequests",
                columns: new[] { "TenantKey", "OfferedToUserId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_BcpShiftSwapRequests_TenantKey_RequestingUserId_Status",
                table: "BcpShiftSwapRequests",
                columns: new[] { "TenantKey", "RequestingUserId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_BcpShiftSwapRequests_TenantKey_ShiftId",
                table: "BcpShiftSwapRequests",
                columns: new[] { "TenantKey", "ShiftId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BcpShiftAttendances");

            migrationBuilder.DropTable(
                name: "BcpShiftLeaveRequests");

            migrationBuilder.DropTable(
                name: "BcpShiftSwapRequests");

            migrationBuilder.DropTable(
                name: "BcpShifts");

            migrationBuilder.DropTable(
                name: "BcpClientSites");

            migrationBuilder.DropColumn(
                name: "DisableAiAutoFill",
                table: "WebPages");
        }
    }
}
