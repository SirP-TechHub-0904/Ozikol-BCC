using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Migrations;
using Ozikol.MasterPersistence.EF.MasterSQL.Security;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Domain.Models.Ai;
using Ozikol_BCC.Infrastructure.TenantSupport;
using System.Security.Claims;
using System.Text.Json;


namespace Ozikol_BCC.Persistence.EF.SQL
{
/// <summary>
/// Primary EF Core context for the tenant database. It combines ASP.NET Identity tables,
/// legacy website/content tables, and all BCP feature tables used by Console and Workspace.
/// </summary>
public class DashboardDbContext : IdentityDbContext<Profile, AppRole, string>
{
    private readonly ITenantProvider _tenantProvider;
    // Tenant-level website UI/brand settings and operational configuration settings.
    public DbSet<MisWebsiteSetting> MisWebsiteSettings { get; set; } = null!;
    public DbSet<MisConfigurationSetting> MisConfigurationSettings { get; set; } = null!;
    public DbSet<MisWebsiteContactChannel> MisWebsiteContactChannels { get; set; } = null!;

    // Console dashboard widgets and guided-tour/wizard persistence.
    public DbSet<BcpWidget> BcpWidgets { get; set; } = null!;
    public DbSet<BcpWizardStep> BcpWizardSteps { get; set; } = null!;
    public DbSet<BcpUserInvitation> BcpUserInvitations { get; set; } = null!;
    public DbSet<UserDeviceSession> UserDeviceSessions { get; set; } = null!;
    public DbSet<BcpUserDevice> BcpUserDevices { get; set; } = null!;
    public DbSet<BcpUserMfaBackupCode> BcpUserMfaBackupCodes { get; set; } = null!;
    public DbSet<BcpLoginAuditLog> BcpLoginAuditLogs { get; set; } = null!;

    // Unified notification, email, and SMS queue pool tables.
    public DbSet<BcpEmailQueue> BcpEmailQueue { get; set; } = null!;
    public DbSet<BcpSmsQueue> BcpSmsQueue { get; set; } = null!;
    public DbSet<BcpScheduledJobQueue> BcpScheduledJobQueues { get; set; } = null!;

    // BCP communication, messaging, wallet, SMS, and contact feature tables.
    public DbSet<BcpLeaveRequest> BcpLeaveRequests { get; set; } = null!;
    public DbSet<BcpPhoneBook> BcpPhoneBooks { get; set; } = null!;
    public DbSet<BcpNewsletterPlan> BcpNewsletterPlans { get; set; }
    public DbSet<BcpNewsletterPlanTransaction> BcpNewsletterPlanTransactions { get; set; }
    public DbSet<BcpNewsletterWallet> BcpNewsletterWallets { get; set; }
    public DbSet<BcpNewsletterWalletTransaction> BcpNewsletterWalletTransactions { get; set; }
    public DbSet<BcpNewsletterCampaign> BcpNewsletterCampaigns { get; set; }
    public DbSet<BcpNewsletterRecipient> BcpNewsletterRecipients { get; set; }
    public DbSet<BcpNewsletterList> BcpNewsletterLists { get; set; }
    public DbSet<BcpNewsletterContact> BcpNewsletterContacts { get; set; }
    public DbSet<BcpContact> BcpContacts { get; set; } = null!;
    public DbSet<BcpUserRecentVisit> BcpUserRecentVisits { get; set; } = null!;
    public DbSet<BcpWallet> BcpWallets { get; set; } = null!;
    public DbSet<BcpWalletTransaction> BcpWalletTransactions { get; set; } = null!;
    public DbSet<BcpSmsTransaction> BcpSmsTransactions { get; set; } = null!;
    public DbSet<BcpSmsCampaign> BcpSmsCampaigns { get; set; } = null!;
    public DbSet<BcpSmsRecipient> BcpSmsRecipients { get; set; } = null!;
    public DbSet<BcpSmsSenderId> BcpSmsSenderIds { get; set; } = null!;
    public DbSet<TemplateCategory> TemplateCategories { get; set; } = null!;
    public DbSet<TemplateType> TemplateTypes { get; set; } = null!;
    public DbSet<MailingSystem> MailingSystems { get; set; } = null!;
    public DbSet<WebPage> WebPages { get; set; } = null!;
    public DbSet<Blog> Blogs { get; set; }
    public DbSet<BlogCategory> BlogCategories { get; set; }
    public DbSet<PageSection> PageSections { get; set; }
    public DbSet<PageSectionList> PageSectionLists { get; set; }
    public DbSet<TenantInstalledTemplate> TenantInstalledTemplates { get; set; } = null!;
    public DbSet<PageCategory> PageCategories { get; set; }
    public DbSet<NewsLetter> NewsLetter { get; set; }
    public DbSet<ContactUsCategory> ContactUsCategories { get; set; }
    public DbSet<ContactUs> ContactUs { get; set; }
    public DbSet<WebPageViewLog> WebPageViewLogs { get; set; }
    public DbSet<SiteCodeInjectionTag> SiteCodeInjectionTags { get; set; } = null!;

    // --- CMS: Dynamic Page Forms & Lead Submissions ---
    public DbSet<PageForm> PageForms { get; set; } = null!;
    public DbSet<PageFormField> PageFormFields { get; set; } = null!;
    public DbSet<PageFormSubmission> PageFormSubmissions { get; set; } = null!;

    // --- Ozi AI: Studio Co-pilot Chat History & Snapshot Restorations ---
    public DbSet<BcpAiChatHistory> AiChatHistories { get; set; } = null!;

    // Legacy website/content tables retained by the same tenant database.
    public DbSet<PostModal> PostModal { get; set; }

    // BCP Projects
    public DbSet<BcpProject> BcpProjects { get; set; }
    public DbSet<BcpProjectSprint> BcpProjectSprints { get; set; }
    public DbSet<BcpProjectTask> BcpProjectTasks { get; set; }
    public DbSet<BcpProjectUser> BcpProjectUsers { get; set; }

    // --- BCP: User Management Feature ---
    public DbSet<BcpUserCategory> BcpUserCategories { get; set; }
    public DbSet<BcpRegistrationFormField> BcpRegistrationFormFields { get; set; }
    public DbSet<BcpKpiIndicator> BcpKpiIndicators { get; set; }
    public DbSet<BcpKpiUserScore> BcpKpiUserScores { get; set; }
    public DbSet<BcpKpiPeriod> BcpKpiPeriods { get; set; } = null!;
    public DbSet<BcpUserFeatureRole> BcpUserFeatureRoles { get; set; }
    public DbSet<BcpUserNote> BcpUserNotes { get; set; }
    public DbSet<BcpActivityLog> BcpActivityLogs { get; set; }

    // --- BCP: Workstations & Application Gatekeeper Feature (bcp-workspace) ---
    public DbSet<BcpWorkstation> BcpWorkstations { get; set; } = null!;
    public DbSet<BcpWorkstationAppPolicy> BcpWorkstationAppPolicies { get; set; } = null!;
    public DbSet<BcpWorkstationFilePolicy> BcpWorkstationFilePolicies { get; set; } = null!;
    public DbSet<BcpWorkstationViolationLog> BcpWorkstationViolationLogs { get; set; } = null!;
    public DbSet<BcpWorkstationAccessRequest> BcpWorkstationAccessRequests { get; set; } = null!;
    public DbSet<BcpWorkstationActivityLog> BcpWorkstationActivityLogs { get; set; } = null!;

    // --- BCP: Independent Committees & Sub-Groups Suite (bcp-committees) ---
    public DbSet<BcpCommitteeSettings> BcpCommitteeSettings { get; set; } = null!;
    public DbSet<BcpCommittee> BcpCommittees { get; set; } = null!;
    public DbSet<BcpCommitteeMember> BcpCommitteeMembers { get; set; } = null!;
    public DbSet<BcpCommitteeForm> BcpCommitteeForms { get; set; } = null!;
    public DbSet<BcpCommitteeRegistration> BcpCommitteeRegistrations { get; set; } = null!;
    public DbSet<BcpCommitteeReport> BcpCommitteeReports { get; set; } = null!;
    public DbSet<BcpCommitteeCloudDocument> BcpCommitteeCloudDocuments { get; set; } = null!;

    // --- BCP: Unified Workforce, Rota & Attendance Suite (bcp-staff-rota & bcp-attendance-tracking) ---
    public DbSet<BcpClientSite> BcpClientSites { get; set; } = null!;
    public DbSet<BcpShift> BcpShifts { get; set; } = null!;
    public DbSet<BcpShiftAttendance> BcpShiftAttendances { get; set; } = null!;
    public DbSet<BcpShiftSwapRequest> BcpShiftSwapRequests { get; set; } = null!;
    public DbSet<BcpShiftLeaveRequest> BcpShiftLeaveRequests { get; set; } = null!;
    public DbSet<BcpShiftAvailability> BcpShiftAvailabilities { get; set; } = null!;
    public DbSet<BcpShiftDocument> BcpShiftDocuments { get; set; } = null!;
    public DbSet<BcpShiftStaffProfile> BcpShiftStaffProfiles { get; set; } = null!;
    public DbSet<BcpStaffType> BcpStaffTypes { get; set; } = null!;
    public DbSet<BcpShiftStaffRating> BcpShiftStaffRatings { get; set; } = null!;
    public DbSet<BcpShiftNotificationPreference> BcpShiftNotificationPreferences { get; set; } = null!;

    // --- BCP: Committees & Groups Feature ---
    public DbSet<BcpGroup> BcpGroups { get; set; }
    public DbSet<BcpGroupMember> BcpGroupMembers { get; set; }
    public DbSet<BcpGroupFile> BcpGroupFiles { get; set; }
    public DbSet<BcpGroupPost> BcpGroupPosts { get; set; }
    public DbSet<BcpGroupPoll> BcpGroupPolls { get; set; }
    public DbSet<BcpGroupPollOption> BcpGroupPollOptions { get; set; }
    public DbSet<BcpGroupPollVote> BcpGroupPollVotes { get; set; }
    public DbSet<BcpDirectMessage> BcpDirectMessages { get; set; }
    public DbSet<BcpMessageReadReceipt> BcpMessageReadReceipts { get; set; }
    public DbSet<BcpChatAuditLog> BcpChatAuditLogs { get; set; }
    public DbSet<BcpGroupInvitation> BcpGroupInvitations { get; set; }
    public DbSet<BcpBookmarkedMessage> BcpBookmarkedMessages { get; set; }
    public DbSet<BcpBiography> BcpBiographies { get; set; } = null!;
    public DbSet<BcpUserChatSetting> BcpUserChatSettings { get; set; }

    // --- BCP: Unified Financials (Dues & Donations) Feature ---
    public DbSet<BcpFinanceCategory> BcpFinanceCategories { get; set; }
    public DbSet<BcpFinanceTransaction> BcpFinanceTransactions { get; set; }

    // --- BCP: Commerce & Store Studio Feature ---
    public DbSet<BcpProductCategory> BcpProductCategories { get; set; }
    public DbSet<BcpProduct> BcpProducts { get; set; }
    public DbSet<BcpProductOrder> BcpProductOrders { get; set; }
    public DbSet<BcpProductOrderItem> BcpProductOrderItems { get; set; }
    public DbSet<BcpMarketingCampaign> BcpMarketingCampaigns { get; set; }

    // --- BCP: Alumni Feature ---
    public DbSet<BcpAlumniProfile> BcpAlumniProfiles { get; set; }
    public DbSet<BcpAlumniPost> BcpAlumniPosts { get; set; }

    // --- BCP: Dynamic Forms ---
    public DbSet<BcpForm> BcpForms { get; set; }
    public DbSet<BcpFormResponse> BcpFormResponses { get; set; }

    // --- BCP: Dynamic Interval Reporting ---
    public DbSet<BcpReportSchema> BcpReportSchemas { get; set; }
    public DbSet<BcpReportParticipant> BcpReportParticipants { get; set; }
    public DbSet<BcpReportSubmission> BcpReportSubmissions { get; set; }
    public DbSet<BcpReportTimeLog> BcpReportTimeLogs { get; set; }

    // Interactive User Manual Models
    public DbSet<BcpManual> BcpManuals { get; set; }
    public DbSet<BcpManualPage> BcpManualPages { get; set; }
    public DbSet<BcpManualElement> BcpManualElements { get; set; }

    // --- BCP: Management & Billing Feature ---
    public DbSet<BcpFeature> BcpFeatures { get; set; }
    public DbSet<BcpFeatureInvoice> BcpFeatureInvoices { get; set; }

    // --- BCP: Event & Ticketing Feature ---
    public DbSet<BcpEvent> BcpEvents { get; set; }
    public DbSet<BcpTicketType> BcpTicketTypes { get; set; }
    public DbSet<BcpEventTicket> BcpEventTickets { get; set; }

    // --- BCP: Proposals & Grants ---
    public DbSet<BcpProposal> BcpProposals { get; set; }
    public DbSet<BcpProposalFile> BcpProposalFiles { get; set; }
    public DbSet<BcpProposalPhase> BcpProposalPhases { get; set; }
    
    public DbSet<BcpDonor> BcpDonors { get; set; }
    public DbSet<BcpGrant> BcpGrants { get; set; }
    public DbSet<BcpGrantMilestone> BcpGrantMilestones { get; set; }

    // BCP Recruitment / ATS
    public DbSet<BcpJobPosting> BcpJobPostings { get; set; }
    public DbSet<BcpJobApplicant> BcpJobApplicants { get; set; }
    public DbSet<BcpJobInterview> BcpJobInterviews { get; set; }
    public DbSet<BcpApplicantAccount> BcpApplicantAccounts { get; set; }
    public DbSet<BcpJobApplicantDocument> BcpJobApplicantDocuments { get; set; }

    // --- BCP: Global Notifications & Message Templates ---
    public DbSet<BcpNotification> BcpNotifications { get; set; }
    public DbSet<BcpMessageTemplate> BcpMessageTemplates { get; set; }

    // --- BCP: E-Voting ---
    public DbSet<BcpElection> BcpElections { get; set; }
    public DbSet<BcpVoteCategory> BcpVoteCategories { get; set; }
    public DbSet<BcpCandidate> BcpCandidates { get; set; }
    public DbSet<BcpElectionVoter> BcpElectionVoters { get; set; }
    public DbSet<BcpUserVote> BcpUserVotes { get; set; }

    // --- BCP: Fleet & Equipment Management ---
    public DbSet<BcpEquipmentCategory> BcpEquipmentCategories { get; set; }
    public DbSet<BcpEquipment> BcpEquipments { get; set; }
    public DbSet<BcpMaintenanceLog> BcpMaintenanceLogs { get; set; }

    // --- BCP: Email Logs ---
    public DbSet<BcpNewsletterEmailLog> BcpNewsletterEmailLogs { get; set; }

    private readonly Microsoft.AspNetCore.Http.IHttpContextAccessor _httpContextAccessor;

    public DashboardDbContext(DbContextOptions<DashboardDbContext> options, ITenantProvider tenantProvider, Microsoft.AspNetCore.Http.IHttpContextAccessor? httpContextAccessor = null) : base(options)
    {
        _tenantProvider = tenantProvider;
        _httpContextAccessor = httpContextAccessor;
    }
    private static readonly HashSet<Type> ExcludedAuditTypes = new()
    {
        typeof(BcpActivityLog),
        typeof(BcpLoginAuditLog),
        typeof(BcpNotification),
        typeof(BcpMessageTemplate),
        typeof(MisConfigurationSetting),
        typeof(TemplateCategory),
        typeof(WebPageViewLog),
        typeof(BcpEmailQueue),
        typeof(BcpSmsQueue),
        typeof(BcpScheduledJobQueue),
        typeof(UserDeviceSession),
        typeof(BcpUserDevice),
        typeof(BcpUserRecentVisit),
        typeof(BcpMessageReadReceipt),
        typeof(BcpAiChatHistory),
        typeof(BcpUserMfaBackupCode)
    };

    private static readonly HashSet<string> SensitiveAuditProperties = new(StringComparer.OrdinalIgnoreCase)
    {
        "PasswordHash",
        "SecurityStamp",
        "ConcurrencyStamp",
        "ResetOtp",
        "OtpCode",
        "Token",
        "Password",
        "NormalizedEmail",
        "NormalizedUserName",
        "LastLogin",
        "UpdatedAt",
        "AccessFailedCount",
        "ViewCount",
        "Views",
        "LastViewedAt"
    };

    /// <summary>
    /// Automatically tracks intentional user/admin database mutations (Added, Modified, Deleted) across the tenant database.
    /// Skips lazy background "follow-come" seeding triggered during HTTP GET requests and skips redundant auto-logs when an explicit BcpActivityLog is already staged.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token for async execution.</param>
    /// <returns>The total number of state entries written to the database.</returns>
    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var httpContext = _httpContextAccessor?.HttpContext;
            var httpMethod = httpContext?.Request?.Method;

            // Never auto-capture lazy "follow-come" starter seeding that runs during HTTP GET/HEAD/OPTIONS requests or background startup jobs
            bool isIntentionalMutationRequest = httpContext != null
                && !string.IsNullOrWhiteSpace(httpMethod)
                && !string.Equals(httpMethod, "GET", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(httpMethod, "HEAD", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(httpMethod, "OPTIONS", StringComparison.OrdinalIgnoreCase);

            // Check if the controller/service already staged an explicit, descriptive BcpActivityLog in this transaction
            var existingStagedLogs = ChangeTracker.Entries<BcpActivityLog>()
                .Where(e => e.State == EntityState.Added)
                .Select(e => e.Entity)
                .ToList();

            // Inspect entries that were added, modified, or deleted, excluding telemetry, notifications, and queue items
            var entries = (isIntentionalMutationRequest && !existingStagedLogs.Any())
                ? ChangeTracker.Entries()
                    .Where(e => (e.State == EntityState.Added || e.State == EntityState.Modified || e.State == EntityState.Deleted)
                                && !ExcludedAuditTypes.Contains(e.Entity.GetType()))
                    .ToList()
                : new List<Microsoft.EntityFrameworkCore.ChangeTracking.EntityEntry>();

            if (entries.Any())
            {
                var user = httpContext?.User;
                var userEmail = user?.FindFirst(ClaimTypes.Email)?.Value
                    ?? user?.FindFirst("email")?.Value
                    ?? (user?.Identity?.Name?.Contains('@') == true ? user.Identity.Name : null);
                
                string? ipAddress = httpContext?.Request.Headers["CF-Connecting-IP"].FirstOrDefault();
                if (string.IsNullOrWhiteSpace(ipAddress))
                {
                    var forwarded = httpContext?.Request.Headers["X-Forwarded-For"].FirstOrDefault();
                    if (!string.IsNullOrWhiteSpace(forwarded))
                    {
                        ipAddress = forwarded.Split(',')[0].Trim();
                    }
                }
                if (string.IsNullOrWhiteSpace(ipAddress))
                {
                    ipAddress = httpContext?.Request.Headers["X-Real-IP"].FirstOrDefault();
                }
                if (string.IsNullOrWhiteSpace(ipAddress))
                {
                    ipAddress = httpContext?.Connection?.RemoteIpAddress?.ToString();
                }

                string? systemId = httpContext?.Request.Headers["X-System-Id"].FirstOrDefault()
                    ?? httpContext?.Request.Headers["X-Device-Id"].FirstOrDefault();
                string? userAgent = httpContext?.Request.Headers["User-Agent"].FirstOrDefault();
                var userId = user?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var userName = user?.Identity?.Name ?? "System";

                var auditLogs = new List<BcpActivityLog>();

                foreach (var entry in entries)
                {
                    var entityType = entry.Entity.GetType();
                    var entityTypeName = entityType.Name;
                    var friendlyEntityLabel = ResolveFriendlyEntityLabel(entityTypeName);

                    // Infer module categorization
                    string module = ResolveModuleForEntity(entry.Entity);

                    // Extract target user details if applicable
                    string? targetProfileId = null;
                    string? targetFullName = null;

                    if (entry.Entity is Profile p)
                    {
                        targetProfileId = p.Id;
                        targetFullName = p.FullName;
                    }
                    else if (entry.Entity is BcpUserFeatureRole role)
                    {
                        targetProfileId = role.ProfileId;
                    }
                    else if (entry.Entity is BcpUserNote note)
                    {
                        targetProfileId = note.ProfileId;
                    }
                    else if (entry.Entity is BcpKpiUserScore score)
                    {
                        targetProfileId = score.ProfileId;
                    }

                    string identifier = GetEntityIdentifier(entry.Entity);

                    if (entry.State == EntityState.Modified)
                    {
                        var diffList = new List<string>();
                        var changeRecords = new List<object>();

                        foreach (var prop in entry.Properties)
                        {
                            if (prop.Metadata.IsPrimaryKey() || !prop.IsModified)
                                continue;

                            var propName = prop.Metadata.Name;
                            if (SensitiveAuditProperties.Contains(propName))
                                continue;

                            var originalVal = prop.OriginalValue?.ToString() ?? "null";
                            var currentVal = prop.CurrentValue?.ToString() ?? "null";

                            if (!string.Equals(originalVal, currentVal, StringComparison.Ordinal))
                            {
                                var origDisplay = originalVal.Length > 40 ? originalVal.Substring(0, 37) + "..." : originalVal;
                                var currDisplay = currentVal.Length > 40 ? currentVal.Substring(0, 37) + "..." : currentVal;

                                diffList.Add($"{propName}: '{origDisplay}' ➔ '{currDisplay}'");
                                changeRecords.Add(new { property = propName, previous = origDisplay, @new = currDisplay });
                            }
                        }

                        // Skip modified log if no tracked values actually differed
                        if (diffList.Count == 0)
                            continue;

                        string diffString = string.Join(", ", diffList);
                        string description = $"Updated {friendlyEntityLabel} '{identifier}': [{diffString}]";
                        if (description.Length > 1000) description = description.Substring(0, 997) + "...";

                        auditLogs.Add(new BcpActivityLog
                        {
                            Id = Guid.CreateVersion7(),
                            ActionType = $"{friendlyEntityLabel} Updated",
                            Description = description,
                            PerformedByProfileId = userId,
                            PerformedByFullName = userName,
                            PerformedByUserEmail = userEmail,
                            TargetProfileId = targetProfileId,
                            TargetFullName = targetFullName,
                            Module = module,
                            IpAddress = ipAddress,
                            SystemId = systemId,
                            UserAgent = userAgent,
                            Date = DateTime.UtcNow,
                            MetadataJson = JsonSerializer.Serialize(new
                            {
                                entity = entityTypeName,
                                action = "Modified",
                                changes = changeRecords
                            })
                        });
                    }
                    else if (entry.State == EntityState.Added)
                    {
                        string description = $"Created {friendlyEntityLabel} '{identifier}'";
                        if (description.Length > 1000) description = description.Substring(0, 997) + "...";

                        auditLogs.Add(new BcpActivityLog
                        {
                            Id = Guid.CreateVersion7(),
                            ActionType = $"{friendlyEntityLabel} Created",
                            Description = description,
                            PerformedByProfileId = userId,
                            PerformedByFullName = userName,
                            PerformedByUserEmail = userEmail,
                            TargetProfileId = targetProfileId,
                            TargetFullName = targetFullName,
                            Module = module,
                            IpAddress = ipAddress,
                            SystemId = systemId,
                            UserAgent = userAgent,
                            Date = DateTime.UtcNow,
                            MetadataJson = JsonSerializer.Serialize(new
                            {
                                entity = entityTypeName,
                                action = "Added"
                            })
                        });
                    }
                    else if (entry.State == EntityState.Deleted)
                    {
                        string description = $"Deleted {friendlyEntityLabel} '{identifier}'";
                        if (description.Length > 1000) description = description.Substring(0, 997) + "...";

                        auditLogs.Add(new BcpActivityLog
                        {
                            Id = Guid.CreateVersion7(),
                            ActionType = $"{friendlyEntityLabel} Deleted",
                            Description = description,
                            PerformedByProfileId = userId,
                            PerformedByFullName = userName,
                            PerformedByUserEmail = userEmail,
                            TargetProfileId = targetProfileId,
                            TargetFullName = targetFullName,
                            Module = module,
                            IpAddress = ipAddress,
                            SystemId = systemId,
                            UserAgent = userAgent,
                            Date = DateTime.UtcNow,
                            MetadataJson = JsonSerializer.Serialize(new
                            {
                                entity = entityTypeName,
                                action = "Deleted"
                            })
                        });
                    }
                }

                if (auditLogs.Any())
                {
                    BcpActivityLogs.AddRange(auditLogs);
                }
            }
        }
        catch
        {
            // Safeguard: audit logging failures must never block database transactions
        }

        return await base.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Maps internal EF entity class names into clean, human-readable domain labels for activity logs.
    /// </summary>
    private static string ResolveFriendlyEntityLabel(string entityTypeName) => entityTypeName switch
    {
        "Profile" or "ApplicationUser" => "User Profile",
        "MisWebsiteSetting" => "Brand & Website Settings",
        "WebPage" => "Web Page",
        "PageSection" => "Page Section",
        "Blog" or "BlogPost" => "Blog Article",
        "CustomForm" => "Custom Form",
        "BcpUserCategory" => "User Category",
        "BcpUserInvitation" => "Member Invitation",
        "BcpUserFeatureRole" => "Feature Permission",
        "BcpKpiIndicator" => "KPI Metric",
        "BcpKpiUserScore" => "KPI Evaluation",
        "BcpRegistrationFormField" => "Registration Field",
        "AppRole" or "IdentityRole" => "Security Role",
        _ => entityTypeName
    };

    /// <summary>
    /// Resolves the human-readable workspace module categorization for an audited entity.
    /// </summary>
    private static string ResolveModuleForEntity(object entity)
    {
        if (entity is Profile || entity is AppRole || entity is BcpUserCategory ||
            entity is BcpUserFeatureRole || entity is BcpUserNote || entity is BcpKpiUserScore ||
            entity is BcpKpiIndicator || entity is BcpRegistrationFormField)
            return "User Management";

        if (entity is MisWebsiteSetting || entity is MisConfigurationSetting || entity is BcpWidget)
            return "Settings & Configuration";

        if (entity is WebPage || entity is PageSection || entity is TemplateCategory ||
            entity is TemplateType || entity is Blog || entity is SiteCodeInjectionTag)
            return "CMS & Content";

        if (entity is BcpGroup || entity is BcpGroupMember || entity is BcpDirectMessage || entity is BcpGroupPost)
            return "Committees & Groups";

        if (entity is BcpFinanceCategory || entity is BcpFinanceTransaction || entity is BcpWallet)
            return "Financials";

        if (entity is BcpProduct || entity is BcpProductOrder || entity is BcpNewsletterPlan)
            return "Commerce";

        if (entity is BcpEvent || entity is BcpEventTicket)
            return "Events";

        return "System";
    }

    /// <summary>
    /// Extracts a concise, human-readable identifier for an entity to enrich audit descriptions.
    /// </summary>
    private static string GetEntityIdentifier(object entity)
    {
        if (entity is Profile p) return !string.IsNullOrWhiteSpace(p.FullName) ? p.FullName : (p.Email ?? p.Id);
        if (entity is AppRole r) return r.Name ?? r.Id;
        if (entity is BcpUserCategory c) return c.Name ?? c.Id.ToString();
        if (entity is BcpUserFeatureRole fr) return $"{fr.ActionRole} ({fr.FeatureAreaKey})";
        if (entity is BcpUserNote un) return $"Note ({un.ProfileId})";
        if (entity is BcpKpiUserScore ks) return $"KPI Score ({ks.Period})";
        if (entity is BcpKpiIndicator ki) return ki.Title ?? ki.Id.ToString();
        if (entity is MisWebsiteSetting ws) return ws.BrandName ?? ws.CompanyName ?? "Website Settings";
        if (entity is MisConfigurationSetting) return "System Configuration";
        if (entity is WebPage wp) return wp.Title ?? wp.Id.ToString();
        if (entity is BcpGroup bg) return bg.Title ?? bg.Id.ToString();

        var type = entity.GetType();
        var nameProp = type.GetProperty("Name") ?? type.GetProperty("Title");
        if (nameProp != null)
        {
            var val = nameProp.GetValue(entity)?.ToString();
            if (!string.IsNullOrWhiteSpace(val)) return val;
        }
        var idProp = type.GetProperty("Id");
        if (idProp != null)
        {
            var val = idProp.GetValue(entity)?.ToString();
            if (!string.IsNullOrWhiteSpace(val)) return val;
        }
        return entity.ToString() ?? type.Name;
    }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        base.OnConfiguring(optionsBuilder);

        optionsBuilder.ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));

        if (!optionsBuilder.IsConfigured)
        {
            // Each request/worker scope resolves the active tenant connection string from ITenantProvider.
            // The current platform model is separate databases per tenant, not tenant selection inside auth.
            optionsBuilder.UseSqlServer(
                _tenantProvider.ConnectionString,
                o =>
                {
                    o.MigrationsHistoryTable(HistoryRepository.DefaultTableName, /*_tenantProvider.DbSchemaName*/null);
                    o.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(10), errorNumbersToAdd: null);
                    o.CommandTimeout(60);
                });
        }
    }

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        base.ConfigureConventions(configurationBuilder);
        configurationBuilder.Properties<decimal>().HavePrecision(18, 2);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // --- Audit & Operational Log Indexes for Fast Telemetry Queries ---
        modelBuilder.Entity<BcpActivityLog>(entity =>
        {
            entity.HasIndex(e => e.Date);
            entity.HasIndex(e => e.PerformedByProfileId);
            entity.HasIndex(e => e.PerformedByUserEmail);
            entity.HasIndex(e => e.SystemId);
            entity.HasIndex(e => e.IpAddress);
            entity.HasIndex(e => e.ActionType);
        });

        modelBuilder.Entity<BcpLoginAuditLog>(entity =>
        {
            entity.HasIndex(e => e.Timestamp);
            entity.HasIndex(e => e.Email);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.SystemId);
            entity.HasIndex(e => e.IpAddress);
        });

        // Identity-related feature records should not cascade-delete user-owned communication records.
        modelBuilder.Entity<BcpNewsletterRecipient>()
            .HasOne(r => r.User)
            .WithMany()
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        // Voting relationships are restricted to preserve election integrity and historical audit trails.
        modelBuilder.Entity<BcpUserVote>()
            .HasOne(v => v.BcpVoteCategory)
            .WithMany(vc => vc.BcpUserVotes)
            .HasForeignKey(v => v.BcpVoteCategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<BcpUserVote>()
            .HasOne(v => v.BcpCandidate)
            .WithMany(c => c.BcpUserVotes)
            .HasForeignKey(v => v.BcpCandidateId)
            .OnDelete(DeleteBehavior.Restrict);

        // --- BCP Groups & Chat System: Prevent Multiple Cascade Paths (SQL Server Error 1785) ---
        modelBuilder.Entity<BcpBookmarkedMessage>()
            .HasOne(b => b.Message)
            .WithMany()
            .HasForeignKey(b => b.MessageId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<BcpBookmarkedMessage>()
            .HasOne(b => b.Group)
            .WithMany()
            .HasForeignKey(b => b.GroupId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<BcpMessageReadReceipt>()
            .HasOne(r => r.Message)
            .WithMany()
            .HasForeignKey(r => r.MessageId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<BcpGroupPollVote>()
            .HasOne(v => v.Poll)
            .WithMany()
            .HasForeignKey(v => v.PollId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<BcpGroupPollVote>()
            .HasOne(v => v.Option)
            .WithMany(o => o.Votes)
            .HasForeignKey(v => v.OptionId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<BcpDirectMessage>()
            .HasOne(d => d.Group)
            .WithMany()
            .HasForeignKey(d => d.GroupId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<BcpDirectMessage>()
            .HasOne(d => d.ReplyToMessage)
            .WithMany()
            .HasForeignKey(d => d.ReplyToMessageId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<BcpGroupPost>()
            .HasOne(p => p.ReplyToMessage)
            .WithMany()
            .HasForeignKey(p => p.ReplyToMessageId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<BcpChatAuditLog>()
            .HasOne(a => a.Group)
            .WithMany()
            .HasForeignKey(a => a.GroupId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<BcpGroup>()
            .HasOne(g => g.CreatedByUser)
            .WithMany()
            .HasForeignKey(g => g.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<BcpGroupInvitation>()
            .HasOne(i => i.Group)
            .WithMany()
            .HasForeignKey(i => i.GroupId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<BcpGroupInvitation>()
            .HasOne(i => i.InvitedUser)
            .WithMany()
            .HasForeignKey(i => i.InvitedUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<BcpGroupInvitation>()
            .HasOne(i => i.InvitedByUser)
            .WithMany()
            .HasForeignKey(i => i.InvitedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<BcpGroupMember>()
            .HasOne(m => m.UserProfile)
            .WithMany()
            .HasForeignKey(m => m.UserProfileId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<BcpGroupPoll>()
            .HasOne(p => p.CreatedByUser)
            .WithMany()
            .HasForeignKey(p => p.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<BcpGroupFile>()
            .HasOne(f => f.UploadedByUser)
            .WithMany()
            .HasForeignKey(f => f.UploadedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<BcpLeaveRequest>()
            .HasOne(l => l.User)
            .WithMany()
            .HasForeignKey(l => l.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<BcpLeaveRequest>()
            .HasOne(l => l.ReviewedBy)
            .WithMany()
            .HasForeignKey(l => l.ReviewedById)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<BcpEventTicket>()
            .HasOne(t => t.UserProfile)
            .WithMany()
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<BcpEventTicket>()
            .HasOne(t => t.ScannedByUser)
            .WithMany()
            .HasForeignKey(t => t.ScannedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        // --- Products & Commerce Taxonomy ---
        modelBuilder.Entity<BcpProductCategory>()
            .HasOne(c => c.ParentCategory)
            .WithMany(c => c.SubCategories)
            .HasForeignKey(c => c.ParentId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<BcpProduct>()
            .HasOne(p => p.Category)
            .WithMany(c => c.Products)
            .HasForeignKey(p => p.BcpProductCategoryId)
            .OnDelete(DeleteBehavior.SetNull);

        // --- Finance Ledger ---
        // BcpFinanceCategoryId is optional: commerce/membership transactions may not have a finance category.
        // Explicitly map the FK column name to prevent EF generating a shadow 'BcpFinanceCategoryId1' property.
        modelBuilder.Entity<BcpFinanceTransaction>(entity =>
        {
            entity.HasOne(t => t.Category)
                .WithMany(c => c.Transactions)
                .HasForeignKey(t => t.BcpFinanceCategoryId)
                .HasConstraintName("FK_BcpFinanceTransactions_BcpFinanceCategories_BcpFinanceCategoryId")
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);

            entity.Property(t => t.BcpFinanceCategoryId)
                .HasColumnName("BcpFinanceCategoryId");
        });

        // --- Prevent SQL Server Multiple Cascade Paths (Error 1785) across all domain entities ---
        var cascadeFKs = modelBuilder.Model.GetEntityTypes()
            .SelectMany(t => t.GetForeignKeys())
            .Where(fk => !fk.IsOwnership && fk.DeleteBehavior == DeleteBehavior.Cascade);

        foreach (var fk in cascadeFKs)
        {
            // Preserve default cascade delete behavior for internal ASP.NET Identity entity mappings
            if (fk.DeclaringEntityType.ClrType.Namespace?.StartsWith("Microsoft.AspNetCore.Identity") == true
                || fk.DeclaringEntityType.ClrType == typeof(PageFormField)
                || fk.DeclaringEntityType.ClrType == typeof(PageFormSubmission))
            {
                continue;
            }

            fk.DeleteBehavior = DeleteBehavior.Restrict;
        }

        // --- CMS Dynamic Page Forms Unique Index & PageSection Relationship ---
        modelBuilder.Entity<PageForm>()
            .HasIndex(f => f.FormKey)
            .IsUnique();

        modelBuilder.Entity<PageSection>()
            .HasOne(s => s.PageForm)
            .WithMany()
            .HasForeignKey(s => s.PageFormId)
            .OnDelete(DeleteBehavior.SetNull);

        // --- Independent Committees & Sub-Groups Suite (bcp-committees) ---
        modelBuilder.Entity<BcpCommittee>(entity =>
        {
            entity.HasIndex(c => c.Slug).IsUnique();
            entity.HasIndex(c => new { c.Status, c.Visibility });

            entity.HasOne(c => c.ParentCommittee)
                .WithMany(p => p.SubGroups)
                .HasForeignKey(c => c.ParentCommitteeId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(c => c.ExtraInfoForm)
                .WithMany()
                .HasForeignKey(c => c.ExtraInfoFormId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<BcpCommitteeMember>(entity =>
        {
            entity.HasIndex(m => new { m.CommitteeId, m.UserProfileId }).IsUnique();
            entity.HasOne(m => m.Committee)
                .WithMany(c => c.Members)
                .HasForeignKey(m => m.CommitteeId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(m => m.UserProfile)
                .WithMany()
                .HasForeignKey(m => m.UserProfileId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<BcpCommitteeRegistration>(entity =>
        {
            entity.HasIndex(r => new { r.CommitteeId, r.Status, r.SubmittedAt });
            entity.HasOne(r => r.Committee)
                .WithMany(c => c.Registrations)
                .HasForeignKey(r => r.CommitteeId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<BcpCommitteeReport>(entity =>
        {
            entity.HasIndex(r => new { r.CommitteeId, r.MeetingDate });
            entity.HasIndex(r => r.ReviewStatus);
            entity.HasOne(r => r.Committee)
                .WithMany(c => c.Reports)
                .HasForeignKey(r => r.CommitteeId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<BcpCommitteeCloudDocument>(entity =>
        {
            entity.HasIndex(d => new { d.CommitteeId, d.IsPinnedToShelf });
            entity.HasIndex(d => d.OwnerUserProfileId);
            entity.HasOne(d => d.Committee)
                .WithMany(c => c.CloudDocuments)
                .HasForeignKey(d => d.CommitteeId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // --- BCP: Unified Workforce, Rota & Attendance Suite ---
        modelBuilder.Entity<BcpClientSite>(entity =>
        {
            entity.HasIndex(s => new { s.TenantKey, s.SiteCode }).IsUnique();
            entity.HasIndex(s => new { s.TenantKey, s.IsActive });
        });

        modelBuilder.Entity<BcpShift>(entity =>
        {
            entity.HasIndex(s => new { s.TenantKey, s.StartsAtUtc, s.EndsAtUtc });
            entity.HasIndex(s => new { s.TenantKey, s.AssignedUserId, s.StartsAtUtc });
            entity.HasIndex(s => new { s.TenantKey, s.ClientSiteId, s.StartsAtUtc });
            entity.HasIndex(s => new { s.TenantKey, s.Status });
            entity.HasOne(s => s.ClientSite)
                .WithMany(cs => cs.Shifts)
                .HasForeignKey(s => s.ClientSiteId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<BcpShiftAttendance>(entity =>
        {
            entity.HasIndex(a => a.ShiftId).IsUnique();
            entity.HasIndex(a => new { a.TenantKey, a.UserId, a.ClockInUtc });
            entity.HasIndex(a => new { a.TenantKey, a.IsFlagged });
            entity.HasOne(a => a.Shift)
                .WithOne(s => s.AttendanceRecord)
                .HasForeignKey<BcpShiftAttendance>(a => a.ShiftId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<BcpShiftSwapRequest>(entity =>
        {
            entity.HasIndex(r => new { r.TenantKey, r.ShiftId });
            entity.HasIndex(r => new { r.TenantKey, r.RequestingUserId, r.Status });
            entity.HasIndex(r => new { r.TenantKey, r.OfferedToUserId, r.Status });
            entity.HasOne(r => r.Shift)
                .WithMany(s => s.SwapRequests)
                .HasForeignKey(r => r.ShiftId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<BcpShiftLeaveRequest>(entity =>
        {
            entity.HasIndex(l => new { l.TenantKey, l.UserId, l.StartDate, l.EndDate });
            entity.HasIndex(l => new { l.TenantKey, l.Status });
        });

        modelBuilder.Entity<BcpShiftAvailability>(entity =>
        {
            entity.HasIndex(a => new { a.TenantKey, a.UserId, a.TargetDate });
            entity.HasIndex(a => new { a.TenantKey, a.State });
        });

        modelBuilder.Entity<BcpShiftDocument>(entity =>
        {
            entity.HasIndex(d => new { d.TenantKey, d.UserId, d.DocumentType });
            entity.HasIndex(d => new { d.TenantKey, d.IsVerified });
        });

        modelBuilder.Entity<BcpStaffType>(entity =>
        {
            entity.HasIndex(t => new { t.TenantKey, t.Code }).IsUnique();
            entity.HasIndex(t => new { t.TenantKey, t.IsActive });
            entity.HasIndex(t => new { t.TenantKey, t.SortOrder });
        });

        modelBuilder.Entity<BcpShiftStaffProfile>(entity =>
        {
            entity.HasIndex(p => new { p.TenantKey, p.UserId }).IsUnique();
            entity.HasIndex(p => new { p.TenantKey, p.IsActive });
            entity.HasIndex(p => new { p.TenantKey, p.StaffTypeId });
            entity.HasOne(p => p.StaffType)
                .WithMany()
                .HasForeignKey(p => p.StaffTypeId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<BcpShiftStaffRating>(entity =>
        {
            entity.HasIndex(r => new { r.TenantKey, r.ShiftId });
            entity.HasIndex(r => new { r.TenantKey, r.UserId });
            entity.HasOne(r => r.Shift)
                .WithMany()
                .HasForeignKey(r => r.ShiftId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<BcpShiftNotificationPreference>(entity =>
        {
            entity.HasIndex(p => new { p.TenantKey, p.UserId }).IsUnique();
        });

        // --- Website Contact Channels Indexing for Fast Querying by Type and Status ---
        modelBuilder.Entity<MisWebsiteContactChannel>(entity =>
        {
            entity.HasIndex(c => new { c.ChannelType, c.IsPublished, c.SortOrder });
        });

        // --- Transparent AES-256-GCM Encryption at Rest for Tenant Secret Credentials ---
        modelBuilder.Entity<MisConfigurationSetting>(entity =>
        {
            entity.Property(c => c.PaystackSecretKey).HasConversion(NullableEncryptedStringValueConverter.Instance);
            entity.Property(c => c.PaystackWebhookSecret).HasConversion(NullableEncryptedStringValueConverter.Instance);
            entity.Property(c => c.FlutterwaveSecretKey).HasConversion(NullableEncryptedStringValueConverter.Instance);
            entity.Property(c => c.FlutterwaveEncryptionKey).HasConversion(NullableEncryptedStringValueConverter.Instance);
            entity.Property(c => c.StripeSecretKey).HasConversion(NullableEncryptedStringValueConverter.Instance);
            entity.Property(c => c.StripeWebhookSecret).HasConversion(NullableEncryptedStringValueConverter.Instance);
            entity.Property(c => c.PayPalClientSecret).HasConversion(NullableEncryptedStringValueConverter.Instance);
            entity.Property(c => c.PixelPaySecretKey).HasConversion(NullableEncryptedStringValueConverter.Instance);
            entity.Property(c => c.PixelPaySaltKey).HasConversion(NullableEncryptedStringValueConverter.Instance);
            entity.Property(c => c.PixelPayWebhookSecret).HasConversion(NullableEncryptedStringValueConverter.Instance);
            entity.Property(c => c.TermiiApiKey).HasConversion(NullableEncryptedStringValueConverter.Instance);
            entity.Property(c => c.TwilioAuthToken).HasConversion(NullableEncryptedStringValueConverter.Instance);
            entity.Property(c => c.PostmarkServerToken).HasConversion(NullableEncryptedStringValueConverter.Instance);
            entity.Property(c => c.SmtpPassword).HasConversion(NullableEncryptedStringValueConverter.Instance);
            entity.Property(c => c.ZeptoMailApiKey).HasConversion(NullableEncryptedStringValueConverter.Instance);
            entity.Property(c => c.ZeptoMailSendMailToken).HasConversion(NullableEncryptedStringValueConverter.Instance);
            entity.Property(c => c.CustomCloudinaryApiSecret).HasConversion(NullableEncryptedStringValueConverter.Instance);
            entity.Property(c => c.CustomS3SecretKey).HasConversion(NullableEncryptedStringValueConverter.Instance);
        });

        // ConfigureCustomer(modelBuilder);
    }


   
}

}
