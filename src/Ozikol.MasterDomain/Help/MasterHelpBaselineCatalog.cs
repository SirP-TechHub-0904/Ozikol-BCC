using System;
using System.Collections.Generic;
using System.Linq;
using Ozikol.MasterDomain.Models;

namespace Ozikol.MasterDomain.Help
{
    /// <summary>
    /// Static baseline catalog providing production documentation, button walkthroughs,
    /// and sibling navigation links for platform pages across all enterprise feature suites.
    /// Used for initial database seeding and high-resilience fallback resolution.
    /// </summary>
    public static class MasterHelpBaselineCatalog
    {
        private static readonly List<MasterPageHelp> _baselinePages = new()
        {
            // =========================================================================
            // 1. WORKFORCE & SHIFTS (Console & Workspace)
            // =========================================================================
            new MasterPageHelp
            {
                RouteKey = "/workforce/console/analytics",
                FeatureSuite = "Workforce & Shifts",
                PageTitle = "Workforce Shift Analytics & Intelligence",
                Category = "Console",
                ShortSummary = "High-level administrative intelligence on shift fulfillment rates, live labor expenditure, clock-in punctuality, and staff coverage across all deployed sites.",
                OverviewMarkdown = @"### Workforce Intelligence & Duty Analytics
The **Workforce Shift Analytics** dashboard gives leadership, rota administrators, and operations controllers a real-time command center over staff scheduling and duty execution across all tenant operating locations.

#### Key Operational Insights
- **Coverage & Fulfillment**: Track total hours scheduled versus actual hours delivered on-site.
- **Punctuality & Lateness Index**: Monitor geo-fenced clock-in accuracy and biometric duty compliance.
- **Live Expenditure**: View accrued payroll liability calculated dynamically based on shift base rates, overtime modifiers, and site tier multipliers.
- **Exception Alerts**: Highlight unfulfilled open shifts, unattended duties, and expired SIA/CSCS certifications before shifts commence.",
                ActionsJson = @"[
  { ""trigger"": ""Filter Range"", ""icon"": ""calendar"", ""description"": ""Select custom reporting date windows (Today, This Week, Current Month, or Custom Range) to recalculate KPI aggregates."" },
  { ""trigger"": ""Export Shift Summary"", ""icon"": ""download"", ""description"": ""Generate executive PDF or CSV payroll audit statements covering worked hours and shift allowances."" },
  { ""trigger"": ""Refresh Data"", ""icon"": ""refresh"", ""description"": ""Re-query live duty telemetry and recalculate real-time fulfillment metrics."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Schedule & Rota Grid"", ""route"": ""/workforce/console/schedule"", ""icon"": ""calendar"" },
  { ""title"": ""Sites & Locations"", ""route"": ""/workforce/console/sites"", ""icon"": ""building"" },
  { ""title"": ""Live Radar"", ""route"": ""/workforce/console/live"", ""icon"": ""activity"" },
  { ""title"": ""Enroll Staff Member"", ""route"": ""/workforce/console/enroll"", ""icon"": ""user-plus"" },
  { ""title"": ""Workforce Settings"", ""route"": ""/workforce/console/settings"", ""icon"": ""settings"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/workforce/console/schedule",
                FeatureSuite = "Workforce & Shifts",
                PageTitle = "Master Staff Rota & Scheduling Grid",
                Category = "Console",
                ShortSummary = "Interactive multi-site rota scheduler with conflict detection, shift publishing, and automated staff allocation.",
                OverviewMarkdown = @"### Rota Planning & Shift Scheduling
The **Schedule & Rota** workspace enables operational supervisors to build, clone, and publish weekly or monthly work schedules across all physical posts, branches, and client venues.

#### Scheduling Capabilities
- **Conflict & Overlap Prevention**: The scheduling engine automatically warns if a staff member is assigned overlapping duties or violates statutory rest period regulations.
- **Draft vs. Published Workflow**: Shifts remain in draft mode until explicitly broadcasted, allowing rota managers to review staffing costs prior to member notification.
- **Role & Badge Matching**: Ensure assigned officers possess required active licenses (e.g. SIA Door Supervision, CCTV Operator, First Aid at Work).",
                ActionsJson = @"[
  { ""trigger"": ""Create Shift"", ""icon"": ""plus"", ""description"": ""Open the shift creation drawer to specify site, duty date, start/end hours, required headcounts, and hourly rates."" },
  { ""trigger"": ""Publish Rota"", ""icon"": ""send"", ""description"": ""Broadcast drafted schedules to members via mobile push notifications and workspace feeds."" },
  { ""trigger"": ""Clone Week"", ""icon"": ""copy"", ""description"": ""Replicate the previous week's rota layout into the active week to expedite scheduling."" },
  { ""trigger"": ""View Switcher"", ""icon"": ""layout"", ""description"": ""Toggle between Day Timeline, Weekly Site Grid, and Monthly Calendar views."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Shift Analytics"", ""route"": ""/workforce/console/analytics"", ""icon"": ""bar-chart"" },
  { ""title"": ""Sites & Locations"", ""route"": ""/workforce/console/sites"", ""icon"": ""building"" },
  { ""title"": ""Live Radar"", ""route"": ""/workforce/console/live"", ""icon"": ""activity"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/workforce/console/sites",
                FeatureSuite = "Workforce & Shifts",
                PageTitle = "Sites, Venues & Geographic Post Management",
                Category = "Console",
                ShortSummary = "Manage client premises, GPS geofences, site instructions, emergency protocols, and on-site supervisor contacts.",
                OverviewMarkdown = @"### Site Configuration & Geofence Boundaries
The **Sites & Locations** registry houses all client properties, venues, event stadiums, and physical premises where your workforce is deployed.

#### Geofence Enforcement
Each site supports configurable GPS coordinates and tolerance radii (meters). Staff duty clock-ins are validated against these coordinates to guarantee on-site presence. Site-specific briefing documents, access codes, and patrol check-in tags are linked directly to each venue.",
                ActionsJson = @"[
  { ""trigger"": ""New Site"", ""icon"": ""plus"", ""description"": ""Register a new venue with operating address, billing client, geofence radius, and emergency contact details."" },
  { ""trigger"": ""Edit Site"", ""icon"": ""edit"", ""description"": ""Update site briefing instructions, access codes, or designated post locations."" },
  { ""trigger"": ""Filter Sites"", ""icon"": ""filter"", ""description"": ""Filter active vs inactive client venues by region or operating tier."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Schedule & Rota"", ""route"": ""/workforce/console/schedule"", ""icon"": ""calendar"" },
  { ""title"": ""Live Radar"", ""route"": ""/workforce/console/live"", ""icon"": ""activity"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/workforce/console/live",
                FeatureSuite = "Workforce & Shifts",
                PageTitle = "Live Attendance & Radar Duty Monitor",
                Category = "Console",
                ShortSummary = "Real-time supervisory monitor displaying active shifts, clocked-in officers, patrol checkpoints, and overdue arrivals.",
                OverviewMarkdown = @"### Real-Time Shift Execution & Operational Telemetry
The **Live Attendance Radar** provides operations managers with a minute-by-minute heartbeat of active field deployments.

#### Radar Status Tiers
- **Green (On Duty)**: Member clocked in within GPS geofence on schedule.
- **Amber (Grace Period)**: Member shift start has arrived; within grace check-in window.
- **Red (Overdue / No-Show)**: Member failed to clock in; triggers automated replacement alerts.
- **Blue (Patrol in Progress)**: NFC/QR checkpoint scanned along assigned patrol route.",
                ActionsJson = @"[
  { ""trigger"": ""Manual Clock-In"", ""icon"": ""clock"", ""description"": ""Override and record duty clock-in on behalf of an officer experiencing connectivity issues."" },
  { ""trigger"": ""Broadcast Broadcast"", ""icon"": ""bell"", ""description"": ""Dispatch urgent operational alert to all officers currently signed in on duty."" },
  { ""trigger"": ""Refresh Telemetry"", ""icon"": ""refresh"", ""description"": ""Pull the latest GPS coordinates and biometric verification events."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Shift Analytics"", ""route"": ""/workforce/console/analytics"", ""icon"": ""bar-chart"" },
  { ""title"": ""Schedule & Rota"", ""route"": ""/workforce/console/schedule"", ""icon"": ""calendar"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/workforce/workspace/analytics",
                FeatureSuite = "Workforce & Shifts",
                PageTitle = "Personal Shift Analytics & Earnings",
                Category = "Workspace",
                ShortSummary = "Personal operational summary displaying completed duties, punctuality score, accrued monthly earnings, and upcoming allocations.",
                OverviewMarkdown = @"### Personal Workforce Performance & Pay Summary
The **Personal Shift Analytics** view provides staff members with transparent insights into their worked shifts, verified duty hours, punctuality ratings, and estimated earnings for the current pay period.

#### Metrics Breakdown
- **Fulfilled Duties**: Total completed shifts vs assigned shifts.
- **Punctuality Score**: Percentage of duty clock-ins recorded on time within geofence.
- **Accrued Duty Pay**: Dynamic take-home pay estimate based on approved timesheets.
- **Leave Balance**: Remaining annual leave days and pending absence requests.",
                ActionsJson = @"[
  { ""trigger"": ""Refresh Data"", ""icon"": ""refresh"", ""description"": ""Refresh duty hours and latest payroll calculations."" },
  { ""trigger"": ""Request Leave"", ""icon"": ""calendar-plus"", ""description"": ""Submit annual leave, medical absence, or personal time-off requests for manager approval."" },
  { ""trigger"": ""Duty Clock-In"", ""icon"": ""clock"", ""description"": ""Jump directly to the biometric clock-in screen for your scheduled shift."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""My Schedule & Rota"", ""route"": ""/workforce/workspace/my-shifts"", ""icon"": ""calendar"" },
  { ""title"": ""Open Shifts & Swaps"", ""route"": ""/workforce/workspace/my-shifts"", ""icon"": ""repeat"" },
  { ""title"": ""Duty Clock-In"", ""route"": ""/workforce/workspace/clock"", ""icon"": ""clock"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/workforce/workspace/my-shifts",
                FeatureSuite = "Workforce & Shifts",
                PageTitle = "My Schedule, Open Shifts & Swap Requests",
                Category = "Workspace",
                ShortSummary = "View assigned shifts, claim available open duties, and initiate peer-to-peer shift swap exchanges.",
                OverviewMarkdown = @"### Personal Rota & Shift Management
The **My Schedule** view allows members to view upcoming rostered duties, review venue access instructions, claim newly released open shifts, and arrange colleague shift swaps.

#### Shift Lifecycle
1. **Assigned**: Manager has published the shift to your schedule.
2. **Confirmed**: You have acknowledged receipt and availability.
3. **In Progress**: Currently clocked in and on active duty.
4. **Completed**: Shift concluded and submitted for timesheet verification.",
                ActionsJson = @"[
  { ""trigger"": ""Claim Open Shift"", ""icon"": ""check"", ""description"": ""Request or immediately claim unassigned shifts published by rota planners."" },
  { ""trigger"": ""Request Shift Swap"", ""icon"": ""repeat"", ""description"": ""Propose a mutual shift swap with an eligible licensed colleague for manager sign-off."" },
  { ""trigger"": ""Download Schedule"", ""icon"": ""download"", ""description"": ""Export your monthly schedule to iCal, Google Calendar, or PDF."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Personal Analytics"", ""route"": ""/workforce/workspace/analytics"", ""icon"": ""bar-chart"" },
  { ""title"": ""Duty Clock-In"", ""route"": ""/workforce/workspace/clock"", ""icon"": ""clock"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/workforce/workspace/clock",
                FeatureSuite = "Workforce & Shifts",
                PageTitle = "Duty Clock-In & Geofence Verification",
                Category = "Workspace",
                ShortSummary = "Biometric and GPS-verified duty clock-in, break logger, and shift handover checklist.",
                OverviewMarkdown = @"### Shift Clock-In & Verification Terminal
The **Duty Clock-In** screen validates your geographic presence at the assigned venue using high-precision browser/device GPS telemetry.

#### Clock-In Flow
1. **Arrival**: Arrive at the designated site location.
2. **GPS Lock**: The terminal verifies you are within the designated geofence radius.
3. **Biometric / PIN**: Confirm your identity to prevent buddy-punching.
4. **Duty Begun**: Your active shift timer starts, notifying operations supervisors on the Live Radar.",
                ActionsJson = @"[
  { ""trigger"": ""Confirm Clock-In"", ""icon"": ""check-circle"", ""description"": ""Lock GPS coordinates and initiate duty tracking for the active shift."" },
  { ""trigger"": ""Start Break"", ""icon"": ""coffee"", ""description"": ""Log mandatory statutory rest breaks or meal intervals."" },
  { ""trigger"": ""End Duty / Clock-Out"", ""icon"": ""log-out"", ""description"": ""Complete shift summary, log handover notes, and conclude duty time tracking."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""My Schedule"", ""route"": ""/workforce/workspace/my-shifts"", ""icon"": ""calendar"" },
  { ""title"": ""Personal Analytics"", ""route"": ""/workforce/workspace/analytics"", ""icon"": ""bar-chart"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },

            // =========================================================================
            // 2. COMMITTEES & SUB-GROUPS (Console & Workspace)
            // =========================================================================
            new MasterPageHelp
            {
                RouteKey = "/committees/console/dashboard",
                FeatureSuite = "Committees & Groups",
                PageTitle = "Committees Governance & Council Command",
                Category = "Console",
                ShortSummary = "Central oversight over board committees, working groups, taskforces, member rosters, and governance compliance.",
                OverviewMarkdown = @"### Committees Governance & Leadership Oversight
The **Committees Admin Dashboard** provides centralized administration of executive boards, steering committees, research taskforces, and member working groups across your organization.

#### Administrative Controls
- **Roster & Tenure Tracking**: Monitor active chairs, secretaries, and elected committee members with terms of service.
- **Meeting Quorum & Minutes**: Oversee meeting schedules, official meeting minutes sign-offs, and voting quorums.
- **Cloud Vault & Documents**: Central repository for confidential committee charters, resolutions, and board packets.",
                ActionsJson = @"[
  { ""trigger"": ""Create Committee"", ""icon"": ""plus"", ""description"": ""Establish a new committee with designated charter, chairperson, and member capacity."" },
  { ""trigger"": ""Export Governance Report"", ""icon"": ""download"", ""description"": ""Generate comprehensive attendance, committee activity, and resolution summaries."" },
  { ""trigger"": ""Manage Registrations"", ""icon"": ""users"", ""description"": ""Review and approve member candidate applications for open committee seats."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Manage Committees"", ""route"": ""/committees/console/manage"", ""icon"": ""folder"" },
  { ""title"": ""Application Forms"", ""route"": ""/committees/console/forms"", ""icon"": ""file-text"" },
  { ""title"": ""Candidate Registrations"", ""route"": ""/committees/console/registrations"", ""icon"": ""user-check"" },
  { ""title"": ""Committee Reports"", ""route"": ""/committees/console/reports"", ""icon"": ""bar-chart"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/committees/workspace/hub",
                FeatureSuite = "Committees & Groups",
                PageTitle = "Member Committee Hub & Working Groups",
                Category = "Workspace",
                ShortSummary = "Your personal committee memberships, agendas, upcoming meetings, assigned resolutions, and working documents.",
                OverviewMarkdown = @"### Committee Member Collaboration Hub
The **Member Committee Hub** is the designated workspace for appointed committee members to collaborate on institutional initiatives, prepare for upcoming council meetings, and submit official activity reports.

#### Collaboration Tools
- **Agenda & Documents**: Access encrypted meeting packs, previous session minutes, and proposed policy resolutions.
- **Action Items**: Track assigned action items and delegate tasks to fellow committee members.
- **Report Composer**: Draft, co-author, and submit committee progress reports directly to council leadership.",
                ActionsJson = @"[
  { ""trigger"": ""Submit Report"", ""icon"": ""send"", ""description"": ""Compose and submit monthly or quarterly committee status reports to leadership."" },
  { ""trigger"": ""View Meeting Agendas"", ""icon"": ""calendar"", ""description"": ""Review schedules, dial-in credentials, and materials for upcoming sessions."" },
  { ""trigger"": ""Open Vault"", ""icon"": ""lock"", ""description"": ""Access encrypted governance documents and shared committee file archives."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Discover Committees"", ""route"": ""/committees/workspace/discover"", ""icon"": ""compass"" },
  { ""title"": ""Cloud Vault"", ""route"": ""/committees/workspace/vault"", ""icon"": ""folder"" },
  { ""title"": ""Report Composer"", ""route"": ""/committees/workspace/reports"", ""icon"": ""edit"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },

            // =========================================================================
            // 3. USER MANAGEMENT & DIRECTORY (Console)
            // =========================================================================
            new MasterPageHelp
            {
                RouteKey = "/users/dashboard",
                FeatureSuite = "User Management",
                PageTitle = "User Management & Membership Intelligence",
                Category = "Console",
                ShortSummary = "Comprehensive overview of tenant member growth, tier breakdowns, onboarding status, and engagement retention.",
                OverviewMarkdown = @"### User Management & Member Intelligence
The **User Management Dashboard** is the command center for administering tenant accounts, tracking membership acquisition cohorts, and overseeing user verification lifecycles.

#### Capabilities
- **Directory Overview**: Total registered members, active users, pending invitations, and suspended accounts.
- **Member Tiers & Categories**: Segment users into custom categories, departments, and corporate cohorts.
- **Retention & Activity**: Monitor login frequency, last seen timestamps, and feature engagement.",
                ActionsJson = @"[
  { ""trigger"": ""Add New User"", ""icon"": ""user-plus"", ""description"": ""Provision a new member profile or send an onboarding activation invitation."" },
  { ""trigger"": ""Export Users"", ""icon"": ""download"", ""description"": ""Export filtered member records to CSV or Excel for administrative auditing."" },
  { ""trigger"": ""Manage Categories"", ""icon"": ""tag"", ""description"": ""Define organizational categories, department tags, and custom membership attributes."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Users Directory"", ""route"": ""/users/list"", ""icon"": ""users"" },
  { ""title"": ""User Categories"", ""route"": ""/users/categories"", ""icon"": ""tag"" },
  { ""title"": ""KPI & Performance"", ""route"": ""/users/kpi"", ""icon"": ""award"" },
  { ""title"": ""Registration Form Builder"", ""route"": ""/users/registration-builder"", ""icon"": ""file-text"" },
  { ""title"": ""User Settings"", ""route"": ""/users/settings"", ""icon"": ""settings"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/users/list",
                FeatureSuite = "User Management",
                PageTitle = "Users & Members Directory",
                Category = "Console",
                ShortSummary = "Searchable directory of all organization members with bulk actions, status filters, and role assignment shortcuts.",
                OverviewMarkdown = @"### Master Member Directory
The **Users Directory** lists all accounts within your organization. Use fast instant search and multi-facet filtering by category, role, verification status, or registration date.

#### Supported Actions
- **Account Actions**: Edit user profiles, reset credentials, assign roles, or suspend access.
- **Bulk Operations**: Bulk assign category tags, trigger re-verification emails, or export selected users.
- **Identity Quick-Links**: Inspect authentication audit logs and multi-factor authentication (MFA) enrollment status.",
                ActionsJson = @"[
  { ""trigger"": ""Search"", ""icon"": ""search"", ""description"": ""Search instantly across names, email addresses, phone numbers, and member IDs."" },
  { ""trigger"": ""Add Member"", ""icon"": ""user-plus"", ""description"": ""Open the member provisioning form to enroll a new user."" },
  { ""trigger"": ""Filter"", ""icon"": ""filter"", ""description"": ""Filter by status (Active, Inactive, Pending), category, or security role."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""User Dashboard"", ""route"": ""/users/dashboard"", ""icon"": ""grid"" },
  { ""title"": ""User Categories"", ""route"": ""/users/categories"", ""icon"": ""tag"" },
  { ""title"": ""Identity & Roles"", ""route"": ""/identity/roles"", ""icon"": ""shield"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },

            // =========================================================================
            // 4. IDENTITY & ACCESS CONTROL (Console)
            // =========================================================================
            new MasterPageHelp
            {
                RouteKey = "/identity/dashboard",
                FeatureSuite = "Identity & RBAC",
                PageTitle = "Identity Governance & Access Security",
                Category = "Console",
                ShortSummary = "Zero-trust identity posture overview, role assignments, security policy enforcement, and authentication event logs.",
                OverviewMarkdown = @"### Identity & Access Security Center
The **Identity Dashboard** provides zero-trust visibility into authentication telemetry, multi-factor adoption rates, role privilege distributions, and potential security anomalies.

#### Security Governance
- **Role-Based Access Control (RBAC)**: Fine-grained permissions governing Console access, Workspace capabilities, and financial actions.
- **Invitation Lifecycle**: Issue and track time-limited, cryptographically signed onboarding invitations.
- **Audit Logging**: Comprehensive, tamper-evident trail of all administrative actions, credential changes, and permission escalations.",
                ActionsJson = @"[
  { ""trigger"": ""New Role"", ""icon"": ""shield-plus"", ""description"": ""Create a custom organizational security role with tailored capability permissions."" },
  { ""trigger"": ""Invite User"", ""icon"": ""mail"", ""description"": ""Dispatch cryptographically signed email invitations with pre-assigned roles."" },
  { ""trigger"": ""Audit Logs"", ""icon"": ""file-text"", ""description"": ""Inspect security audit trail for login events, password resets, and permission changes."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Roles & Permissions"", ""route"": ""/identity/roles"", ""icon"": ""shield"" },
  { ""title"": ""Invitations"", ""route"": ""/identity/invitations"", ""icon"": ""mail"" },
  { ""title"": ""Audit Logs"", ""route"": ""/identity/audit-logs"", ""icon"": ""file-text"" },
  { ""title"": ""Security Policies"", ""route"": ""/identity/policies"", ""icon"": ""lock"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },

            // =========================================================================
            // 5. CMS & WEBSITE STUDIO (Console)
            // =========================================================================
            new MasterPageHelp
            {
                RouteKey = "/content/dashboard",
                FeatureSuite = "CMS & Website Studio",
                PageTitle = "Website Studio & Content Command",
                Category = "Console",
                ShortSummary = "Manage public website pages, template themes, dynamic forms, digital media assets, and SEO settings.",
                OverviewMarkdown = @"### Content Management System & Website Builder
The **CMS Dashboard** empowers your team to design, publish, and maintain your public-facing web presence without writing code.

#### Integrated Capabilities
- **Modular Website Templates**: Pick from pre-crafted industry designs or customize section layouts.
- **Dynamic Form Builder**: Construct contact inquiries, survey questionnaires, and event sign-up forms.
- **Digital Asset Management**: Upload, optimize, and organize brand photography, documents, and media via Cloudflare R2 / Cloudinary.",
                ActionsJson = @"[
  { ""trigger"": ""Template Marketplace"", ""icon"": ""shopping-bag"", ""description"": ""Explore and adopt certified responsive website template themes."" },
  { ""trigger"": ""New Web Page"", ""icon"": ""file-plus"", ""description"": ""Create a new public landing page, service showcase, or content route."" },
  { ""trigger"": ""Media Manager"", ""icon"": ""image"", ""description"": ""Access the central media vault to upload brand assets and logos."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Template Marketplace"", ""route"": ""/content/marketplace"", ""icon"": ""layout"" },
  { ""title"": ""My Active Templates"", ""route"": ""/content/templates"", ""icon"": ""layers"" },
  { ""title"": ""Web Pages"", ""route"": ""/content/web-pages"", ""icon"": ""globe"" },
  { ""title"": ""Forms & Inquiries"", ""route"": ""/content/forms"", ""icon"": ""check-square"" },
  { ""title"": ""File Manager"", ""route"": ""/content/files"", ""icon"": ""folder"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },

            // =========================================================================
            // 6. COMMERCE & PRODUCTS (Console)
            // =========================================================================
            new MasterPageHelp
            {
                RouteKey = "/products",
                FeatureSuite = "Commerce & Storefront",
                PageTitle = "Product Catalog & Store Inventory",
                Category = "Console",
                ShortSummary = "Manage physical and digital product merchandise, pricing tiers, stock availability, and checkout configuration.",
                OverviewMarkdown = @"### Commerce Studio & Store Inventory
The **Products Catalog** controls your organization's digital storefront, physical merchandise, event tickets, and premium membership add-ons.

#### Commerce Features
- **Multi-Currency Pricing**: Support localized pricing with automatic multi-currency conversion (USD, GBP, EUR, NGN, KES, GHS, ZAR).
- **Inventory Tracking**: Automated low-stock thresholds and back-order controls.
- **Integrated Payment Gateways**: Connect seamlessly to Paystack and PixelPay for secure card payments and bank transfers.",
                ActionsJson = @"[
  { ""trigger"": ""Add Product"", ""icon"": ""plus"", ""description"": ""List a new product item with title, descriptions, image gallery, and pricing."" },
  { ""trigger"": ""Product Categories"", ""icon"": ""tag"", ""description"": ""Organize storefront products into browsable collection categories."" },
  { ""trigger"": ""Orders & Fulfillment"", ""icon"": ""package"", ""description"": ""Review customer orders, shipping labels, and payment settlement records."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Create Product"", ""route"": ""/products/create"", ""icon"": ""plus-circle"" },
  { ""title"": ""Billing & Plans"", ""route"": ""/billing"", ""icon"": ""credit-card"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },

            // =========================================================================
            // 7. BILLING & SUBSCRIPTIONS (Console)
            // =========================================================================
            new MasterPageHelp
            {
                RouteKey = "/billing",
                FeatureSuite = "Billing & Subscriptions",
                PageTitle = "Tenant Billing & Capability Subscriptions",
                Category = "Console",
                ShortSummary = "Oversee platform subscription tier, active modular capability add-ons, invoice history, and payment methods.",
                OverviewMarkdown = @"### Tenant Subscription & Billing Management
The **Billing Command Center** displays your organization's active platform tier, subscribed modular features, renewal dates, and payment history.

#### Modular Capabilities
Ozikol BCC operates on a modular capability model. You can activate or deactivate individual feature add-ons (such as Workforce Scheduling, Committees Governance, or Commerce Store) at any time, with prorated subscription billing.",
                ActionsJson = @"[
  { ""trigger"": ""Upgrade Plan"", ""icon"": ""arrow-up"", ""description"": ""Upgrade your tenant tier or activate additional high-volume feature capabilities."" },
  { ""trigger"": ""Download Invoice"", ""icon"": ""download"", ""description"": ""Retrieve official VAT/Tax invoices and payment receipts."" },
  { ""trigger"": ""Manage Payment Method"", ""icon"": ""credit-card"", ""description"": ""Update registered credit/debit cards or bank transfer settlement mandates."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Invoice History"", ""route"": ""/billing/invoices"", ""icon"": ""file-text"" },
  { ""title"": ""Subscription Plans"", ""route"": ""/billing/plans"", ""icon"": ""layers"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },

            // =========================================================================
            // 8. PERSONAL WORKSPACE & PROFILE (Workspace)
            // =========================================================================
            new MasterPageHelp
            {
                RouteKey = "/workspace/dashboard",
                FeatureSuite = "Personal Workspace",
                PageTitle = "Member Workspace & Daily Overview",
                Category = "Workspace",
                ShortSummary = "Personal daily mission dashboard showing upcoming schedule, committee meetings, active duties, and notifications.",
                OverviewMarkdown = @"### Member Command Workspace
The **Personal Workspace Dashboard** is the dedicated portal where every member begins their working day. It consolidates all assignments across active committees, scheduled shifts, team direct messages, and pending action items.

#### Quick Widgets
- **Today's Duties**: Immediate access to your upcoming shifts with 1-click clock-in.
- **My Committees**: Active working groups and next scheduled council sessions.
- **System Feeds**: Unread organizational broadcasts and direct peer messages.",
                ActionsJson = @"[
  { ""trigger"": ""Edit Profile"", ""icon"": ""user"", ""description"": ""Update your personal contact details, emergency contacts, and notification preferences."" },
  { ""trigger"": ""Security Settings"", ""icon"": ""lock"", ""description"": ""Configure password, active login sessions, and two-factor authentication (2FA)."" },
  { ""trigger"": ""My Purchases"", ""icon"": ""shopping-bag"", ""description"": ""Review your personal event tickets, store receipts, and membership dues."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""My Profile"", ""route"": ""/workspace/profile"", ""icon"": ""user"" },
  { ""title"": ""Security & 2FA"", ""route"": ""/workspace/security"", ""icon"": ""shield"" },
  { ""title"": ""Shift Rota"", ""route"": ""/workforce/workspace/my-shifts"", ""icon"": ""calendar"" },
  { ""title"": ""Committees"", ""route"": ""/committees/workspace/hub"", ""icon"": ""users"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            }
        };

        /// <summary>
        /// Retrieves the complete list of baseline help documentation entries.
        /// </summary>
        public static IReadOnlyList<MasterPageHelp> GetAll() => _baselinePages.AsReadOnly();

        /// <summary>
        /// Resolves a baseline help article matching the specified route path,
        /// handling trailing slash normalization and sub-path fallbacks.
        /// </summary>
        /// <param name="routeKey">Normalized route key (e.g. "/workforce/console/analytics").</param>
        /// <returns>Matching MasterPageHelp record or null if not found.</returns>
        public static MasterPageHelp? GetByRoute(string? routeKey)
        {
            if (string.IsNullOrWhiteSpace(routeKey)) return null;

            var normalized = NormalizeRoute(routeKey);

            // Exact match
            var exact = _baselinePages.FirstOrDefault(p =>
                string.Equals(p.RouteKey, normalized, StringComparison.OrdinalIgnoreCase));
            if (exact != null) return exact;

            // Prefix match for nested sub-routes (e.g. /workforce/console/schedule/edit/123 -> /workforce/console/schedule)
            var prefixMatch = _baselinePages
                .Where(p => normalized.StartsWith(p.RouteKey, StringComparison.OrdinalIgnoreCase))
                .OrderByDescending(p => p.RouteKey.Length)
                .FirstOrDefault();

            return prefixMatch;
        }

        /// <summary>
        /// Searches all baseline help topics matching the keyword in title, summary, overview, or route.
        /// </summary>
        /// <param name="query">Search term.</param>
        /// <returns>List of matching MasterPageHelp articles.</returns>
        public static List<MasterPageHelp> Search(string query)
        {
            if (string.IsNullOrWhiteSpace(query))
                return _baselinePages.ToList();

            var q = query.Trim().ToLowerInvariant();
            return _baselinePages.Where(p =>
                p.PageTitle.ToLowerInvariant().Contains(q) ||
                p.RouteKey.ToLowerInvariant().Contains(q) ||
                (p.ShortSummary != null && p.ShortSummary.ToLowerInvariant().Contains(q)) ||
                p.FeatureSuite.ToLowerInvariant().Contains(q) ||
                p.OverviewMarkdown.ToLowerInvariant().Contains(q)
            ).ToList();
        }

        /// <summary>
        /// Normalizes a route path by ensuring leading slash and removing query parameters/hash anchors.
        /// </summary>
        public static string NormalizeRoute(string route)
        {
            if (string.IsNullOrWhiteSpace(route)) return "/";
            var clean = route.Trim();

            // Strip query string and fragment
            var qIdx = clean.IndexOf('?');
            if (qIdx >= 0) clean = clean[..qIdx];
            var hIdx = clean.IndexOf('#');
            if (hIdx >= 0) clean = clean[..hIdx];

            if (!clean.StartsWith('/')) clean = "/" + clean;
            if (clean.Length > 1 && clean.EndsWith('/')) clean = clean.TrimEnd('/');

            return clean.ToLowerInvariant();
        }
    }
}
