using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OzikolBCC.Persistence.EF.SQL.Migrations
{
    /// <inheritdoc />
    public partial class AddBcpWorkstationSupervisorTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BcpWorkstationAccessRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    WorkstationId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    MachineName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    UserName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    RequestedProcessName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ApprovedUntil = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReviewedByUserId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ReviewedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpWorkstationAccessRequests", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BcpWorkstationAppPolicies",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DisplayName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    ProcessName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Category = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    IsAllowed = table.Column<bool>(type: "bit", nullable: false),
                    ApplicableRole = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    IconName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpWorkstationAppPolicies", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BcpWorkstationFilePolicies",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ApprovedDirectoryPath = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    UsbStoragePolicy = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    BlockUsbStorage = table.Column<bool>(type: "bit", nullable: false),
                    EnforceDirectorySandbox = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpWorkstationFilePolicies", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BcpWorkstations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StationKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    MachineName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    HardwareGuid = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    AssignedUserId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    AssignedUserName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    AssignedUserEmail = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    Department = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    IpAddress = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    OsVersion = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    ClientVersion = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    IsOnline = table.Column<bool>(type: "bit", nullable: false),
                    LastHeartbeat = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CurrentProcessName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CurrentWindowTitle = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CurrentDocumentPath = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IsLocked = table.Column<bool>(type: "bit", nullable: false),
                    LockReason = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    KioskEnforced = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpWorkstations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BcpWorkstationViolationLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    WorkstationId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    MachineName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    UserName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    ProcessName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    WindowTitle = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    FilePath = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ActionTaken = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ViolationType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Timestamp = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpWorkstationViolationLogs", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BcpWorkstationAccessRequests");

            migrationBuilder.DropTable(
                name: "BcpWorkstationAppPolicies");

            migrationBuilder.DropTable(
                name: "BcpWorkstationFilePolicies");

            migrationBuilder.DropTable(
                name: "BcpWorkstations");

            migrationBuilder.DropTable(
                name: "BcpWorkstationViolationLogs");
        }
    }
}
