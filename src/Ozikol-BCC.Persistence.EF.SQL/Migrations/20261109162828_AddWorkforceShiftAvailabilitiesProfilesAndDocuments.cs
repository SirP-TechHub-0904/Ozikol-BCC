using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OzikolBCC.Persistence.EF.SQL.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkforceShiftAvailabilitiesProfilesAndDocuments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedUtc",
                table: "BcpShiftSwapRequests",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "AcceptanceDeadlineUtc",
                table: "BcpShifts",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Address",
                table: "BcpShifts",
                type: "nvarchar(250)",
                maxLength: 250,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EventTag",
                table: "BcpShifts",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FacilityName",
                table: "BcpShifts",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PostCode",
                table: "BcpShifts",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedUtc",
                table: "BcpShiftLeaveRequests",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ClockInBiometricType",
                table: "BcpShiftAttendances",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "ClockInBiometricVerified",
                table: "BcpShiftAttendances",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ClockInPhotoUrl",
                table: "BcpShiftAttendances",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ClockOutPhotoUrl",
                table: "BcpShiftAttendances",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "BcpShiftAvailabilities",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    TargetDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    State = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    UnavailableFromTime = table.Column<TimeSpan>(type: "time", nullable: true),
                    UnavailableToTime = table.Column<TimeSpan>(type: "time", nullable: true),
                    Reason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpShiftAvailabilities", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BcpShiftDocuments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    DocumentType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    DocumentName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    FileUrl = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    UploadedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ExpiryDateUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsVerified = table.Column<bool>(type: "bit", nullable: false),
                    VerifiedByUserId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    VerifiedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpShiftDocuments", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BcpShiftNotificationPreferences",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Slot1MinutesBefore = table.Column<int>(type: "int", nullable: false),
                    EnableSlot1 = table.Column<bool>(type: "bit", nullable: false),
                    Slot2MinutesBefore = table.Column<int>(type: "int", nullable: false),
                    EnableSlot2 = table.Column<bool>(type: "bit", nullable: false),
                    Slot3MinutesBefore = table.Column<int>(type: "int", nullable: false),
                    EnableSlot3 = table.Column<bool>(type: "bit", nullable: false),
                    EnableInApp = table.Column<bool>(type: "bit", nullable: false),
                    EnableEmail = table.Column<bool>(type: "bit", nullable: false),
                    EnableWhatsApp = table.Column<bool>(type: "bit", nullable: false),
                    PreferredContactPhone = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpShiftNotificationPreferences", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BcpShiftStaffProfiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    JobTitle = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    DefaultHourlyRate = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    ContractedWeeklyHours = table.Column<decimal>(type: "decimal(6,2)", precision: 18, scale: 2, nullable: true),
                    AverageRating = table.Column<decimal>(type: "decimal(3,2)", precision: 18, scale: 2, nullable: false),
                    TotalRatingsCount = table.Column<int>(type: "int", nullable: false),
                    TotalShiftsCompleted = table.Column<int>(type: "int", nullable: false),
                    PunctualityScorePercent = table.Column<decimal>(type: "decimal(5,2)", precision: 18, scale: 2, nullable: false),
                    NoShowCount = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpShiftStaffProfiles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BcpShiftStaffRatings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ShiftId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    RatedByUserId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    RatedByUserName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    RatingStars = table.Column<int>(type: "int", nullable: false),
                    PunctualityScore = table.Column<int>(type: "int", nullable: false),
                    FeedbackNotes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpShiftStaffRatings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpShiftStaffRatings_BcpShifts_ShiftId",
                        column: x => x.ShiftId,
                        principalTable: "BcpShifts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BcpShiftAvailabilities_TenantKey_State",
                table: "BcpShiftAvailabilities",
                columns: new[] { "TenantKey", "State" });

            migrationBuilder.CreateIndex(
                name: "IX_BcpShiftAvailabilities_TenantKey_UserId_TargetDate",
                table: "BcpShiftAvailabilities",
                columns: new[] { "TenantKey", "UserId", "TargetDate" });

            migrationBuilder.CreateIndex(
                name: "IX_BcpShiftDocuments_TenantKey_IsVerified",
                table: "BcpShiftDocuments",
                columns: new[] { "TenantKey", "IsVerified" });

            migrationBuilder.CreateIndex(
                name: "IX_BcpShiftDocuments_TenantKey_UserId_DocumentType",
                table: "BcpShiftDocuments",
                columns: new[] { "TenantKey", "UserId", "DocumentType" });

            migrationBuilder.CreateIndex(
                name: "IX_BcpShiftNotificationPreferences_TenantKey_UserId",
                table: "BcpShiftNotificationPreferences",
                columns: new[] { "TenantKey", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BcpShiftStaffProfiles_TenantKey_IsActive",
                table: "BcpShiftStaffProfiles",
                columns: new[] { "TenantKey", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_BcpShiftStaffProfiles_TenantKey_UserId",
                table: "BcpShiftStaffProfiles",
                columns: new[] { "TenantKey", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BcpShiftStaffRatings_ShiftId",
                table: "BcpShiftStaffRatings",
                column: "ShiftId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpShiftStaffRatings_TenantKey_ShiftId",
                table: "BcpShiftStaffRatings",
                columns: new[] { "TenantKey", "ShiftId" });

            migrationBuilder.CreateIndex(
                name: "IX_BcpShiftStaffRatings_TenantKey_UserId",
                table: "BcpShiftStaffRatings",
                columns: new[] { "TenantKey", "UserId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BcpShiftAvailabilities");

            migrationBuilder.DropTable(
                name: "BcpShiftDocuments");

            migrationBuilder.DropTable(
                name: "BcpShiftNotificationPreferences");

            migrationBuilder.DropTable(
                name: "BcpShiftStaffProfiles");

            migrationBuilder.DropTable(
                name: "BcpShiftStaffRatings");

            migrationBuilder.DropColumn(
                name: "UpdatedUtc",
                table: "BcpShiftSwapRequests");

            migrationBuilder.DropColumn(
                name: "AcceptanceDeadlineUtc",
                table: "BcpShifts");

            migrationBuilder.DropColumn(
                name: "Address",
                table: "BcpShifts");

            migrationBuilder.DropColumn(
                name: "EventTag",
                table: "BcpShifts");

            migrationBuilder.DropColumn(
                name: "FacilityName",
                table: "BcpShifts");

            migrationBuilder.DropColumn(
                name: "PostCode",
                table: "BcpShifts");

            migrationBuilder.DropColumn(
                name: "UpdatedUtc",
                table: "BcpShiftLeaveRequests");

            migrationBuilder.DropColumn(
                name: "ClockInBiometricType",
                table: "BcpShiftAttendances");

            migrationBuilder.DropColumn(
                name: "ClockInBiometricVerified",
                table: "BcpShiftAttendances");

            migrationBuilder.DropColumn(
                name: "ClockInPhotoUrl",
                table: "BcpShiftAttendances");

            migrationBuilder.DropColumn(
                name: "ClockOutPhotoUrl",
                table: "BcpShiftAttendances");
        }
    }
}
