using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Migrations;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Infrastructure.TenantSupport;


namespace Ozikol_BCC.Persistence.EF.SQL
{
/// <summary>
/// Primary EF Core context for the tenant database. It combines ASP.NET Identity tables,
/// legacy website/content tables, and all BCP feature tables used by Console and Workspace.
/// </summary>
public class DashboardDbContext : IdentityDbContext<Profile, AppRole, string>
{
    private readonly ITenantProvider _tenantProvider;
    // Site and platform configuration tables shared by the website and BCP runtime.
    public DbSet<UiSetting> UiSettings { get; set; } = null!;
    public DbSet<ConfigSetting> ConfigSettings { get; set; } = null!;
    public DbSet<ManagementSetting> ManagementSettings { get; set; } = null!;
    public DbSet<BcpSetting> BcpSettings { get; set; } = null!;

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

    // Legacy website/content tables retained by the same tenant database.
    public DbSet<PostModal> PostModal { get; set; }

    // BCP Projects
    public DbSet<BcpProject> BcpProjects { get; set; }
    public DbSet<BcpProjectSprint> BcpProjectSprints { get; set; }
    public DbSet<BcpProjectTask> BcpProjectTasks { get; set; }
    public DbSet<BcpProjectUser> BcpProjectUsers { get; set; }

    // --- BCP: User Management Feature ---
    public DbSet<BcpUserCategory> BcpUserCategories { get; set; }
    public DbSet<BcpKpiIndicator> BcpKpiIndicators { get; set; }
    public DbSet<BcpKpiUserScore> BcpKpiUserScores { get; set; }
    public DbSet<BcpKpiPeriod> BcpKpiPeriods { get; set; } = null!;
    public DbSet<BcpUserFeatureRole> BcpUserFeatureRoles { get; set; }
    public DbSet<BcpUserNote> BcpUserNotes { get; set; }
    public DbSet<BcpActivityLog> BcpActivityLogs { get; set; }

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

    /// <summary>
    /// Adds lightweight audit rows for sensitive BCP user-management changes before saving.
    /// This currently tracks feature roles, KPI scores, and private user notes.
    /// </summary>
    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var auditedEntities = new[] { typeof(BcpUserFeatureRole), typeof(BcpKpiUserScore), typeof(BcpUserNote) };

        var entries = ChangeTracker.Entries()
            .Where(e => (e.State == EntityState.Added || e.State == EntityState.Modified || e.State == EntityState.Deleted)
                        && auditedEntities.Contains(e.Entity.GetType()))
            .ToList();

        if (entries.Any())
        {
            var user = _httpContextAccessor?.HttpContext?.User;
            var userId = user?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var userName = user?.Identity?.Name ?? "System";

            var logs = new List<BcpActivityLog>();

            foreach (var entry in entries)
            {
                string actionType = entry.State.ToString();

                var log = new BcpActivityLog
                {
                    ActionType = actionType,
                    Description = $"{actionType} a record.",
                    PerformedByProfileId = userId,
                    PerformedByFullName = userName,
                    Module = "User Management",
                    Date = DateTime.UtcNow
                };

                if (entry.Entity is BcpUserFeatureRole role)
                {
                    // Feature-role changes affect authorization, sidebar visibility, and feature actions.
                    log.ActionType = $"{actionType} Role";
                    log.Description = $"{actionType} Role '{role.ActionRole}' for module '{role.FeatureAreaKey}'.";
                    log.TargetProfileId = role.ProfileId;
                }
                else if (entry.Entity is BcpUserNote note)
                {
                    log.ActionType = $"{actionType} Note";
                    log.Description = $"{actionType} HR Note (Private: {note.IsPrivate}).";
                    log.TargetProfileId = note.ProfileId;
                }
                else if (entry.Entity is BcpKpiUserScore score)
                {
                    log.ActionType = $"{actionType} KPI";
                    log.Description = $"{actionType} KPI Score for Period: {score.Period}.";
                    log.TargetProfileId = score.ProfileId;
                }

                logs.Add(log);
            }

            if (logs.Any())
            {
                BcpActivityLogs.AddRange(logs);
            }
        }

        return await base.SaveChangesAsync(cancellationToken);
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
                o => o.MigrationsHistoryTable(HistoryRepository.DefaultTableName, /*_tenantProvider.DbSchemaName*/null));
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

        // ConfigureCustomer(modelBuilder);
    }


   
}

}
