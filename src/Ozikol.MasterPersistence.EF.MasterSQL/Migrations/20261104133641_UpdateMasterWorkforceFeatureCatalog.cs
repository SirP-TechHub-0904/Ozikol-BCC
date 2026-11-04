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

            // 2. Update Feature #6: bcp-shift-swaps (Merged into bcp-staff-rota)
            migrationBuilder.Sql(@"
UPDATE [dbo].[MasterFeatureCatalogs]
SET [Name] = 'Shift Swaps & Leave Management (Merged into Rota)',
    [Description] = 'Consolidated into Staff Rota & Shift Management (bcp-staff-rota).',
    [IsActive] = 0,
    [IsPublished] = 0,
    [IsAvailableForUse] = 0
WHERE [FeatureCode] = 'bcp-shift-swaps';
");

            // 3. Update Feature #7: bcp-attendance-tracking (Biometric, QR & Live GPS Duty Monitor)
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
UPDATE [dbo].[MasterFeatureCatalogs]
SET [Name] = 'Staff & Volunteer Rota Scheduling',
    [MenuTitle] = 'Staff & Volunteer Rota',
    [Description] = 'Multi-department weekly shift scheduling, recurring duty patterns, on-call assignment, and conflict detection.'
WHERE [FeatureCode] = 'bcp-staff-rota';

UPDATE [dbo].[MasterFeatureCatalogs]
SET [Name] = 'Shift Swaps & Leave Management',
    [MenuTitle] = 'Shift Swaps & Leave',
    [Description] = 'Peer-to-peer shift trade approvals, open-shift claiming, annual leave accrual tracking, sick leave requests, and supervisor sign-offs.',
    [IsActive] = 1,
    [IsPublished] = 1
WHERE [FeatureCode] = 'bcp-shift-swaps';

UPDATE [dbo].[MasterFeatureCatalogs]
SET [Name] = 'Biometric & QR Attendance Tracking',
    [MenuTitle] = 'Attendance & QR'
WHERE [FeatureCode] = 'bcp-attendance-tracking';
");
        }
    }
}
