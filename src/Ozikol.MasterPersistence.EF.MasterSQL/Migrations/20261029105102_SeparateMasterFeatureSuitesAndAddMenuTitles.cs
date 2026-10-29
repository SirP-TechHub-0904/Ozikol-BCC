using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Ozikol.MasterPersistence.EF.MasterSQL.Migrations
{
    /// <inheritdoc />
    public partial class SeparateMasterFeatureSuitesAndAddMenuTitles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "MasterFeatureSuiteId",
                table: "MasterFeatureCatalogs",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MenuTitle",
                table: "MasterFeatureCatalogs",
                type: "nvarchar(60)",
                maxLength: 60,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "MasterFeatureSuites",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SuiteCode = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    SuiteLetter = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    MenuTitle = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Icon = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsPublished = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterFeatureSuites", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "MasterFeatureSuites",
                columns: new[] { "Id", "CreatedUtc", "Description", "Icon", "IsActive", "IsPublished", "MenuTitle", "Name", "SortOrder", "SuiteCode", "SuiteLetter" },
                values: new object[,]
                {
                    { new Guid("11111111-0001-0000-0000-000000000001"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Real-time team messaging, committees, sub-groups, alumni directories, and confidential whistleblowing channels.", "groups", true, true, "People & Community", "People, Community & Collaboration", 1, "suite-people-community", "A" },
                    { new Guid("11111111-0002-0000-0000-000000000002"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Staff and volunteer shift scheduling, shift swaps, leave approvals, biometric/QR attendance, and appointment booking.", "calendar_month", true, true, "Workforce & Shifts", "Workforce, Rota & Scheduling", 2, "suite-workforce-rota", "B" },
                    { new Guid("11111111-0003-0000-0000-000000000003"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Dynamic form builders, periodic operational reports, opinion poll surveys, and confidential referee verification.", "assessment", true, true, "Reports & Forms", "Reports, Forms & Analytics", 3, "suite-reports-forms", "C" },
                    { new Guid("11111111-0004-0000-0000-000000000004"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Event registration, multi-tier ticketing, speaker session tracks, and QR badge check-in kiosks.", "confirmation_number", true, true, "Events & Ticketing", "Events & Training Management", 4, "suite-events-training", "D" },
                    { new Guid("11111111-0005-0000-0000-000000000005"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Membership dues, e-commerce storefront, commercial proposals, grant ledgers, and virtual treasury wallets.", "account_balance_wallet", true, true, "Finance & Commerce", "Finance & Commercial Revenue", 5, "suite-finance-revenue", "E" },
                    { new Guid("11111111-0006-0000-0000-000000000006"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Applicant tracking, tamper-evident e-voting, equipment logistics, asset inventory, and project Kanban boards.", "work", true, true, "Operations & Workflows", "Operations & Workflows", 6, "suite-operations-workflows", "F" },
                    { new Guid("11111111-0007-0000-0000-000000000007"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Ozi AI Studio assistant, bulk SMS/Email broadcast studio, helpdesk ticketing, live chat, and video rooms.", "campaign", true, true, "Communication & AI", "Communication, AI & Support", 7, "suite-communication-ai", "G" },
                    { new Guid("11111111-0008-0000-0000-000000000008"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Encrypted document vaults, LMS training courses, verifiable certificates, visitor gate passes, and KYC vetting.", "verified_user", true, true, "Compliance & Learning", "Compliance, Learning & Certification", 8, "suite-compliance-learning", "H" },
                    { new Guid("11111111-0009-0000-0000-000000000009"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Household census registries, offline field enumeration, printable digital ID cards, and population intelligence.", "map", true, true, "Demographics & Census", "Demographics & Civic Census", 9, "suite-demographics-census", "I" },
                    { new Guid("11111111-0010-0000-0000-000000000010"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Digital memorials, wedding and celebration RSVP portals, and interactive 3D page-flip brochures.", "celebration", true, true, "Life Events & Media", "Life Events & Publications", 10, "suite-life-events", "J" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_MasterFeatureCatalogs_MasterFeatureSuiteId",
                table: "MasterFeatureCatalogs",
                column: "MasterFeatureSuiteId");

            migrationBuilder.CreateIndex(
                name: "IX_MasterFeatureSuites_IsActive",
                table: "MasterFeatureSuites",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_MasterFeatureSuites_IsPublished",
                table: "MasterFeatureSuites",
                column: "IsPublished");

            migrationBuilder.CreateIndex(
                name: "IX_MasterFeatureSuites_SortOrder",
                table: "MasterFeatureSuites",
                column: "SortOrder");

            migrationBuilder.CreateIndex(
                name: "IX_MasterFeatureSuites_SuiteCode",
                table: "MasterFeatureSuites",
                column: "SuiteCode",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_MasterFeatureCatalogs_MasterFeatureSuites_MasterFeatureSuiteId",
                table: "MasterFeatureCatalogs",
                column: "MasterFeatureSuiteId",
                principalTable: "MasterFeatureSuites",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.Sql(@"
-- 1. Ensure all 45 canonical platform features exist in MasterFeatureCatalogs
IF NOT EXISTS (SELECT 1 FROM MasterFeatureCatalogs WHERE FeatureCode = 'bcp-calendar-followups')
    INSERT INTO MasterFeatureCatalogs (Id, FeatureCode, Name, MenuTitle, Category, MasterFeatureSuiteId, Description, Icon, RoutePrefix, IsCompulsory, BillingType, MonthlyPrice, QuarterlyPrice, YearlyPrice, IsMetered, MeterUnitName, MeterUnitPrice, MeterBlockSize, IncludedFreeUnits, SortOrder, IsActive, IsPublished, IsAvailableForUse, IsInBeta, CreatedUtc)
    VALUES (NEWID(), 'bcp-calendar-followups', 'Calendar & Automated Follow-Up Routine', 'Calendar & Follow-Ups', 'Workforce, Rota & Scheduling', '11111111-0002-0000-0000-000000000002', 'Two-way calendar synchronization, routine appointment reminders, and automated member follow-up cadences.', 'event_repeat', '/calendar-followups', 1, 1, 0.00, 0.00, 0.74, 0, NULL, 0, 1, 0, 9, 1, 1, 0, 0, GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM MasterFeatureCatalogs WHERE FeatureCode = 'bcp-reference-forms')
    INSERT INTO MasterFeatureCatalogs (Id, FeatureCode, Name, MenuTitle, Category, MasterFeatureSuiteId, Description, Icon, RoutePrefix, IsCompulsory, BillingType, MonthlyPrice, QuarterlyPrice, YearlyPrice, IsMetered, MeterUnitName, MeterUnitPrice, MeterBlockSize, IncludedFreeUnits, SortOrder, IsActive, IsPublished, IsAvailableForUse, IsInBeta, CreatedUtc)
    VALUES (NEWID(), 'bcp-reference-forms', 'Reference Form & Referee Verification', 'Reference Forms', 'Reports, Forms & Analytics', '11111111-0003-0000-0000-000000000003', 'Design custom confidential reference questionnaires, dispatch secure magic links, and generate vetting dossiers.', 'fact_check', '/reference-forms', 1, 1, 0.00, 0.00, 0.74, 0, NULL, 0, 1, 0, 13, 1, 1, 0, 0, GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM MasterFeatureCatalogs WHERE FeatureCode = 'bcp-embedded-banking')
    INSERT INTO MasterFeatureCatalogs (Id, FeatureCode, Name, MenuTitle, Category, MasterFeatureSuiteId, Description, Icon, RoutePrefix, IsCompulsory, BillingType, MonthlyPrice, QuarterlyPrice, YearlyPrice, IsMetered, MeterUnitName, MeterUnitPrice, MeterBlockSize, IncludedFreeUnits, SortOrder, IsActive, IsPublished, IsAvailableForUse, IsInBeta, CreatedUtc)
    VALUES (NEWID(), 'bcp-embedded-banking', 'Virtual Wallets & Payout Treasury', 'Wallets & Treasury', 'Finance & Commercial Revenue', '11111111-0005-0000-0000-000000000005', 'Multi-currency sub-accounts, automated split settlements, vendor payouts, and bank reconciliation.', 'account_balance', '/embedded-banking', 1, 1, 0.00, 0.00, 0.74, 0, NULL, 0, 1, 0, 21, 1, 1, 0, 0, GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM MasterFeatureCatalogs WHERE FeatureCode = 'bcp-gocall-ai')
    INSERT INTO MasterFeatureCatalogs (Id, FeatureCode, Name, MenuTitle, Category, MasterFeatureSuiteId, Description, Icon, RoutePrefix, IsCompulsory, BillingType, MonthlyPrice, QuarterlyPrice, YearlyPrice, IsMetered, MeterUnitName, MeterUnitPrice, MeterBlockSize, IncludedFreeUnits, SortOrder, IsActive, IsPublished, IsAvailableForUse, IsInBeta, CreatedUtc)
    VALUES (NEWID(), 'bcp-gocall-ai', 'Voice & Video Conferencing Rooms', 'Video Conferencing', 'Communication, AI & Support', '11111111-0007-0000-0000-000000000007', 'Browser-based HD video meetings, screen sharing, automated AI meeting minutes, and cloud recording.', 'video_call', '/gocall', 1, 1, 0.00, 0.00, 0.74, 0, NULL, 0, 1, 0, 33, 1, 1, 0, 0, GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM MasterFeatureCatalogs WHERE FeatureCode = 'bcp-kyc-verification')
    INSERT INTO MasterFeatureCatalogs (Id, FeatureCode, Name, MenuTitle, Category, MasterFeatureSuiteId, Description, Icon, RoutePrefix, IsCompulsory, BillingType, MonthlyPrice, QuarterlyPrice, YearlyPrice, IsMetered, MeterUnitName, MeterUnitPrice, MeterBlockSize, IncludedFreeUnits, SortOrder, IsActive, IsPublished, IsAvailableForUse, IsInBeta, CreatedUtc)
    VALUES (NEWID(), 'bcp-kyc-verification', 'Identity KYC & Background Vetting', 'KYC Verification', 'Compliance, Learning & Certification', '11111111-0008-0000-0000-000000000008', 'Automated government ID verification, facial liveness checks, and compliance screening.', 'verified_user', '/kyc', 1, 1, 0.00, 0.00, 0.74, 0, NULL, 0, 1, 0, 38, 1, 1, 0, 0, GETUTCDATE());

-- 2. Link all features to their canonical MasterFeatureSuites by Category
UPDATE MasterFeatureCatalogs SET MasterFeatureSuiteId = '11111111-0001-0000-0000-000000000001' WHERE Category = 'People, Community & Collaboration';
UPDATE MasterFeatureCatalogs SET MasterFeatureSuiteId = '11111111-0002-0000-0000-000000000002' WHERE Category = 'Workforce, Rota & Scheduling';
UPDATE MasterFeatureCatalogs SET MasterFeatureSuiteId = '11111111-0003-0000-0000-000000000003' WHERE Category = 'Reports, Forms & Analytics';
UPDATE MasterFeatureCatalogs SET MasterFeatureSuiteId = '11111111-0004-0000-0000-000000000004' WHERE Category = 'Events & Training Management';
UPDATE MasterFeatureCatalogs SET MasterFeatureSuiteId = '11111111-0005-0000-0000-000000000005' WHERE Category = 'Finance & Commercial Revenue';
UPDATE MasterFeatureCatalogs SET MasterFeatureSuiteId = '11111111-0006-0000-0000-000000000006' WHERE Category = 'Operations & Workflows';
UPDATE MasterFeatureCatalogs SET MasterFeatureSuiteId = '11111111-0007-0000-0000-000000000007' WHERE Category = 'Communication, AI & Support';
UPDATE MasterFeatureCatalogs SET MasterFeatureSuiteId = '11111111-0008-0000-0000-000000000008' WHERE Category = 'Compliance, Learning & Certification';
UPDATE MasterFeatureCatalogs SET MasterFeatureSuiteId = '11111111-0009-0000-0000-000000000009' WHERE Category = 'Demographics & Civic Census';
UPDATE MasterFeatureCatalogs SET MasterFeatureSuiteId = '11111111-0010-0000-0000-000000000010' WHERE Category = 'Life Events & Publications';

-- 3. Seed concise Sidebar MenuTitle for all 45 canonical features
UPDATE MasterFeatureCatalogs SET MenuTitle = 'Chat Messenger', IsAvailableForUse = 1 WHERE FeatureCode = 'bcp-community-messenger';
UPDATE MasterFeatureCatalogs SET MenuTitle = 'Groups & Committees', IsAvailableForUse = 1 WHERE FeatureCode = 'bcp-committees';
UPDATE MasterFeatureCatalogs SET MenuTitle = 'Alumni Network', IsAvailableForUse = 1 WHERE FeatureCode = 'bcp-alumni-directory';
UPDATE MasterFeatureCatalogs SET MenuTitle = 'Whistleblowing' WHERE FeatureCode = 'bcp-whistleblowing';

UPDATE MasterFeatureCatalogs SET MenuTitle = 'Staff & Volunteer Rota' WHERE FeatureCode = 'bcp-staff-rota';
UPDATE MasterFeatureCatalogs SET MenuTitle = 'Shift Swaps & Leave' WHERE FeatureCode = 'bcp-shift-swaps';
UPDATE MasterFeatureCatalogs SET MenuTitle = 'Attendance & QR' WHERE FeatureCode = 'bcp-attendance-tracking';
UPDATE MasterFeatureCatalogs SET MenuTitle = 'Appointment Booking' WHERE FeatureCode = 'bcp-appointment-booking';
UPDATE MasterFeatureCatalogs SET MenuTitle = 'Calendar & Follow-Ups' WHERE FeatureCode = 'bcp-calendar-followups';

UPDATE MasterFeatureCatalogs SET MenuTitle = 'Periodic Reports' WHERE FeatureCode = 'bcp-interval-reporting';
UPDATE MasterFeatureCatalogs SET MenuTitle = 'Forms & Surveys', IsAvailableForUse = 1 WHERE FeatureCode = 'bcp-form-builder';
UPDATE MasterFeatureCatalogs SET MenuTitle = 'Opinion Polls' WHERE FeatureCode = 'bcp-survey-analytics';
UPDATE MasterFeatureCatalogs SET MenuTitle = 'Reference Forms' WHERE FeatureCode = 'bcp-reference-forms';

UPDATE MasterFeatureCatalogs SET MenuTitle = 'Events & Passes' WHERE FeatureCode = 'bcp-event-ticketing';
UPDATE MasterFeatureCatalogs SET MenuTitle = 'Speaker & Sessions' WHERE FeatureCode = 'bcp-speaker-sessions';
UPDATE MasterFeatureCatalogs SET MenuTitle = 'Attendee Check-In' WHERE FeatureCode = 'bcp-attendee-management';

UPDATE MasterFeatureCatalogs SET MenuTitle = 'Invoicing & Dues' WHERE FeatureCode = 'bcp-invoicing-dues';
UPDATE MasterFeatureCatalogs SET MenuTitle = 'Commerce Studio', IsAvailableForUse = 1 WHERE FeatureCode = 'bcp-store-ecommerce';
UPDATE MasterFeatureCatalogs SET MenuTitle = 'Proposals & Pipeline' WHERE FeatureCode = 'bcp-proposal-pipeline';
UPDATE MasterFeatureCatalogs SET MenuTitle = 'Grants & Donations' WHERE FeatureCode = 'bcp-grant-ledger';
UPDATE MasterFeatureCatalogs SET MenuTitle = 'Wallets & Treasury' WHERE FeatureCode = 'bcp-embedded-banking';

UPDATE MasterFeatureCatalogs SET MenuTitle = 'Recruitment & Hiring' WHERE FeatureCode = 'bcp-recruitment-hiring';
UPDATE MasterFeatureCatalogs SET MenuTitle = 'E-Voting & Elections' WHERE FeatureCode = 'bcp-elections-evoting';
UPDATE MasterFeatureCatalogs SET MenuTitle = 'Equipment Logistics' WHERE FeatureCode = 'bcp-equipment-fleet';
UPDATE MasterFeatureCatalogs SET MenuTitle = 'Asset Inventory' WHERE FeatureCode = 'bcp-company-assets';
UPDATE MasterFeatureCatalogs SET MenuTitle = 'Projects & Tasks' WHERE FeatureCode = 'bcp-project-tasks';

UPDATE MasterFeatureCatalogs SET MenuTitle = 'AI Smart Assist', IsAvailableForUse = 1 WHERE FeatureCode = 'bcp-ai-smart-assist';
UPDATE MasterFeatureCatalogs SET MenuTitle = 'Notification Studio', IsAvailableForUse = 1 WHERE FeatureCode = 'bcp-mass-communication';
UPDATE MasterFeatureCatalogs SET MenuTitle = 'Helpdesk Support' WHERE FeatureCode = 'bcp-helpdesk-support';
UPDATE MasterFeatureCatalogs SET MenuTitle = 'Live Chat Widget' WHERE FeatureCode = 'bcp-live-chat';
UPDATE MasterFeatureCatalogs SET MenuTitle = 'Social Publisher' WHERE FeatureCode = 'bcp-social-media';
UPDATE MasterFeatureCatalogs SET MenuTitle = 'Bio Link Hub' WHERE FeatureCode = 'bcp-bio-link';
UPDATE MasterFeatureCatalogs SET MenuTitle = 'Video Conferencing' WHERE FeatureCode = 'bcp-gocall-ai';

UPDATE MasterFeatureCatalogs SET MenuTitle = 'Document Vault' WHERE FeatureCode = 'bcp-document-management';
UPDATE MasterFeatureCatalogs SET MenuTitle = 'LMS & Courses' WHERE FeatureCode = 'bcp-learning-management';
UPDATE MasterFeatureCatalogs SET MenuTitle = 'Certificates' WHERE FeatureCode = 'bcp-certificate-verification';
UPDATE MasterFeatureCatalogs SET MenuTitle = 'Visitor Gate Passes' WHERE FeatureCode = 'bcp-visitor-gate';
UPDATE MasterFeatureCatalogs SET MenuTitle = 'KYC Verification' WHERE FeatureCode = 'bcp-kyc-verification';

UPDATE MasterFeatureCatalogs SET MenuTitle = 'Community Census' WHERE FeatureCode = 'bcp-community-census';
UPDATE MasterFeatureCatalogs SET MenuTitle = 'Field Surveyor' WHERE FeatureCode = 'bcp-field-surveyor';
UPDATE MasterFeatureCatalogs SET MenuTitle = 'Digital Member IDs' WHERE FeatureCode = 'bcp-resident-id-cards';
UPDATE MasterFeatureCatalogs SET MenuTitle = 'Population Analytics' WHERE FeatureCode = 'bcp-demographic-analytics';

UPDATE MasterFeatureCatalogs SET MenuTitle = 'Digital Memorials' WHERE FeatureCode = 'bcp-digital-memorials';
UPDATE MasterFeatureCatalogs SET MenuTitle = 'Wedding Portals' WHERE FeatureCode = 'bcp-wedding-portals';
UPDATE MasterFeatureCatalogs SET MenuTitle = 'Digital Brochures' WHERE FeatureCode = 'bcp-digital-brochures';
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_MasterFeatureCatalogs_MasterFeatureSuites_MasterFeatureSuiteId",
                table: "MasterFeatureCatalogs");

            migrationBuilder.DropTable(
                name: "MasterFeatureSuites");

            migrationBuilder.DropIndex(
                name: "IX_MasterFeatureCatalogs_MasterFeatureSuiteId",
                table: "MasterFeatureCatalogs");

            migrationBuilder.DropColumn(
                name: "MasterFeatureSuiteId",
                table: "MasterFeatureCatalogs");

            migrationBuilder.DropColumn(
                name: "MenuTitle",
                table: "MasterFeatureCatalogs");
        }
    }
}
