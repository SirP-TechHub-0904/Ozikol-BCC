using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ozikol.MasterPersistence.EF.MasterSQL.Migrations
{
    /// <inheritdoc />
    public partial class UpdateMasterFeatureCatalogTitlesAndDescriptions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Update bcp-staff-rota: Unified Workforce, Shifts & Rotas
            migrationBuilder.Sql(@"
UPDATE [dbo].[MasterFeatureCatalogs]
SET [Name] = 'Workforce, Shifts & Rotas',
    [MenuTitle] = 'Workforce, Shifts & Rotas',
    [Description] = 'Unified shift management including multi-site rotas, peer-to-peer shift swaps, leave and vacation time-off approvals, and built-in shift QR clock-ins.',
    [Icon] = 'calendar_month',
    [IsPublished] = 1,
    [IsActive] = 1,
    [IsAvailableForUse] = 1
WHERE [FeatureCode] = 'bcp-staff-rota';
");

            // 2. Ensure bcp-shift-swaps is deactivated/consolidated so it never appears separately
            migrationBuilder.Sql(@"
UPDATE [dbo].[MasterFeatureCatalogs]
SET [IsActive] = 0,
    [IsPublished] = 0,
    [IsAvailableForUse] = 0
WHERE [FeatureCode] = 'bcp-shift-swaps';
");

            // 3. Update bcp-attendance-tracking: Standalone attendance tracking for non-shift businesses
            migrationBuilder.Sql(@"
UPDATE [dbo].[MasterFeatureCatalogs]
SET [Name] = 'Attendance & QR Check-In',
    [MenuTitle] = 'Attendance & QR Check-In',
    [Description] = 'Standalone attendance tracking, biometric clock-in, and geofenced QR check-ins for non-shift organizations, gyms, and facilities.',
    [Icon] = 'fingerprint',
    [IsPublished] = 1,
    [IsActive] = 1,
    [IsAvailableForUse] = 1
WHERE [FeatureCode] = 'bcp-attendance-tracking';
");

            // 4. Update bcp-mass-communication: Marketing Studio
            migrationBuilder.Sql(@"
UPDATE [dbo].[MasterFeatureCatalogs]
SET [Name] = 'Marketing Studio & Promotional Campaigns',
    [MenuTitle] = 'Marketing Studio',
    [Description] = 'Multi-channel promotional marketing broadcasts, drip campaigns, targeted SMS/email blasts, and delivery telemetry.',
    [Icon] = 'campaign',
    [IsPublished] = 1,
    [IsActive] = 1,
    [IsAvailableForUse] = 1
WHERE [FeatureCode] = 'bcp-mass-communication';
");

            // 5. Update bcp-social-media: Social Media Marketer
            migrationBuilder.Sql(@"
UPDATE [dbo].[MasterFeatureCatalogs]
SET [Name] = 'Social Media Marketer & Content Scheduler',
    [MenuTitle] = 'Social Media Marketer',
    [Description] = 'Automated social post scheduler, AI content assistant, queue publisher, and multi-network analytics.',
    [Icon] = 'share',
    [IsPublished] = 1,
    [IsActive] = 1,
    [IsAvailableForUse] = 1
WHERE [FeatureCode] = 'bcp-social-media';
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
UPDATE [dbo].[MasterFeatureCatalogs]
SET [Name] = 'Staff Rota & Shift Management',
    [MenuTitle] = 'Staff Rota & Shifts'
WHERE [FeatureCode] = 'bcp-staff-rota';

UPDATE [dbo].[MasterFeatureCatalogs]
SET [Name] = 'Biometric & QR Attendance Tracking',
    [MenuTitle] = 'Attendance & Live Duty'
WHERE [FeatureCode] = 'bcp-attendance-tracking';

UPDATE [dbo].[MasterFeatureCatalogs]
SET [Name] = 'Mass Multi-Channel SMS & Email',
    [MenuTitle] = 'Notification Studio'
WHERE [FeatureCode] = 'bcp-mass-communication';

UPDATE [dbo].[MasterFeatureCatalogs]
SET [Name] = 'Social Media Publisher & Queue',
    [MenuTitle] = 'Social Publisher'
WHERE [FeatureCode] = 'bcp-social-media';
");
        }
    }
}
