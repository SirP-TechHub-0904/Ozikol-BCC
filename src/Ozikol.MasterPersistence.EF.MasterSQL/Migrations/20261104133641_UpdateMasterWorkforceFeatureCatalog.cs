using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ozikol.MasterPersistence.EF.MasterSQL.Migrations
{
    /// <inheritdoc />
    public partial class UpdateMasterWorkforceFeatureCatalog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Update Feature #5: bcp-staff-rota (Consolidated single source of truth for Rota, Swaps & Leave)
            migrationBuilder.Sql(@"
UPDATE [dbo].[MasterFeatureCatalogs]
SET [Name] = 'Staff Rota & Shift Management',
    [MenuTitle] = 'Staff Rota & Shifts',
    [Description] = 'Multi-department weekly shift scheduling, recurring duty patterns, 24/7 cross-midnight overnight shifts, peer shift swaps, open-shift claiming, and annual/sick leave management.',
    [Icon] = 'calendar_month',
    [IsPublished] = 1,
    [IsAvailableForUse] = 1,
    [FreeTrialDays] = 14
WHERE [FeatureCode] = 'bcp-staff-rota';
");

            // 2. Remove Feature #6: bcp-shift-swaps (Merged into bcp-staff-rota)
            migrationBuilder.Sql(@"
DELETE FROM [dbo].[MasterTenantFeatureSubscriptions]
WHERE [MasterFeatureCatalogId] IN (SELECT [Id] FROM [dbo].[MasterFeatureCatalogs] WHERE [FeatureCode] = 'bcp-shift-swaps');

DELETE FROM [dbo].[MasterFeatureCatalogs]
WHERE [FeatureCode] = 'bcp-shift-swaps';
");

            // 3. Shift SortOrder down by 1 for all features after the removed bcp-shift-swaps
            migrationBuilder.Sql(@"
UPDATE [dbo].[MasterFeatureCatalogs]
SET [SortOrder] = [SortOrder] - 1
WHERE [SortOrder] > 6;
");

            // 4. Update Feature #6 (formerly #7): bcp-attendance-tracking (Biometric, QR & Live GPS Duty Monitor)
            migrationBuilder.Sql(@"
UPDATE [dbo].[MasterFeatureCatalogs]
SET [Name] = 'Biometric & QR Attendance Tracking',
    [MenuTitle] = 'Attendance & Live Duty',
    [Description] = 'Real-time clock-in/out via mobile GPS geofencing, QR codes, biometric sync, lone-worker safety welfare check-ins, and desktop workstation hardware gatekeeping.',
    [Icon] = 'timer',
    [IsPublished] = 1,
    [IsAvailableForUse] = 1,
    [FreeTrialDays] = 14
WHERE [FeatureCode] = 'bcp-attendance-tracking';
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
-- Shift SortOrder back up by 1
UPDATE [dbo].[MasterFeatureCatalogs]
SET [SortOrder] = [SortOrder] + 1
WHERE [SortOrder] >= 6;

-- Re-insert bcp-shift-swaps at SortOrder 6
IF NOT EXISTS (SELECT 1 FROM [dbo].[MasterFeatureCatalogs] WHERE [FeatureCode] = 'bcp-shift-swaps')
BEGIN
    INSERT INTO [dbo].[MasterFeatureCatalogs] (
        [Id], [FeatureCode], [Name], [MenuTitle], [Category], [Description], [Icon], [RoutePrefix],
        [IsCompulsory], [BillingType], [MonthlyPrice], [QuarterlyPrice], [YearlyPrice], [IsMetered],
        [SortOrder], [IsActive], [IsPublished], [IsAvailableForUse], [FreeTrialDays], [CreatedUtc]
    ) VALUES (
        NEWID(), 'bcp-shift-swaps', 'Shift Swaps & Leave Management', 'Shift Swaps & Leave', 'Workforce, Rota & Scheduling',
        'Peer-to-peer shift trade approvals, open-shift claiming, annual leave accrual tracking, sick leave requests, and supervisor sign-offs.',
        'swap_horiz', '/leave', 0, 1, 0.00, 0.00, 0.74, 0, 6, 1, 1, 0, 14, GETUTCDATE()
    );
END

UPDATE [dbo].[MasterFeatureCatalogs]
SET [Name] = 'Staff & Volunteer Rota Scheduling',
    [MenuTitle] = 'Staff & Volunteer Rota',
    [Description] = 'Multi-department weekly shift scheduling, recurring duty patterns, on-call assignment, and conflict detection.'
WHERE [FeatureCode] = 'bcp-staff-rota';

UPDATE [dbo].[MasterFeatureCatalogs]
SET [Name] = 'Biometric & QR Attendance Tracking',
    [MenuTitle] = 'Attendance & QR'
WHERE [FeatureCode] = 'bcp-attendance-tracking';
");
        }
    }
}
