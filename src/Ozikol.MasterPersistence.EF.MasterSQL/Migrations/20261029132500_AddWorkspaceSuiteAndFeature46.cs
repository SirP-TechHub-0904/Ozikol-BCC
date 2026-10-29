using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ozikol.MasterPersistence.EF.MasterSQL.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkspaceSuiteAndFeature46 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "MasterFeatureSuites",
                columns: new[] { "Id", "CreatedUtc", "Description", "Icon", "IsActive", "IsPublished", "MenuTitle", "Name", "SortOrder", "SuiteCode", "SuiteLetter" },
                values: new object[]
                {
                    new Guid("11111111-0011-0000-0000-000000000011"),
                    new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc),
                    "Desktop app workspace operations, workplace station control, and connected workstation governance.",
                    "desktop_windows",
                    true,
                    true,
                    "Workspace",
                    "Workspace",
                    11,
                    "suite-workspace",
                    "K"
                });

            // Seed Feature #46: Workspace (Desktop only) in MasterFeatureCatalogs
            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM [MasterFeatureCatalogs] WHERE [FeatureCode] = 'bcp-workspace')
BEGIN
    INSERT INTO [MasterFeatureCatalogs]
    (
        [Id], [FeatureCode], [Name], [MenuTitle], [Category], [MasterFeatureSuiteId],
        [Description], [Icon], [RoutePrefix], [IsCompulsory], [BillingType],
        [MonthlyPrice], [QuarterlyPrice], [YearlyPrice], [IsMetered],
        [MeterUnitPrice], [MeterBlockSize], [IncludedFreeUnits],
        [IsActive], [IsPublished], [IsAvailableForUse], [IsInBeta], [SortOrder], [CreatedUtc]
    )
    VALUES
    (
        'A1000000-0000-0000-0000-000000000046',
        'bcp-workspace',
        N'Workspace (Desktop only)',
        N'Workspace (Desktop only)',
        N'Workspace',
        '11111111-0011-0000-0000-000000000011',
        N'Manage workplace operations, desktop app access, and connected workspace stations.',
        'desktop_windows',
        '/workspace/console',
        0,
        1,
        0.00,
        0.00,
        0.74,
        0,
        0.0000,
        1,
        0,
        1,
        1,
        0,
        0,
        46,
        '2026-01-01T00:00:00Z'
    );
END
ELSE
BEGIN
    UPDATE [MasterFeatureCatalogs]
    SET [Name] = N'Workspace (Desktop only)',
        [MenuTitle] = N'Workspace (Desktop only)',
        [Category] = N'Workspace',
        [MasterFeatureSuiteId] = '11111111-0011-0000-0000-000000000011',
        [SortOrder] = 46
    WHERE [FeatureCode] = 'bcp-workspace';
END
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DELETE FROM [MasterFeatureCatalogs] WHERE [FeatureCode] = 'bcp-workspace';");

            migrationBuilder.DeleteData(
                table: "MasterFeatureSuites",
                keyColumn: "Id",
                keyValue: new Guid("11111111-0011-0000-0000-000000000011"));
        }
    }
}

