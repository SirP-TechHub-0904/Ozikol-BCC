using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OzikolBCC.Persistence.EF.SQL.Migrations
{
    /// <inheritdoc />
    public partial class AddBcpDocumentCategoriesAndDocRefNumber : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ReferenceNumber",
                table: "BcpShiftDocuments",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "BcpDocumentCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IsMandatory = table.Column<bool>(type: "bit", nullable: false),
                    RequiresExpiryDate = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpDocumentCategories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BcpJobRoles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    DefaultHourlyRate = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    BillingChargeRate = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    MandatorySiaSector = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    BadgeColor = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpJobRoles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BcpStaffTypes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    DefaultContractedHours = table.Column<decimal>(type: "decimal(6,2)", nullable: false),
                    IsCompulsory = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpStaffTypes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BcpWorkforcePolicySettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    StandardWeeklyHours = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    MaxPermissibleWeeklyHours = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    MaxConsecutiveWorkingDays = table.Column<int>(type: "int", nullable: false),
                    Enforce48HourWeeklyCap = table.Column<bool>(type: "bit", nullable: false),
                    DayShiftStart = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    DayShiftEnd = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    NightShiftStart = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    NightShiftEnd = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    NightPremiumHourlyAllowance = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    EnableNightPremium = table.Column<bool>(type: "bit", nullable: false),
                    BreakMinutesFor6Hours = table.Column<int>(type: "int", nullable: false),
                    BreakMinutesFor8Hours = table.Column<int>(type: "int", nullable: false),
                    BreakMinutesFor12Hours = table.Column<int>(type: "int", nullable: false),
                    IsBreakPaid = table.Column<bool>(type: "bit", nullable: false),
                    BreakLoggingMode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    RequireUniformSizes = table.Column<bool>(type: "bit", nullable: false),
                    RequireDrivingLicense = table.Column<bool>(type: "bit", nullable: false),
                    RequireMedicalAllergies = table.Column<bool>(type: "bit", nullable: false),
                    RequireDbsCriminalDisclosure = table.Column<bool>(type: "bit", nullable: false),
                    CustomQuestionsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpWorkforcePolicySettings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BcpClientOrganizations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    OrganizationCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    BillingEmail = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    BillingPhone = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Address = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    City = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Country = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    PostCode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    PrimaryContactName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    PrimaryContactPhone = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpClientOrganizations", x => x.Id);
                });

            migrationBuilder.AddColumn<Guid>(
                name: "ClientOrganizationId",
                table: "BcpClientSites",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ClientOrganizationName",
                table: "BcpClientSites",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "StaffTypeId",
                table: "BcpShiftStaffProfiles",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StaffTypeName",
                table: "BcpShiftStaffProfiles",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "Permanent");

            migrationBuilder.AddColumn<decimal>(
                name: "ContractedWeeklyHours",
                table: "BcpShiftStaffProfiles",
                type: "decimal(6,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "DefaultHourlyRate",
                table: "BcpShiftStaffProfiles",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_BcpDocumentCategories_TenantKey_Code",
                table: "BcpDocumentCategories",
                columns: new[] { "TenantKey", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BcpDocumentCategories_TenantKey_IsActive",
                table: "BcpDocumentCategories",
                columns: new[] { "TenantKey", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_BcpDocumentCategories_TenantKey_SortOrder",
                table: "BcpDocumentCategories",
                columns: new[] { "TenantKey", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_BcpJobRoles_TenantKey_Code",
                table: "BcpJobRoles",
                columns: new[] { "TenantKey", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BcpJobRoles_TenantKey_IsActive",
                table: "BcpJobRoles",
                columns: new[] { "TenantKey", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_BcpJobRoles_TenantKey_SortOrder",
                table: "BcpJobRoles",
                columns: new[] { "TenantKey", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_BcpStaffTypes_TenantKey_Code",
                table: "BcpStaffTypes",
                columns: new[] { "TenantKey", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BcpStaffTypes_TenantKey_IsActive",
                table: "BcpStaffTypes",
                columns: new[] { "TenantKey", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_BcpStaffTypes_TenantKey_SortOrder",
                table: "BcpStaffTypes",
                columns: new[] { "TenantKey", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_BcpWorkforcePolicySettings_TenantKey",
                table: "BcpWorkforcePolicySettings",
                column: "TenantKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BcpClientSites_TenantKey_ClientOrganizationId",
                table: "BcpClientSites",
                columns: new[] { "TenantKey", "ClientOrganizationId" });

            migrationBuilder.CreateIndex(
                name: "IX_BcpShiftStaffProfiles_TenantKey_StaffTypeId",
                table: "BcpShiftStaffProfiles",
                columns: new[] { "TenantKey", "StaffTypeId" });

            migrationBuilder.AddForeignKey(
                name: "FK_BcpClientSites_BcpClientOrganizations_ClientOrganizationId",
                table: "BcpClientSites",
                column: "ClientOrganizationId",
                principalTable: "BcpClientOrganizations",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_BcpShiftStaffProfiles_BcpStaffTypes_StaffTypeId",
                table: "BcpShiftStaffProfiles",
                column: "StaffTypeId",
                principalTable: "BcpStaffTypes",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_BcpClientSites_BcpClientOrganizations_ClientOrganizationId",
                table: "BcpClientSites");

            migrationBuilder.DropForeignKey(
                name: "FK_BcpShiftStaffProfiles_BcpStaffTypes_StaffTypeId",
                table: "BcpShiftStaffProfiles");

            migrationBuilder.DropTable(
                name: "BcpDocumentCategories");

            migrationBuilder.DropTable(
                name: "BcpJobRoles");

            migrationBuilder.DropTable(
                name: "BcpStaffTypes");

            migrationBuilder.DropTable(
                name: "BcpWorkforcePolicySettings");

            migrationBuilder.DropTable(
                name: "BcpClientOrganizations");

            migrationBuilder.DropColumn(
                name: "ClientOrganizationId",
                table: "BcpClientSites");

            migrationBuilder.DropColumn(
                name: "ClientOrganizationName",
                table: "BcpClientSites");

            migrationBuilder.DropColumn(
                name: "StaffTypeId",
                table: "BcpShiftStaffProfiles");

            migrationBuilder.DropColumn(
                name: "StaffTypeName",
                table: "BcpShiftStaffProfiles");

            migrationBuilder.DropColumn(
                name: "ContractedWeeklyHours",
                table: "BcpShiftStaffProfiles");

            migrationBuilder.DropColumn(
                name: "DefaultHourlyRate",
                table: "BcpShiftStaffProfiles");

            migrationBuilder.DropColumn(
                name: "ReferenceNumber",
                table: "BcpShiftDocuments");
        }
    }
}
