"""
Script to generate and inject the comprehensive, platform-specific legal documents into MasterCatalogDataSeeder.cs.
"""
import os

seeder_path = r"c:\Users\JURAY\source\Ozikol-BCC\src\Ozikol.MasterPersistence.EF.MasterSQL\Seeding\MasterCatalogDataSeeder.cs"

with open(seeder_path, "r", encoding="utf-8") as f:
    original_content = f.read()

# Locate the start of SeedLegalDocumentsAsync
target_start = "        public static async Task SeedLegalDocumentsAsync(MasterCatalogDbContext dbContext, CancellationToken ct = default)"
idx = original_content.find(target_start)
if idx == -1:
    raise Exception("Could not find SeedLegalDocumentsAsync in MasterCatalogDataSeeder.cs")

# Keep everything up to the method signature
prefix = original_content[:idx]

new_method_code = '''        public static async Task SeedLegalDocumentsAsync(MasterCatalogDbContext dbContext, CancellationToken ct = default)
        {
            var defaultDocuments = new[]
            {
                new MasterLegalDocument
                {
                    Slug = "privacy-notice",
                    Title = "Ozikol Master Privacy Notice & Data Sovereignty Charter",
                    Category = "Privacy & Data Protection",
                    Summary = "Comprehensive legal transparency detailing how Ozikol isolates, processes, safeguards, and respects institutional data across our 9 operational suites, web portals, executive MIS, mobile apps, and edge desktop clients.",
                    Version = "2026.3",
                    EffectiveDate = new DateTime(2026, 4, 17, 0, 0, 0, DateTimeKind.Utc),
                    LastUpdatedUtc = new DateTime(2026, 9, 5, 0, 0, 0, DateTimeKind.Utc),
                    Culture = "en",
                    SortOrder = 1,
                    IsPublished = true,
                    ContentHtml = """
                        <h3>1. Executive Scope &amp; Architectural Context</h3>
                        <p>At Ozikol (""Ozikol"", ""Platform"", ""we"", ""our"", or ""us""), protecting the sovereignty, privacy, and integrity of our client organizations' data is foundational to everything we engineer. This Master Privacy Notice applies to all visitors, subscriber institutions, tenant administrators, staff, members, residents, contractors, and end-users interacting with the Ozikol ecosystem across all delivery channels:</p>
                        <ul>
                            <li><strong>Ozikol Central Web Portals:</strong> Central marketing, marketplace directory, developer API documentation, billing management, and customer support helpdesk.</li>
                            <li><strong>Dedicated Organization Workspaces:</strong> Dedicated web portals provisioned uniquely for each subscribing enterprise, residential estate, educational institution, corporate association, or religious body.</li>
                            <li><strong>Executive Management Information Systems (MIS):</strong> Comprehensive administrative web consoles utilized by executive leadership, estate managers, accountants, and security directors.</li>
                            <li><strong>Native Cross-Platform Mobile Applications:</strong> iOS and Android applications providing member self-service, real-time push notifications, offline digital QR passes, and dues payments.</li>
                            <li><strong>Windows Desktop Enterprise Applications:</strong> Native WinUI 3 / WPF desktop clients engineered for high-throughput gatehouses, front-desk receptionists, and accounting offices with direct peripheral hardware drivers.</li>
                        </ul>

                        <div class="oz-legal-callout oz-legal-callout--info">
                            <p><strong>Core Privacy Principle:</strong> Ozikol is built on an uncompromising privacy-first philosophy. We do not sell your data, we do not monetize user activity, we do not serve third-party behavioral advertisements, and we never train public artificial intelligence models on your private institutional records.</p>
                        </div>

                        <h3>2. Classification of Roles: Data Controller vs. Data Processor</h3>
                        <p>Under international data protection laws, including the EU General Data Protection Regulation (GDPR Article 4), the UK Data Protection Act 2018 (UK GDPR), the California Consumer Privacy Act (CCPA/CPRA), and the Nigeria Data Protection Act 2023 (NDPA), our legal role depends on the context of the data processed:</p>
                        <ul>
                            <li><strong>Ozikol as a Data Processor (Service Provider):</strong> When client organizations (such as residential estates, clubs, corporate entities, or faith organizations) deploy Ozikol to manage their internal rosters, member dues, gate security, and staff records, the client organization acts as the <strong>Data Controller</strong>. Ozikol processes this tenant data strictly on behalf of and according to the documented instructions of the client organization.</li>
                            <li><strong>Ozikol as a Data Controller:</strong> Ozikol acts as a Data Controller solely for direct account management data, including prospective client inquiries, enterprise contract billing, subscription administrator credentials, and central support ticket submissions.</li>
                        </ul>

                        <h3>3. Categories of Information Processed by Operational Suite</h3>
                        <p>Ozikol delivers modular cloud functionality organized into nine specialized operational suites. We process only the minimum necessary data required to deliver each suite's capabilities:</p>

                        <h4>3.1 Financial Accounting &amp; Dues Suite</h4>
                        <p>Processes invoice ledgers, assessment dues schedules, utility billing calculations, split-payment distribution instructions, and transaction settlement records. <strong>Payment Card Security:</strong> All credit/debit card transactions are processed via PCI-DSS Level 1 certified payment gateways. Ozikol never stores raw credit card Primary Account Numbers (PAN) or CVV security codes on its servers.</p>

                        <h4>3.2 Estate, Asset &amp; Facility Management Suite</h4>
                        <p>Processes physical unit registers, tenant occupancy records, commercial lease terms, preventive maintenance logs, asset serial numbers, and utility sub-meter readings (electricity, water, gas).</p>

                        <h4>3.3 Community Engagement &amp; Social Portal</h4>
                        <p>Processes member profile details, opt-in directory listings, community discussion posts, event RSVPs, facility amenity bookings, classified ads, and direct communication threads. Members maintain granular privacy toggles to hide phone numbers and email addresses from general member directories.</p>

                        <h4>3.4 Access Control, Visitor Management &amp; Gate Pass Automation</h4>
                        <p>Processes visitor pre-clearance tokens, digital QR pass generation, visitor names, phone numbers, vehicle license plate numbers captured via Automated Number Plate Recognition (ANPR) cameras, and timestamped entry/exit logs recorded at boom barriers, turnstiles, and pedestrian gates.</p>

                        <h4>3.5 Governance, Secret Elections &amp; Digital Balloting</h4>
                        <p>Processes verified voter roll eligibility, quorum tracking, and digital ballot casting. <strong>Irrevocable Ballot Secrecy:</strong> Voting choices are cryptographically blinded using homomorphic encryption protocols. Once a vote is submitted and verified against the electoral roll, the ballot is permanently detached from the voter's personal identity, rendering it mathematically impossible for administrators or Ozikol engineers to correlate an individual voter with their candidate choice.</p>

                        <h4>3.6 Procurement &amp; Vendor Marketplace</h4>
                        <p>Processes vendor company profiles, tax identification numbers, compliance accreditations, Request for Proposal (RFP) submissions, formal bids, purchase orders, and contractor service delivery ratings.</p>

                        <h4>3.7 Incident Dispatch, Security Patrols &amp; Emergency SOS Broadcasts</h4>
                        <p>Processes real-time emergency SOS trigger alerts, GPS coordinates transmitted during active distress calls, security guard GPS patrol checkpoint waypoints, incident investigation logs, and emergency muster roll headcounts.</p>

                        <h4>3.8 Events, Ticketing &amp; Banquet Facility Booking</h4>
                        <p>Processes banquet hall and conference room reservations, attendee ticketing tiers, seating allocations, ticket QR scan check-ins, and guest catering dietary preferences.</p>

                        <h4>3.9 Workforce, Security Personnel &amp; Payroll Suite</h4>
                        <p>Processes employee contact details, duty shift rosters, overtime records, performance evaluations, and net payroll calculations. <strong>Biometric Data Protection:</strong> Where biometric clock-in devices (fingerprint or facial geometry scanners) are integrated, raw biometric images are never uploaded to the cloud. Hardware devices generate irreversible mathematical feature hashes that reside in localized hardware memory, ensuring complete protection of biological markers.</p>

                        <h3>4. Architectural Tenant Fleet Data Isolation (Zero Commingling Guarantee)</h3>
                        <p>Unlike conventional multi-tenant architectures that pool multiple organizations' confidential records into shared, row-level database tables, Ozikol employs an architectural fleet isolation model:</p>
                        <ul>
                            <li><strong>Dedicated Relational Storage Rings:</strong> Each subscribing organization is provisioned with a dedicated relational database ring. Operational tables, financial ledgers, member rosters, and security logs are physically and logically segregated from all other tenants.</li>
                            <li><strong>Master vs. Tenant Layer Separation:</strong> The central platform master catalog (containing pricing, licensing tiers, and central system routing) is completely isolated from tenant databases. Tenant encryption keys are independently generated and isolated.</li>
                            <li><strong>Zero AI Model Training:</strong> We guarantee that private tenant operational data, documents, chat messages, and member rosters are never used to train or fine-tune public artificial intelligence models or machine learning algorithms.</li>
                        </ul>

                        <h3>5. Multi-Channel Edge Clients, Offline SQLite Cache &amp; Hardware Privacy</h3>
                        <p>Ozikol provides dedicated native applications for mobile devices and Windows desktop environments designed to operate reliably in intermittent connectivity environments:</p>
                        <ul>
                            <li><strong>Encrypted Offline SQLite Cache:</strong> When using the Windows Desktop application or mobile apps in offline mode, local data is stored in an encrypted SQLite database using SQLCipher AES-256 encryption. Local data is protected by the operating system's cryptographic credential storage (Windows DPAPI, Apple Keychain, Android Keystore).</li>
                            <li><strong>Cryptographic Delta-Sync:</strong> Upon re-establishing network connectivity, local changes synchronize with the cloud instance via a secure delta-sync protocol with cryptographic conflict detection and validation.</li>
                            <li><strong>Peripheral Hardware Drivers:</strong> The Windows Desktop client interfaces with hardware peripherals, including ESC/POS thermal receipt printers, barcode/QR scanners, turnstiles, and USB biometric readers. Hardware drivers process data strictly in volatile system memory; peripheral print streams and raw scanner inputs are never cached on permanent unencrypted disk storage.</li>
                        </ul>

                        <h3>6. Lawful Grounds for Processing</h3>
                        <p>We process personal data only when substantiated by recognized lawful grounds under Article 6 of the GDPR and equivalent international statutes:</p>
                        <ul>
                            <li><strong>Contractual Performance (Article 6(1)(b)):</strong> To provision your dedicated cloud instance, process dues, authenticate authorized users, and deliver operational suite capabilities defined in our Master Subscription Agreement.</li>
                            <li><strong>Legal &amp; Regulatory Compliance (Article 6(1)(c)):</strong> To retain accounting records, tax invoices, and statutory financial ledgers for mandatory legal retention periods (typically 6 to 7 years depending on jurisdiction).</li>
                            <li><strong>Legitimate Interests (Article 6(1)(f)):</strong> To maintain system cybersecurity, mitigate DDoS attacks, prevent fraudulent transactions, monitor 99.99% service availability, and safeguard institutional safety at access control checkpoints.</li>
                            <li><strong>Explicit Consent (Article 6(1)(a)):</strong> When users voluntarily opt-in to receive non-critical platform announcements, community forum notifications, or enable optional mobile location tracking for incident reporting.</li>
                        </ul>

                        <h3>7. Sovereign Regional Cloud Hosting &amp; International Transfers</h3>
                        <p>Ozikol partners with premier tier-1 sovereign cloud infrastructure providers (Microsoft Azure and Amazon Web Services) adhering to ISO/IEC 27001, SOC 2 Type II, and PCI-DSS standards. Subscribing organizations select their primary data residency zone during onboarding:</p>
                        <ul>
                            <li><strong>United Kingdom (UK Sovereign Hub):</strong> London / Cardiff data center regions.</li>
                            <li><strong>European Union (EU Sovereign Hub):</strong> Frankfurt (Germany) and Dublin (Ireland) data center regions.</li>
                            <li><strong>North America (US Hub):</strong> Northern Virginia / Ohio data center regions.</li>
                            <li><strong>West Africa (African Hub):</strong> Lagos data center facilities ensuring local compliance with the Nigeria Data Protection Act (NDPA).</li>
                        </ul>
                        <p>When cross-border data transfers are necessary for central engineering support, they are protected by legally binding Standard Contractual Clauses (SCCs) approved by the European Commission and the UK International Data Transfer Addendum (IDTA).</p>

                        <h3>8. Cryptographic Safeguards &amp; Enterprise Security Posture</h3>
                        <p>We maintain an enterprise-grade defense-in-depth cybersecurity posture to protect organizational records against unauthorized access, alteration, disclosure, or destruction:</p>
                        <ul>
                            <li><strong>Encryption at Rest:</strong> All database storage, transaction logs, attachments, and disk volumes are encrypted at rest using FIPS 140-2 validated AES-256 cryptographic cipher suites.</li>
                            <li><strong>Encryption in Transit:</strong> All communications between web browsers, mobile apps, desktop clients, APIs, and cloud databases are enforced using TLS 1.3 with mandatory HTTP Strict Transport Security (HSTS) and perfect forward secrecy.</li>
                            <li><strong>Administrative Authentication Security:</strong> Multi-factor authentication (MFA) via FIDO2/WebAuthn hardware security keys or time-based one-time passwords (TOTP) is enforced for all system administrators and privileged staff accounts.</li>
                            <li><strong>Role-Based Access Control (RBAC):</strong> Granular permission matrices restrict staff access strictly to modules authorized for their operational job responsibilities.</li>
                            <li><strong>Immutable Audit Logging:</strong> Every administrative data read, export, modification, and credential change is recorded in an immutable, tamper-evident audit log that cannot be altered by tenant administrators or compromised credentials.</li>
                        </ul>

                        <h3>9. Sub-processors and Infrastructure Partners</h3>
                        <p>We engage vetted third-party sub-processors strictly to deliver underlying cloud infrastructure, transactional communication channels, and payment gateway connectivity. All sub-processors are bound by strict Data Processing Agreements (DPAs) requiring equivalent or superior security controls:</p>
                        <ul>
                            <li><strong>Cloud Infrastructure:</strong> Microsoft Azure (Cloud compute, relational storage, blob storage) and Amazon Web Services (Cloud infrastructure).</li>
                            <li><strong>Transactional Communications:</strong> Enterprise SMTP relay pools and carrier-grade SMS routing gateways with mandatory TLS transport.</li>
                            <li><strong>Payment Gateways:</strong> PCI-DSS Level 1 certified processors (Stripe, Paystack, Flutterwave) handling tokenized credit card and direct bank transfer settlements.</li>
                        </ul>

                        <h3>10. Data Retention, Archival &amp; Cryptographic Sanitization</h3>
                        <p>We retain organizational data for the duration of the active subscription agreement. Upon contract termination or formal deletion request:</p>
                        <ul>
                            <li><strong>30-Day Transition Grace Period:</strong> The organization's dedicated workspace enters a 30-day read-only grace period, allowing authorized administrators to export all database tables, financial records, and documents in standard SQL, JSON, and CSV formats.</li>
                            <li><strong>Cryptographic Sanitization:</strong> Following the 30-day grace period, all primary database instances, replica nodes, disk volumes, and associated backup snapshots undergo permanent cryptographic shredding in accordance with NIST SP 800-88 Revision 1 and DoD 5220.22-M data sanitization standards.</li>
                        </ul>

                        <h3>11. Protection of Minor and Student Privacy</h3>
                        <p>Where Ozikol is deployed by educational institutions, youth organizations, or family residential estates, member records may include information concerning minors (individuals under 16 or 18 years of age depending on jurisdiction). Institutional administrators must verify that appropriate parental, legal guardian, or school authorization has been secured in compliance with the Children\'s Online Privacy Protection Act (COPPA) and GDPR Article 8 before provisioning minor accounts. Minors are shielded from public directories by default.</p>

                        <h3>12. Your Statutory Privacy Rights &amp; DPO Escalation</h3>
                        <p>Depending on your jurisdiction, you possess clear statutory rights regarding your personal data:</p>
                        <ul>
                            <li><strong>Right to Access &amp; Portability:</strong> Obtain confirmation of processing and request a machine-readable copy (JSON/CSV) of your personal records.</li>
                            <li><strong>Right to Rectification:</strong> Request correction of inaccurate, outdated, or incomplete personal data.</li>
                            <li><strong>Right to Erasure ("Right to be Forgotten"):</strong> Request deletion of personal records where legal grounds for continued processing no longer exist.</li>
                            <li><strong>Right to Restrict or Object:</strong> Restrict processing or object to processing conducted under legitimate interests.</li>
                        </ul>

                        <div class="oz-legal-callout oz-legal-callout--info">
                            <p><strong>How to Submit a Request:</strong> If you are a member, resident, or staff member of an organization powered by Ozikol, please contact your organization administrator first. If you are an account holder or need direct assistance, visit our <a href="/privacy-choices">Privacy Choices Portal</a> or reach our legal desk directly via our <a href="/support/contact?type=General">Enterprise Helpdesk</a>.</p>
                        </div>

                        <p><strong>Global Data Protection Officer (DPO):</strong><br />
                        Ozikol Cloud Global Headquarters<br />
                        Attn: Legal, Governance &amp; Regulatory Compliance Desk<br />
                        100 Bishopsgate, London EC2N 4AG, United Kingdom<br />
                        Support Escalation: <a href="/support/contact?type=General">Contact Legal Desk</a><br />
                        Supervisory Authorities: If you believe your rights have not been respected, you have the right to lodge a complaint with your national data protection supervisory authority (such as the UK Information Commissioner\'s Office - ICO, or the Nigeria Data Protection Commission - NDPC).</p>
                    """
                },
                new MasterLegalDocument
                {
                    Slug = "terms-of-use",
                    Title = "Terms of Use & Master Subscription Agreement",
                    Category = "Terms & Enterprise Licensing",
                    Summary = "The definitive contractual framework governing enterprise subscriptions, dedicated cloud instance provisioning, client software licensing, service level commitments, and acceptable use across the Ozikol ecosystem.",
                    Version = "2026.2",
                    EffectiveDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    LastUpdatedUtc = new DateTime(2026, 9, 5, 0, 0, 0, DateTimeKind.Utc),
                    Culture = "en",
                    SortOrder = 2,
                    IsPublished = true,
                    ContentHtml = """
                        <h3>1. Formation of Agreement &amp; Enterprise Scope</h3>
                        <p>This Master Subscription Agreement and Terms of Use (""Agreement"") constitutes a legally binding contract between Ozikol (""Ozikol"", ""we"", ""our"", or ""us"") and the subscriber entity, organization, corporate body, or individual (""Customer"", ""Tenant"", or ""you"") registering, deploying, or accessing Ozikol Cloud services, executive MIS systems, web portals, mobile applications, or desktop enterprise software. By executing an Order Form, clicking ""Agree"", or deploying a dedicated workspace, you represent and warrant that you possess full corporate and legal authority to bind the Customer to this Agreement.</p>

                        <h3>2. Dedicated Cloud Workspace Provisioning &amp; Fleet Isolation</h3>
                        <p>Upon registration and subscription confirmation, Ozikol provisions a dedicated cloud workspace for the Customer:</p>
                        <ul>
                            <li><strong>Fleet Isolation Guarantee:</strong> Your dedicated workspace is deployed with its own segregated relational database ring. Customer operational data, financial transactions, member records, and security logs are never commingled in shared multi-tenant database tables.</li>
                            <li><strong>Custom Domain &amp; SSL:</strong> Customers on eligible enterprise tiers may bind custom hostnames (e.g. <code>portal.yourorganization.org</code>) with automated TLS certificate generation, management, and renewal.</li>
                            <li><strong>Administrative Controls:</strong> Ozikol grants the Customer designated administrative credentials to configure suites, manage user roles, and define institutional policies within their dedicated instance.</li>
                        </ul>

                        <h3>3. 100% Customer Data Ownership Guarantee</h3>
                        <p><strong>The Customer retains sole, unencumbered, and exclusive ownership of all data, rosters, documents, media, financial transactions, and records uploaded to or generated within their dedicated instance (""Customer Data"").</strong> Ozikol asserts zero intellectual property rights or ownership claims over Customer Data. The Customer may export their complete database in open, standard formats (SQL, BACPAC, JSON, CSV) at any time during an active subscription without penalty or restrictive barriers.</p>

                        <div class="oz-legal-callout oz-legal-callout--success">
                            <p><strong>Zero Data Monetization Pledge:</strong> Ozikol will never sell, rent, monetize, license, or commercially exploit Customer Data. Furthermore, Ozikol will never utilize Customer Data, private communications, or operational records to train or improve public artificial intelligence models.</p>
                        </div>

                        <h3>4. Multi-Channel Client Applications &amp; Edge Hardware Licensing</h3>
                        <p>Ozikol grants Customer and its authorized users a non-exclusive, non-transferable, revocable license to access and utilize our software client suite during the subscription term:</p>
                        <ul>
                            <li><strong>Web Portals &amp; Executive MIS:</strong> Accessible via modern web browsers for administrative management, financial reconciliation, and member self-service.</li>
                            <li><strong>Cross-Platform Mobile Applications:</strong> Deployable on authorized iOS and Android devices for member engagement, dues payment, and digital gate passes.</li>
                            <li><strong>Windows Desktop Enterprise Applications:</strong> Deployable on Windows 10/11 operating systems for high-volume gatehouses, front-desk reception, and cashiers. The desktop client includes direct drivers for ESC/POS thermal receipt printers, USB/Ethernet barcode scanners, turnstiles, and biometric fingerprint readers.</li>
                            <li><strong>Offline Operation:</strong> Where offline synchronization is utilized, local cached data remains the exclusive property of the Customer and must be protected on Customer-managed physical hardware.</li>
                        </ul>

                        <h3>5. Administrative User Security &amp; Tenant Responsibilities</h3>
                        <p>The Customer is responsible for maintaining the operational security of its authorized user accounts:</p>
                        <ul>
                            <li><strong>Multi-Factor Authentication Mandate:</strong> The Customer agrees to mandate Multi-Factor Authentication (MFA) for all administrative users, accountants, security supervisors, and personnel with access to sensitive personal or financial records.</li>
                            <li><strong>Credential Hygiene:</strong> Authorized users must maintain confidential passwords and tokens. Sharing of administrative credentials across multiple staff members is strictly prohibited.</li>
                            <li><strong>Audit Trail Accountability:</strong> The Customer is solely responsible for all actions, data modifications, financial disbursements, and gate approvals executed under valid authorized user credentials.</li>
                        </ul>

                        <h3>6. Acceptable Use Policy (AUP) &amp; Platform Restrictions</h3>
                        <p>The Customer agrees to use Ozikol services exclusively for lawful institutional management. The Customer and its authorized users shall not:</p>
                        <ul>
                            <li>Reverse engineer, decompile, disassemble, or attempt to derive source code from any Ozikol binary, application, or central API service.</li>
                            <li>Conduct unauthorized penetration tests, vulnerability scans, or denial-of-service simulations against central endpoints without prior written authorization from Ozikol Security Operations.</li>
                            <li>Utilize the platform to store, distribute, or transmit malicious software, viruses, ransomware, or infringing materials.</li>
                            <li>Send unsolicited bulk commercial communications (spam) or abuse platform SMS broadcast pools for non-institutional promotions.</li>
                            <li>Attempt to circumvent architectural tenant boundaries, cryptographic vaults, or role-based access permissions.</li>
                        </ul>

                        <h3>7. Service Level Agreement (SLA) &amp; 99.99% Availability Commitment</h3>
                        <p>Ozikol commits to providing <strong>99.99% Monthly Uptime Availability</strong> for core cloud production workflows, measured 24/7 across every calendar month:</p>

                        <table class="oz-legal-table">
                            <thead>
                                <tr>
                                    <th>Monthly Availability Percentage</th>
                                    <th>Service Credit Granted</th>
                                    <th>Resolution Commitment</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><strong>99.99% &ndash; 100.0%</strong></td>
                                    <td>Standard SLA Target Met</td>
                                    <td>Normal monitoring and continuous operations.</td>
                                </tr>
                                <tr>
                                    <td><strong>99.90% &ndash; 99.98%</strong></td>
                                    <td><strong>10% Credit</strong> of monthly subscription fee</td>
                                    <td>Priority incident post-mortem delivered within 5 business days.</td>
                                </tr>
                                <tr>
                                    <td><strong>99.50% &ndash; 99.89%</strong></td>
                                    <td><strong>25% Credit</strong> of monthly subscription fee</td>
                                    <td>Executive root cause analysis delivered within 72 hours.</td>
                                </tr>
                                <tr>
                                    <td><strong>Below 99.50%</strong></td>
                                    <td><strong>50% Credit</strong> of monthly subscription fee</td>
                                    <td>Emergency engineering review and immediate executive escalation.</td>
                                </tr>
                            </tbody>
                        </table>

                        <p><strong>Scheduled Maintenance:</strong> Routine infrastructure enhancements are performed during low-impact maintenance windows (typically Sundays between 01:00 and 04:00 UTC). Ozikol provides at least five (5) business days advance electronic notice for scheduled maintenance. Scheduled maintenance is excluded from uptime calculations.</p>

                        <h3>8. Subscription Billing, Multi-Currency Invoicing &amp; Taxes</h3>
                        <p>Access to Ozikol is billed on an agreed annual or monthly subscription schedule:</p>
                        <ul>
                            <li><strong>Multi-Currency Settlement:</strong> Invoices are denominated and payable in the currency agreed upon in your Order Form, including US Dollars (USD $), British Pounds Sterling (GBP £), Euros (EUR €), and Nigerian Naira (NGN ₦).</li>
                            <li><strong>Payment Terms:</strong> Invoices are due thirty (30) calendar days from invoice date. Uncontested delinquent balances exceeding thirty days may accrue interest at 1.5% per month or the maximum statutory rate allowed by law.</li>
                            <li><strong>Taxes:</strong> All fees are exclusive of applicable value-added tax (VAT), sales tax, goods and services tax (GST), or withholding taxes, which shall be added to invoices where statutory regulations require.</li>
                        </ul>

                        <h3>9. Confidentiality &amp; Mutual Non-Disclosure</h3>
                        <p>Each party agrees that all code, architecture designs, business workflows, financial details, and Customer Data disclosed under this Agreement constitute confidential information. Each party agrees to protect the other\'s confidential information using the same degree of care it uses for its own confidential data (and no less than reasonable care), and shall not disclose such information to third parties except as strictly required to fulfill this Agreement or comply with legal subpoenas.</p>

                        <h3>10. Warranties &amp; Disclaimers</h3>
                        <p>Ozikol warrants that the software will perform materially in accordance with published user documentation under normal operating conditions. Except for this express warranty, the platform is provided on an ""as is"" and ""as available"" basis. Ozikol does not warrant that software execution will be completely error-free or uninterrupted, nor does it assume liability for external internet service provider outages, telecommunication carrier SMS delivery delays, or local power failures at Customer facilities.</p>

                        <h3>11. Limitation of Aggregate Liability</h3>
                        <p>To the maximum extent permitted by applicable law, neither party shall be liable to the other for any indirect, incidental, punitive, special, or consequential damages, including loss of profits, revenue, or business reputation, arising out of or in connection with this Agreement. <strong>Ozikol\'s cumulative aggregate liability for all claims of any kind arising under this Agreement shall not exceed the total subscription fees actually paid by Customer in the twelve (12) months preceding the incident giving rise to liability.</strong></p>

                        <h3>12. Term, Non-Renewal, Termination &amp; Dispute Resolution</h3>
                        <ul>
                            <li><strong>Term &amp; Auto-Renewal:</strong> Subscriptions remain in effect for the term specified in the Order Form and automatically renew for successive terms unless either party provides written notice of non-renewal at least thirty (30) days prior to the expiration date.</li>
                            <li><strong>Termination for Cause:</strong> Either party may terminate this Agreement immediately upon written notice if the other party materially breaches this Agreement and fails to cure such breach within thirty (30) days of receiving written notice.</li>
                            <li><strong>30-Day Transition Grace Period:</strong> Following subscription termination, Customer is provided 30 days of read-only access to export all Customer Data. After 30 days, all Customer databases and backups are permanently purged via cryptographic shredding.</li>
                            <li><strong>Governing Law:</strong> This Agreement shall be governed by and construed in accordance with the laws of England and Wales. Any controversy or claim arising out of this Agreement shall be resolved through good-faith executive negotiation, and if unresolved within 30 days, referred to binding arbitration under the Rules of the London Court of International Arbitration (LCIA).</li>
                        </ul>
                    """
                },
                new MasterLegalDocument
                {
                    Slug = "cookies",
                    Title = "Cookie & Tracking Technologies Policy",
                    Category = "Cookies & Device Storage",
                    Summary = "A clear, comprehensive breakdown of operational cookies, authentication tickets, local storage tokens, and our uncompromising zero-third-party-ad-tracker pledge.",
                    Version = "2026.2",
                    EffectiveDate = new DateTime(2025, 10, 3, 0, 0, 0, DateTimeKind.Utc),
                    LastUpdatedUtc = new DateTime(2026, 9, 5, 0, 0, 0, DateTimeKind.Utc),
                    Culture = "en",
                    SortOrder = 3,
                    IsPublished = true,
                    ContentHtml = """
                        <h3>1. Understanding Cookies, Local Storage &amp; Cryptographic Tokens</h3>
                        <p>Cookies and modern browser storage technologies are small data files placed on your device when you interact with digital web applications. Ozikol utilizes cookies, HTML5 LocalStorage, and encrypted session tokens strictly to authenticate administrators and members, enforce cryptographic security against cross-site attacks, and remember functional UI preferences such as interface language and dark/light display modes.</p>

                        <h3>2. The Ozikol Zero-Ad-Tracker Guarantee</h3>
                        <div class="oz-legal-callout oz-legal-callout--success">
                            <p><strong>Uncompromising Ad-Free Environment:</strong> Ozikol does not deploy third-party advertising cookies, cross-site tracking pixels, social media remarketing beacons, or data broker scripts (such as Google AdSense, Facebook Pixel, or TikTok Trackers). We do not monetize your browsing behavior, and we never share visitor telemetry with advertising networks.</p>
                        </div>

                        <h3>3. Comprehensive Platform Cookie &amp; Storage Inventory</h3>
                        <p>The following table provides an exhaustive, transparent inventory of all first-party cookies and local storage keys utilized across the Ozikol platform:</p>

                        <table class="oz-legal-table">
                            <thead>
                                <tr>
                                    <th>Cookie / Key Identifier</th>
                                    <th>Category</th>
                                    <th>Specific Operational Purpose</th>
                                    <th>Standard Duration</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><code>.AspNetCore.Antiforgery.*</code></td>
                                    <td>Strictly Necessary</td>
                                    <td>Cryptographic token designed to prevent Cross-Site Request Forgery (CSRF) attacks, ensuring form submissions originate from your authorized session.</td>
                                    <td>Session (Purged on browser close)</td>
                                </tr>
                                <tr>
                                    <td><code>.AspNetCore.Identity.Application</code></td>
                                    <td>Strictly Necessary</td>
                                    <td>Encrypted authentication ticket verifying the identity of logged-in administrators, staff members, and residents across secure portal pages.</td>
                                    <td>7 Days (Sliding expiration)</td>
                                </tr>
                                <tr>
                                    <td><code>.AspNetCore.Culture</code> / <code>ozikol_culture</code></td>
                                    <td>Functional Preference</td>
                                    <td>Remembers your selected language and localization formatting (e.g. English, French, Spanish, German, Arabic).</td>
                                    <td>1 Year</td>
                                </tr>
                                <tr>
                                    <td><code>ozikol_cookie_consent</code></td>
                                    <td>Functional Preference</td>
                                    <td>Stores your cookie acknowledgement preferences so you are not repeatedly prompted on subsequent visits.</td>
                                    <td>1 Year</td>
                                </tr>
                                <tr>
                                    <td><code>ozikol_tenant_context</code></td>
                                    <td>Strictly Necessary</td>
                                    <td>Caches active organization workspace routing context to ensure requests are routed to the correct dedicated tenant instance.</td>
                                    <td>Session</td>
                                </tr>
                                <tr>
                                    <td><code>ozikol_theme_preference</code></td>
                                    <td>Functional Preference</td>
                                    <td>Records user preference for visual display theme (Default Light, Dark Mode, or System Synchronized).</td>
                                    <td>1 Year</td>
                                </tr>
                                <tr>
                                    <td><code>ozikol_sidebar_state</code></td>
                                    <td>Functional Preference</td>
                                    <td>Remembers whether the executive MIS navigation sidebar was collapsed or expanded by the user.</td>
                                    <td>180 Days</td>
                                </tr>
                            </tbody>
                        </table>

                        <h3>4. Native Desktop &amp; Mobile Client Storage Architecture</h3>
                        <p>When you interact with Ozikol via our native mobile applications (iOS/Android) or our Windows Desktop Enterprise application, traditional browser HTTP cookies are not utilized. Instead, native applications employ operating-system-level secure cryptographic vaults:</p>
                        <ul>
                            <li><strong>Windows Desktop Enterprise Client:</strong> Stores authentication tokens and workspace credentials using the Windows Data Protection API (DPAPI) and local encrypted SQLite files (SQLCipher AES-256).</li>
                            <li><strong>iOS Mobile Application:</strong> Employs Apple Keychain Services for secure storage of JSON Web Tokens (JWT) and biometric authentication flags.</li>
                            <li><strong>Android Mobile Application:</strong> Employs Android Keystore and EncryptedSharedPreferences for hardware-backed token encryption.</li>
                        </ul>

                        <h3>5. Server-Side Operational Telemetry &amp; Diagnostics</h3>
                        <p>To maintain 99.99% availability and defend against cyberattacks, our cloud web servers log technical diagnostic telemetry. These logs record API response latency, HTTP status codes, browser user-agent tokens, and IP addresses. <strong>IP addresses in general diagnostics are truncated and anonymized.</strong> Diagnostic logs are used strictly for system performance tuning, DDoS mitigation, and intrusion prevention, and are automatically purged after 30 calendar days.</p>

                        <h3>6. How to Manage, Inspect, and Block Cookies</h3>
                        <p>You maintain full control over cookie storage through your web browser configuration:</p>
                        <ul>
                            <li><strong>Google Chrome:</strong> Settings &gt; Privacy and Security &gt; Cookies and other site data.</li>
                            <li><strong>Microsoft Edge:</strong> Settings &gt; Cookies and site permissions &gt; Manage and delete cookies.</li>
                            <li><strong>Mozilla Firefox:</strong> Options &gt; Privacy &amp; Security &gt; Cookies and Site Data.</li>
                            <li><strong>Apple Safari:</strong> Preferences &gt; Privacy &gt; Manage Website Data.</li>
                        </ul>
                        <div class="oz-legal-callout oz-legal-callout--warning">
                            <p><strong>Impact of Disabling Cookies:</strong> If you configure your browser to block all cookies, strictly necessary security and authentication cookies will be blocked. Consequently, you will not be able to log into your administrator account or submit authenticated forms. To configure your settings without breaking core functionality, visit our <a href="/privacy-choices">Privacy Choices Portal</a>.</p>
                        </div>
                    """
                },
                new MasterLegalDocument
                {
                    Slug = "privacy-choices",
                    Title = "Your Privacy Choices & Data Subject Rights Portal",
                    Category = "Privacy & Subject Rights",
                    Summary = "Self-service guidance and official procedures for exercising your statutory privacy rights under GDPR, UK GDPR, CCPA/CPRA, and NDPA across the Ozikol ecosystem.",
                    Version = "2026.2",
                    EffectiveDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    LastUpdatedUtc = new DateTime(2026, 9, 5, 0, 0, 0, DateTimeKind.Utc),
                    Culture = "en",
                    SortOrder = 4,
                    IsPublished = true,
                    ContentHtml = """
                        <h3>1. Core Principles: Data Sovereignty &amp; Self-Determination</h3>
                        <p>At Ozikol, data privacy is not a compliance afterthought; it is an architectural cornerstone. We believe that organizations and individuals possess an inherent right to sovereignty over their personal and corporate records. Whether you are protected under the European Union General Data Protection Regulation (GDPR), the UK Data Protection Act 2018 (UK GDPR), the California Consumer Privacy Act (CCPA/CPRA), or the Nigeria Data Protection Act 2023 (NDPA), Ozikol provides direct, transparent mechanisms to exercise your legal rights without delay or artificial hurdles.</p>

                        <h3>2. Exhaustive Catalog of Statutory Data Subject Rights</h3>
                        <p>Depending on your geographic location and statutory jurisdiction, you are entitled to exercise the following legal rights:</p>

                        <ul>
                            <li><strong>Right of Access &amp; Information:</strong> You have the right to receive confirmation of whether personal data concerning you is being processed, along with a detailed copy of all categories of personal information held in our records.</li>
                            <li><strong>Right to Rectification:</strong> You have the right to request the immediate correction of inaccurate, outdated, or incomplete personal data. Most profile information can be edited directly within your account settings.</li>
                            <li><strong>Right to Erasure (""Right to be Forgotten""):</strong> You have the right to request the permanent deletion of your personal records where data is no longer necessary for the purposes collected, where consent has been withdrawn, or where processing is unlawful. Certain financial transaction and gate security records must be preserved for statutory tax and legal liability periods.</li>
                            <li><strong>Right to Restriction of Processing:</strong> You have the right to request the temporary freezing or restriction of personal data processing while accuracy disputes or legal claims are investigated.</li>
                            <li><strong>Right to Data Portability:</strong> You have the right to receive your personal data in a structured, commonly used, and machine-readable format (JSON or CSV) and to transmit that data to another provider without hindrance.</li>
                            <li><strong>Right to Object:</strong> You have the right to object at any time to data processing carried out under the legal grounds of legitimate interests, including direct marketing and operational profiling.</li>
                            <li><strong>Right to Opt-Out of Automated Decision-Making:</strong> You have the right to request human review of any automated algorithmic decision that produces legal or significantly impactful consequences (such as automated visitor gate clearance refusals).</li>
                        </ul>

                        <h3>3. Dual-Tier Data Architecture: Tenant Records vs. Central Records</h3>
                        <p>To exercise your rights effectively, it is essential to understand Ozikol\'s dual-tier operational structure:</p>

                        <table class="oz-legal-table">
                            <thead>
                                <tr>
                                    <th>Data Scope</th>
                                    <th>Data Controller</th>
                                    <th>How to Exercise Your Rights</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><strong>Organization Tenant Records:</strong> Member rosters, estate resident directories, dues assessments, gate visitor logs, staff rotas, and security incident reports.</td>
                                    <td><strong>Your Subscribing Organization</strong> (e.g. your Estate Management Board, Club Executive, or Employer).</td>
                                    <td>Contact your organization administrator or estate manager directly. If you cannot reach them or encounter difficulties, Ozikol\'s DPO will assist in facilitating your request with the organization.</td>
                                </tr>
                                <tr>
                                    <td><strong>Ozikol Central Platform Records:</strong> Central billing accounts, enterprise subscription contracts, central helpdesk support tickets, and direct contact inquiries.</td>
                                    <td><strong>Ozikol Cloud Global</strong> (Central Platform Controller).</td>
                                    <td>Submit your request directly to the Ozikol Legal &amp; Governance Desk via our <a href="/support/contact?type=General">Data Subject Rights Desk</a>.</td>
                                </tr>
                            </tbody>
                        </table>

                        <h3>4. Step-by-Step Data Subject Access Request (DSAR) Procedure</h3>
                        <p>When submitting a formal Data Subject Access Request (DSAR) to Ozikol Central, our standardized compliance workflow ensures rapid and secure processing:</p>
                        <ol>
                            <li><strong>Submission:</strong> Submit your request via our <a href="/support/contact?type=General">Enterprise Helpdesk Form</a> selecting category ""Data Privacy &amp; DSAR"". Include your full name, associated email address, and the specific rights you wish to exercise.</li>
                            <li><strong>Cryptographic Verification:</strong> To protect against identity fraud, we verify the requester\'s identity via a two-factor cryptographic email challenge or signed institutional token before any records are disclosed or modified.</li>
                            <li><strong>48-Hour Acknowledgment:</strong> Our Data Protection team issues a formal acknowledgment and unique compliance tracking reference within 48 business hours.</li>
                            <li><strong>30-Day Fulfillment SLA:</strong> All verified DSAR requests are completed within thirty (30) calendar days at zero cost to the requester. If an exceptionally complex request requires an extension (up to 60 additional days as permitted by law), you will be notified within the first 30 days.</li>
                        </ol>

                        <h3>5. In-App Notification &amp; Communication Preferences</h3>
                        <p>You can customize your notification and communication preferences directly without filing a formal DSAR:</p>
                        <ul>
                            <li><strong>Push Notifications:</strong> Configurable at any time via your device settings (iOS Settings &gt; Ozikol, Android App Info &gt; Notifications).</li>
                            <li><strong>Transactional Emails:</strong> Essential account receipts, dues statements, and password resets are strictly operational and cannot be unsubscribed while maintaining an active account.</li>
                            <li><strong>Community Announcements:</strong> Toggle opt-in preferences for general announcements, sports club updates, and social polls in your member profile settings.</li>
                        </ul>

                        <h3>6. Global DPO Contact &amp; Independent Supervisory Authorities</h3>
                        <p>If you have questions regarding this policy or wish to escalate a privacy concern, please contact our Data Protection Officer:</p>
                        <p><strong>Ozikol Legal &amp; Governance Desk:</strong><br />
                        100 Bishopsgate, London EC2N 4AG, United Kingdom<br />
                        Web Portal: <a href="/support/contact?type=General">Submit Legal &amp; Privacy Request</a></p>

                        <p>You also have the statutory right to lodge a complaint with the relevant regulatory supervisory authority: in the UK, the Information Commissioner\'s Office (ICO) at <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">ico.org.uk</a>; in Nigeria, the Nigeria Data Protection Commission (NDPC) at <a href="https://ndpc.gov.ng" target="_blank" rel="noopener noreferrer">ndpc.gov.ng</a>; or the Data Protection Authority in your respective EU member state.</p>
                    """
                },
                new MasterLegalDocument
                {
                    Slug = "policies-and-reports",
                    Title = "Corporate Governance, Policies & Compliance Reports",
                    Category = "Governance & Compliance",
                    Summary = "Public repository of Ozikol's corporate governance policies, ISO 27001 certifications, SOC 2 Type II audit summaries, accessibility standards, and ethical vendor charters.",
                    Version = "2026.2",
                    EffectiveDate = new DateTime(2026, 3, 19, 0, 0, 0, DateTimeKind.Utc),
                    LastUpdatedUtc = new DateTime(2026, 9, 5, 0, 0, 0, DateTimeKind.Utc),
                    Culture = "en",
                    SortOrder = 5,
                    IsPublished = true,
                    ContentHtml = """
                        <h3>1. Executive Corporate Governance Framework &amp; Board Oversight</h3>
                        <p>Ozikol is committed to the highest standards of corporate governance, business integrity, technical reliability, and social responsibility. Our executive leadership team and Board of Directors maintain active oversight over information security, regulatory compliance, risk management, and ethical corporate conduct. Our governance model ensures that commercial objectives are achieved in full harmony with statutory legal obligations and customer data sovereignty.</p>

                        <h3>2. Master Enterprise Compliance Register</h3>
                        <p>The following register outlines the core operational policies governing all Ozikol corporate operations, engineering departments, and infrastructure partnerships:</p>

                        <h4>2.1 Information Security Management System (ISO/IEC 27001:2022)</h4>
                        <p>Our information security program is structured strictly in accordance with ISO/IEC 27001:2022 and NIST Cybersecurity Framework (CSF) standards. Our controls encompass continuous vulnerability assessments, weekly automated static code analysis (SAST), third-party penetration testing, hardware-backed administrative access controls, and comprehensive employee cybersecurity certification.</p>

                        <h4>2.2 SOC 2 Type II Compliance Framework</h4>
                        <p>Ozikol undergoes annual independent SOC 2 Type II examinations conducted by accredited third-party auditing firms. The examination verifies our operational controls across the American Institute of Certified Public Accountants (AICPA) Trust Services Criteria for <strong>Security, Availability, and Confidentiality</strong>.</p>

                        <h4>2.3 Business Continuity &amp; Disaster Recovery (BCDR) Policy</h4>
                        <p>Our platform is engineered for continuous resilience against regional infrastructure disruptions. All client databases feature point-in-time recovery with geo-redundant backups replicated across paired sovereign cloud availability zones:</p>
                        <ul>
                            <li><strong>Recovery Point Objective (RPO):</strong> Less than fifteen (15) minutes for all transactional databases.</li>
                            <li><strong>Recovery Time Objective (RTO):</strong> Less than two (2) hours for complete automated regional failover.</li>
                            <li><strong>Tabletop Drills:</strong> Emergency failover procedures and incident response plans undergo live simulation testing bi-annually.</li>
                        </ul>

                        <h4>2.4 Accessibility &amp; Universal Inclusion (WCAG 2.1 Level AA)</h4>
                        <p>We believe enterprise software must be accessible to all users regardless of physical ability. Our engineering teams rigorously audit our central web portals, executive MIS systems, and mobile applications to maintain conformance with the Web Content Accessibility Guidelines (WCAG 2.1 Level AA). This includes full keyboard navigation, ARIA screen-reader support, high-contrast color palettes, and resizable typography.</p>

                        <h4>2.5 Modern Slavery &amp; Human Rights Statement</h4>
                        <p>Ozikol enforces an absolute zero-tolerance policy regarding forced labor, servitude, human trafficking, and child labor across our global operations, sub-contractors, and technology supply chains. We comply with the UK Modern Slavery Act 2015 and require all hardware suppliers (including manufacturers of POS thermal printers, turnstiles, and biometric devices) to certify compliance with fair labor and human rights standards.</p>

                        <h4>2.6 Anti-Bribery, Anti-Corruption &amp; Whistleblower Protection</h4>
                        <p>Ozikol operates in strict compliance with the UK Bribery Act 2010, the US Foreign Corrupt Practices Act (FCPA), and applicable international anti-bribery statutes. We prohibit the offering, solicitation, or acceptance of any bribe, kickback, or improper commercial inducement. Our independent whistleblower channel provides secure, anonymous reporting with complete non-retaliation protections for employees and partners.</p>

                        <h4>2.7 Coordinated Vulnerability Disclosure (CVD) &amp; Bug Bounty</h4>
                        <p>We actively collaborate with ethical cybersecurity researchers to enhance platform resilience. Our Coordinated Vulnerability Disclosure policy provides clear safe-harbor terms for security research conducted in good faith. Vulnerabilities may be reported directly to our security engineering team, and we commit to initial triage within twenty-four (24) hours.</p>

                        <h3>3. Hardware Peripheral, Thermal Printer &amp; Edge Driver Standards</h3>
                        <p>Ozikol provides native desktop and edge applications interfacing directly with physical hardware peripherals (including ESC/POS thermal receipt printers, barcode/QR scanners, turnstiles, and biometric readers). Our hardware driver architecture guarantees:</p>
                        <ul>
                            <li><strong>Direct Driver Execution:</strong> Peripheral communication executes strictly in volatile memory; print spool data and barcode read streams are never cached to unencrypted permanent storage.</li>
                            <li><strong>Hardware Compatibility Certifications:</strong> Official support for standard USB, Ethernet, and serial peripheral protocols meeting international electrical and electromagnetic compatibility standards (CE, FCC, RoHS).</li>
                        </ul>

                        <h3>4. Environmental Sustainability &amp; Green Cloud Operations</h3>
                        <p>Ozikol recognizes our ecological responsibility. We deploy exclusively on tier-1 sovereign cloud infrastructure (Microsoft Azure and Amazon Web Services) committed to achieving 100% carbon-neutral operations powered by renewable energy. Furthermore, our digital access passes, digital dues receipts, and paperless elections have eliminated millions of sheets of paper across hundreds of subscribing estates and institutions.</p>

                        <h3>5. Transparency Reporting &amp; Law Enforcement Inquiries</h3>
                        <p>Ozikol maintains strict protocols regarding government, law enforcement, and regulatory requests for customer data:</p>
                        <ul>
                            <li><strong>No Backdoors:</strong> Ozikol does not build encryption backdoors or master decryption keys into any of its client workspaces, databases, or native binaries.</li>
                            <li><strong>Statutory Subpoena Verification:</strong> Customer data will never be disclosed to law enforcement without a legally binding court order, search warrant, or subpoena issued by a court of competent jurisdiction.</li>
                            <li><strong>Mandatory Customer Notice:</strong> Unless explicitly prohibited by a lawful non-disclosure gag order issued by a judge, Ozikol will promptly notify the affected customer organization before disclosing any records, providing the opportunity to seek protective legal remedies.</li>
                        </ul>

                        <h3>6. Accessing Audit Reports and Compliance Dossiers</h3>
                        <p>Enterprise prospective clients and current institutional subscribers may request confidential access to our comprehensive compliance dossiers, including our SOC 2 Type II examination reports, ISO 27001 summary certificates, and standard Data Processing Addendums (DPAs). To request these documents under mutual non-disclosure, please visit our <a href="/support/certifications">Certifications &amp; Compliance Hub</a> or contact our enterprise team via our <a href="/support/contact?type=General">Enterprise Support Portal</a>.</p>
                    """
                }
            };

            // Seed missing legal documents idempotently or update existing documents
            foreach (var doc in defaultDocuments)
            {
                var existing = await dbContext.MasterLegalDocuments
                    .FirstOrDefaultAsync(d => d.Slug == doc.Slug && d.Culture == doc.Culture, ct);

                if (existing == null)
                {
                    dbContext.MasterLegalDocuments.Add(doc);
                }
                else
                {
                    existing.Title = doc.Title;
                    existing.Category = doc.Category;
                    existing.Summary = doc.Summary;
                    existing.Version = doc.Version;
                    existing.EffectiveDate = doc.EffectiveDate;
                    existing.LastUpdatedUtc = doc.LastUpdatedUtc;
                    existing.ContentHtml = doc.ContentHtml;
                    existing.SortOrder = doc.SortOrder;
                    existing.IsPublished = doc.IsPublished;
                }
            }

            await dbContext.SaveChangesAsync(ct);
        }
    }
}
'''

full_new_content = prefix + new_method_code

with open(seeder_path, "w", encoding="utf-8") as f:
    f.write(full_new_content)

print(f"Successfully updated {seeder_path} with comprehensive legal documents!")
