using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models;

namespace Ozikol.MasterPersistence.EF.MasterSQL.Seeding
{
    /// <summary>
    /// Programmatic data seeder for the Master Catalog Database (<c>Ozikol_MasterCatalogDb</c>).
    /// Responsible for initializing central governance roles and the root SuperAdmin identity account.
    /// Avoids dynamic runtime data seeding inside EF Core's OnModelCreating to ensure zero migration drift.
    /// </summary>
    public static class MasterCatalogDataSeeder
    {
        /// <summary>
        /// Global seeder entry point. Invokes central identity role and SuperAdmin user initialization.
        /// </summary>
        /// <param name="dbContext">The master catalog database context instance.</param>
        /// <param name="roleManager">Optional ASP.NET Core Identity RoleManager for web runtime environments.</param>
        /// <param name="userManager">Optional ASP.NET Core Identity UserManager for web runtime environments.</param>
        /// <param name="cancellationToken">Cancellation token for async operations.</param>
        /// <returns>A task representing the asynchronous seeding operation.</returns>
        public static async Task SeedAllAsync(
            MasterCatalogDbContext dbContext,
            RoleManager<CentralRole>? roleManager = null,
            UserManager<CentralUser>? userManager = null,
            CancellationToken cancellationToken = default)
        {
            // Seed the central security governance roles and initial SuperAdmin account
            await SeedRolesAndSuperAdminAsync(dbContext, roleManager, userManager, cancellationToken);

            // Seed the 10 global & African regional platform currency exchange rates
            await SeedCurrenciesAsync(dbContext, cancellationToken);

            // Seed default baseline platform settings record via EF Core
            await SeedPlatformSettingsAsync(dbContext, cancellationToken);

            // Seed default dynamic legal and compliance documents via EF Core
            await SeedLegalDocumentsAsync(dbContext, cancellationToken);
        }

        /// <summary>
        /// Seeds the 7 central system roles and provisions the initial default SuperAdmin user account.
        /// Designed with dual-execution capability: supports both ASP.NET Identity managers and direct EF Core DbSet fallbacks.
        /// </summary>
        /// <param name="dbContext">The master catalog database context instance.</param>
        /// <param name="roleManager">Optional ASP.NET Core Identity RoleManager.</param>
        /// <param name="userManager">Optional ASP.NET Core Identity UserManager.</param>
        /// <param name="ct">Cancellation token for async operations.</param>
        /// <returns>A task representing the asynchronous role and user seeding.</returns>
        public static async Task SeedRolesAndSuperAdminAsync(
            MasterCatalogDbContext dbContext,
            RoleManager<CentralRole>? roleManager,
            UserManager<CentralUser>? userManager,
            CancellationToken ct = default)
        {
            // Define the 7 core central platform governance roles
            var centralRoles = new[]
            {
                new CentralRole("SuperAdmin", "Full system governance, database fleet migrations, operator access"),
                new CentralRole("Admin", "Tenant workspace governance, subscription status, support"),
                new CentralRole("TemplateManager", "Marketplace templates, layout blueprints, review moderations"),
                new CentralRole("ReferralManager", "Affiliate partner network, commission tiers, payout tracking"),
                new CentralRole("Operator", "Platform operational staff and monitoring"),
                new CentralRole("BillingAdmin", "Subscription billing, invoices, and payment gateway configuration"),
                new CentralRole("SupportAgent", "Customer tickets, live chat assistance, and workspace diagnostics")
            };

            // Ensure all central roles exist in the database
            foreach (var role in centralRoles)
            {
                if (roleManager != null)
                {
                    if (!await roleManager.RoleExistsAsync(role.Name!))
                    {
                        await roleManager.CreateAsync(role);
                    }
                }
                else
                {
                    // Fallback when executed via standalone migration tools where RoleManager is unavailable
                    if (!await dbContext.Roles.AnyAsync(r => r.NormalizedName == role.Name!.ToUpperInvariant(), ct))
                    {
                        role.NormalizedName = role.Name!.ToUpperInvariant();
                        dbContext.Roles.Add(role);
                        await dbContext.SaveChangesAsync(ct);
                    }
                }
            }

            // Seed SuperAdmin User
            const string superAdminEmail = "superadmin@ozikol.cloud";
            if (userManager != null)
            {
                var existingUser = await userManager.FindByEmailAsync(superAdminEmail);
                if (existingUser == null)
                {
                    var superAdmin = new CentralUser
                    {
                        UserName = superAdminEmail,
                        Email = superAdminEmail,
                        EmailConfirmed = true,
                        FirstName = "Ozikol",
                        LastName = "SuperAdmin",
                        Department = "Global DevOps & Architecture",
                        IsActive = true,
                        CreatedUtc = DateTime.UtcNow
                    };

                    var createResult = await userManager.CreateAsync(superAdmin, "[REDACTED_BOOTSTRAP_PASSWORD]");
                    if (createResult.Succeeded)
                    {
                        await userManager.AddToRoleAsync(superAdmin, "SuperAdmin");
                    }
                }
            }
            else
            {
                // Fallback direct creation when executed in headless migrator contexts
                if (!await dbContext.Users.AnyAsync(u => u.NormalizedEmail == superAdminEmail.ToUpperInvariant(), ct))
                {
                    var hasher = new PasswordHasher<CentralUser>();
                    var superAdmin = new CentralUser
                    {
                        Id = Guid.NewGuid().ToString(),
                        UserName = superAdminEmail,
                        NormalizedUserName = superAdminEmail.ToUpperInvariant(),
                        Email = superAdminEmail,
                        NormalizedEmail = superAdminEmail.ToUpperInvariant(),
                        EmailConfirmed = true,
                        FirstName = "Ozikol",
                        LastName = "SuperAdmin",
                        Department = "Global DevOps & Architecture",
                        IsActive = true,
                        SecurityStamp = Guid.NewGuid().ToString(),
                        ConcurrencyStamp = Guid.NewGuid().ToString(),
                        CreatedUtc = DateTime.UtcNow
                    };
                    superAdmin.PasswordHash = hasher.HashPassword(superAdmin, "[REDACTED_BOOTSTRAP_PASSWORD]");

                    dbContext.Users.Add(superAdmin);
                    await dbContext.SaveChangesAsync(ct);

                    var superAdminRole = await dbContext.Roles.FirstOrDefaultAsync(r => r.NormalizedName == "SUPERADMIN", ct);
                    if (superAdminRole != null)
                    {
                        dbContext.UserRoles.Add(new IdentityUserRole<string>
                        {
                            UserId = superAdmin.Id,
                            RoleId = superAdminRole.Id
                        });
                        await dbContext.SaveChangesAsync(ct);
                    }
                }
            }
        }

        /// <summary>
        /// Programmatically seeds the 10 core global and African regional platform currencies
        /// with exchange rates relative to the USD $25.00 baseline.
        /// Avoids migration drift by verifying presence in the database prior to insertion.
        /// </summary>
        /// <param name="dbContext">The master catalog database context instance.</param>
        /// <param name="ct">Cancellation token for async operations.</param>
        /// <returns>A task representing the asynchronous currency seeding operation.</returns>
        public static async Task SeedCurrenciesAsync(MasterCatalogDbContext dbContext, CancellationToken ct = default)
        {
            if (await dbContext.MasterCurrencyRates.AnyAsync(ct))
            {
                return; // Already initialized
            }

            var defaultCurrencies = new[]
            {
                new MasterCurrencyRate
                {
                    CurrencyCode = "USD",
                    CurrencySymbol = "$",
                    DisplayName = "US Dollar",
                    CultureName = "en-US",
                    PillLabel = "USD ($)",
                    RateFromUsd = 1.0m,
                    IsBaseCurrency = true,
                    IsActive = true,
                    SortOrder = 1,
                    AssociatedCountryCodes = "US",
                    CreatedAtUtc = DateTime.UtcNow
                },
                new MasterCurrencyRate
                {
                    CurrencyCode = "NGN",
                    CurrencySymbol = "\u20A6",
                    DisplayName = "Nigerian Naira",
                    CultureName = "en-NG",
                    PillLabel = "NGN (\u20A6)",
                    RateFromUsd = 1600.0m,
                    IsBaseCurrency = false,
                    IsActive = true,
                    SortOrder = 2,
                    AssociatedCountryCodes = "NG",
                    CreatedAtUtc = DateTime.UtcNow
                },
                new MasterCurrencyRate
                {
                    CurrencyCode = "GBP",
                    CurrencySymbol = "\u00A3",
                    DisplayName = "British Pound",
                    CultureName = "en-GB",
                    PillLabel = "GBP (\u00A3)",
                    RateFromUsd = 0.80m,
                    IsBaseCurrency = false,
                    IsActive = true,
                    SortOrder = 3,
                    AssociatedCountryCodes = "GB",
                    CreatedAtUtc = DateTime.UtcNow
                },
                new MasterCurrencyRate
                {
                    CurrencyCode = "EUR",
                    CurrencySymbol = "\u20AC",
                    DisplayName = "Euro",
                    CultureName = "de-DE",
                    PillLabel = "EUR (\u20AC)",
                    RateFromUsd = 0.92m,
                    IsBaseCurrency = false,
                    IsActive = true,
                    SortOrder = 4,
                    AssociatedCountryCodes = "DE,FR,ES,IT,NL,BE,IE,PT,AT,FI,GR",
                    CreatedAtUtc = DateTime.UtcNow
                },
                new MasterCurrencyRate
                {
                    CurrencyCode = "GHS",
                    CurrencySymbol = "GH\u20B5",
                    DisplayName = "Ghanaian Cedi",
                    CultureName = "en-GH",
                    PillLabel = "GHS (GH\u20B5)",
                    RateFromUsd = 14.0m,
                    IsBaseCurrency = false,
                    IsActive = true,
                    SortOrder = 5,
                    AssociatedCountryCodes = "GH",
                    CreatedAtUtc = DateTime.UtcNow
                },
                new MasterCurrencyRate
                {
                    CurrencyCode = "KES",
                    CurrencySymbol = "KSh",
                    DisplayName = "Kenyan Shilling",
                    CultureName = "sw-KE",
                    PillLabel = "KES (KSh)",
                    RateFromUsd = 130.0m,
                    IsBaseCurrency = false,
                    IsActive = true,
                    SortOrder = 6,
                    AssociatedCountryCodes = "KE",
                    CreatedAtUtc = DateTime.UtcNow
                },
                new MasterCurrencyRate
                {
                    CurrencyCode = "ZAR",
                    CurrencySymbol = "R",
                    DisplayName = "South African Rand",
                    CultureName = "en-ZA",
                    PillLabel = "ZAR (R)",
                    RateFromUsd = 18.0m,
                    IsBaseCurrency = false,
                    IsActive = true,
                    SortOrder = 7,
                    AssociatedCountryCodes = "ZA",
                    CreatedAtUtc = DateTime.UtcNow
                },
                new MasterCurrencyRate
                {
                    CurrencyCode = "CAD",
                    CurrencySymbol = "CA$",
                    DisplayName = "Canadian Dollar",
                    CultureName = "en-CA",
                    PillLabel = "CAD (CA$)",
                    RateFromUsd = 1.36m,
                    IsBaseCurrency = false,
                    IsActive = true,
                    SortOrder = 8,
                    AssociatedCountryCodes = "CA",
                    CreatedAtUtc = DateTime.UtcNow
                },
                new MasterCurrencyRate
                {
                    CurrencyCode = "AED",
                    CurrencySymbol = "AED",
                    DisplayName = "UAE Dirham",
                    CultureName = "ar-AE",
                    PillLabel = "AED",
                    RateFromUsd = 3.67m,
                    IsBaseCurrency = false,
                    IsActive = true,
                    SortOrder = 9,
                    AssociatedCountryCodes = "AE",
                    CreatedAtUtc = DateTime.UtcNow
                },
                new MasterCurrencyRate
                {
                    CurrencyCode = "INR",
                    CurrencySymbol = "\u20B9",
                    DisplayName = "Indian Rupee",
                    CultureName = "en-IN",
                    PillLabel = "INR (\u20B9)",
                    RateFromUsd = 84.0m,
                    IsBaseCurrency = false,
                    IsActive = true,
                    SortOrder = 10,
                    AssociatedCountryCodes = "IN",
                    CreatedAtUtc = DateTime.UtcNow
                }
            };

            await dbContext.MasterCurrencyRates.AddRangeAsync(defaultCurrencies, ct);
            await dbContext.SaveChangesAsync(ct);
        }

        /// <summary>
        /// Seeds the baseline platform settings record (<c>Id = 1</c>) using standard EF Core entity persistence.
        /// Strictly relies on official EF Core migrations for database schema management.
        /// </summary>
        /// <param name="dbContext">The master catalog database context instance.</param>
        /// <param name="ct">Cancellation token for async operations.</param>
        /// <returns>A task representing the asynchronous settings initialization.</returns>
        public static async Task SeedPlatformSettingsAsync(MasterCatalogDbContext dbContext, CancellationToken ct = default)
        {
            var existingSetting = await dbContext.MasterPlatformSettings.FirstOrDefaultAsync(s => s.Id == 1, ct);
            if (existingSetting == null)
            {
                var defaultSetting = new MasterPlatformSetting
                {
                    Id = 1,
                    PlatformName = "Ozikol",
                    EnableAdminNotifications = true,
                    SupportAdminEmails = null,
                    PartnerAdminEmails = null,
                    CreatorAdminEmails = null,
                    CareersAdminEmails = null,
                    CertificationAdminEmails = null,
                    TicketAutoCloseHours = 24,
                    EnableTicketAutoClose = true,
                    UpdatedUtc = DateTime.UtcNow
                };

                dbContext.MasterPlatformSettings.Add(defaultSetting);
                await dbContext.SaveChangesAsync(ct);
            }
        }

        /// <summary>
        /// Seeds the official dynamic central legal documents (Privacy Notice, Terms of Use, Cookie Policy,
        /// Privacy Choices, Corporate Policies & Compliance Reports) into the master database via EF Core.
        /// Preserves zero raw SQL rule and provides initial high-grade enterprise policies.
        /// </summary>
        /// <param name="dbContext">The master catalog database context.</param>
        /// <param name="ct">Cancellation token for async operations.</param>
        /// <returns>A task representing the asynchronous seeding operation.</returns>
        public static async Task SeedLegalDocumentsAsync(MasterCatalogDbContext dbContext, CancellationToken ct = default)
        {
            var defaultDocuments = new[]
            {
                new MasterLegalDocument
                {
                    Slug = "privacy-notice",
                    Title = "Ozikol Master Privacy Notice",
                    Category = "Privacy",
                    Summary = "Comprehensive transparency on how Ozikol processes, isolates, protects, and respects organizational and personal data across our cloud services.",
                    Version = "2026.2",
                    EffectiveDate = new DateTime(2026, 4, 17, 0, 0, 0, DateTimeKind.Utc),
                    LastUpdatedUtc = new DateTime(2026, 9, 5, 0, 0, 0, DateTimeKind.Utc),
                    Culture = "en",
                    SortOrder = 1,
                    IsPublished = true,
                    ContentHtml = @"
                        <h3>1. Scope and Commitment to Data Sovereignty</h3>
                        <p>At Ozikol (""Ozikol"", ""we"", ""our"", or ""us""), safeguarding the sovereignty, privacy, and integrity of our client organizations' data is foundational to our mission. This Master Privacy Notice applies to all visitors, tenants, administrators, authorized staff members, and end-users interacting with Ozikol Cloud services, our dedicated websites, executive MIS systems, and native mobile applications.</p>
                        
                        <h3>2. Categories of Information We Process</h3>
                        <p>We process information exclusively to provision, secure, maintain, and enhance institutional cloud operations:</p>
                        <ul>
                            <li><strong>Organizational Client Data:</strong> Membership directories, staff rotas, dues invoicing records, facility asset registries, and visitor gate logs submitted by your organization.</li>
                            <li><strong>Authentication &amp; Account Data:</strong> Name, work email address, hashed credentials, two-factor authentication tokens, and administrative role designations.</li>
                            <li><strong>Technical Diagnostics &amp; Operational Telemetry:</strong> Anonymized IP addresses, browser user-agent tokens, API endpoint latency figures, and system audit logs required to ensure 99.99% availability.</li>
                        </ul>

                        <h3>3. Tenant Fleet Data Isolation</h3>
                        <p>Ozikol operates under strict architectural isolation principles. Each client organization's operational database is physically and logically separated within dedicated relational storage rings. <strong>We do not commingle organizational records</strong>, nor do we train public AI models on private tenant data.</p>

                        <h3>4. Legal Grounds for Processing</h3>
                        <p>We process personal data in compliance with the General Data Protection Regulation (GDPR Article 6), the California Consumer Privacy Act (CCPA/CPRA), and applicable international data protection statutes:</p>
                        <ul>
                            <li><strong>Contractual Performance:</strong> Processing necessary to fulfill our Master Subscription Agreement with your organization.</li>
                            <li><strong>Legal &amp; Regulatory Compliance:</strong> Retaining financial dues and corporate records as mandated by statutory accounting regulations.</li>
                            <li><strong>Legitimate Interests:</strong> Protecting platform cybersecurity, fraud prevention, and uptime monitoring.</li>
                        </ul>

                        <h3>5. Security Safeguards &amp; Encryption Standards</h3>
                        <p>All data at rest is encrypted using FIPS 140-2 validated AES-256 cipher suites. All data in transit across public and private networks is enforced with TLS 1.3 encryption. Internal access to production infrastructure requires hardware-backed multi-factor authentication, cryptographic bastions, and continuous role-based authorization.</p>

                        <h3>6. Sub-processors and Cloud Infrastructure</h3>
                        <p>We partner with premier sovereign cloud infrastructure providers (Microsoft Azure, Amazon Web Services) adhering to ISO 27001, SOC 1/2/3, and GDPR Standard Contractual Clauses. Sub-processors are bound by data processing agreements mandating equivalent or superior security controls.</p>

                        <h3>7. Data Retention and Deletion Protocols</h3>
                        <p>Organizational data is retained for the active subscription term. Upon contract termination or formal deletion request, data undergoes a 30-day grace period for authorized administrative export, followed by permanent cryptographic destruction across production and backup media.</p>

                        <h3>8. Your Statutory Privacy Rights</h3>
                        <p>Depending on your jurisdiction, you have the right to request access to, rectification of, portability of, or erasure of your personal data, as well as the right to object to or restrict processing. Individual members should first contact their organization administrator. Alternatively, contact our Data Protection Officer.</p>

                        <h3>9. Contacting Our Data Protection Officer (DPO)</h3>
                        <p>If you have any questions, regulatory inquiries, or concerns regarding this notice, please contact our legal and compliance desk directly via our <a href=""/support/contact?type=General"">Enterprise Helpdesk</a> or by postal mail to our Global Headquarters: Ozikol Legal &amp; Governance Desk, 100 Bishopsgate, London EC2N 4AG, United Kingdom.</p>"
                },
                new MasterLegalDocument
                {
                    Slug = "terms-of-use",
                    Title = "Terms of Use & Master Subscription Agreement",
                    Category = "Terms",
                    Summary = "Official terms and conditions governing enterprise organizations, administrators, members, and API consumers using the Ozikol cloud platform.",
                    Version = "2026.1",
                    EffectiveDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    LastUpdatedUtc = new DateTime(2026, 9, 5, 0, 0, 0, DateTimeKind.Utc),
                    Culture = "en",
                    SortOrder = 2,
                    IsPublished = true,
                    ContentHtml = @"
                        <h3>1. Agreement to Terms and Enterprise Licensing</h3>
                        <p>By registering, deploying an organization instance, accessing our executive MIS system, or consuming Ozikol APIs, your organization agrees to be contractually bound by these Terms of Use and Master Subscription Agreement (""Agreement""). If you are accepting on behalf of an enterprise, estate, or community, you represent and warrant that you possess full legal authority to bind that entity.</p>

                        <h3>2. 100% Customer Data Ownership Guarantee</h3>
                        <p><strong>Your organization retains sole, unencumbered ownership of all data, rosters, media, financial transactions, and records uploaded to or generated within your dedicated instance.</strong> Ozikol claims zero intellectual property rights over your data. You may export your complete database and media assets in open industry formats at any time.</p>

                        <h3>3. Acceptable Use Policy</h3>
                        <p>You agree to utilize Ozikol services solely for lawful institutional management. You shall not:</p>
                        <ul>
                            <li>Reverse engineer, decompile, or attempt to extract source code from any Ozikol binary or service.</li>
                            <li>Conduct unauthorized vulnerability scans or load tests against central endpoints without prior written authorization.</li>
                            <li>Distribute malicious software, spam, or unsolicited mass communications through Ozikol relay pools.</li>
                            <li>Bypass or attempt to circumvent authentication layers, role constraints, or cryptographic vaults.</li>
                        </ul>

                        <h3>4. Service Level Commitments &amp; Availability</h3>
                        <p>Ozikol provides an availability commitment of 99.99% uptime for core production workflows. Scheduled maintenance windows are communicated at least 5 business days in advance and scheduled during off-peak regional hours. If availability falls below SLA commitments in any calendar quarter, eligible tenants receive SLA credit adjustments according to their service tier.</p>

                        <h3>5. Fees, Subscriptions, and Invoicing</h3>
                        <p>Subscription fees are billed on an agreed annual or monthly cycle in your selected currency. Invoices are due within 30 calendar days. All fees are exclusive of applicable value-added or sales taxes unless explicitly stated otherwise.</p>

                        <h3>6. Term, Renewal, and Termination</h3>
                        <p>This Agreement remains in effect for the duration of your active subscription and automatically renews for successive terms unless canceled at least 30 days prior to expiration. Either party may terminate immediately for material breach if such breach remains uncured 30 days after written notice.</p>

                        <h3>7. Limitation of Liability</h3>
                        <p>To the maximum extent permitted by applicable law, neither party shall be liable for indirect, incidental, punitive, or consequential damages arising out of or in connection with this Agreement. Ozikol's cumulative aggregate liability for all claims shall be capped at the total amount paid by your organization in the 12 months preceding the incident.</p>

                        <h3>8. Governing Law &amp; Dispute Resolution</h3>
                        <p>This Agreement shall be governed by and construed in accordance with the laws of England and Wales, without regard to conflict of law principles. Any dispute arising under or in connection with this Agreement shall be resolved through confidential executive escalation, followed by binding arbitration in London, United Kingdom.</p>"
                },
                new MasterLegalDocument
                {
                    Slug = "cookies",
                    Title = "Cookie & Tracking Technologies Policy",
                    Category = "Cookies",
                    Summary = "Detailed overview of operational cookies, security tokens, and how Ozikol provides tracking transparency without third-party advertising cookies.",
                    Version = "2026.1",
                    EffectiveDate = new DateTime(2025, 10, 3, 0, 0, 0, DateTimeKind.Utc),
                    LastUpdatedUtc = new DateTime(2026, 9, 5, 0, 0, 0, DateTimeKind.Utc),
                    Culture = "en",
                    SortOrder = 3,
                    IsPublished = true,
                    ContentHtml = @"
                        <h3>1. Understanding Cookies &amp; Browser Storage</h3>
                        <p>Cookies are small alphanumeric files stored in your web browser when accessing digital platforms. Ozikol uses cookies and browser local storage strictly to ensure cryptographic session security, maintain authentication tokens, and preserve language preferences.</p>

                        <h3>2. Our Zero-Ad-Tracker Guarantee</h3>
                        <p><strong>Ozikol does not deploy third-party advertising cookies, cross-site behavioral trackers, or data-broker pixels.</strong> We do not monetize your browsing behavior, nor do we sell user activity to marketing conglomerates.</p>

                        <h3>3. Detailed Classification of Cookies Used</h3>
                        <table class=""oz-legal-table"">
                            <thead>
                                <tr>
                                    <th>Cookie / Key Name</th>
                                    <th>Category</th>
                                    <th>Purpose</th>
                                    <th>Duration</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><code>.AspNetCore.Antiforgery.*</code></td>
                                    <td>Strictly Necessary</td>
                                    <td>Cryptographic token preventing Cross-Site Request Forgery (CSRF) attacks.</td>
                                    <td>Session</td>
                                </tr>
                                <tr>
                                    <td><code>.AspNetCore.Identity.Application</code></td>
                                    <td>Strictly Necessary</td>
                                    <td>Encrypted authentication ticket identifying logged-in administrators and members.</td>
                                    <td>7 Days</td>
                                </tr>
                                <tr>
                                    <td><code>ozikol_culture</code></td>
                                    <td>Functional Preference</td>
                                    <td>Stores the user's preferred interface language (e.g. English, Français, Español, Deutsch).</td>
                                    <td>1 Year</td>
                                </tr>
                                <tr>
                                    <td><code>ozikol_cookie_consent</code></td>
                                    <td>Functional Preference</td>
                                    <td>Records your acknowledged cookie consent settings.</td>
                                    <td>1 Year</td>
                                </tr>
                            </tbody>
                        </table>

                        <h3>4. How to Control and Manage Cookies</h3>
                        <p>You have full freedom to manage or disable cookies at any time via your browser settings (Chrome, Safari, Firefox, Edge). Note that disabling strictly necessary cookies will prevent secure login and form submissions on the platform. You may also configure your preferences on our <a href=""/privacy-choices"">Privacy Choices</a> dashboard.</p>"
                },
                new MasterLegalDocument
                {
                    Slug = "privacy-choices",
                    Title = "Your Privacy Choices & Data Subject Rights",
                    Category = "Privacy",
                    Summary = "Exercise your statutory rights under GDPR, CCPA/CPRA, and global data sovereignty regulations, including data portability and erasure.",
                    Version = "2026.1",
                    EffectiveDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    LastUpdatedUtc = new DateTime(2026, 9, 5, 0, 0, 0, DateTimeKind.Utc),
                    Culture = "en",
                    SortOrder = 4,
                    IsPublished = true,
                    ContentHtml = @"
                        <h3>1. Empowering Your Data Sovereignty</h3>
                        <p>Ozikol is engineered to give organizations and individuals transparent, straightforward controls over their personal data. We honor your rights under the EU General Data Protection Regulation (GDPR), UK GDPR, the California Consumer Privacy Act (CCPA/CPRA), and other regional privacy frameworks.</p>

                        <h3>2. Summary of Your Statutory Rights</h3>
                        <ul>
                            <li><strong>Right of Access:</strong> Request a complete copy of all personal information we hold about you.</li>
                            <li><strong>Right to Rectification:</strong> Correct inaccurate, outdated, or incomplete personal records.</li>
                            <li><strong>Right to Erasure (""Right to be Forgotten""):</strong> Request the permanent deletion of your personal records, subject to statutory accounting and legal retention requirements.</li>
                            <li><strong>Right to Data Portability:</strong> Receive your data in a structured, commonly used, and machine-readable format (JSON/CSV).</li>
                            <li><strong>Right to Restriction &amp; Objection:</strong> Restrict or object to processing under certain legitimate interest grounds.</li>
                        </ul>

                        <h3>3. Submitting a Data Subject Access Request (DSAR)</h3>
                        <p>If you are an individual member of an organization powered by Ozikol, your primary point of contact is your organization administrator who controls your roster data. If you are an account holder, customer, or need direct escalation, submit your request through our <a href=""/support/contact?type=General"">Data Subject Rights Desk</a>.</p>

                        <h3>4. Verification and Turnaround SLA</h3>
                        <p>To protect data from unauthorized access, we cryptographically verify the identity of any requester before disclosing or modifying records. All verified requests are acknowledged within 48 hours and fulfilled within 30 calendar days at zero charge.</p>"
                },
                new MasterLegalDocument
                {
                    Slug = "policies-and-reports",
                    Title = "Corporate Governance, Policies & Compliance Reports",
                    Category = "Governance",
                    Summary = "Public transparency index of Ozikol's corporate governance policies, modern slavery commitments, accessibility standards, and ISO certifications.",
                    Version = "2026.1",
                    EffectiveDate = new DateTime(2026, 3, 19, 0, 0, 0, DateTimeKind.Utc),
                    LastUpdatedUtc = new DateTime(2026, 9, 5, 0, 0, 0, DateTimeKind.Utc),
                    Culture = "en",
                    SortOrder = 5,
                    IsPublished = true,
                    ContentHtml = @"
                        <h3>1. Executive Governance &amp; Ethical Charter</h3>
                        <p>Ozikol operates under strict corporate governance, transparency, and accountability standards. Our board and leadership team ensure all operational, technical, and commercial practices align with international legal ethics, fair competition, and human rights.</p>

                        <h3>2. Key Corporate Compliance Policies</h3>
                        <ul>
                            <li><strong>Information Security Policy:</strong> Strict technical controls aligned with ISO/IEC 27001:2022 standards, mandatory staff security awareness training, and quarterly external penetration testing.</li>
                            <li><strong>Accessibility &amp; Universal Inclusion:</strong> Continuous engineering auditing to ensure our web portals, MIS consoles, and mobile apps achieve WCAG 2.1 Level AA conformance.</li>
                            <li><strong>Modern Slavery &amp; Human Trafficking Statement:</strong> Zero tolerance for forced labor, human trafficking, or unethical working conditions across our supply chains and technology partners.</li>
                            <li><strong>Coordinated Vulnerability Disclosure (CVD):</strong> A transparent, safe-harbor channel for ethical security researchers to report vulnerabilities directly to our security engineering team.</li>
                            <li><strong>Anti-Bribery &amp; Corruption Policy:</strong> Mandatory anti-bribery standards governing all partner commercial engagements and government contracts.</li>
                        </ul>

                        <h3>3. Compliance Reports and Certification Audits</h3>
                        <p>Enterprise prospective clients and existing institutional tenants can access our SOC 2 Type II audit report, ISO 27001 summary certificate, and standard business continuity disaster recovery plans by visiting our <a href=""/support/certifications"">Certifications &amp; Compliance Hub</a> or by contacting our security escort team.</p>"
                }
            };

            // Seed missing legal documents idempotently
            foreach (var doc in defaultDocuments)
            {
                var exists = await dbContext.MasterLegalDocuments
                    .AnyAsync(d => d.Slug == doc.Slug && d.Culture == doc.Culture, ct);

                if (!exists)
                {
                    dbContext.MasterLegalDocuments.Add(doc);
                }
            }

            await dbContext.SaveChangesAsync(ct);
        }
    }
}
