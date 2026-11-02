using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ozikol.MasterPersistence.EF.MasterSQL.Migrations
{
    /// <summary>
    /// EF Core Migration: Seeds the canonical 37 modular platform capabilities across the 10 feature suites.
    /// Provisions ~70% as Compulsory (included in base platform plan) and ~30% as Optional Add-ons.
    /// Runs exactly once per database environment to preserve future custom database updates.
    /// </summary>
    public partial class SeedCanonicalMasterFeatureCatalogs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
-- Insert the canonical 37 platform features across the 10 suites
INSERT INTO MasterFeatureCatalogs (Id, FeatureCode, Name, Category, Description, Icon, RoutePrefix, IsCompulsory, BillingType, MonthlyPrice, QuarterlyPrice, YearlyPrice, IsMetered, MeterUnitName, MeterUnitPrice, MeterBlockSize, IncludedFreeUnits, SortOrder, IsActive, IsInBeta, CreatedUtc)
VALUES
-- Suite 01: People, Community & Collaboration
(NEWID(), 'bcp-community-messenger', 'Community Messenger & Team Chat', 'People, Community & Collaboration', 'Real-time 1-to-1 DMs, group channels, and platform-wide floating quick chat with end-to-end encryption.', 'chat', '/messenger', 1, 1, 0.00, 0.00, 0.00, 0, NULL, 0, 1, 0, 1, 1, 0, GETUTCDATE()),
(NEWID(), 'bcp-committees', 'Committees & Sub-Groups', 'People, Community & Collaboration', 'Manage committee leadership, meeting schedules, minutes, voting resolutions, and member rosters.', 'groups', '/committees', 1, 1, 0.00, 0.00, 0.00, 0, NULL, 0, 1, 0, 2, 1, 0, GETUTCDATE()),
(NEWID(), 'bcp-alumni-directory', 'Alumni Network & Directory', 'People, Community & Collaboration', 'Searchable alumni directory, graduating class portals, career networking, and mentoring rosters.', 'badge', '/alumni', 0, 1, 2.99, 8.07, 28.70, 0, NULL, 0, 1, 0, 3, 1, 0, GETUTCDATE()),
(NEWID(), 'bcp-whistleblowing', 'Anonymous Whistleblowing & Feedback', 'People, Community & Collaboration', 'Encrypted, anonymous whistleblowing submission channel and internal investigation management ledger.', 'security', '/whistleblowing', 1, 1, 0.00, 0.00, 0.00, 0, NULL, 0, 1, 0, 4, 1, 0, GETUTCDATE()),

-- Suite 02: Workforce, Rota & Scheduling
(NEWID(), 'bcp-staff-rota', 'Staff & Volunteer Rota Scheduling', 'Workforce, Rota & Scheduling', 'Multi-department weekly shift scheduling, recurring duty patterns, on-call assignment, and conflict detection.', 'calendar_month', '/rota', 1, 1, 0.00, 0.00, 0.00, 0, NULL, 0, 1, 0, 5, 1, 0, GETUTCDATE()),
(NEWID(), 'bcp-shift-swaps', 'Shift Swaps & Leave Management', 'Workforce, Rota & Scheduling', 'Peer-to-peer shift trade approvals, annual leave accrual tracking, sick leave requests, and supervisor sign-offs.', 'swap_horiz', '/leave', 1, 1, 0.00, 0.00, 0.00, 0, NULL, 0, 1, 0, 6, 1, 0, GETUTCDATE()),
(NEWID(), 'bcp-attendance-tracking', 'Biometric & QR Attendance Tracking', 'Workforce, Rota & Scheduling', 'Clock-in/out via mobile QR codes, biometric device sync, geolocation geofencing, and timesheet reports.', 'fingerprint', '/attendance', 0, 1, 4.99, 13.47, 47.90, 0, NULL, 0, 1, 0, 7, 1, 0, GETUTCDATE()),
(NEWID(), 'bcp-appointment-booking', 'Appointment & Facility Booking', 'Workforce, Rota & Scheduling', 'Online calendar booking for consultations, counseling, meeting rooms, shared equipment, and venues.', 'book_online', '/appointments', 1, 1, 0.00, 0.00, 0.00, 0, NULL, 0, 1, 0, 8, 1, 0, GETUTCDATE()),

-- Suite 03: Reports, Forms & Analytics
(NEWID(), 'bcp-interval-reporting', 'Interval & Periodic Reporting', 'Reports, Forms & Analytics', 'Automated weekly, monthly, and annual operational reports with PDF exports and executive summaries.', 'assessment', '/reporting', 1, 1, 0.00, 0.00, 0.00, 0, NULL, 0, 1, 0, 9, 1, 0, GETUTCDATE()),
(NEWID(), 'bcp-form-builder', 'Custom Dynamic Form Builder', 'Reports, Forms & Analytics', 'Drag-and-drop form designer with conditional logic, payment collection, file uploads, and webhook integrations.', 'dynamic_form', '/forms', 1, 1, 0.00, 0.00, 0.00, 0, NULL, 0, 1, 0, 10, 1, 0, GETUTCDATE()),
(NEWID(), 'bcp-survey-analytics', 'Survey & Opinion Poll Analytics', 'Reports, Forms & Analytics', 'Create multi-question satisfaction surveys, NPS sentiment scoring, and real-time response distribution charts.', 'poll', '/surveys', 0, 1, 2.99, 8.07, 28.70, 0, NULL, 0, 1, 0, 11, 1, 0, GETUTCDATE()),

-- Suite 04: Events & Training Management
(NEWID(), 'bcp-event-ticketing', 'Event Ticketing & Registration', 'Events & Training Management', 'Paid and free event registration, tiered tickets, promo codes, digital PDF passes, and Apple/Google Wallet cards.', 'confirmation_number', '/events', 1, 1, 0.00, 0.00, 0.00, 0, NULL, 0, 1, 0, 12, 1, 0, GETUTCDATE()),
(NEWID(), 'bcp-speaker-sessions', 'Speaker & Session Management', 'Events & Training Management', 'Conference schedules, track/room allocations, speaker bio directories, presentation slide downloads, and Q&A.', 'record_voice_over', '/sessions', 0, 1, 3.99, 10.77, 38.30, 0, NULL, 0, 1, 0, 13, 1, 0, GETUTCDATE()),
(NEWID(), 'bcp-attendee-management', 'Attendee Management & QR Check-in', 'Events & Training Management', 'Rapid onsite QR scanning, badge printing, attendance telemetry, live delegate rosters, and post-event certificates.', 'how_to_reg', '/attendees', 1, 1, 0.00, 0.00, 0.00, 0, NULL, 0, 1, 0, 14, 1, 0, GETUTCDATE()),

-- Suite 05: Finance & Commercial Revenue
(NEWID(), 'bcp-invoicing-dues', 'Invoicing, Dues & Pledges', 'Finance & Commercial Revenue', 'Membership dues billing, automated payment reminders, recurring invoice schedules, and Paystack/Stripe gateways.', 'receipt_long', '/invoicing', 1, 1, 0.00, 0.00, 0.00, 0, NULL, 0, 1, 0, 15, 1, 0, GETUTCDATE()),
(NEWID(), 'bcp-store-ecommerce', 'Store & E-Commerce Catalog', 'Finance & Commercial Revenue', 'Online storefront for merchandise, digital resources, publications, and uniform orders with inventory tracking.', 'shopping_bag', '/store', 0, 1, 5.99, 16.17, 57.50, 0, NULL, 0, 1, 0, 16, 1, 0, GETUTCDATE()),
(NEWID(), 'bcp-proposal-pipeline', 'Proposal & Grant Pipeline', 'Finance & Commercial Revenue', 'Track grant opportunities, donor proposal pipelines, pitch decks, award milestones, and disbursement timelines.', 'monetization_on', '/proposals', 1, 1, 0.00, 0.00, 0.00, 0, NULL, 0, 1, 0, 17, 1, 0, GETUTCDATE()),
(NEWID(), 'bcp-grant-ledger', 'Grant & Project Ledger', 'Finance & Commercial Revenue', 'Restricted fund accounting, grant allocation burn rates, vendor receipt audits, and donor compliance reporting.', 'account_balance', '/grant-ledger', 0, 1, 4.99, 13.47, 47.90, 0, NULL, 0, 1, 0, 18, 1, 0, GETUTCDATE()),

-- Suite 06: Operations & Workflows
(NEWID(), 'bcp-recruitment-hiring', 'Recruitment & Applicant Tracking', 'Operations & Workflows', 'Job board publishing, candidate resume ingestion, interview scorecards, background checks, and offer letter generation.', 'person_search', '/recruitment', 1, 1, 0.00, 0.00, 0.00, 0, NULL, 0, 1, 0, 19, 1, 0, GETUTCDATE()),
(NEWID(), 'bcp-elections-evoting', 'Elections & Secure E-Voting', 'Operations & Workflows', 'Cryptographic secret-ballot e-voting, voter voter registry validation, candidate profiles, and real-time certified tallies.', 'how_to_vote', '/elections', 0, 1, 3.99, 10.77, 38.30, 0, NULL, 0, 1, 0, 20, 1, 0, GETUTCDATE()),
(NEWID(), 'bcp-equipment-fleet', 'Equipment & Fleet Management', 'Operations & Workflows', 'Vehicle fleet tracking, maintenance logs, insurance renewal alerts, fuel telemetry, and checkout custodianship.', 'local_shipping', '/fleet', 1, 1, 0.00, 0.00, 0.00, 0, NULL, 0, 1, 0, 21, 1, 0, GETUTCDATE()),
(NEWID(), 'bcp-company-assets', 'Fixed Asset & Tag Registry', 'Operations & Workflows', 'Depreciation schedules, QR/barcode asset tags, physical audit verification, and equipment assignment records.', 'inventory_2', '/assets', 1, 1, 0.00, 0.00, 0.00, 0, NULL, 0, 1, 0, 22, 1, 0, GETUTCDATE()),
(NEWID(), 'bcp-project-tasks', 'Project & Task Tracking Board', 'Operations & Workflows', 'Kanban boards, Gantt milestones, task dependencies, time logging, and cross-team project collaboration.', 'task_alt', '/projects', 1, 1, 0.00, 0.00, 0.00, 0, NULL, 0, 1, 0, 23, 1, 0, GETUTCDATE()),

-- Suite 07: Communication, AI & Support
(NEWID(), 'bcp-ai-smart-assist', 'AI Smart Assist & Workflows', 'Communication, AI & Support', 'AI-powered document summarization, draft generation, member inquiry auto-replies, and intelligent search.', 'smart_toy', '/ai', 0, 1, 6.99, 18.87, 67.10, 0, NULL, 0, 1, 0, 24, 1, 0, GETUTCDATE()),
(NEWID(), 'bcp-mass-communication', 'Mass Multi-Channel SMS & Email', 'Communication, AI & Support', 'Broadcast bulk SMS, targeted email newsletters, WhatsApp announcements, and delivery receipts.', 'campaign', '/communications', 1, 1, 0.00, 0.00, 0.00, 0, NULL, 0, 1, 0, 25, 1, 0, GETUTCDATE()),
(NEWID(), 'bcp-helpdesk-support', 'Helpdesk & Ticketing Support', 'Communication, AI & Support', 'Multi-agent ticket queue, SLA resolution timers, automated routing, canned answers, and customer CSAT surveys.', 'support_agent', '/helpdesk', 1, 1, 0.00, 0.00, 0.00, 0, NULL, 0, 1, 0, 26, 1, 0, GETUTCDATE()),
(NEWID(), 'bcp-live-chat', 'Live Chat & Widget Messenger', 'Communication, AI & Support', 'Embeddable website live chat widget, real-time agent notifications, file sharing, and visitor routing.', 'forum', '/live-chat', 1, 1, 0.00, 0.00, 0.00, 0, NULL, 0, 1, 0, 27, 1, 0, GETUTCDATE()),
(NEWID(), 'bcp-social-media', 'Social Media Publisher & Queue', 'Communication, AI & Support', 'Schedule and publish posts to Facebook, X (Twitter), LinkedIn, and Instagram with analytics tracking.', 'share', '/social', 0, 1, 3.99, 10.77, 38.30, 0, NULL, 0, 1, 0, 28, 1, 0, GETUTCDATE()),
(NEWID(), 'bcp-bio-link', 'Bio Link Hub & Public Microsite', 'Communication, AI & Support', 'Custom branded link-in-bio hub, event buttons, donation links, and embeddable social media widgets.', 'link', '/bio', 1, 1, 0.00, 0.00, 0.00, 0, NULL, 0, 1, 0, 29, 1, 0, GETUTCDATE()),

-- Suite 08: Compliance, Learning & Certification
(NEWID(), 'bcp-document-management', 'Document Vault & Revision Control', 'Compliance, Learning & Certification', 'Encrypted digital document storage, role-based access permissions, version history, and audit watermarking.', 'folder_open', '/documents', 1, 1, 0.00, 0.00, 0.00, 0, NULL, 0, 1, 0, 30, 1, 0, GETUTCDATE()),
(NEWID(), 'bcp-learning-management', 'Learning Management & Course LMS', 'Compliance, Learning & Certification', 'Video lectures, quiz assessments, course progress tracking, instructor gradebooks, and completion diplomas.', 'school', '/lms', 0, 1, 5.99, 16.17, 57.50, 0, NULL, 0, 1, 0, 31, 1, 0, GETUTCDATE()),
(NEWID(), 'bcp-certificate-verification', 'Certificate Issuance & Verification', 'Compliance, Learning & Certification', 'Issue tamper-proof certificates with QR validation codes, public lookup portal, and blockchain stamping.', 'workspace_premium', '/certificates', 1, 1, 0.00, 0.00, 0.00, 0, NULL, 0, 1, 0, 32, 1, 0, GETUTCDATE()),
(NEWID(), 'bcp-visitor-gate', 'Visitor & Gate Pass Management', 'Compliance, Learning & Certification', 'Digital visitor registration, host notifications, visitor badge generation, NDA signing, and gate logs.', 'meeting_room', '/visitor-gate', 1, 1, 0.00, 0.00, 0.00, 0, NULL, 0, 1, 0, 33, 1, 0, GETUTCDATE()),

-- Suite 09: Demographics & Civic Census
(NEWID(), 'bcp-community-census', 'Community & Household Census', 'Demographics & Civic Census', 'Household census enumeration, socio-economic surveys, family relationships, and civic profiling.', 'people', '/census', 1, 1, 0.00, 0.00, 0.00, 0, NULL, 0, 1, 0, 34, 1, 0, GETUTCDATE()),
(NEWID(), 'bcp-field-surveyor', 'Offline Field Surveyor & GPS', 'Demographics & Civic Census', 'Mobile surveyor data collection with offline caching, GPS location stamping, and photo evidence attachments.', 'location_on', '/field-survey', 0, 1, 4.99, 13.47, 47.90, 0, NULL, 0, 1, 0, 35, 1, 0, GETUTCDATE()),
(NEWID(), 'bcp-resident-id-cards', 'Resident PVC & Digital ID Cards', 'Demographics & Civic Census', 'PVC card template designer, batch barcode/QR generation, biometric photo capture, and print queue management.', 'badge', '/id-cards', 1, 1, 0.00, 0.00, 0.00, 0, NULL, 0, 1, 0, 36, 1, 0, GETUTCDATE()),
(NEWID(), 'bcp-demographic-analytics', 'Demographic & Spatial Analytics', 'Demographics & Civic Census', 'Interactive GIS mapping, age/gender pyramid distribution, income stratifications, and civic cluster charts.', 'insights', '/demographics', 1, 1, 0.00, 0.00, 0.00, 0, NULL, 0, 1, 0, 37, 1, 0, GETUTCDATE()),

-- Suite 10: Life Events & Publications
(NEWID(), 'bcp-digital-memorials', 'Digital Memorials & Funeral Tributes', 'Life Events & Publications', 'Online memorial portals, virtual candles, biography galleries, eulogy streams, and printable funeral booklets.', 'local_fire_department', '/memorials', 1, 1, 0.00, 0.00, 0.00, 0, NULL, 0, 1, 0, 38, 1, 0, GETUTCDATE()),
(NEWID(), 'bcp-wedding-portals', 'Weddings & Celebration Portals', 'Life Events & Publications', 'Digital wedding invitations, RSVP registry, order of service flipbook, and guest live camera snapping.', 'celebration', '/weddings', 0, 1, 2.99, 8.07, 28.70, 0, NULL, 0, 1, 0, 39, 1, 0, GETUTCDATE()),
(NEWID(), 'bcp-digital-brochures', 'Digital Brochures & Magazine Publishing', 'Life Events & Publications', 'Interactive 3D page-flip brochures, anniversary magazines, souvenir programmes, and PDF downloads.', 'auto_stories', '/brochures', 1, 1, 0.00, 0.00, 0.00, 0, NULL, 0, 1, 0, 40, 1, 0, GETUTCDATE());
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Drop features if needed
        }
    }
}
