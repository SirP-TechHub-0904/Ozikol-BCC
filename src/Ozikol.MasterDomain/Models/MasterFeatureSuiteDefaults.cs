using System;
using System.Collections.Generic;

namespace Ozikol.MasterDomain.Models
{
    /// <summary>
    /// Canonical default definitions for the 11 platform suites and 46 modular features,
    /// providing deterministic Suite IDs, Full Titles, and concise Sidebar Menu Titles.
    /// </summary>
    public static class MasterFeatureSuiteDefaults
    {
        /// <summary>
        /// Deterministic GUIDs for the 11 canonical platform suites.
        /// </summary>
        public static readonly Guid SuiteAId = Guid.Parse("11111111-0001-0000-0000-000000000001");
        public static readonly Guid SuiteBId = Guid.Parse("11111111-0002-0000-0000-000000000002");
        public static readonly Guid SuiteCId = Guid.Parse("11111111-0003-0000-0000-000000000003");
        public static readonly Guid SuiteDId = Guid.Parse("11111111-0004-0000-0000-000000000004");
        public static readonly Guid SuiteEId = Guid.Parse("11111111-0005-0000-0000-000000000005");
        public static readonly Guid SuiteFId = Guid.Parse("11111111-0006-0000-0000-000000000006");
        public static readonly Guid SuiteGId = Guid.Parse("11111111-0007-0000-0000-000000000007");
        public static readonly Guid SuiteHId = Guid.Parse("11111111-0008-0000-0000-000000000008");
        public static readonly Guid SuiteIId = Guid.Parse("11111111-0009-0000-0000-000000000009");
        public static readonly Guid SuiteJId = Guid.Parse("11111111-0010-0000-0000-000000000010");
        public static readonly Guid SuiteKId = Guid.Parse("11111111-0011-0000-0000-000000000011");

        /// <summary>
        /// Returns the 11 canonical <see cref="MasterFeatureSuite"/> records.
        /// </summary>
        /// <returns>List of canonical suites.</returns>
        public static List<MasterFeatureSuite> GetDefaultSuites()
        {
            var created = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            return new List<MasterFeatureSuite>
            {
                new() { Id = SuiteAId, SuiteCode = "suite-people-community", SuiteLetter = "A", Name = "People, Community & Collaboration", MenuTitle = "People & Community", Description = "Real-time team messaging, committees, sub-groups, alumni directories, and confidential whistleblowing channels.", Icon = "groups", SortOrder = 1, IsPublished = true, IsActive = true, CreatedUtc = created },
                new() { Id = SuiteBId, SuiteCode = "suite-workforce-rota", SuiteLetter = "B", Name = "Workforce, Rota & Scheduling", MenuTitle = "Workforce & Shifts", Description = "Staff and volunteer shift scheduling, shift swaps, leave approvals, biometric/QR attendance, and appointment booking.", Icon = "calendar_month", SortOrder = 2, IsPublished = true, IsActive = true, CreatedUtc = created },
                new() { Id = SuiteCId, SuiteCode = "suite-reports-forms", SuiteLetter = "C", Name = "Reports, Forms & Analytics", MenuTitle = "Reports & Forms", Description = "Dynamic form builders, periodic operational reports, opinion poll surveys, and confidential referee verification.", Icon = "assessment", SortOrder = 3, IsPublished = true, IsActive = true, CreatedUtc = created },
                new() { Id = SuiteDId, SuiteCode = "suite-events-training", SuiteLetter = "D", Name = "Events & Training Management", MenuTitle = "Events & Ticketing", Description = "Event registration, multi-tier ticketing, speaker session tracks, and QR badge check-in kiosks.", Icon = "confirmation_number", SortOrder = 4, IsPublished = true, IsActive = true, CreatedUtc = created },
                new() { Id = SuiteEId, SuiteCode = "suite-finance-revenue", SuiteLetter = "E", Name = "Finance & Commercial Revenue", MenuTitle = "Finance & Commerce", Description = "Membership dues, e-commerce storefront, commercial proposals, grant ledgers, and virtual treasury wallets.", Icon = "account_balance_wallet", SortOrder = 5, IsPublished = true, IsActive = true, CreatedUtc = created },
                new() { Id = SuiteFId, SuiteCode = "suite-operations-workflows", SuiteLetter = "F", Name = "Operations & Workflows", MenuTitle = "Operations & Workflows", Description = "Applicant tracking, tamper-evident e-voting, equipment logistics, asset inventory, and project Kanban boards.", Icon = "work", SortOrder = 6, IsPublished = true, IsActive = true, CreatedUtc = created },
                new() { Id = SuiteGId, SuiteCode = "suite-communication-ai", SuiteLetter = "G", Name = "Communication, AI & Support", MenuTitle = "Communication & AI", Description = "Ozi AI Studio assistant, bulk SMS/Email broadcast studio, helpdesk ticketing, live chat, and video rooms.", Icon = "campaign", SortOrder = 7, IsPublished = true, IsActive = true, CreatedUtc = created },
                new() { Id = SuiteHId, SuiteCode = "suite-compliance-learning", SuiteLetter = "H", Name = "Compliance, Learning & Certification", MenuTitle = "Compliance & Learning", Description = "Encrypted document vaults, LMS training courses, verifiable certificates, visitor gate passes, and KYC vetting.", Icon = "verified_user", SortOrder = 8, IsPublished = true, IsActive = true, CreatedUtc = created },
                new() { Id = SuiteIId, SuiteCode = "suite-demographics-census", SuiteLetter = "I", Name = "Demographics & Civic Census", MenuTitle = "Demographics & Census", Description = "Household census registries, offline field enumeration, printable digital ID cards, and population intelligence.", Icon = "map", SortOrder = 9, IsPublished = true, IsActive = true, CreatedUtc = created },
                new() { Id = SuiteJId, SuiteCode = "suite-life-events", SuiteLetter = "J", Name = "Life Events & Publications", MenuTitle = "Life Events & Media", Description = "Digital memorials, wedding and celebration RSVP portals, and interactive 3D page-flip brochures.", Icon = "celebration", SortOrder = 10, IsPublished = true, IsActive = true, CreatedUtc = created },
                new() { Id = SuiteKId, SuiteCode = "suite-workspace", SuiteLetter = "K", Name = "Workspace", MenuTitle = "Workspace", Description = "Desktop application workspace and workplace management suite.", Icon = "desktop_windows", SortOrder = 11, IsPublished = true, IsActive = true, CreatedUtc = created }
            };
        }

        /// <summary>
        /// Maps each canonical Suite Full Title (<c>Category</c>) to its deterministic Suite ID.
        /// </summary>
        public static readonly IReadOnlyDictionary<string, Guid> SuiteIdByCategory = new Dictionary<string, Guid>(StringComparer.OrdinalIgnoreCase)
        {
            ["People, Community & Collaboration"] = SuiteAId,
            ["Workforce, Rota & Scheduling"] = SuiteBId,
            ["Reports, Forms & Analytics"] = SuiteCId,
            ["Events & Training Management"] = SuiteDId,
            ["Finance & Commercial Revenue"] = SuiteEId,
            ["Operations & Workflows"] = SuiteFId,
            ["Communication, AI & Support"] = SuiteGId,
            ["Compliance, Learning & Certification"] = SuiteHId,
            ["Demographics & Civic Census"] = SuiteIId,
            ["Life Events & Publications"] = SuiteJId,
            ["Workspace"] = SuiteKId
        };

        /// <summary>
        /// Maps each canonical Suite Full Title (<c>Category</c>) to its concise Sidebar Menu Title.
        /// </summary>
        public static readonly IReadOnlyDictionary<string, string> SuiteMenuTitleByCategory = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["People, Community & Collaboration"] = "People & Community",
            ["Workforce, Rota & Scheduling"] = "Workforce & Shifts",
            ["Reports, Forms & Analytics"] = "Reports & Forms",
            ["Events & Training Management"] = "Events & Ticketing",
            ["Finance & Commercial Revenue"] = "Finance & Commerce",
            ["Operations & Workflows"] = "Operations & Workflows",
            ["Communication, AI & Support"] = "Communication & AI",
            ["Compliance, Learning & Certification"] = "Compliance & Learning",
            ["Demographics & Civic Census"] = "Demographics & Census",
            ["Life Events & Publications"] = "Life Events & Media",
            ["Workspace"] = "Workspace"
        };

        /// <summary>
        /// Maps each canonical <c>FeatureCode</c> to its concise Sidebar Menu Title (<c>MenuTitle</c>).
        /// </summary>
        public static readonly IReadOnlyDictionary<string, string> FeatureMenuTitleByCode = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            // Suite A: People, Community & Collaboration
            ["bcp-community-messenger"] = "Chat Messenger",
            ["bcp-committees"] = "Groups & Committees",
            ["bcp-alumni-directory"] = "Alumni Network",
            ["bcp-whistleblowing"] = "Whistleblowing",

            // Suite B: Workforce, Rota & Scheduling
            ["bcp-staff-rota"] = "Staff & Volunteer Rota",
            ["bcp-shift-swaps"] = "Shift Swaps & Leave",
            ["bcp-attendance-tracking"] = "Attendance & QR",
            ["bcp-appointment-booking"] = "Appointment Booking",
            ["bcp-calendar-followups"] = "Calendar & Follow-Ups",

            // Suite C: Reports, Forms & Analytics
            ["bcp-interval-reporting"] = "Periodic Reports",
            ["bcp-form-builder"] = "Forms & Surveys",
            ["bcp-survey-analytics"] = "Opinion Polls",
            ["bcp-reference-forms"] = "Reference Forms",

            // Suite D: Events & Training Management
            ["bcp-event-ticketing"] = "Events & Passes",
            ["bcp-speaker-sessions"] = "Speaker & Sessions",
            ["bcp-attendee-management"] = "Attendee Check-In",

            // Suite E: Finance & Commercial Revenue
            ["bcp-invoicing-dues"] = "Invoicing & Dues",
            ["bcp-store-ecommerce"] = "Commerce Studio",
            ["bcp-proposal-pipeline"] = "Proposals & Pipeline",
            ["bcp-grant-ledger"] = "Grants & Donations",
            ["bcp-embedded-banking"] = "Wallets & Treasury",

            // Suite F: Operations & Workflows
            ["bcp-recruitment-hiring"] = "Recruitment & Hiring",
            ["bcp-elections-evoting"] = "E-Voting & Elections",
            ["bcp-equipment-fleet"] = "Equipment Logistics",
            ["bcp-company-assets"] = "Asset Inventory",
            ["bcp-project-tasks"] = "Projects & Tasks",

            // Suite G: Communication, AI & Support
            ["bcp-ai-smart-assist"] = "AI Smart Assist",
            ["bcp-mass-communication"] = "Notification Studio",
            ["bcp-helpdesk-support"] = "Helpdesk Support",
            ["bcp-live-chat"] = "Live Chat Widget",
            ["bcp-social-media"] = "Social Publisher",
            ["bcp-bio-link"] = "Bio Link Hub",
            ["bcp-gocall-ai"] = "Video Conferencing",

            // Suite H: Compliance, Learning & Certification
            ["bcp-document-management"] = "Document Vault",
            ["bcp-learning-management"] = "LMS & Courses",
            ["bcp-certificate-verification"] = "Certificates",
            ["bcp-visitor-gate"] = "Visitor Gate Passes",
            ["bcp-kyc-verification"] = "KYC Verification",

            // Suite I: Demographics & Civic Census
            ["bcp-community-census"] = "Community Census",
            ["bcp-field-surveyor"] = "Field Surveyor",
            ["bcp-resident-id-cards"] = "Digital Member IDs",
            ["bcp-demographic-analytics"] = "Population Analytics",

            // Suite J: Life Events & Publications
            ["bcp-digital-memorials"] = "Digital Memorials",
            ["bcp-wedding-portals"] = "Wedding Portals",
            ["bcp-digital-brochures"] = "Digital Brochures",

            // Suite K: Workspace
            ["bcp-workspace"] = "Workspace (Desktop only)"
        };

        /// <summary>
        /// Resolves the concise Sidebar Menu Title for a feature code, falling back to its full name if not mapped.
        /// </summary>
        public static string ResolveFeatureMenuTitle(string? featureCode, string? currentMenuTitle, string fallbackFullName)
        {
            if (!string.IsNullOrWhiteSpace(currentMenuTitle))
                return currentMenuTitle.Trim();
            if (!string.IsNullOrWhiteSpace(featureCode) && FeatureMenuTitleByCode.TryGetValue(featureCode.Trim(), out var mapped))
                return mapped;
            return fallbackFullName;
        }

        /// <summary>
        /// Resolves the concise Sidebar Menu Title for a suite category, falling back to the category name.
        /// </summary>
        public static string ResolveSuiteMenuTitle(string? category, string? currentSuiteMenuTitle)
        {
            if (!string.IsNullOrWhiteSpace(currentSuiteMenuTitle))
                return currentSuiteMenuTitle.Trim();
            if (!string.IsNullOrWhiteSpace(category) && SuiteMenuTitleByCategory.TryGetValue(category.Trim(), out var mapped))
                return mapped;
            return category ?? "Operations";
        }

        /// <summary>
        /// Resolves the deterministic Suite ID for a given category string.
        /// </summary>
        public static Guid? ResolveSuiteId(string? category)
        {
            if (!string.IsNullOrWhiteSpace(category) && SuiteIdByCategory.TryGetValue(category.Trim(), out var id))
                return id;
            return null;
        }
    }
}

