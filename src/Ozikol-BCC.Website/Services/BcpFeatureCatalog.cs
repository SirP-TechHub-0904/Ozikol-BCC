using System.Collections.Generic;
using System.Linq;

namespace Ozikol_BCC.Website.Services
{
    public sealed record BcpFeatureDefinition(
        string FeatureName,
        string ModuleFolder,
        string Description,
        string Icon,
        int SortOrder,
        bool HasConsole = true,
        bool HasWorkspace = true,
        bool RequiresSubscription = true)
    {
        public string ConsolePath => $"/{ModuleFolder}/Console";
        public string WorkspacePath => $"/{ModuleFolder}/Workspace";
    }

    public static class BcpFeatureCatalog
    {
        public static IReadOnlyList<BcpFeatureDefinition> Features { get; } =
        [
            new("User Management & KPIs", "BcpUserManagement", "People, categories, KPI scoring, and feature roles.", "groups", 10),
            new("Committees & Groups", "BcpGroups", "Private workspaces for committees and sub-groups.", "hub", 20),
            new("Alumni Directory", "BcpAlumni", "Alumni profiles, networking, mentorship, and opportunities.", "diversity_3", 30),
            new("Dynamic Reports", "BcpReports", "Interval-based reports, submissions, and lateness tracking.", "assignment", 40),
            new("Manual & Knowledge Base", "BcpManuals", "Interactive manuals and feature help content.", "menu_book", 50, RequiresSubscription: false),
            new("Forms & Surveys", "BcpForms", "Custom forms, responses, and survey collection.", "dynamic_form", 60),
            new("Ticketing", "BcpTicketing", "Events, ticket types, purchases, and QR validation.", "confirmation_number", 70),
            new("Finance & Dues", "BcpFinances", "Dues, donations, transactions, and defaulter tracking.", "account_balance_wallet", 80),
            new("Proposals", "BcpProposals", "Internal ideas, pitches, budgets, and approval flow.", "lightbulb", 90),
            new("Grants", "BcpGrants", "Donors, funding awards, milestones, and reporting deadlines.", "volunteer_activism", 100),
            new("Recruitment", "BcpRecruitment", "Job postings, applicants, interviews, and candidate scoring.", "badge", 110),
            new("Elections", "BcpVoting", "Elections, candidates, accreditation, voting, and results.", "how_to_vote", 120),
            new("Fleet & Equipment", "BcpEquipment", "Equipment, vehicle, maintenance, and lifecycle records.", "precision_manufacturing", 130),
            new("Projects & Tasks", "BcpProjects", "Projects, sprints, tasks, priorities, and completion tracking.", "task_alt", 140),
            new("Smart Assist", "BcpSmartAssist", "BYOK AI configuration and assisted drafting.", "auto_awesome", 150),
            new("Mass Communication", "BcpMassComm", "SMS, newsletters, contacts, campaigns, and wallets.", "campaign", 160),
            new("Helpdesk", "BcpHelpdesk", "Support requests, ticket handling, and resolution tracking.", "support_agent", 170),
            new("Documents", "BcpDocuments", "Policies, files, version control, and secure access.", "folder_managed", 180),
            new("Learning", "BcpLearning", "Training content, tests, progress, and certificates.", "school", 190),
            new("Visitors", "BcpVisitors", "Gate logs, guest records, host notifications, and visitor history.", "sensor_door", 200),
        ];

        public static BcpFeatureDefinition? FindByPath(string path)
        {
            return Features.FirstOrDefault(feature =>
                path.StartsWith("/" + feature.ModuleFolder, System.StringComparison.OrdinalIgnoreCase));
        }
    }
}
