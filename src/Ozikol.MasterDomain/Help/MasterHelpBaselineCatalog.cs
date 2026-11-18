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
  { ""trigger"": ""Create Shift"", ""icon"": ""plus"", ""description"": ""Open the shift creation drawer to specify site, duty date, start/end hours, required headcounts, and hourly rates."", ""route"": ""/workforce/console/schedule/create"" },
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
                RouteKey = "/workforce/console/schedule/create",
                FeatureSuite = "Workforce & Shifts",
                PageTitle = "Create & Dispatch Shift Allocation",
                Category = "Console",
                ShortSummary = "Define duty requirements, assign licensed personnel or mark as open claim, and set hourly charge/pay rates.",
                OverviewMarkdown = @"### Shift Authoring & Duty Specification
Use this drawer/form to configure new individual or recurring shift allocations across client venues.

#### Configuration Highlights
- **Duty Venue**: Select client premises; geofence and site instructions load automatically.
- **Licence Requirements**: Restrict eligibility to members holding active certifications.
- **Open Shift Toggle**: Allow qualified officers to claim the shift on a first-come basis.",
                ActionsJson = @"[
  { ""trigger"": ""Save & Publish"", ""icon"": ""send"", ""description"": ""Commit the shift and dispatch instant notifications to assigned members."" },
  { ""trigger"": ""Save as Draft"", ""icon"": ""save"", ""description"": ""Store shift specification for rota review without notifying personnel."" },
  { ""trigger"": ""Cancel"", ""icon"": ""close"", ""description"": ""Discard unsaved shift inputs and return to rota grid."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Rota Grid"", ""route"": ""/workforce/console/schedule"", ""icon"": ""calendar"" },
  { ""title"": ""Sites Registry"", ""route"": ""/workforce/console/sites"", ""icon"": ""building"" }
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
  { ""trigger"": ""New Site"", ""icon"": ""plus"", ""description"": ""Register a new venue with operating address, billing client, geofence radius, and emergency contact details."", ""route"": ""/workforce/console/sites/create"" },
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
                RouteKey = "/workforce/console/sites/create",
                FeatureSuite = "Workforce & Shifts",
                PageTitle = "Register New Client Site & Venue",
                Category = "Console",
                ShortSummary = "Provision a new deployment post with GPS coordinates, geofence radius, emergency contacts, and briefing instructions.",
                OverviewMarkdown = @"### Venue Provisioning & Geofence Setup
Configure new physical locations where duties and patrol shifts occur. Accurate latitude and longitude guarantee automated clock-in verification.",
                ActionsJson = @"[
  { ""trigger"": ""Locate on Map"", ""icon"": ""map"", ""description"": ""Auto-populate coordinates using address geocoding."" },
  { ""trigger"": ""Save Site"", ""icon"": ""save"", ""description"": ""Commit venue to the active site directory."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Sites Registry"", ""route"": ""/workforce/console/sites"", ""icon"": ""building"" },
  { ""title"": ""Rota Grid"", ""route"": ""/workforce/console/schedule"", ""icon"": ""calendar"" }
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
  { ""trigger"": ""Broadcast Alert"", ""icon"": ""bell"", ""description"": ""Dispatch urgent operational alert to all officers currently signed in on duty."" },
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
                RouteKey = "/workforce/console/enroll",
                FeatureSuite = "Workforce & Shifts",
                PageTitle = "Enroll & Onboard Staff Personnel",
                Category = "Console",
                ShortSummary = "Register security officers and operative staff with SIA licences, RTW verification, and emergency contact dossiers.",
                OverviewMarkdown = @"### Personnel Enrollment & Compliance Verification
Onboard operational staff members into the workforce rota pool. Validates licence numbers, expiry dates, right-to-work documentation, and assigned hourly pay bands.",
                ActionsJson = @"[
  { ""trigger"": ""Enroll Member"", ""icon"": ""user-plus"", ""description"": ""Save personnel dossier and issue workspace activation credentials."" },
  { ""trigger"": ""Upload Licences"", ""icon"": ""upload"", ""description"": ""Attach verified copies of SIA/CSCS badges and ID proof."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Rota Grid"", ""route"": ""/workforce/console/schedule"", ""icon"": ""calendar"" },
  { ""title"": ""Shift Analytics"", ""route"": ""/workforce/console/analytics"", ""icon"": ""bar-chart"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/workforce/console/settings",
                FeatureSuite = "Workforce & Shifts",
                PageTitle = "Workforce & Rota Automation Settings",
                Category = "Console",
                ShortSummary = "Configure grace periods, overtime rules, geofence radius tolerances, and automated replacement broadcasts.",
                OverviewMarkdown = @"### Workforce Engine Configuration
Tailor platform attendance rules to your organization's statutory and operational policies. Set default shift durations, break deductions, and lateness penalties.",
                ActionsJson = @"[
  { ""trigger"": ""Save Configuration"", ""icon"": ""save"", ""description"": ""Commit updated rota rules and geofence tolerance limits."" },
  { ""trigger"": ""Reset Defaults"", ""icon"": ""refresh"", ""description"": ""Restore canonical workforce scheduling parameters."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Rota Grid"", ""route"": ""/workforce/console/schedule"", ""icon"": ""calendar"" },
  { ""title"": ""Live Radar"", ""route"": ""/workforce/console/live"", ""icon"": ""activity"" }
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
  { ""trigger"": ""Request Leave"", ""icon"": ""calendar-plus"", ""description"": ""Submit annual leave, medical absence, or personal time-off requests for manager approval."", ""route"": ""/workforce/workspace/leave"" },
  { ""trigger"": ""Duty Clock-In"", ""icon"": ""clock"", ""description"": ""Jump directly to the biometric clock-in screen for your scheduled shift."", ""route"": ""/workforce/workspace/clock"" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""My Schedule & Rota"", ""route"": ""/workforce/workspace/my-shifts"", ""icon"": ""calendar"" },
  { ""title"": ""Open Shifts & Swaps"", ""route"": ""/workforce/workspace/open-shifts"", ""icon"": ""repeat"" },
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
  { ""trigger"": ""Claim Open Shift"", ""icon"": ""check"", ""description"": ""Request or immediately claim unassigned shifts published by rota planners."", ""route"": ""/workforce/workspace/open-shifts"" },
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
                RouteKey = "/workforce/workspace/open-shifts",
                FeatureSuite = "Workforce & Shifts",
                PageTitle = "Available Open Shifts & Overtime Board",
                Category = "Workspace",
                ShortSummary = "Browse unallocated duties across client sites and claim overtime shifts matching your badge credentials.",
                OverviewMarkdown = @"### Open Shifts & Overtime Opportunities
Browse unassigned duties posted by operational controllers across all authorized sites. Shifts matching your active licence types can be claimed with 1 click.",
                ActionsJson = @"[
  { ""trigger"": ""Claim Duty"", ""icon"": ""check"", ""description"": ""Submit claim for the open shift slot."" },
  { ""trigger"": ""Filter by Site"", ""icon"": ""filter"", ""description"": ""Narrow available shifts by venue or distance."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""My Shifts"", ""route"": ""/workforce/workspace/my-shifts"", ""icon"": ""calendar"" },
  { ""title"": ""Duty Clock-In"", ""route"": ""/workforce/workspace/clock"", ""icon"": ""clock"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/workforce/workspace/timesheets",
                FeatureSuite = "Workforce & Shifts",
                PageTitle = "Timesheets & Verified Pay Records",
                Category = "Workspace",
                ShortSummary = "Review worked duty hours, supervisor sign-offs, overtime allowances, and download payroll vouchers.",
                OverviewMarkdown = @"### Personal Timesheet & Pay Audit
Inspect verified duty hours, overtime credits, and break deductions. Once approved by operations controllers, timesheet records feed directly into payroll disbursements.",
                ActionsJson = @"[
  { ""trigger"": ""Export Timesheet"", ""icon"": ""download"", ""description"": ""Download monthly hours summary in PDF or CSV format."" },
  { ""trigger"": ""Dispute Hours"", ""icon"": ""alert-circle"", ""description"": ""Submit correction inquiry for unrecorded overtime or site extensions."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Personal Analytics"", ""route"": ""/workforce/workspace/analytics"", ""icon"": ""bar-chart"" },
  { ""title"": ""My Schedule"", ""route"": ""/workforce/workspace/my-shifts"", ""icon"": ""calendar"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/workforce/workspace/leave",
                FeatureSuite = "Workforce & Shifts",
                PageTitle = "Time Off, Annual Leave & Absence",
                Category = "Workspace",
                ShortSummary = "Submit and track annual leave, sickness, and time-off requests with manager sign-off workflows.",
                OverviewMarkdown = @"### Leave & Absence Management
Request annual holiday leave, statutory medical absence, or emergency time off. Rota planners are notified instantly to arrange substitute coverage.",
                ActionsJson = @"[
  { ""trigger"": ""Request Leave"", ""icon"": ""plus"", ""description"": ""Submit dates and reason for absence."" },
  { ""trigger"": ""Cancel Request"", ""icon"": ""close"", ""description"": ""Withdraw pending time-off application."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Personal Analytics"", ""route"": ""/workforce/workspace/analytics"", ""icon"": ""bar-chart"" },
  { ""title"": ""My Schedule"", ""route"": ""/workforce/workspace/my-shifts"", ""icon"": ""calendar"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/workforce/workspace/documents",
                FeatureSuite = "Workforce & Shifts",
                PageTitle = "Compliance Documents & SIA Badges",
                Category = "Workspace",
                ShortSummary = "Store, update, and track expiry dates for SIA door supervisor licences, right-to-work documents, and training certificates.",
                OverviewMarkdown = @"### Personal Compliance & Document Vault
Maintain active professional accreditations. Automated alerts notify you 60, 30, and 7 days prior to badge expiry to ensure zero shift scheduling disruptions.",
                ActionsJson = @"[
  { ""trigger"": ""Upload Document"", ""icon"": ""upload"", ""description"": ""Submit renewal image or PDF of certification."" },
  { ""trigger"": ""Download Copy"", ""icon"": ""download"", ""description"": ""Access certified document copy."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Personal Analytics"", ""route"": ""/workforce/workspace/analytics"", ""icon"": ""bar-chart"" },
  { ""title"": ""My Shifts"", ""route"": ""/workforce/workspace/my-shifts"", ""icon"": ""calendar"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/workforce/workspace/availability",
                FeatureSuite = "Workforce & Shifts",
                PageTitle = "Working Availability & Preferences",
                Category = "Workspace",
                ShortSummary = "Set preferred working days, night shift availability, and blackout dates for rota planners.",
                OverviewMarkdown = @"### Availability Roster Preferences
Specify your standard weekly availability and blackout dates. Rota planners use these preferences to assign optimal shifts without scheduling conflicts.",
                ActionsJson = @"[
  { ""trigger"": ""Save Availability"", ""icon"": ""save"", ""description"": ""Update recurring weekly day/night preferences."" },
  { ""trigger"": ""Add Blackout Date"", ""icon"": ""calendar-x"", ""description"": ""Flag specific days you cannot work."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""My Schedule"", ""route"": ""/workforce/workspace/my-shifts"", ""icon"": ""calendar"" },
  { ""title"": ""Personal Analytics"", ""route"": ""/workforce/workspace/analytics"", ""icon"": ""bar-chart"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/workforce/workspace/reminders",
                FeatureSuite = "Workforce & Shifts",
                PageTitle = "Duty Reminders & Shift Briefings",
                Category = "Workspace",
                ShortSummary = "Upcoming duty notifications, site access codes, emergency numbers, and operational checklists.",
                OverviewMarkdown = @"### Operational Briefings & Checklists
Review specific site access codes, keys handover protocols, and client contact numbers prior to heading out to your assigned duty post.",
                ActionsJson = @"[
  { ""trigger"": ""Acknowledge Briefing"", ""icon"": ""check"", ""description"": ""Confirm receipt of site post orders."" },
  { ""trigger"": ""Directions to Site"", ""icon"": ""map-pin"", ""description"": ""Open navigation route in Google Maps."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Duty Clock-In"", ""route"": ""/workforce/workspace/clock"", ""icon"": ""clock"" },
  { ""title"": ""My Schedule"", ""route"": ""/workforce/workspace/my-shifts"", ""icon"": ""calendar"" }
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
  { ""trigger"": ""Create Committee"", ""icon"": ""plus"", ""description"": ""Establish a new committee with designated charter, chairperson, and member capacity."", ""route"": ""/committees/console/manage"" },
  { ""trigger"": ""Export Governance Report"", ""icon"": ""download"", ""description"": ""Generate comprehensive attendance, committee activity, and resolution summaries."", ""route"": ""/committees/console/reports"" },
  { ""trigger"": ""Manage Registrations"", ""icon"": ""users"", ""description"": ""Review and approve member candidate applications for open committee seats."", ""route"": ""/committees/console/registrations"" }
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
                RouteKey = "/committees/console/manage",
                FeatureSuite = "Committees & Groups",
                PageTitle = "Committees & Working Groups Registry",
                Category = "Console",
                ShortSummary = "Configure committee charters, appoint chairs, manage maximum roster capacities, and archive retired taskforces.",
                OverviewMarkdown = @"### Committee Structure & Appointment Management
Define charters, responsibilities, and term limits for all governing committees. Assign chairs and secretaries who receive authority to compose official council reports.",
                ActionsJson = @"[
  { ""trigger"": ""New Committee"", ""icon"": ""plus"", ""description"": ""Provision a new working group or council committee."" },
  { ""trigger"": ""Edit Roster"", ""icon"": ""users"", ""description"": ""Assign or remove voting members and committee leadership."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Committees Dashboard"", ""route"": ""/committees/console/dashboard"", ""icon"": ""grid"" },
  { ""title"": ""Candidate Registrations"", ""route"": ""/committees/console/registrations"", ""icon"": ""user-check"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/committees/console/forms",
                FeatureSuite = "Committees & Groups",
                PageTitle = "Committee Application & Nomination Forms",
                Category = "Console",
                ShortSummary = "Build and publish custom candidate intake forms for members wishing to join council working groups.",
                OverviewMarkdown = @"### Candidate Nomination & Intake Forms
Create customized application questionnaires with qualifications, personal statements, and document uploads for committee recruitment.",
                ActionsJson = @"[
  { ""trigger"": ""New Form"", ""icon"": ""plus"", ""description"": ""Design a candidate intake form with custom questionnaire fields."" },
  { ""trigger"": ""Share Form"", ""icon"": ""share"", ""description"": ""Copy public or member-only application link."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Registrations"", ""route"": ""/committees/console/registrations"", ""icon"": ""user-check"" },
  { ""title"": ""Committees Dashboard"", ""route"": ""/committees/console/dashboard"", ""icon"": ""grid"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/committees/console/registrations",
                FeatureSuite = "Committees & Groups",
                PageTitle = "Candidate Registrations & Approvals",
                Category = "Console",
                ShortSummary = "Review, approve, or reject candidate applications for open committee seats and working taskforces.",
                OverviewMarkdown = @"### Committee Intake Review Queue
Screen applicant submissions, review uploaded qualifications, and approve appointed candidates with automated role assignment.",
                ActionsJson = @"[
  { ""trigger"": ""Approve Candidate"", ""icon"": ""check"", ""description"": ""Appoint candidate and issue committee workspace credentials."" },
  { ""trigger"": ""Reject"", ""icon"": ""close"", ""description"": ""Decline application with optional feedback note."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Manage Committees"", ""route"": ""/committees/console/manage"", ""icon"": ""folder"" },
  { ""title"": ""Application Forms"", ""route"": ""/committees/console/forms"", ""icon"": ""file-text"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/committees/console/reports",
                FeatureSuite = "Committees & Groups",
                PageTitle = "Committee Activity & Governance Reports",
                Category = "Console",
                ShortSummary = "Audit official reports, meeting resolutions, minutes sign-offs, and annual council performance statements.",
                OverviewMarkdown = @"### Governance Reporting & Resolution Audits
Review executive summaries, action items, and resolutions submitted by committee chairs across all active working council groups.",
                ActionsJson = @"[
  { ""trigger"": ""Export Report"", ""icon"": ""download"", ""description"": ""Generate executive council compilation report in PDF."" },
  { ""trigger"": ""Review Resolutions"", ""icon"": ""file-text"", ""description"": ""Inspect approved policy recommendations."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Committees Dashboard"", ""route"": ""/committees/console/dashboard"", ""icon"": ""grid"" },
  { ""title"": ""Committee Settings"", ""route"": ""/committees/console/settings"", ""icon"": ""settings"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/committees/console/settings",
                FeatureSuite = "Committees & Groups",
                PageTitle = "Committees Governance Settings",
                Category = "Console",
                ShortSummary = "Configure default quorum percentages, maximum term limits, voting rules, and automated report reminders.",
                OverviewMarkdown = @"### Council Governance Settings
Enforce organizational compliance rules including voting quorums, mandatory meeting minutes sign-offs, and automated report reminders.",
                ActionsJson = @"[
  { ""trigger"": ""Save Settings"", ""icon"": ""save"", ""description"": ""Commit updated council governance rules."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Committees Dashboard"", ""route"": ""/committees/console/dashboard"", ""icon"": ""grid"" },
  { ""title"": ""Reports"", ""route"": ""/committees/console/reports"", ""icon"": ""bar-chart"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/committees/workspace/my",
                FeatureSuite = "Committees & Groups",
                PageTitle = "My Committees & Active Appointments",
                Category = "Workspace",
                ShortSummary = "Your personal committee appointments, upcoming sessions, agenda packs, and assigned resolutions.",
                OverviewMarkdown = @"### Member Committee Workspace
Collaborate with fellow council appointees, access meeting minutes, review upcoming agendas, and track assigned action items.",
                ActionsJson = @"[
  { ""trigger"": ""Submit Report"", ""icon"": ""send"", ""description"": ""Draft and submit working report to committee chair."", ""route"": ""/committees/workspace/reports/compose"" },
  { ""trigger"": ""Cloud Vault"", ""icon"": ""folder"", ""description"": ""Access encrypted governance files."", ""route"": ""/committees/workspace/cloud-links"" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Discover Committees"", ""route"": ""/committees/workspace/discover"", ""icon"": ""compass"" },
  { ""title"": ""Report Composer"", ""route"": ""/committees/workspace/reports/compose"", ""icon"": ""edit"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/committees/workspace/discover",
                FeatureSuite = "Committees & Groups",
                PageTitle = "Discover & Join Committees",
                Category = "Workspace",
                ShortSummary = "Browse open committee vacancies, working group charters, and submit candidate nominations.",
                OverviewMarkdown = @"### Open Council Committees Directory
Explore committees seeking members. Review charters, meeting frequencies, and submit an application to join.",
                ActionsJson = @"[
  { ""trigger"": ""Apply to Join"", ""icon"": ""send"", ""description"": ""Open candidate nomination form for selected committee."" },
  { ""trigger"": ""View Charter"", ""icon"": ""file-text"", ""description"": ""Read mandate and responsibilities."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""My Committees"", ""route"": ""/committees/workspace/my"", ""icon"": ""users"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/committees/workspace/reports/compose",
                FeatureSuite = "Committees & Groups",
                PageTitle = "Committee Report Composer",
                Category = "Workspace",
                ShortSummary = "Draft and submit official committee progress reports, action logs, and resolutions to executive leadership.",
                OverviewMarkdown = @"### Council Report Authoring
Compose periodic activity reports, capture session resolutions, attach meeting minutes, and submit to the council board for executive sign-off.",
                ActionsJson = @"[
  { ""trigger"": ""Submit Report"", ""icon"": ""send"", ""description"": ""Submit finished report to council secretariat."" },
  { ""trigger"": ""Save Draft"", ""icon"": ""save"", ""description"": ""Preserve in-progress report draft."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""My Committees"", ""route"": ""/committees/workspace/my"", ""icon"": ""users"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/committees/workspace/cloud-links",
                FeatureSuite = "Committees & Groups",
                PageTitle = "Committee Cloud Vault & Link Repository",
                Category = "Workspace",
                ShortSummary = "Central secure repository for committee cloud links, Google Drive folders, board packets, and shared resources.",
                OverviewMarkdown = @"### Committee Digital Resource Vault
Secure repository for collaborative documents, video meeting links, presentation decks, and shared cloud folders.",
                ActionsJson = @"[
  { ""trigger"": ""Add Resource Link"", ""icon"": ""plus"", ""description"": ""Share a cloud document or video dial-in URL."" },
  { ""trigger"": ""Open Link"", ""icon"": ""external-link"", ""description"": ""Launch shared resource in new tab."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""My Committees"", ""route"": ""/committees/workspace/my"", ""icon"": ""users"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },

            // =========================================================================
            // 3. USER MANAGEMENT & ONBOARDING (Console)
            // =========================================================================
            new MasterPageHelp
            {
                RouteKey = "/users/console/dashboard",
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
  { ""trigger"": ""Add New User"", ""icon"": ""user-plus"", ""description"": ""Provision a new member profile or send an onboarding activation invitation."", ""route"": ""/users/console/create"" },
  { ""trigger"": ""Export Users"", ""icon"": ""download"", ""description"": ""Export filtered member records to CSV or Excel for administrative auditing."" },
  { ""trigger"": ""Manage Categories"", ""icon"": ""tag"", ""description"": ""Define organizational categories, department tags, and custom membership attributes."", ""route"": ""/users/console/categories"" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Users Directory"", ""route"": ""/users/console/list"", ""icon"": ""users"" },
  { ""title"": ""User Categories"", ""route"": ""/users/console/categories"", ""icon"": ""tag"" },
  { ""title"": ""KPI & Performance"", ""route"": ""/users/console/kpi"", ""icon"": ""award"" },
  { ""title"": ""Registration Form Builder"", ""route"": ""/users/console/registration-form"", ""icon"": ""file-text"" },
  { ""title"": ""User Settings"", ""route"": ""/users/console/settings"", ""icon"": ""settings"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/users/console/list",
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
  { ""trigger"": ""Add Member"", ""icon"": ""user-plus"", ""description"": ""Open the member provisioning form to enroll a new user."", ""route"": ""/users/console/create"" },
  { ""trigger"": ""Filter"", ""icon"": ""filter"", ""description"": ""Filter by status (Active, Inactive, Pending), category, or security role."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""User Dashboard"", ""route"": ""/users/console/dashboard"", ""icon"": ""grid"" },
  { ""title"": ""User Categories"", ""route"": ""/users/console/categories"", ""icon"": ""tag"" },
  { ""title"": ""Identity & Roles"", ""route"": ""/identity/console/roles"", ""icon"": ""shield"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/users/console/create",
                FeatureSuite = "User Management",
                PageTitle = "Provision New User Account",
                Category = "Console",
                ShortSummary = "Directly register a new member profile or dispatch an activation invitation with assigned roles and categories.",
                OverviewMarkdown = @"### User Provisioning & Account Creation
Enroll new staff, members, or administrators. Specify credentials, assigned categories, and initial security roles.",
                ActionsJson = @"[
  { ""trigger"": ""Create Account"", ""icon"": ""check"", ""description"": ""Commit profile and send welcome onboarding credentials."" },
  { ""trigger"": ""Cancel"", ""icon"": ""close"", ""description"": ""Return to members directory."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Users Directory"", ""route"": ""/users/console/list"", ""icon"": ""users"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/users/console/categories",
                FeatureSuite = "User Management",
                PageTitle = "Member Categories & Cohorts",
                Category = "Console",
                ShortSummary = "Organize members into organizational departments, membership tiers, chapters, and custom cohorts.",
                OverviewMarkdown = @"### Member Categorization & Tagging
Segment your membership base for targeted broadcasts, specific feature access, and departmental filtering.",
                ActionsJson = @"[
  { ""trigger"": ""New Category"", ""icon"": ""plus"", ""description"": ""Create a new member category tag."" },
  { ""trigger"": ""Edit Category"", ""icon"": ""edit"", ""description"": ""Modify name and description."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Users Directory"", ""route"": ""/users/console/list"", ""icon"": ""users"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/users/console/kpi",
                FeatureSuite = "User Management",
                PageTitle = "Member KPI Metrics & Performance Grading",
                Category = "Console",
                ShortSummary = "Define performance evaluation metrics, grading scales, and review member accomplishment scores.",
                OverviewMarkdown = @"### Performance & Evaluation Metrics
Track employee and member key performance indicators. Configure objective metrics, weightings, and grading rubrics.",
                ActionsJson = @"[
  { ""trigger"": ""New Metric"", ""icon"": ""plus"", ""description"": ""Define an evaluation metric."" },
  { ""trigger"": ""Grade Member"", ""icon"": ""award"", ""description"": ""Assign performance score to a member."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Users Directory"", ""route"": ""/users/console/list"", ""icon"": ""users"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/users/console/activity",
                FeatureSuite = "User Management",
                PageTitle = "Member Engagement & Activity Telemetry",
                Category = "Console",
                ShortSummary = "Live stream of member logins, profile updates, purchases, and feature interactions.",
                OverviewMarkdown = @"### Member Activity Logs
Monitor user session activity, login timestamps, and system interactions across your tenant workspace.",
                ActionsJson = @"[
  { ""trigger"": ""Filter Activity"", ""icon"": ""filter"", ""description"": ""Narrow activity by event type or user."" },
  { ""trigger"": ""Export Log"", ""icon"": ""download"", ""description"": ""Download activity records in CSV."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Users Directory"", ""route"": ""/users/console/list"", ""icon"": ""users"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/users/console/registration-form",
                FeatureSuite = "User Management",
                PageTitle = "Public Registration Form Builder",
                Category = "Console",
                ShortSummary = "Design customized self-service registration forms for new members with custom fields and approval rules.",
                OverviewMarkdown = @"### Self-Service Registration Form Builder
Tailor the signup experience for public users. Add custom fields, require terms acceptance, and toggle automated vs manual approval.",
                ActionsJson = @"[
  { ""trigger"": ""Save Form"", ""icon"": ""save"", ""description"": ""Publish registration form changes."" },
  { ""trigger"": ""Preview Form"", ""icon"": ""eye"", ""description"": ""Inspect public signup view."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Users Directory"", ""route"": ""/users/console/list"", ""icon"": ""users"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/users/console/auth-setup",
                FeatureSuite = "User Management",
                PageTitle = "Authentication & Onboarding Branding",
                Category = "Console",
                ShortSummary = "Customize login screen hero images, welcome headlines, branding logos, and social login triggers.",
                OverviewMarkdown = @"### Authentication Portal Branding
Configure the visual theme of your organization's login and signup portal. Set custom logos, backdrop imagery, and welcome notices.",
                ActionsJson = @"[
  { ""trigger"": ""Save Branding"", ""icon"": ""save"", ""description"": ""Apply login screen customization."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""User Settings"", ""route"": ""/users/console/settings"", ""icon"": ""settings"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/users/console/settings",
                FeatureSuite = "User Management",
                PageTitle = "User Management Configuration",
                Category = "Console",
                ShortSummary = "Global user account rules, password policies, invitation expiry timeouts, and self-registration gates.",
                OverviewMarkdown = @"### User Policy Configuration
Set default member roles upon registration, invitation link lifetimes, and account suspension criteria.",
                ActionsJson = @"[
  { ""trigger"": ""Save Settings"", ""icon"": ""save"", ""description"": ""Commit updated membership settings."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Users Directory"", ""route"": ""/users/console/list"", ""icon"": ""users"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },

            // =========================================================================
            // 4. IDENTITY & ACCESS CONTROL (Console)
            // =========================================================================
            new MasterPageHelp
            {
                RouteKey = "/identity/console/dashboard",
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
  { ""trigger"": ""New Role"", ""icon"": ""shield-plus"", ""description"": ""Create a custom organizational security role with tailored capability permissions."", ""route"": ""/identity/console/roles"" },
  { ""trigger"": ""Invite User"", ""icon"": ""mail"", ""description"": ""Dispatch cryptographically signed email invitations with pre-assigned roles."", ""route"": ""/identity/console/invitations"" },
  { ""trigger"": ""Audit Logs"", ""icon"": ""file-text"", ""description"": ""Inspect security audit trail for login events, password resets, and permission changes."", ""route"": ""/identity/console/audit-logs"" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Roles & Permissions"", ""route"": ""/identity/console/roles"", ""icon"": ""shield"" },
  { ""title"": ""Invitations"", ""route"": ""/identity/console/invitations"", ""icon"": ""mail"" },
  { ""title"": ""Audit Logs"", ""route"": ""/identity/console/audit-logs"", ""icon"": ""file-text"" },
  { ""title"": ""Security Policies"", ""route"": ""/identity/console/policies"", ""icon"": ""lock"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/identity/console/roles",
                FeatureSuite = "Identity & RBAC",
                PageTitle = "Roles & Capability Permissions",
                Category = "Console",
                ShortSummary = "Configure granular permissions across Console administrative modules and member workspace features.",
                OverviewMarkdown = @"### Role-Based Access Control (RBAC)
Define custom administrative and operational roles. Toggle fine-grained read, write, and delete permissions per platform capability.",
                ActionsJson = @"[
  { ""trigger"": ""Create Role"", ""icon"": ""plus"", ""description"": ""Define a new custom role with selected permissions."" },
  { ""trigger"": ""Edit Permissions"", ""icon"": ""shield"", ""description"": ""Adjust capability rights for an existing role."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Identity Dashboard"", ""route"": ""/identity/console/dashboard"", ""icon"": ""grid"" },
  { ""title"": ""Audit Logs"", ""route"": ""/identity/console/audit-logs"", ""icon"": ""file-text"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/identity/console/invitations",
                FeatureSuite = "Identity & RBAC",
                PageTitle = "User Onboarding Invitations",
                Category = "Console",
                ShortSummary = "Issue, monitor, and revoke cryptographically signed email onboarding invitations.",
                OverviewMarkdown = @"### Cryptographic Invitation Management
Send secure onboarding invites with pre-assigned roles. Track accepted vs pending invitations and revoke expired tokens.",
                ActionsJson = @"[
  { ""trigger"": ""New Invitation"", ""icon"": ""mail"", ""description"": ""Dispatch onboarding invitation."", ""route"": ""/identity/console/invitations/create"" },
  { ""trigger"": ""Resend"", ""icon"": ""refresh"", ""description"": ""Re-dispatch invitation token to recipient."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Roles & Permissions"", ""route"": ""/identity/console/roles"", ""icon"": ""shield"" },
  { ""title"": ""Identity Dashboard"", ""route"": ""/identity/console/dashboard"", ""icon"": ""grid"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/identity/console/invitations/create",
                FeatureSuite = "Identity & RBAC",
                PageTitle = "Create & Dispatch Invitation",
                Category = "Console",
                ShortSummary = "Specify recipient email, assign security roles, and set token expiration time.",
                OverviewMarkdown = @"### Invitation Dispatch
Issue a single or bulk onboarding invitation. The recipient receives a cryptographic link to establish their credentials.",
                ActionsJson = @"[
  { ""trigger"": ""Send Invitation"", ""icon"": ""send"", ""description"": ""Commit and dispatch invite email."" },
  { ""trigger"": ""Cancel"", ""icon"": ""close"", ""description"": ""Return to invitation directory."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Invitations Registry"", ""route"": ""/identity/console/invitations"", ""icon"": ""mail"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/identity/console/audit-logs",
                FeatureSuite = "Identity & RBAC",
                PageTitle = "Security & Governance Audit Trail",
                Category = "Console",
                ShortSummary = "Immutable log of authentication events, credential updates, role escalations, and administrative actions.",
                OverviewMarkdown = @"### Security Audit Trail
Inspect all security actions across your workspace. Every credential modification, permission change, and login event is logged with actor IP, device, and timestamp.",
                ActionsJson = @"[
  { ""trigger"": ""Filter by Actor"", ""icon"": ""filter"", ""description"": ""Filter logs by specific administrator or date range."" },
  { ""trigger"": ""Export Audit Log"", ""icon"": ""download"", ""description"": ""Download audit records for compliance certification."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Identity Dashboard"", ""route"": ""/identity/console/dashboard"", ""icon"": ""grid"" },
  { ""title"": ""Security Policies"", ""route"": ""/identity/console/policies"", ""icon"": ""lock"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/identity/console/error-codes",
                FeatureSuite = "Identity & RBAC",
                PageTitle = "System Error Code Catalog",
                Category = "Console",
                ShortSummary = "Standardized error code index (ERR-XXXX) with user-friendly explanations and troubleshooting resolutions.",
                OverviewMarkdown = @"### Standardized Error Code Reference
Reference catalog defining system error identifiers, user meanings, and recommended administrative resolutions.",
                ActionsJson = @"[
  { ""trigger"": ""Search Code"", ""icon"": ""search"", ""description"": ""Find error definition by code (e.g. ERR-AUTH-403)."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Audit Logs"", ""route"": ""/identity/console/audit-logs"", ""icon"": ""file-text"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/identity/console/policies",
                FeatureSuite = "Identity & RBAC",
                PageTitle = "Authentication & Password Security Policies",
                Category = "Console",
                ShortSummary = "Enforce mandatory two-factor authentication (2FA), password complexity rules, session timeouts, and lockout limits.",
                OverviewMarkdown = @"### Security Policy Enforcement
Configure organization-wide security baselines: enforce 2FA for administrators, set idle session timeouts, and define account lockout thresholds.",
                ActionsJson = @"[
  { ""trigger"": ""Save Policies"", ""icon"": ""save"", ""description"": ""Enforce updated security policies across all users."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Identity Dashboard"", ""route"": ""/identity/console/dashboard"", ""icon"": ""grid"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },

            // =========================================================================
            // 5. CMS & WEBSITE STUDIO (Console)
            // =========================================================================
            new MasterPageHelp
            {
                RouteKey = "/content/console",
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
  { ""trigger"": ""Template Marketplace"", ""icon"": ""shopping-bag"", ""description"": ""Explore and adopt certified responsive website template themes."", ""route"": ""/content/console/marketplace"" },
  { ""trigger"": ""New Web Page"", ""icon"": ""file-plus"", ""description"": ""Create a new public landing page, service showcase, or content route."", ""route"": ""/content/console/pages/create"" },
  { ""trigger"": ""Media Manager"", ""icon"": ""image"", ""description"": ""Access the central media vault to upload brand assets and logos."", ""route"": ""/content/console/files"" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Template Marketplace"", ""route"": ""/content/console/marketplace"", ""icon"": ""layout"" },
  { ""title"": ""My Active Templates"", ""route"": ""/content/console/templates"", ""icon"": ""layers"" },
  { ""title"": ""Web Pages"", ""route"": ""/content/console/pages"", ""icon"": ""globe"" },
  { ""title"": ""Forms & Inquiries"", ""route"": ""/content/console/forms"", ""icon"": ""check-square"" },
  { ""title"": ""File Manager"", ""route"": ""/content/console/files"", ""icon"": ""folder"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/content/console/pages",
                FeatureSuite = "CMS & Website Studio",
                PageTitle = "Web Pages & Route Management",
                Category = "Console",
                ShortSummary = "Create, edit, and organize public website pages, landing pages, and URL routes with SEO metadata.",
                OverviewMarkdown = @"### Public Web Pages Registry
Manage all pages published on your public website. Assign category slugs, custom layout templates, and OpenGraph social sharing meta tags.",
                ActionsJson = @"[
  { ""trigger"": ""Create Page"", ""icon"": ""plus"", ""description"": ""Author a new web page route."", ""route"": ""/content/console/pages/create"" },
  { ""trigger"": ""Edit Page"", ""icon"": ""edit"", ""description"": ""Modify page sections, headlines, and content."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""CMS Command"", ""route"": ""/content/console"", ""icon"": ""grid"" },
  { ""title"": ""Page Sections"", ""route"": ""/content/console/sections"", ""icon"": ""layers"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/content/console/pages/create",
                FeatureSuite = "CMS & Website Studio",
                PageTitle = "Author New Web Page",
                Category = "Console",
                ShortSummary = "Define page slug, title, meta descriptions, and link page body sections.",
                OverviewMarkdown = @"### Page Creation Studio
Establish page path (e.g. `/about`, `/services`), configure search engine tags, and attach section components.",
                ActionsJson = @"[
  { ""trigger"": ""Save & Publish"", ""icon"": ""check"", ""description"": ""Commit page and make live on website."" },
  { ""trigger"": ""Save Draft"", ""icon"": ""save"", ""description"": ""Preserve page draft without publishing."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Pages Registry"", ""route"": ""/content/console/pages"", ""icon"": ""globe"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/content/console/categories",
                FeatureSuite = "CMS & Website Studio",
                PageTitle = "Web Page Categories & Slugs",
                Category = "Console",
                ShortSummary = "Group pages into hierarchical menu sections and URL prefixes (e.g. /services/*, /legal/*).",
                OverviewMarkdown = @"### Web Categories Architecture
Structure your site's navigation hierarchy. Link page categories directly into the master navbar and menu dropdowns.",
                ActionsJson = @"[
  { ""trigger"": ""New Category"", ""icon"": ""plus"", ""description"": ""Create a new content group slug."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Web Pages"", ""route"": ""/content/console/pages"", ""icon"": ""globe"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/content/console/sections",
                FeatureSuite = "CMS & Website Studio",
                PageTitle = "Page Sections & Modular Components",
                Category = "Console",
                ShortSummary = "Build and arrange reusable modular components: Heroes, Feature Grids, Testimonials, Stats, and FAQs.",
                OverviewMarkdown = @"### Modular Page Sections
Design reusable content blocks. Sections can be assigned to multiple web pages, allowing global updates in a single edit.",
                ActionsJson = @"[
  { ""trigger"": ""New Section"", ""icon"": ""plus"", ""description"": ""Construct a hero, feature card, or accordion section."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Web Pages"", ""route"": ""/content/console/pages"", ""icon"": ""globe"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/content/console/blogs",
                FeatureSuite = "CMS & Website Studio",
                PageTitle = "Blog Posts & News Articles",
                Category = "Console",
                ShortSummary = "Author and publish editorial news, thought leadership, case studies, and organization announcements.",
                OverviewMarkdown = @"### Editorial Blog & Articles Studio
Write rich articles with featured images, author attribution, reading time estimates, and tag categories.",
                ActionsJson = @"[
  { ""trigger"": ""New Article"", ""icon"": ""plus"", ""description"": ""Draft a new blog post."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""CMS Command"", ""route"": ""/content/console"", ""icon"": ""grid"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/content/console/files",
                FeatureSuite = "CMS & Website Studio",
                PageTitle = "Digital Asset & Media Manager",
                Category = "Console",
                ShortSummary = "Central media vault for brand logos, photography, PDF brochures, and videos powered by Cloudflare R2 / Cloudinary.",
                OverviewMarkdown = @"### Cloud Media & Asset Vault
Upload, organize, and optimize digital files. Automatic responsive image generation and CDN distribution deliver fast website loading speeds.",
                ActionsJson = @"[
  { ""trigger"": ""Upload Assets"", ""icon"": ""upload"", ""description"": ""Upload images, documents, or brand assets."" },
  { ""trigger"": ""Copy CDN URL"", ""icon"": ""copy"", ""description"": ""Copy fast global CDN link."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""CMS Command"", ""route"": ""/content/console"", ""icon"": ""grid"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/content/console/templates",
                FeatureSuite = "CMS & Website Studio",
                PageTitle = "Active Website Templates & Theme Suite",
                Category = "Console",
                ShortSummary = "Manage active site templates, customize brand color palettes, fonts, header zones, and footer scripts.",
                OverviewMarkdown = @"### Theme & Template Suite
Controls your website's active aesthetic framework. Adjust brand typography, link external Google Fonts, and configure zone code injections.",
                ActionsJson = @"[
  { ""trigger"": ""Customize Theme"", ""icon"": ""edit"", ""description"": ""Adjust typography, palette, and layouts."", ""route"": ""/content/console/templates/visuals"" },
  { ""trigger"": ""Browse Marketplace"", ""icon"": ""shopping-bag"", ""description"": ""Adopt certified themes."", ""route"": ""/content/console/marketplace"" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Marketplace"", ""route"": ""/content/console/marketplace"", ""icon"": ""shopping-bag"" },
  { ""title"": ""Template Visuals"", ""route"": ""/content/console/templates/visuals"", ""icon"": ""image"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/content/console/marketplace",
                FeatureSuite = "CMS & Website Studio",
                PageTitle = "Website Template Marketplace",
                Category = "Console",
                ShortSummary = "Discover and adopt certified turnkey website templates designed for security, corporate, alumni, and enterprise brands.",
                OverviewMarkdown = @"### Curated Website Marketplace
Browse production-ready responsive website designs. One-click adoption hydrates complete page trees, hero sections, and navigation structures.",
                ActionsJson = @"[
  { ""trigger"": ""Preview Template"", ""icon"": ""eye"", ""description"": ""Launch interactive template simulation in sandbox."" },
  { ""trigger"": ""Adopt Template"", ""icon"": ""check"", ""description"": ""Apply template design to your live website."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""My Templates"", ""route"": ""/content/console/templates"", ""icon"": ""layers"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/content/console/templates/visuals",
                FeatureSuite = "CMS & Website Studio",
                PageTitle = "Template Visual Preview & Customizer",
                Category = "Console",
                ShortSummary = "Real-time sandbox customizer to inspect responsive desktop, tablet, and mobile layouts with live brand tokens.",
                OverviewMarkdown = @"### Live Visual Template Previewer
Simulate responsive layouts across phone, tablet, and widescreen viewports with hydrated database content and brand styling.",
                ActionsJson = @"[
  { ""trigger"": ""Toggle Device"", ""icon"": ""devices"", ""description"": ""Switch between Desktop, Tablet, and Mobile preview frames."" },
  { ""trigger"": ""Save Changes"", ""icon"": ""save"", ""description"": ""Commit visual customizations."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""My Templates"", ""route"": ""/content/console/templates"", ""icon"": ""layers"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/content/console/templates/import",
                FeatureSuite = "CMS & Website Studio",
                PageTitle = "Import Website Template Package",
                Category = "Console",
                ShortSummary = "Upload and unpack custom JSON or HTML website packages into your tenant theme repository.",
                OverviewMarkdown = @"### External Template Import
Import custom HTML5/CSS3 template archives or JSON schema blueprints directly into your content management system.",
                ActionsJson = @"[
  { ""trigger"": ""Upload Archive"", ""icon"": ""upload"", ""description"": ""Select and validate template archive package."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""My Templates"", ""route"": ""/content/console/templates"", ""icon"": ""layers"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/content/console/templates/maintenance",
                FeatureSuite = "CMS & Website Studio",
                PageTitle = "Template Maintenance & Code Injections",
                Category = "Console",
                ShortSummary = "Configure custom CSS resets, analytics tracking tags (Google Analytics, Meta Pixel), and header/footer scripts.",
                OverviewMarkdown = @"### Code Injections & Advanced Scripts
Safely inject global tracking scripts, custom meta tags, and third-party chat widgets into `<head>`, `<body>`, and footer zones.",
                ActionsJson = @"[
  { ""trigger"": ""Save Injections"", ""icon"": ""save"", ""description"": ""Commit custom script and CSS changes."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""My Templates"", ""route"": ""/content/console/templates"", ""icon"": ""layers"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/content/console/forms",
                FeatureSuite = "CMS & Website Studio",
                PageTitle = "Dynamic Forms & Inquiry Submissions",
                Category = "Console",
                ShortSummary = "Build custom contact forms, capture client leads, view submission responses, and configure email autoresponders.",
                OverviewMarkdown = @"### Lead Capture & Inquiries Studio
Create custom form questionnaires for client quote requests, contact inquiries, and feedback surveys. Submissions route to the Central Notification Pool.",
                ActionsJson = @"[
  { ""trigger"": ""New Form"", ""icon"": ""plus"", ""description"": ""Design a new dynamic form with custom input fields."" },
  { ""trigger"": ""View Submissions"", ""icon"": ""list"", ""description"": ""Audit captured form responses and lead data."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""CMS Command"", ""route"": ""/content/console"", ""icon"": ""grid"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/surveys/console",
                FeatureSuite = "CMS & Website Studio",
                PageTitle = "Surveys & Polling Management",
                Category = "Console",
                ShortSummary = "Design multi-question surveys, satisfaction polls, and analyze member response statistics.",
                OverviewMarkdown = @"### Enterprise Surveys & Feedback Polling
Deploy satisfaction rating scales, multiple-choice questions, and open-ended feedback surveys to members or public visitors.",
                ActionsJson = @"[
  { ""trigger"": ""New Survey"", ""icon"": ""plus"", ""description"": ""Create a structured survey questionnaire."" },
  { ""trigger"": ""Analyze Results"", ""icon"": ""bar-chart"", ""description"": ""Inspect visual response charts and averages."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Forms"", ""route"": ""/content/console/forms"", ""icon"": ""check-square"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },

            // =========================================================================
            // 6. COMMERCE & PRODUCTS (Console)
            // =========================================================================
            new MasterPageHelp
            {
                RouteKey = "/products/console",
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
  { ""trigger"": ""Add Product"", ""icon"": ""plus"", ""description"": ""List a new product item with title, descriptions, image gallery, and pricing."", ""route"": ""/products/console/create"" },
  { ""trigger"": ""Product Categories"", ""icon"": ""tag"", ""description"": ""Organize storefront products into browsable collection categories."", ""route"": ""/products/console/categories"" },
  { ""trigger"": ""Orders & Fulfillment"", ""icon"": ""package"", ""description"": ""Review customer orders, shipping labels, and payment settlement records."", ""route"": ""/products/console/orders"" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Create Product"", ""route"": ""/products/console/create"", ""icon"": ""plus-circle"" },
  { ""title"": ""Orders"", ""route"": ""/products/console/orders"", ""icon"": ""package"" },
  { ""title"": ""Billing & Plans"", ""route"": ""/billing/console"", ""icon"": ""credit-card"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/products/console/create",
                FeatureSuite = "Commerce & Storefront",
                PageTitle = "Create New Merchandise Product",
                Category = "Console",
                ShortSummary = "Configure product title, SKU, localized currency prices, stock quantity, and gallery imagery.",
                OverviewMarkdown = @"### Product Authoring Studio
Add items to your digital storefront. Configure variants, tax categories, stock alerts, and digital file download attachments.",
                ActionsJson = @"[
  { ""trigger"": ""Save Product"", ""icon"": ""save"", ""description"": ""Publish item to the active online store."" },
  { ""trigger"": ""Cancel"", ""icon"": ""close"", ""description"": ""Return to product catalog."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Product Catalog"", ""route"": ""/products/console"", ""icon"": ""shopping-bag"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/products/console/categories",
                FeatureSuite = "Commerce & Storefront",
                PageTitle = "Storefront Collections & Categories",
                Category = "Console",
                ShortSummary = "Organize storefront items into browsable product collections, featured departments, and discount groups.",
                OverviewMarkdown = @"### Product Categories & Collections
Group products into intuitive shopping collections displayed on your public storefront.",
                ActionsJson = @"[
  { ""trigger"": ""New Collection"", ""icon"": ""plus"", ""description"": ""Create a product category."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Product Catalog"", ""route"": ""/products/console"", ""icon"": ""shopping-bag"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/products/console/marketing",
                FeatureSuite = "Commerce & Storefront",
                PageTitle = "Promotions, Coupons & Discounts",
                Category = "Console",
                ShortSummary = "Configure promotional voucher codes, percentage discounts, seasonal sales, and free shipping triggers.",
                OverviewMarkdown = @"### Commerce Promotions & Discount Codes
Issue promotional coupon codes with usage limits, expiry dates, and minimum order spend requirements.",
                ActionsJson = @"[
  { ""trigger"": ""New Coupon"", ""icon"": ""plus"", ""description"": ""Create a discount promo code."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Product Catalog"", ""route"": ""/products/console"", ""icon"": ""shopping-bag"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/products/console/orders",
                FeatureSuite = "Commerce & Storefront",
                PageTitle = "Customer Orders & Fulfillment",
                Category = "Console",
                ShortSummary = "Process customer purchases, manage shipping fulfillment statuses, track payment confirmations, and issue refunds.",
                OverviewMarkdown = @"### Orders & Dispatch Management
Audit online orders, review payment settlement status (Paystack/PixelPay), print shipping slips, and mark duties fulfilled.",
                ActionsJson = @"[
  { ""trigger"": ""Filter Orders"", ""icon"": ""filter"", ""description"": ""View pending, fulfilled, or cancelled orders."" },
  { ""trigger"": ""Export Orders"", ""icon"": ""download"", ""description"": ""Download orders ledger in CSV/Excel."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Transactions"", ""route"": ""/products/console/transactions"", ""icon"": ""credit-card"" },
  { ""title"": ""Product Catalog"", ""route"": ""/products/console"", ""icon"": ""shopping-bag"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/products/console/transactions",
                FeatureSuite = "Commerce & Storefront",
                PageTitle = "Commerce Payment Transactions",
                Category = "Console",
                ShortSummary = "Gateway settlement audit logs detailing payment provider reference codes, transaction fees, and net receipts.",
                OverviewMarkdown = @"### Gateway Transaction Telemetry
Reconcile payment transactions across Paystack and PixelPay. View transaction references, currency amounts, and settlement fees.",
                ActionsJson = @"[
  { ""trigger"": ""Reconcile Transactions"", ""icon"": ""refresh"", ""description"": ""Sync payment statuses with gateway providers."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Orders"", ""route"": ""/products/console/orders"", ""icon"": ""package"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },

            // =========================================================================
            // 7. BILLING & SUBSCRIPTIONS (Console)
            // =========================================================================
            new MasterPageHelp
            {
                RouteKey = "/billing/console",
                FeatureSuite = "Billing & Subscriptions",
                PageTitle = "Tenant Billing & Capability Subscriptions",
                Category = "Console",
                ShortSummary = "Oversee platform subscription tier, active modular capability add-ons, invoice history, and payment methods.",
                OverviewMarkdown = @"### Tenant Subscription & Billing Management
The **Billing Command Center** displays your organization's active platform tier, subscribed modular features, renewal dates, and payment history.

#### Modular Capabilities
Ozikol BCC operates on a modular capability model. You can activate or deactivate individual feature add-ons (such as Workforce Scheduling, Committees Governance, or Commerce Store) at any time, with prorated subscription billing.",
                ActionsJson = @"[
  { ""trigger"": ""Upgrade Plan"", ""icon"": ""arrow-up"", ""description"": ""Upgrade your tenant tier or activate additional high-volume feature capabilities."", ""route"": ""/billing/plans"" },
  { ""trigger"": ""Download Invoice"", ""icon"": ""download"", ""description"": ""Retrieve official VAT/Tax invoices and payment receipts."", ""route"": ""/billing/invoices"" },
  { ""trigger"": ""Manage Payment Method"", ""icon"": ""credit-card"", ""description"": ""Update registered credit/debit cards or bank transfer settlement mandates."", ""route"": ""/billing/payment-methods"" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Invoice History"", ""route"": ""/billing/invoices"", ""icon"": ""file-text"" },
  { ""title"": ""Subscription Plans"", ""route"": ""/billing/plans"", ""icon"": ""layers"" },
  { ""title"": ""Feature Add-ons"", ""route"": ""/billing/features"", ""icon"": ""grid"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/billing/plans",
                FeatureSuite = "Billing & Subscriptions",
                PageTitle = "Subscription Plans & Pricing Tiers",
                Category = "Console",
                ShortSummary = "Compare enterprise platform tiers, included seat capacities, monthly quotas, and switch plans.",
                OverviewMarkdown = @"### Platform Tier Comparison
Select the operational package that fits your organization scale. Tiers scale seamlessly with member count and feature usage.",
                ActionsJson = @"[
  { ""trigger"": ""Select Plan"", ""icon"": ""check"", ""description"": ""Initiate plan upgrade with prorated billing."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Billing Dashboard"", ""route"": ""/billing/console"", ""icon"": ""credit-card"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/billing/invoices",
                FeatureSuite = "Billing & Subscriptions",
                PageTitle = "VAT Invoices & Payment History",
                Category = "Console",
                ShortSummary = "Download historical tax invoices, review line-item capability charges, and inspect payment receipts.",
                OverviewMarkdown = @"### Official Invoice Repository
Access official VAT and tax receipts for tenant subscriptions and modular add-on activations.",
                ActionsJson = @"[
  { ""trigger"": ""Download PDF"", ""icon"": ""download"", ""description"": ""Download official invoice document."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Billing Dashboard"", ""route"": ""/billing/console"", ""icon"": ""credit-card"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/billing/payment-methods",
                FeatureSuite = "Billing & Subscriptions",
                PageTitle = "Payment Methods & Auto-Billing",
                Category = "Console",
                ShortSummary = "Configure credit/debit cards, bank direct debit mandates, and billing contact addresses.",
                OverviewMarkdown = @"### Payment Mandate Configuration
Manage cards and automated billing accounts to guarantee uninterrupted subscription and feature add-on renewals.",
                ActionsJson = @"[
  { ""trigger"": ""Add Card"", ""icon"": ""plus"", ""description"": ""Register a new payment card."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Billing Dashboard"", ""route"": ""/billing/console"", ""icon"": ""credit-card"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/billing/features",
                FeatureSuite = "Billing & Subscriptions",
                PageTitle = "Modular Capability Feature Catalog",
                Category = "Console",
                ShortSummary = "Activate or deactivate individual platform capabilities (e.g. Workforce Rota, Committees, CMS Marketplace).",
                OverviewMarkdown = @"### Modular Feature Activation
Enable specialized feature modules on demand. Billing is automatically calculated based on active modular subscriptions.",
                ActionsJson = @"[
  { ""trigger"": ""Activate Feature"", ""icon"": ""check"", ""description"": ""Subscribe to modular capability."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Billing Dashboard"", ""route"": ""/billing/console"", ""icon"": ""credit-card"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },

            // =========================================================================
            // 8. PERSONAL WORKSPACE & PROFILE (Workspace)
            // =========================================================================
            new MasterPageHelp
            {
                RouteKey = "/users/workspace/dashboard",
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
  { ""trigger"": ""Edit Profile"", ""icon"": ""user"", ""description"": ""Update your personal contact details, emergency contacts, and notification preferences."", ""route"": ""/users/workspace/profile"" },
  { ""trigger"": ""Security Settings"", ""icon"": ""lock"", ""description"": ""Configure password, active login sessions, and two-factor authentication (2FA)."", ""route"": ""/users/workspace/security"" },
  { ""trigger"": ""My Purchases"", ""icon"": ""shopping-bag"", ""description"": ""Review your personal event tickets, store receipts, and membership dues."", ""route"": ""/users/workspace/purchases"" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""My Profile"", ""route"": ""/users/workspace/profile"", ""icon"": ""user"" },
  { ""title"": ""Security & 2FA"", ""route"": ""/users/workspace/security"", ""icon"": ""shield"" },
  { ""title"": ""Shift Rota"", ""route"": ""/workforce/workspace/my-shifts"", ""icon"": ""calendar"" },
  { ""title"": ""Committees"", ""route"": ""/committees/workspace/my"", ""icon"": ""users"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/users/workspace/profile",
                FeatureSuite = "Personal Workspace",
                PageTitle = "Personal Profile & Contact Dossier",
                Category = "Workspace",
                ShortSummary = "Update avatar photo, personal telephone, home address, emergency contacts, and public bio.",
                OverviewMarkdown = @"### Member Dossier & Contact Information
Maintain your personal contact details. Supervisors and committee secretariats use these records for communications and incident reports.",
                ActionsJson = @"[
  { ""trigger"": ""Save Profile"", ""icon"": ""save"", ""description"": ""Commit personal contact updates."" },
  { ""trigger"": ""Change Avatar"", ""icon"": ""image"", ""description"": ""Upload new profile photo."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Workspace Home"", ""route"": ""/users/workspace/dashboard"", ""icon"": ""grid"" },
  { ""title"": ""Security"", ""route"": ""/users/workspace/security"", ""icon"": ""shield"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/users/workspace/kpi",
                FeatureSuite = "Personal Workspace",
                PageTitle = "Personal KPI Accomplishments & Performance",
                Category = "Workspace",
                ShortSummary = "View supervisor grading scores, punctuality rating, completed milestones, and achievements.",
                OverviewMarkdown = @"### Member Accomplishment & KPI Tracker
Review your quarterly performance evaluations, supervisor feedback, attendance reliability ratings, and institutional recognition badges.",
                ActionsJson = @"[
  { ""trigger"": ""Export Report"", ""icon"": ""download"", ""description"": ""Download performance record."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Workspace Home"", ""route"": ""/users/workspace/dashboard"", ""icon"": ""grid"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/users/workspace/security",
                FeatureSuite = "Personal Workspace",
                PageTitle = "Personal Account Security & Two-Factor (2FA)",
                Category = "Workspace",
                ShortSummary = "Manage personal login password, enroll authenticator app (TOTP 2FA), and revoke active device sessions.",
                OverviewMarkdown = @"### Personal Security Center
Safeguard your workspace account. Enroll an authenticator app for 2FA, change your password, and inspect active device sessions.",
                ActionsJson = @"[
  { ""trigger"": ""Change Password"", ""icon"": ""lock"", ""description"": ""Update login credentials."" },
  { ""trigger"": ""Enable 2FA"", ""icon"": ""shield"", ""description"": ""Scan QR code to bind authenticator app."" },
  { ""trigger"": ""Log Out Devices"", ""icon"": ""log-out"", ""description"": ""Revoke all other browser sessions."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""My Profile"", ""route"": ""/users/workspace/profile"", ""icon"": ""user"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/users/workspace/notifications",
                FeatureSuite = "Personal Workspace",
                PageTitle = "Notification Center & Preferences",
                Category = "Workspace",
                ShortSummary = "Review all historical system alerts, shift assignments, and customize notification delivery preferences.",
                OverviewMarkdown = @"### Notification Inbox & Alert Feed
Review in-app alerts regarding shifts, committee meeting calls, and team mentions. Configure email vs push delivery channels.",
                ActionsJson = @"[
  { ""trigger"": ""Mark All Read"", ""icon"": ""check"", ""description"": ""Dismiss unread alert count."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Workspace Home"", ""route"": ""/users/workspace/dashboard"", ""icon"": ""grid"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/users/workspace/purchases",
                FeatureSuite = "Personal Workspace",
                PageTitle = "My Purchases, Receipts & Tickets",
                Category = "Workspace",
                ShortSummary = "Personal purchase receipts for storefront merchandise, event tickets, membership dues, and invoices.",
                OverviewMarkdown = @"### Member Orders & Receipts Archive
Access personal purchase receipts, event barcodes, membership dues vouchers, and download VAT payment proofs.",
                ActionsJson = @"[
  { ""trigger"": ""Download Receipt"", ""icon"": ""download"", ""description"": ""Download purchase PDF."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Workspace Home"", ""route"": ""/users/workspace/dashboard"", ""icon"": ""grid"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/users/workspace/chat",
                FeatureSuite = "Personal Workspace",
                PageTitle = "Team Chat & Direct Peer Messaging",
                Category = "Workspace",
                ShortSummary = "Encrypted peer-to-peer messaging, group channels, document sharing, and direct team collaboration.",
                OverviewMarkdown = @"### Real-Time Peer & Channel Messaging
Communicate instantly with colleagues, committee members, and supervisors. Supports rich formatting, file attachments, and message reactions.",
                ActionsJson = @"[
  { ""trigger"": ""New Chat"", ""icon"": ""plus"", ""description"": ""Start a direct conversation with a colleague."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Workspace Groups"", ""route"": ""/users/workspace/groups"", ""icon"": ""users"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/users/workspace/groups",
                FeatureSuite = "Personal Workspace",
                PageTitle = "Workspace Groups & Community Channels",
                Category = "Workspace",
                ShortSummary = "Join or browse departmental group channels, discussion forums, and community interest groups.",
                OverviewMarkdown = @"### Community & Departmental Channels
Collaborate with fellow members in open or invite-only community groups and interest channels.",
                ActionsJson = @"[
  { ""trigger"": ""Create Group"", ""icon"": ""plus"", ""description"": ""Establish a new team collaboration channel."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Team Chat"", ""route"": ""/users/workspace/chat"", ""icon"": ""message"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/users/workspace/alumni",
                FeatureSuite = "Personal Workspace",
                PageTitle = "Alumni Network & Cohorts Directory",
                Category = "Workspace",
                ShortSummary = "Connect with organization alumni, graduating class cohorts, and professional mentorship networks.",
                OverviewMarkdown = @"### Alumni & Cohorts Network
Directory of alumni fellows and former officers. Connect with graduating cohorts and explore mentorship opportunities.",
                ActionsJson = @"[
  { ""trigger"": ""Search Alumni"", ""icon"": ""search"", ""description"": ""Find colleagues by graduation year or field."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Workspace Home"", ""route"": ""/users/workspace/dashboard"", ""icon"": ""grid"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },

            // =========================================================================
            // 9. PLATFORM SETTINGS & DOMAINS (Console)
            // =========================================================================
            new MasterPageHelp
            {
                RouteKey = "/settings/console/general",
                FeatureSuite = "Platform Settings",
                PageTitle = "General Organization Settings",
                Category = "Settings",
                ShortSummary = "Configure tenant corporate identity, primary currency, time zone, localization language, and support contacts.",
                OverviewMarkdown = @"### Organization Configuration & Localization
Set your tenant legal name, canonical time zone for shift rostering, primary operating currency, and default system language.",
                ActionsJson = @"[
  { ""trigger"": ""Save Configuration"", ""icon"": ""save"", ""description"": ""Commit general settings updates."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Currencies"", ""route"": ""/settings/console/general/currency"", ""icon"": ""dollar"" },
  { ""title"": ""Custom Domain"", ""route"": ""/settings/console/custom-domain"", ""icon"": ""globe"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/settings/console/general/currency",
                FeatureSuite = "Platform Settings",
                PageTitle = "Multi-Currency & Exchange Rates",
                Category = "Settings",
                ShortSummary = "Select primary base currency, enabled transaction currencies, and configure dynamic or fixed exchange rates.",
                OverviewMarkdown = @"### Currency & Multi-Currency Engine
Configure store and billing currencies (USD, GBP, EUR, NGN, KES, GHS, ZAR). Exchange rates sync automatically from Central Master.",
                ActionsJson = @"[
  { ""trigger"": ""Save Currencies"", ""icon"": ""save"", ""description"": ""Commit active currency selection."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""General Settings"", ""route"": ""/settings/console/general"", ""icon"": ""settings"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/settings/console/custom-domain",
                FeatureSuite = "Platform Settings",
                PageTitle = "Custom Sovereign Domain (CNAME / SSL)",
                Category = "Settings",
                ShortSummary = "Bind your custom corporate domain (e.g. nightpresssecurity.co.uk) with automated SSL certification.",
                OverviewMarkdown = @"### Custom Domain Configuration
Map your company's sovereign domain name to your Ozikol BCC instance. Follow DNS CNAME instructions to enable free automated SSL/TLS encryption.",
                ActionsJson = @"[
  { ""trigger"": ""Verify DNS"", ""icon"": ""refresh"", ""description"": ""Probe DNS records for CNAME validation."" },
  { ""trigger"": ""Save Domain"", ""icon"": ""check"", ""description"": ""Bind domain to your tenant workspace."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""General Settings"", ""route"": ""/settings/console/general"", ""icon"": ""settings"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },

            // =========================================================================
            // 10. PUBLIC STOREFRONT & AUTH
            // =========================================================================
            new MasterPageHelp
            {
                RouteKey = "/store",
                FeatureSuite = "Public Storefront",
                PageTitle = "Public Merchandise & Products Store",
                Category = "Public",
                ShortSummary = "Public customer shopping catalog with product categories, localized prices, and shopping cart.",
                OverviewMarkdown = @"### Public Online Store
Browse and purchase organization merchandise, event tickets, and services with localized currency payments.",
                ActionsJson = @"[
  { ""trigger"": ""View Cart"", ""icon"": ""shopping-cart"", ""description"": ""Review selected items."", ""route"": ""/store/cart"" },
  { ""trigger"": ""Filter"", ""icon"": ""filter"", ""description"": ""Filter by product collection."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Shopping Cart"", ""route"": ""/store/cart"", ""icon"": ""shopping-cart"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/store/cart",
                FeatureSuite = "Public Storefront",
                PageTitle = "Shopping Cart",
                Category = "Public",
                ShortSummary = "Review selected merchandise items, adjust quantities, apply discount codes, and proceed to checkout.",
                OverviewMarkdown = @"### Shopping Cart & Order Summary
Review items before payment. Apply promotional coupon codes and proceed to secure card/transfer checkout.",
                ActionsJson = @"[
  { ""trigger"": ""Proceed to Checkout"", ""icon"": ""credit-card"", ""description"": ""Proceed to payment form."", ""route"": ""/store/checkout"" },
  { ""trigger"": ""Apply Coupon"", ""icon"": ""tag"", ""description"": ""Validate promotional discount code."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Store Catalog"", ""route"": ""/store"", ""icon"": ""shopping-bag"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/store/checkout",
                FeatureSuite = "Public Storefront",
                PageTitle = "Secure Checkout & Payment Gateway",
                Category = "Public",
                ShortSummary = "Complete customer delivery address, select payment gateway (Paystack / PixelPay), and finalize order.",
                OverviewMarkdown = @"### Secure Payment Checkout
Pay securely via encrypted Paystack or PixelPay gateways with instant digital order confirmation.",
                ActionsJson = @"[
  { ""trigger"": ""Pay Now"", ""icon"": ""lock"", ""description"": ""Initiate secure gateway payment modal."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Cart"", ""route"": ""/store/cart"", ""icon"": ""shopping-cart"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/auth/login",
                FeatureSuite = "Public Auth",
                PageTitle = "Member & Administrator Sign-In",
                Category = "Public",
                ShortSummary = "Secure authentication gate with email/password, two-factor authenticator challenges, and workspace routing.",
                OverviewMarkdown = @"### Secure Portal Sign-In
Authenticate into your tenant workspace or central console. Validates multi-factor authentication (2FA) and device fingerprints.",
                ActionsJson = @"[
  { ""trigger"": ""Sign In"", ""icon"": ""log-in"", ""description"": ""Verify credentials and open workspace."" },
  { ""trigger"": ""Forgot Password"", ""icon"": ""help"", ""description"": ""Request self-service password reset email."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Register Account"", ""route"": ""/auth/register"", ""icon"": ""user-plus"" }
]",
                IsPublished = true,
                LastUpdatedBy = "system@ozikol.cloud"
            },
            new MasterPageHelp
            {
                RouteKey = "/auth/register",
                FeatureSuite = "Public Auth",
                PageTitle = "Member Self-Registration",
                Category = "Public",
                ShortSummary = "Public registration form for new organization applicants and member self-onboarding.",
                OverviewMarkdown = @"### Public Account Registration
Register a new profile for access to personal workspace, committee applications, and staff duty rosters.",
                ActionsJson = @"[
  { ""trigger"": ""Register"", ""icon"": ""check"", ""description"": ""Submit profile for onboarding verification."" }
]",
                RelatedRoutesJson = @"[
  { ""title"": ""Sign In"", ""route"": ""/auth/login"", ""icon"": ""log-in"" }
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
