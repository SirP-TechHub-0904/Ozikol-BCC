using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;

namespace Ozikol.Central.Services.Seo
{
    /// <summary>
    /// Singleton service implementation managing structured knowledge manifests,
    /// FAQ schema generation, cross-platform specifications, and GEO entity mapping for Ozikol BCC features.
    /// </summary>
    public class FeatureKnowledgeRegistry : IFeatureKnowledgeRegistry
    {
        private readonly Dictionary<string, FeatureKnowledgeEntry> _byCode = new(StringComparer.OrdinalIgnoreCase);
        private readonly Dictionary<string, FeatureKnowledgeEntry> _bySlug = new(StringComparer.OrdinalIgnoreCase);

        /// <summary>
        /// Initializes a new instance of the <see cref="FeatureKnowledgeRegistry"/> class
        /// and populates the canonical feature knowledge manifests.
        /// </summary>
        public FeatureKnowledgeRegistry()
        {
            RegisterCoreFeatures();
        }

        /// <inheritdoc />
        public FeatureKnowledgeEntry? GetFeature(string featureCodeOrSlug)
        {
            if (string.IsNullOrWhiteSpace(featureCodeOrSlug)) return null;
            var key = featureCodeOrSlug.Trim();

            if (_byCode.TryGetValue(key, out var byCode)) return byCode;
            if (_bySlug.TryGetValue(key, out var bySlug)) return bySlug;

            // Handle slugs without leading slash
            var withSlash = key.StartsWith("/") ? key : "/" + key;
            if (_bySlug.TryGetValue(withSlash, out var bySlugWithSlash)) return bySlugWithSlash;

            return null;
        }

        /// <inheritdoc />
        public IReadOnlyList<FeatureKnowledgeEntry> GetAllFeatures()
        {
            return _byCode.Values.ToList().AsReadOnly();
        }

        /// <inheritdoc />
        public IReadOnlyList<FeatureKnowledgeEntry> GetFeaturesForIndustry(string industryKey)
        {
            if (string.IsNullOrWhiteSpace(industryKey)) return Array.Empty<FeatureKnowledgeEntry>();
            var target = industryKey.Trim().ToLowerInvariant();

            return _byCode.Values
                .Where(f => f.IndustryUseCases.Any(u => u.IndustryKey.Equals(target, StringComparison.OrdinalIgnoreCase)))
                .ToList()
                .AsReadOnly();
        }

        /// <inheritdoc />
        public string GenerateJsonLdSchema(FeatureKnowledgeEntry entry, string currentUrl)
        {
            if (entry == null) return string.Empty;

            var sb = new StringBuilder();
            sb.AppendLine("<script type=\"application/ld+json\">");
            sb.AppendLine("{");
            sb.AppendLine("  \"@context\": \"https://schema.org\",");
            sb.AppendLine("  \"@graph\": [");

            // 1. SoftwareApplication Schema
            sb.AppendLine("    {");
            sb.AppendLine("      \"@type\": \"SoftwareApplication\",");
            sb.AppendLine($"      \"name\": \"Ozikol BCC - {EscapeJson(entry.Title)}\",");
            sb.AppendLine($"      \"applicationCategory\": \"BusinessApplication\",");
            sb.AppendLine($"      \"operatingSystem\": \"Windows 10, Windows 11, macOS, Linux, Android, iOS, Web\",");
            sb.AppendLine($"      \"url\": \"{EscapeJson(currentUrl)}\",");
            sb.AppendLine($"      \"description\": \"{EscapeJson(entry.Summary)}\",");
            sb.AppendLine("      \"offers\": {");
            sb.AppendLine("        \"@type\": \"Offer\",");
            sb.AppendLine("        \"price\": \"0\",");
            sb.AppendLine("        \"priceCurrency\": \"USD\",");
            sb.AppendLine("        \"name\": \"14-Day Free Operational Trial\"");
            sb.AppendLine("      },");
            sb.AppendLine("      \"author\": {");
            sb.AppendLine("        \"@type\": \"Organization\",");
            sb.AppendLine("        \"name\": \"Ozikol Business Command Center\",");
            sb.AppendLine("        \"url\": \"https://ozikol.cloud\"");
            sb.AppendLine("      }");
            sb.AppendLine("    },");

            // 2. FAQPage Schema
            sb.AppendLine("    {");
            sb.AppendLine("      \"@type\": \"FAQPage\",");
            sb.AppendLine("      \"mainEntity\": [");

            for (var i = 0; i < entry.Faqs.Count; i++)
            {
                var faq = entry.Faqs[i];
                var isLast = i == entry.Faqs.Count - 1;
                sb.AppendLine("        {");
                sb.AppendLine("          \"@type\": \"Question\",");
                sb.AppendLine($"          \"name\": \"{EscapeJson(faq.Question)}\",");
                sb.AppendLine("          \"acceptedAnswer\": {");
                sb.AppendLine("            \"@type\": \"Answer\",");
                sb.AppendLine($"            \"text\": \"{EscapeJson(faq.Answer)}\"");
                sb.AppendLine("          }");
                sb.AppendLine(isLast ? "        }" : "        },");
            }

            sb.AppendLine("      ]");
            sb.AppendLine("    }");
            sb.AppendLine("  ]");
            sb.AppendLine("}");
            sb.AppendLine("</script>");

            return sb.ToString();
        }

        private static string EscapeJson(string? val)
        {
            if (string.IsNullOrEmpty(val)) return string.Empty;
            return val
                .Replace("\\", "\\\\")
                .Replace("\"", "\\\"")
                .Replace("\r", "")
                .Replace("\n", "\\n");
        }

        private void Register(FeatureKnowledgeEntry entry)
        {
            _byCode[entry.FeatureCode] = entry;
            _bySlug[entry.RouteSlug] = entry;
        }

        private void RegisterCoreFeatures()
        {
            // ─────────────────────────────────────────────────────────────────
            // 1. bcp-staff-rota: Workforce Scheduling & Shift Rota
            // ─────────────────────────────────────────────────────────────────
            Register(new FeatureKnowledgeEntry
            {
                FeatureCode = "bcp-staff-rota",
                Title = "Staff Rota & Shift Scheduling",
                Tagline = "Intelligent Workforce Scheduling, Shift Swaps & Mobile Attendance",
                SuiteName = "Workforce & Operations",
                RouteSlug = "/features/staff-rota",
                Summary = "Ozikol BCC Staff Rota is an enterprise workforce management suite featuring drag-and-drop weekly/monthly shift scheduling, skill-coverage rules, open shift broadcasts, mobile clock-in, and automated overtime calculations.",
                ArchitecturalMoat = "Eliminates clock-in buddy punching by binding physical workstation supervisor hardware to shift clock-in records across web and mobile.",
                Platforms = new List<PlatformSupportBadge>
                {
                    new() { Name = "Web Administration", Category = "Web", Icon = "globe", TechnicalDetail = "Angular 19 Reactive Drag-and-Drop Roster Planner" },
                    new() { Name = "Mobile iOS & Android", Category = "Mobile", Icon = "smartphone", TechnicalDetail = "Flutter Native App for GPS/Geofenced Clock-In & Shift Swaps" },
                    new() { Name = "Desktop Supervisor", Category = "Desktop", Icon = "desktop_windows", TechnicalDetail = "Native Windows (.exe) & macOS Workstation Clock-In" }
                },
                KeyCapabilities = new List<string>
                {
                    "Visual Drag-and-Drop Weekly & Monthly Roster Builder",
                    "Automated Skill & Coverage Rules (e.g. minimum 1 supervisor + 2 first-aiders per shift)",
                    "Open Shift Broadcasts for instantaneous team self-claiming",
                    "Employee Leave Request & Manager Approval Workflows",
                    "Real-time overtime budget calculations and fatigue alerts",
                    "Instant calendar sync with Google Calendar, Apple iCal, and Outlook"
                },
                Faqs = new List<FeatureFaqItem>
                {
                    new()
                    {
                        Question = "Can employees clock in from their mobile phones?",
                        Answer = "Yes. Through the native Ozikol Mobile app (available for iOS and Android), staff members can clock in and out with GPS geofencing verification or QR scanning at designated workspace stations."
                    },
                    new()
                    {
                        Question = "How does Ozikol BCC handle shift swaps and leave requests?",
                        Answer = "Staff members can request shift swaps with eligible colleagues directly in the mobile app. The swap automatically verifies skill parity before routing to the department supervisor for one-click approval."
                    },
                    new()
                    {
                        Question = "Does the rota planner prevent overtime and understaffing?",
                        Answer = "Yes. As managers drag and drop shifts, Ozikol BCC validates mandatory rest breaks, contracted maximum hours, and department skill minimums in real-time, displaying non-compliance warnings before publishing."
                    },
                    new()
                    {
                        Question = "Can shift rotas be exported or synced with external payroll systems?",
                        Answer = "Yes. Rota attendance reports export to Excel, CSV, and PDF formats, and can be consumed directly via the Ozikol BCC REST API (/api/workforce/rota) for integration with external payroll software."
                    }
                },
                IndustryUseCases = new List<IndustryUseCaseItem>
                {
                    new()
                    {
                        IndustryKey = "healthcare",
                        IndustryName = "Hospitals & Medical Clinics",
                        Headline = "Continuous 24/7 Clinical Shift Coverage",
                        ProblemSolved = "Medical facilities struggle with sudden nurse call-outs and mandatory specialization coverage.",
                        SolutionSummary = "Broadcast open clinical shifts to certified relief staff within seconds while enforcing rest-interval compliance.",
                        Icon = "local_hospital"
                    },
                    new()
                    {
                        IndustryKey = "retail-pos",
                        IndustryName = "Retail & Multi-Outlet Chains",
                        Headline = "Peak Hour Cashier & Store Staffing",
                        ProblemSolved = "Retail chains experience high turnover and unpredictable foot-traffic spikes.",
                        SolutionSummary = "Dynamic shift templates matched to store opening hours, automated break schedules, and multi-branch assignment.",
                        Icon = "storefront"
                    }
                }
            });

            // ─────────────────────────────────────────────────────────────────
            // 2. bcp-workspace: Workstation Supervisor & Document Sandboxing
            // ─────────────────────────────────────────────────────────────────
            Register(new FeatureKnowledgeEntry
            {
                FeatureCode = "bcp-workspace",
                Title = "Workstation Supervisor & Sandboxing",
                Tagline = "Physical Station Telemetry, Hardware Gatekeeper & Tamper-Proof Attendance",
                SuiteName = "Station Governance & Hardware",
                RouteSlug = "/features/workspace",
                Summary = "Ozikol BCC Workstation Supervisor is a native desktop client running on Windows, macOS, and Linux that binds physical workstation hardware to user identity, preventing clock-in fraud and sandboxing company documents.",
                ArchitecturalMoat = "Hardware-verified physical presence prevents remote proxy clock-in and secures workstation environments with offline telemetry buffering.",
                Platforms = new List<PlatformSupportBadge>
                {
                    new() { Name = "Windows Desktop", Category = "Desktop", Icon = "desktop_windows", TechnicalDetail = "Native C++ / Flutter Windows 10/11 x64 (.exe)" },
                    new() { Name = "macOS Workstation", Category = "Desktop", Icon = "laptop_mac", TechnicalDetail = "Apple Silicon & Intel Universal Binary (.app)" },
                    new() { Name = "Linux Station", Category = "Desktop", Icon = "terminal", TechnicalDetail = "Debian / Ubuntu / RedHat workstation daemon" },
                    new() { Name = "Web Central Console", Category = "Web", Icon = "dashboard", TechnicalDetail = "Real-time station monitoring and remote session termination" }
                },
                KeyCapabilities = new List<string>
                {
                    "Physical Station Hardware UUID & Motherboard Serial Binding",
                    "Hardware-Verified Clock-In handshake preventing remote proxy attendance",
                    "Offline Telemetry Logging with encrypted sync upon reconnect",
                    "Document Sandboxing preventing unauthorized local file exfiltration",
                    "Real-time operator shift monitoring across multi-station floors",
                    "Remote lock and emergency session purge from Central Web Console"
                },
                Faqs = new List<FeatureFaqItem>
                {
                    new()
                    {
                        Question = "What operating systems are supported by the Workstation Supervisor?",
                        Answer = "Ozikol Workstation Supervisor runs natively on Windows 10/11 (64-bit), macOS 12+ (Apple Silicon and Intel), and major Linux distributions (Ubuntu, Debian, Fedora)."
                    },
                    new()
                    {
                        Question = "How does workstation hardware binding stop clock-in fraud?",
                        Answer = "The desktop application hashes physical hardware identifiers (motherboard serial, BIOS UUID, MAC address) into a cryptographic token. Staff cannot spoof attendance from home or personal devices because shifts must physically originate from an enrolled company station."
                    },
                    new()
                    {
                        Question = "What happens if the internet goes down during an active shift?",
                        Answer = "Workstation Supervisor buffers all station telemetry, shift clocks, and document access records inside an encrypted SQLite local cache and automatically flushes to Central servers the moment connectivity is restored."
                    }
                },
                IndustryUseCases = new List<IndustryUseCaseItem>
                {
                    new()
                    {
                        IndustryKey = "corporate-governance",
                        IndustryName = "Enterprise & Corporate Operations",
                        Headline = "Zero-Trust Physical Workstation Control",
                        ProblemSolved = "Sensitive legal, financial, and executive documents being copied to unverified personal laptops.",
                        SolutionSummary = "Hardware sandboxing ensures corporate records can only be opened on authenticated, enrolled workstations.",
                        Icon = "security"
                    },
                    new()
                    {
                        IndustryKey = "education",
                        IndustryName = "Computer Labs & Examination Centers",
                        Headline = "Hardware Locked Computer Terminals",
                        ProblemSolved = "Students altering desktop settings or accessing external drives during assessments.",
                        SolutionSummary = "Lock workstations into dedicated supervisor mode during test and lecture sessions.",
                        Icon = "school"
                    }
                }
            });

            // ─────────────────────────────────────────────────────────────────
            // 3. bcp-commerce-studio: Point of Sale (POS) & Commerce
            // ─────────────────────────────────────────────────────────────────
            Register(new FeatureKnowledgeEntry
            {
                FeatureCode = "bcp-commerce-studio",
                Title = "Point of Sale (POS) & Commerce",
                Tagline = "Multi-Store POS Checkout, Inventory Sync & Multi-Gateway Processing",
                SuiteName = "Commerce & Retail Operations",
                RouteSlug = "/features/store-ecommerce",
                Summary = "Ozikol BCC Commerce is an omnichannel retail operating engine combining a rapid-checkout Point of Sale (POS) desktop terminal with a unified online storefront, inventory synchronizer, and multi-gateway payment processing.",
                ArchitecturalMoat = "Unifies in-person cash register checkout and online catalog stock in real-time with offline POS transaction queueing.",
                Platforms = new List<PlatformSupportBadge>
                {
                    new() { Name = "Desktop POS Terminal", Category = "Desktop", Icon = "point_of_sale", TechnicalDetail = "Native Windows (.exe) with barcode reader & receipt printer support" },
                    new() { Name = "Web Storefront", Category = "Web", Icon = "shopping_cart", TechnicalDetail = "Mobile-first responsive online store with instant checkout" },
                    new() { Name = "Mobile Cashier App", Category = "Mobile", Icon = "smartphone", TechnicalDetail = "Flutter mobile POS for pop-up shops, tableside, and mobile sales" }
                },
                KeyCapabilities = new List<string>
                {
                    "Instant-scan barcode lookup and multi-variant SKU management",
                    "Integrated ESC/POS thermal receipt printing and digital email receipts",
                    "Unified inventory synchronizer between physical stores and web catalog",
                    "Multi-gateway checkout supporting Paystack, Stripe, and Cash on Delivery",
                    "Cashier shift opening/closing floats and daily cash drawer reconciliation",
                    "Multi-currency pricing supporting USD, NGN, EUR, and GBP"
                },
                Faqs = new List<FeatureFaqItem>
                {
                    new()
                    {
                        Question = "Can the POS terminal operate when internet connection drops?",
                        Answer = "Yes. The desktop POS terminal caches catalog prices and local stock, allowing cashiers to ring up sales and print receipts offline. Pending transactions sync automatically once internet returns."
                    },
                    new()
                    {
                        Question = "What payment gateways are supported?",
                        Answer = "Ozikol BCC natively integrates with Paystack, Flutterwave, Stripe, and Direct Bank Transfer, alongside cash and split-payment methods."
                    },
                    new()
                    {
                        Question = "Does it support hardware barcode scanners and receipt printers?",
                        Answer = "Yes. The native desktop POS client connects directly with standard USB/Bluetooth barcode scanners and ESC/POS thermal receipt printers."
                    }
                },
                IndustryUseCases = new List<IndustryUseCaseItem>
                {
                    new()
                    {
                        IndustryKey = "retail-pos",
                        IndustryName = "Supermarkets, Boutiques & Pharmacies",
                        Headline = "High-Speed In-Store & Online Retail",
                        ProblemSolved = "Selling the same product online and in-store causes duplicate sales and stockouts.",
                        SolutionSummary = "Live stock count decreases across both physical POS cash registers and online storefront simultaneously.",
                        Icon = "storefront"
                    }
                }
            });

            // ─────────────────────────────────────────────────────────────────
            // 4. bcp-committees: Governance & Board Committees
            // ─────────────────────────────────────────────────────────────────
            Register(new FeatureKnowledgeEntry
            {
                FeatureCode = "bcp-committees",
                Title = "Governance & Board Committees",
                Tagline = "Autonomous Committee Workspaces, Minuted Agendas & Resolution Tracking",
                SuiteName = "Executive Governance & Boards",
                RouteSlug = "/features/committees",
                Summary = "Ozikol BCC Governance & Committees empowers executive boards, academic councils, and departmental committees with isolated workspaces, structured agendas, attendee rosters, and tamper-proof resolution tracking.",
                ArchitecturalMoat = "Complete cryptographic isolation of committee records from general tenant members with role-based document access controls.",
                Platforms = new List<PlatformSupportBadge>
                {
                    new() { Name = "Web Executive Portal", Category = "Web", Icon = "gavel", TechnicalDetail = "Confidential committee workspace with minuted agenda builder" },
                    new() { Name = "Mobile Member Companion", Category = "Mobile", Icon = "smartphone", TechnicalDetail = "View board packets, submit votes, and review meeting minutes" }
                },
                KeyCapabilities = new List<string>
                {
                    "Independent committee workspaces with autonomous leadership roles",
                    "Structured agenda composer with time-boxed discussion topics",
                    "Formal minuted meeting records with attached board documentation",
                    "Resolution tracking with recorded attendee voting outcomes",
                    "Confidential document vault with granular view/edit permissions",
                    "Meeting attendance logging and quorom threshold verification"
                },
                Faqs = new List<FeatureFaqItem>
                {
                    new()
                    {
                        Question = "Are committee documents visible to regular workspace members?",
                        Answer = "No. Each committee operates within a sovereign security boundary. Only assigned committee members and designated platform administrators can view meeting agendas, minutes, and confidential attachments."
                    },
                    new()
                    {
                        Question = "Can committee members cast votes on resolutions remotely?",
                        Answer = "Yes. When a resolution is introduced, authorized members can record votes (Approve, Object, Abstain) from the web console or mobile app with recorded audit timestamps."
                    }
                },
                IndustryUseCases = new List<IndustryUseCaseItem>
                {
                    new()
                    {
                        IndustryKey = "corporate-governance",
                        IndustryName = "Corporate Boards & Executive Councils",
                        Headline = "Streamlined Board Governance & Compliance",
                        ProblemSolved = "Board packets scattered across unencrypted emails and informal chat groups.",
                        SolutionSummary = "Consolidate all board agendas, minutes, and compliance votes in one encrypted executive hub.",
                        Icon = "account_balance"
                    },
                    new()
                    {
                        IndustryKey = "education",
                        IndustryName = "University Senates & Faculty Committees",
                        Headline = "Academic Council Resolution Tracking",
                        ProblemSolved = "Tracking historical curriculum decisions and tenure votes across multiple departments.",
                        SolutionSummary = "Searchable, immutable record of all academic resolutions with verified member attendance.",
                        Icon = "school"
                    }
                }
            });

            // ─────────────────────────────────────────────────────────────────
            // 5. bcp-cms-studio: Web Studio & Digital Presence
            // ─────────────────────────────────────────────────────────────────
            Register(new FeatureKnowledgeEntry
            {
                FeatureCode = "bcp-cms-studio",
                Title = "Web Studio & CMS Builder",
                Tagline = "Dynamic Enterprise Landing Pages, Theme Hydration & Custom Domains",
                SuiteName = "Digital Presence & CMS",
                RouteSlug = "/features/cms-studio",
                Summary = "Ozikol BCC CMS Studio is a modular enterprise website builder featuring dynamic page section compilation, live token hydration, automated SSL issuance, white-label custom domain mapping, and multi-language support.",
                ArchitecturalMoat = "Zero-code template assembler coupled with real-time tenant token hydration and global Cloudflare Edge distribution.",
                Platforms = new List<PlatformSupportBadge>
                {
                    new() { Name = "Web Visual Studio", Category = "Web", Icon = "web", TechnicalDetail = "Angular 19 dynamic page section builder with live iframe preview" },
                    new() { Name = "Global Edge CDN", Category = "Edge", Icon = "cloud", TechnicalDetail = "Cloudflare Edge distribution with automated SSL and multi-zone DNS" }
                },
                KeyCapabilities = new List<string>
                {
                    "Drag-and-drop category layout builder with live iframe preview",
                    "Dynamic token hydration reflecting real-time tenant store, brand, and news items",
                    "White-label custom domain mapping with automated Let's Encrypt / Cloudflare SSL",
                    "Multi-language localization supporting English, French, Spanish, and German",
                    "Customizable public lead capture and registration forms",
                    "Built-in blog publication studio with SEO metadata management"
                },
                Faqs = new List<FeatureFaqItem>
                {
                    new()
                    {
                        Question = "Can I use my own custom domain (e.g. www.mycompany.com)?",
                        Answer = "Yes. Ozikol BCC supports white-label custom domains. You simply point a CNAME DNS record, and the platform issues an automated SSL certificate with edge CDN caching."
                    },
                    new()
                    {
                        Question = "Is technical coding required to build websites in Ozikol?",
                        Answer = "No. The Web Studio offers pre-designed, responsive page sections (Hero banners, feature showcases, testimonials, FAQs, team grids) that can be arranged and customized without writing code."
                    }
                },
                IndustryUseCases = new List<IndustryUseCaseItem>
                {
                    new()
                    {
                        IndustryKey = "corporate-governance",
                        IndustryName = "Modern Enterprises & Professional Services",
                        Headline = "Brand Authority & Client Engagement",
                        ProblemSolved = "Maintaining separate expensive website hosting and CRM software.",
                        SolutionSummary = "Unify company public presence, client portal, and lead forms in one connected ecosystem.",
                        Icon = "business"
                    }
                }
            });
        }
    }
}
