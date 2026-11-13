using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Ozikol.Central.Services.Seo;

namespace Ozikol.Central.Pages.Solutions
{
    /// <summary>
    /// Metadata definition for a vertical industry solution in Ozikol BCC.
    /// </summary>
    public class IndustrySolutionDefinition
    {
        public string Slug { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Tagline { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Icon { get; set; } = string.Empty;
        public string Badge { get; set; } = string.Empty;
        public string HeroHeadline { get; set; } = string.Empty;
        public string HeroSubheadline { get; set; } = string.Empty;
        public List<string> KeyPillars { get; set; } = new();
    }

    /// <summary>
    /// Dynamic Page Model serving both the Solutions directory and individual vertical industry pages.
    /// </summary>
    public class IndexModel : PageModel
    {
        private readonly IFeatureKnowledgeRegistry _featureRegistry;

        public IndexModel(IFeatureKnowledgeRegistry featureRegistry)
        {
            _featureRegistry = featureRegistry;
        }

        public string? ActiveSlug { get; private set; }
        public IndustrySolutionDefinition? ActiveSolution { get; private set; }
        public IReadOnlyList<FeatureKnowledgeEntry> RelevantFeatures { get; private set; } = Array.Empty<FeatureKnowledgeEntry>();
        public IReadOnlyList<IndustrySolutionDefinition> AllSolutions { get; private set; } = Array.Empty<IndustrySolutionDefinition>();

        public string CurrentCulture => (RouteData.Values["culture"] as string) ?? "en";

        private static readonly Dictionary<string, IndustrySolutionDefinition> _solutions = new(StringComparer.OrdinalIgnoreCase)
        {
            ["healthcare"] = new IndustrySolutionDefinition
            {
                Slug = "healthcare",
                Title = "Healthcare & Medical Clinics",
                Badge = "Healthcare & Life Sciences",
                Icon = "local_hospital",
                Tagline = "24/7 Clinical Shift Coverage, Multi-Station Check-Ins & Immutable Audit Compliance",
                HeroHeadline = "Unified Operations for Medical Clinics, Hospitals & Healthcare Networks",
                HeroSubheadline = "Eliminate nurse shift shortages, protect sensitive patient records with hardware document sandboxing, and maintain complete HIPAA-grade audit trails across all departments.",
                Description = "Modern healthcare facilities operate around the clock. Ozikol BCC provides clinical administrators with visual drag-and-drop rota planning, instant emergency shift broadcasts to certified staff, and workstation hardware binding that prevents proxy clock-ins.",
                KeyPillars = new List<string>
                {
                    "Instant Relief Nurse & Doctor Shift Broadcasting",
                    "Mandatory Rest-Interval & Skill-Coverage Validation",
                    "Hardware-Verified Terminal Sandboxing for Clinical Records",
                    "Complete IP & Timestamped Security Audit Logs"
                }
            },
            ["retail-pos"] = new IndustrySolutionDefinition
            {
                Slug = "retail-pos",
                Title = "Retail & Multi-Outlet Chains",
                Badge = "Retail, Commerce & POS",
                Icon = "storefront",
                Tagline = "Desktop POS Registers, Real-Time Inventory Sync & Cashier Shift Governance",
                HeroHeadline = "Unified Commerce and Point-of-Sale for Multi-Branch Retailers",
                HeroSubheadline = "Synchronize in-person POS sales with your online catalog in real-time, print thermal receipts offline, and eliminate cashier shrinkage with shift float reconciliation.",
                Description = "Whether running a high-traffic boutique, pharmacy, or regional supermarket chain, Ozikol BCC unites offline-resilient desktop POS terminals with real-time stock synchronizers and multi-currency payment gateways.",
                KeyPillars = new List<string>
                {
                    "Rapid Barcode Scanner & ESC/POS Thermal Printer Support",
                    "Offline-Resilient POS Cash Register with Auto-Sync",
                    "Multi-Currency Pricing (USD, NGN, EUR, GBP)",
                    "Unified Multi-Store Inventory & Stock Depletion"
                }
            },
            ["education"] = new IndustrySolutionDefinition
            {
                Slug = "education",
                Title = "Educational Institutions & Academies",
                Badge = "Education & Higher Learning",
                Icon = "school",
                Tagline = "Faculty Shift Rotas, Computer Lab Station Supervisor & Academic Senate Governance",
                HeroHeadline = "Sovereign Command Center for Universities, Schools & Academies",
                HeroSubheadline = "Manage faculty timetables, securely govern academic senate committees, issue digital student credentials, and supervise computer lab terminals.",
                Description = "Educational institutions require complex departmental coordination. Ozikol BCC provides independent committee workspaces for faculty boards, hardware terminal locking for assessment labs, and streamlined staff scheduling.",
                KeyPillars = new List<string>
                {
                    "Faculty & Lecturer Timetable Scheduling",
                    "Academic Council & Senate Committee Minutes and Voting",
                    "Computer Lab Workstation Lockdown & Assessment Mode",
                    "Multi-Tier Role-Based Security for Staff and Students"
                }
            },
            ["corporate-governance"] = new IndustrySolutionDefinition
            {
                Slug = "corporate-governance",
                Title = "Enterprise Boards & Corporate Governance",
                Badge = "Corporate Governance & Legal",
                Icon = "account_balance",
                Tagline = "Executive Board Workspaces, Minuted Agendas, Voting Records & Document Vaults",
                HeroHeadline = "Zero-Trust Governance for Executive Boards & Leadership Teams",
                HeroSubheadline = "Replace fragmented email chains with sovereign committee workspaces, automated agenda time-boxing, formal minuted records, and cryptographic resolution tracking.",
                Description = "Corporate boards and non-profit trustees require ironclad confidentiality and structured decision-making. Ozikol BCC gives each committee an autonomous workspace with tamper-proof records and role-based permissions.",
                KeyPillars = new List<string>
                {
                    "Isolated Executive Board Workspaces with Granular Permissions",
                    "Structured Meeting Agenda Composer with Topic Time-Boxing",
                    "Formal Minuted Reports with Cloud Document Attachments",
                    "Immutable Voting Records & Quorum Threshold Tracking"
                }
            }
        };

        public IActionResult OnGet(string? slug = null)
        {
            AllSolutions = _solutions.Values.ToList().AsReadOnly();

            if (string.IsNullOrWhiteSpace(slug))
            {
                ActiveSlug = null;
                ActiveSolution = null;
                return Page();
            }

            if (_solutions.TryGetValue(slug, out var solution))
            {
                ActiveSlug = slug;
                ActiveSolution = solution;
                RelevantFeatures = _featureRegistry.GetFeaturesForIndustry(slug);
                return Page();
            }

            // Redirect unmapped slug back to solutions directory
            return RedirectToPage("/Solutions/Index", new { culture = CurrentCulture });
        }
    }
}
