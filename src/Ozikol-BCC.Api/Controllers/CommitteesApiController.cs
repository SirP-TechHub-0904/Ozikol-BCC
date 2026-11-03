using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Application.Common.Errors;
using Ozikol_BCC.Application.Hubs;
using Ozikol_BCC.Application.Interfaces.Services;
using Ozikol_BCC.Application.Services.Cloudinary;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Infrastructure.TenantSupport;
using Ozikol_BCC.Persistence.EF.SQL;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Api.Controllers
{
    /// <summary>
    /// Self-contained enterprise API controller for the independent Committees &amp; Sub-Groups capability (<c>bcp-committees</c>).
    /// Governs dynamic alias settings, hierarchical committees &amp; sub-groups, delegated leadership micro-roles,
    /// module-independent Extra-Info forms, internal &amp; external intake registrations, multi-modal meeting reports,
    /// Google Docs / Sheets / Notebook cloud connectors, and Ozi AI report digests.
    /// </summary>
    [ApiController]
    [Route("api/committees")]
    [Authorize]
    [Tags("Committees & Sub-Groups Suite (bcp-committees)")]
    public class CommitteesApiController : ControllerBase
    {
        private readonly DashboardDbContext _db;
        private readonly UserManager<Profile>? _userManager;
        private readonly MasterCatalogDbContext? _masterCatalogDbContext;
        private readonly ICentralNotificationDispatcher? _notificationDispatcher;
        private readonly ICloudinaryService? _cloudinaryService;
        private readonly ITenantActivityLogger? _activityLogger;
        private readonly ITenantProvider? _tenantProvider;
        private readonly IHubContext<NotificationHub>? _notificationHub;
        private readonly IConfiguration _configuration;
        private readonly ITenantFeatureGateService? _featureGateService;

        /// <summary>
        /// Roles considered workspace-wide administrators for the Committees Console.
        /// </summary>
        private static readonly HashSet<string> ConsoleAdminRoles = new(StringComparer.OrdinalIgnoreCase)
        {
            "SuperAdmin", "Admin", "UserManager", "IdentityManager"
        };

        /// <summary>
        /// Delegated committee micro-roles permitted to manage group attendance, submit official reports, and approve applicants for their own group.
        /// </summary>
        private static readonly HashSet<string> GroupLeaderRoles = new(StringComparer.OrdinalIgnoreCase)
        {
            "Chairperson", "CoChair", "Secretary", "Coordinator"
        };

        /// <summary>
        /// Initializes a new instance of the <see cref="CommitteesApiController"/> class.
        /// </summary>
        /// <param name="db">Tenant-scoped database context.</param>
        /// <param name="configuration">Application configuration for optional platform Google Picker public client keys.</param>
        /// <param name="userManager">Identity user manager for member account provisioning.</param>
        /// <param name="masterCatalogDbContext">Master catalog context for Ozi AI key pool governance.</param>
        /// <param name="notificationDispatcher">Unified multi-channel notification dispatcher.</param>
        /// <param name="cloudinaryService">Managed document and media storage service.</param>
        /// <param name="activityLogger">Tenant security and operational audit logger.</param>
        /// <param name="tenantProvider">Active tenant context provider.</param>
        /// <param name="notificationHub">SignalR real-time hub context for live alias updates.</param>
        /// <param name="featureGateService">Tenant modular feature gate evaluator.</param>
        public CommitteesApiController(
            DashboardDbContext db,
            IConfiguration configuration,
            UserManager<Profile>? userManager = null,
            MasterCatalogDbContext? masterCatalogDbContext = null,
            ICentralNotificationDispatcher? notificationDispatcher = null,
            ICloudinaryService? cloudinaryService = null,
            ITenantActivityLogger? activityLogger = null,
            ITenantProvider? tenantProvider = null,
            IHubContext<NotificationHub>? notificationHub = null,
            ITenantFeatureGateService? featureGateService = null)
        {
            _db = db;
            _configuration = configuration;
            _userManager = userManager;
            _masterCatalogDbContext = masterCatalogDbContext;
            _notificationDispatcher = notificationDispatcher;
            _cloudinaryService = cloudinaryService;
            _activityLogger = activityLogger;
            _tenantProvider = tenantProvider;
            _notificationHub = notificationHub;
            _featureGateService = featureGateService;
        }

        /// <summary>
        /// Validates that the Committees &amp; Sub-Groups feature (<c>bcp-committees</c>) is active and licensed.
        /// </summary>
        /// <param name="cancellationToken">Request cancellation token.</param>
        /// <returns>True if feature is active; otherwise false.</returns>
        private async Task<bool> IsFeatureActiveAsync(CancellationToken cancellationToken)
        {
            if (_featureGateService == null) return true;
            var tenantKey = ResolveCurrentTenantKey();
            if (string.IsNullOrWhiteSpace(tenantKey)) return true;
            return await _featureGateService.IsFeatureActiveAsync(tenantKey, "bcp-committees", cancellationToken);
        }

        // =====================================================================
        // 1. SETTINGS, DYNAMIC ALIAS ENGINE & GOOGLE PICKER PUBLIC CONFIG
        // =====================================================================

        /// <summary>
        /// Retrieves the workspace's active <see cref="BcpCommitteeSettings"/> including dynamic terminology aliases
        /// (e.g. "Ministry / Ministries", "Actors", "Chapters") and platform Google Picker client configuration.
        /// </summary>
        /// <param name="cancellationToken">Request cancellation token.</param>
        /// <returns>Standard <see cref="ApiResponse{T}"/> wrapping the active settings and cloud config.</returns>
        [HttpGet("settings")]
        public async Task<IActionResult> GetSettings(CancellationToken cancellationToken)
        {
            if (!await IsFeatureActiveAsync(cancellationToken))
            {
                return StatusCode(StatusCodes.Status403Forbidden,
                    ApiResponse<object>.FailureResponse("This capability is not active on your workspace plan.", errorCode: StandardErrorCodes.CapabilityNotActive));
            }

            var settings = await GetOrCreateSettingsAsync(cancellationToken);
            var googleClientId = _configuration["GoogleWorkspace:ClientId"]
                              ?? Environment.GetEnvironmentVariable("GOOGLE_WORKSPACE_CLIENT_ID")
                              ?? string.Empty;
            var googlePickerApiKey = _configuration["GoogleWorkspace:PickerApiKey"]
                                  ?? Environment.GetEnvironmentVariable("GOOGLE_WORKSPACE_PICKER_API_KEY")
                                  ?? string.Empty;
            var googleAppId = _configuration["GoogleWorkspace:AppId"]
                           ?? Environment.GetEnvironmentVariable("GOOGLE_WORKSPACE_APP_ID")
                           ?? string.Empty;

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                settings.Id,
                settings.AliasSingular,
                settings.AliasPlural,
                settings.SubGroupAliasSingular,
                settings.SubGroupAliasPlural,
                settings.LeaderTitleAlias,
                settings.SecretaryTitleAlias,
                settings.AllowExternalRegistration,
                settings.RequireApprovalForExternal,
                settings.AutoProvisionMemberOnApprove,
                settings.DefaultExtraInfoFormId,
                settings.AllowGoogleCloudLinking,
                settings.AllowAnyMemberReportSubmission,
                settings.MaxUploadSizeMb,
                settings.ReportReminderCadence,
                CustomReportMetrics = ParseJsonOrDefault<List<CommitteeMetricSchemaDto>>(settings.CustomReportMetricsJson, new List<CommitteeMetricSchemaDto>()),
                GooglePickerConfig = new
                {
                    ClientId = googleClientId,
                    ApiKey = googlePickerApiKey,
                    AppId = googleAppId,
                    IsConfigured = !string.IsNullOrWhiteSpace(googleClientId) && !string.IsNullOrWhiteSpace(googlePickerApiKey)
                },
                TenantKey = ResolveCurrentTenantKey(),
                settings.UpdatedAt
            }, "Settings retrieved."));
        }

        /// <summary>
        /// Updates the workspace's <see cref="BcpCommitteeSettings"/> and broadcasts live terminology alias changes
        /// across all active Admin Console and Member Workspace clients.
        /// </summary>
        /// <param name="dto">Updated committee settings payload.</param>
        /// <param name="cancellationToken">Request cancellation token.</param>
        /// <returns>Updated settings snapshot.</returns>
        [HttpPut("settings")]
        public async Task<IActionResult> UpdateSettings([FromBody] UpdateCommitteeSettingsDto dto, CancellationToken cancellationToken)
        {
            if (!IsCurrentUserConsoleAdmin())
            {
                return StatusCode(StatusCodes.Status403Forbidden,
                    ApiResponse<object>.FailureResponse("Access denied.", errorCode: StandardErrorCodes.AccessDenied));
            }

            if (dto == null)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Invalid request data.", errorCode: StandardErrorCodes.InvalidRequestData));
            }

            var settings = await GetOrCreateSettingsAsync(cancellationToken);

            settings.AliasSingular = !string.IsNullOrWhiteSpace(dto.AliasSingular) ? dto.AliasSingular.Trim() : "Committee";
            settings.AliasPlural = !string.IsNullOrWhiteSpace(dto.AliasPlural) ? dto.AliasPlural.Trim() : "Committees";
            settings.SubGroupAliasSingular = !string.IsNullOrWhiteSpace(dto.SubGroupAliasSingular) ? dto.SubGroupAliasSingular.Trim() : "Sub-Group";
            settings.SubGroupAliasPlural = !string.IsNullOrWhiteSpace(dto.SubGroupAliasPlural) ? dto.SubGroupAliasPlural.Trim() : "Sub-Groups";
            settings.LeaderTitleAlias = !string.IsNullOrWhiteSpace(dto.LeaderTitleAlias) ? dto.LeaderTitleAlias.Trim() : "Chairperson";
            settings.SecretaryTitleAlias = !string.IsNullOrWhiteSpace(dto.SecretaryTitleAlias) ? dto.SecretaryTitleAlias.Trim() : "Secretary";
            settings.AllowExternalRegistration = dto.AllowExternalRegistration;
            settings.RequireApprovalForExternal = dto.RequireApprovalForExternal;
            settings.AutoProvisionMemberOnApprove = dto.AutoProvisionMemberOnApprove;
            settings.DefaultExtraInfoFormId = dto.DefaultExtraInfoFormId;
            settings.AllowGoogleCloudLinking = dto.AllowGoogleCloudLinking;
            settings.AllowAnyMemberReportSubmission = dto.AllowAnyMemberReportSubmission;
            settings.MaxUploadSizeMb = Math.Clamp(dto.MaxUploadSizeMb <= 0 ? 25 : dto.MaxUploadSizeMb, 1, 100);
            settings.ReportReminderCadence = string.IsNullOrWhiteSpace(dto.ReportReminderCadence) ? "Monthly" : dto.ReportReminderCadence.Trim();
            settings.CustomReportMetricsJson = JsonSerializer.Serialize(dto.CustomReportMetrics ?? new List<CommitteeMetricSchemaDto>());
            settings.UpdatedAt = DateTime.UtcNow;

            // Keep workspace global GroupAlias synchronized so top-level navigation and Flutter workspace model stay aligned
            var globalConfig = await _db.MisConfigurationSettings.FirstOrDefaultAsync(cancellationToken);
            if (globalConfig != null)
            {
                globalConfig.GroupAlias = settings.AliasPlural;
            }

            await _db.SaveChangesAsync(cancellationToken);

            // Broadcast live alias update over SignalR so connected Web & Mobile clients switch labels instantaneously
            var tenantKey = ResolveCurrentTenantKey();
            if (_notificationHub != null && !string.IsNullOrWhiteSpace(tenantKey))
            {
                await _notificationHub.Clients.Group($"tenant:{tenantKey.ToLowerInvariant()}").SendAsync("TenantAliasesUpdated", new
                {
                    groupAlias = settings.AliasPlural,
                    committeeAliasSingular = settings.AliasSingular,
                    committeeAliasPlural = settings.AliasPlural,
                    subGroupAliasSingular = settings.SubGroupAliasSingular,
                    subGroupAliasPlural = settings.SubGroupAliasPlural,
                    leaderTitleAlias = settings.LeaderTitleAlias,
                    secretaryTitleAlias = settings.SecretaryTitleAlias
                }, cancellationToken);
            }

            if (_activityLogger != null)
            {
                await _activityLogger.LogAsync(
                    "UPDATE_COMMITTEE_SETTINGS",
                    $"Updated {settings.AliasPlural} settings and alias configuration ({settings.AliasSingular} / {settings.AliasPlural}).",
                    "Committees");
            }

            return await GetSettings(cancellationToken);
        }

        // =====================================================================
        // 2. ADMIN GRAPHICAL & KPI DASHBOARD (ZERO DUMMY DATA)
        // =====================================================================

        /// <summary>
        /// Computes 100% live tenant database KPI metrics, chart series, and recent activity feeds
        /// for the Administrator Graphical Dashboard.
        /// </summary>
        /// <param name="cancellationToken">Request cancellation token.</param>
        /// <returns>Structured telemetry payload for cards, charts, and feeds.</returns>
        [HttpGet("dashboard")]
        public async Task<IActionResult> GetAdminDashboard(CancellationToken cancellationToken)
        {
            if (!IsCurrentUserConsoleAdmin())
            {
                return StatusCode(StatusCodes.Status403Forbidden,
                    ApiResponse<object>.FailureResponse("Access denied.", errorCode: StandardErrorCodes.AccessDenied));
            }

            var now = DateTime.UtcNow;
            var startOfMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var sixMonthsAgo = startOfMonth.AddMonths(-5);

            var settings = await GetOrCreateSettingsAsync(cancellationToken);

            var committees = await _db.BcpCommittees
                .AsNoTracking()
                .Select(c => new
                {
                    c.Id,
                    c.ParentCommitteeId,
                    c.Name,
                    c.Slug,
                    c.CategoryTag,
                    c.Status,
                    c.Visibility,
                    c.CreatedAt,
                    ActiveMemberCount = c.Members.Count(m => m.Status == "Active"),
                    PendingRegCount = c.Registrations.Count(r => r.Status == "Pending"),
                    TotalReportsCount = c.Reports.Count(),
                    ReportsThisMonthCount = c.Reports.Count(r => r.CreatedAt >= startOfMonth),
                    CloudDocsCount = c.CloudDocuments.Count()
                })
                .ToListAsync(cancellationToken);

            var totalDistinctMembers = await _db.BcpCommitteeMembers
                .AsNoTracking()
                .Where(m => m.Status == "Active")
                .Select(m => m.UserProfileId)
                .Distinct()
                .CountAsync(cancellationToken);

            var totalMemberships = await _db.BcpCommitteeMembers
                .AsNoTracking()
                .CountAsync(m => m.Status == "Active", cancellationToken);

            var pendingRegistrations = await _db.BcpCommitteeRegistrations
                .AsNoTracking()
                .CountAsync(r => r.Status == "Pending", cancellationToken);

            var totalCloudDocs = await _db.BcpCommitteeCloudDocuments
                .AsNoTracking()
                .CountAsync(cancellationToken);

            var totalForms = await _db.BcpCommitteeForms
                .AsNoTracking()
                .CountAsync(f => f.IsActive, cancellationToken);

            // Attendance & monthly reporting trend over the past 6 months
            var recentReportsRaw = await _db.BcpCommitteeReports
                .AsNoTracking()
                .Where(r => r.MeetingDate >= sixMonthsAgo || r.CreatedAt >= sixMonthsAgo)
                .Select(r => new
                {
                    r.Id,
                    r.CommitteeId,
                    CommitteeName = r.Committee != null ? r.Committee.Name : "",
                    r.Title,
                    r.SubmittedByName,
                    r.MeetingDate,
                    r.PresentCount,
                    r.ExcusedCount,
                    r.AbsentCount,
                    r.ReviewStatus,
                    r.CreatedAt
                })
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync(cancellationToken);

            int totalPresent = recentReportsRaw.Sum(r => r.PresentCount);
            int totalRollCall = recentReportsRaw.Sum(r => r.PresentCount + r.ExcusedCount + r.AbsentCount);
            double avgAttendanceRate = totalRollCall > 0
                ? Math.Round((double)totalPresent / totalRollCall * 100.0, 1)
                : 0.0;

            var monthlySeries = new List<object>();
            for (int i = 5; i >= 0; i--)
            {
                var monthStart = startOfMonth.AddMonths(-i);
                var monthEnd = monthStart.AddMonths(1);
                var inMonth = recentReportsRaw.Where(r => r.CreatedAt >= monthStart && r.CreatedAt < monthEnd).ToList();
                var mRoll = inMonth.Sum(r => r.PresentCount + r.ExcusedCount + r.AbsentCount);
                var mPres = inMonth.Sum(r => r.PresentCount);

                monthlySeries.Add(new
                {
                    MonthLabel = monthStart.ToString("MMM yyyy"),
                    ReportsCount = inMonth.Count,
                    AttendanceRate = mRoll > 0 ? Math.Round((double)mPres / mRoll * 100.0, 1) : 0.0
                });
            }

            var membershipDistribution = committees
                .Where(c => c.Status == "Active")
                .OrderByDescending(c => c.ActiveMemberCount)
                .Take(10)
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    IsSubGroup = c.ParentCommitteeId.HasValue,
                    MemberCount = c.ActiveMemberCount,
                    ReportsCount = c.TotalReportsCount,
                    c.CloudDocsCount
                })
                .ToList();

            var latestRegistrations = await _db.BcpCommitteeRegistrations
                .AsNoTracking()
                .Include(r => r.Committee)
                .OrderByDescending(r => r.SubmittedAt)
                .Take(8)
                .Select(r => new
                {
                    r.Id,
                    r.CommitteeId,
                    CommitteeName = r.Committee != null ? r.Committee.Name : "",
                    FullName = (r.FirstName + " " + r.LastName).Trim(),
                    r.Email,
                    r.IsExternalApplicant,
                    r.Status,
                    r.SubmittedAt
                })
                .ToListAsync(cancellationToken);

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                Aliases = new
                {
                    settings.AliasSingular,
                    settings.AliasPlural,
                    settings.SubGroupAliasSingular,
                    settings.SubGroupAliasPlural,
                    settings.LeaderTitleAlias,
                    settings.SecretaryTitleAlias
                },
                Kpis = new
                {
                    TotalCommittees = committees.Count(c => !c.ParentCommitteeId.HasValue),
                    ActiveCommittees = committees.Count(c => !c.ParentCommitteeId.HasValue && c.Status == "Active"),
                    TotalSubGroups = committees.Count(c => c.ParentCommitteeId.HasValue),
                    DistinctEnrolledMembers = totalDistinctMembers,
                    TotalSeatEnrollments = totalMemberships,
                    PendingRegistrations = pendingRegistrations,
                    ReportsThisMonth = committees.Sum(c => c.ReportsThisMonthCount),
                    TotalReportsAllTime = committees.Sum(c => c.TotalReportsCount),
                    AverageAttendanceRate = avgAttendanceRate,
                    ConnectedCloudDocs = totalCloudDocs,
                    ActiveExtraForms = totalForms
                },
                Charts = new
                {
                    MonthlyTrends = monthlySeries,
                    MembershipDistribution = membershipDistribution,
                    StatusBreakdown = new
                    {
                        Active = committees.Count(c => c.Status == "Active"),
                        Suspended = committees.Count(c => c.Status == "Suspended"),
                        Archived = committees.Count(c => c.Status == "Archived")
                    }
                },
                RecentReports = recentReportsRaw.Take(8),
                RecentRegistrations = latestRegistrations
            }, "Dashboard telemetry loaded."));
        }

        // =====================================================================
        // 3. MANAGE COMMITTEES & SUB-GROUPS (CRUD, HIERARCHY & ROSTER)
        // =====================================================================

        /// <summary>
        /// Lists all committees and nested sub-groups for the Administrator Directory with live counts and leader previews.
        /// </summary>
        /// <param name="search">Optional search filter across name, code, and category tag.</param>
        /// <param name="status">Optional lifecycle status filter ("Active", "Suspended", "Archived").</param>
        /// <param name="cancellationToken">Request cancellation token.</param>
        /// <returns>List of committee summary cards and hierarchy relationships.</returns>
        [HttpGet("manage")]
        public async Task<IActionResult> GetManagedCommittees(
            [FromQuery] string? search = null,
            [FromQuery] string? status = null,
            CancellationToken cancellationToken = default)
        {
            if (!IsCurrentUserConsoleAdmin())
            {
                return StatusCode(StatusCodes.Status403Forbidden,
                    ApiResponse<object>.FailureResponse("Access denied.", errorCode: StandardErrorCodes.AccessDenied));
            }

            var query = _db.BcpCommittees
                .AsNoTracking()
                .Include(c => c.ExtraInfoForm)
                .Include(c => c.ParentCommittee)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(status) && !status.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(c => c.Status == status);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(c =>
                    c.Name.ToLower().Contains(term) ||
                    (c.Code != null && c.Code.ToLower().Contains(term)) ||
                    (c.CategoryTag != null && c.CategoryTag.ToLower().Contains(term)));
            }

            var items = await query
                .OrderBy(c => c.ParentCommitteeId.HasValue)
                .ThenBy(c => c.Name)
                .Select(c => new
                {
                    c.Id,
                    c.ParentCommitteeId,
                    ParentCommitteeName = c.ParentCommittee != null ? c.ParentCommittee.Name : null,
                    c.Name,
                    c.Slug,
                    c.Code,
                    c.CategoryTag,
                    c.Description,
                    c.MissionStatement,
                    c.MeetingSchedule,
                    c.MeetingLocationOrLink,
                    c.CoverBannerUrl,
                    c.IconName,
                    c.Visibility,
                    c.Status,
                    c.MaxCapacity,
                    c.AllowExternalRegistration,
                    c.RequireApproval,
                    c.ExternalInviteToken,
                    c.ExtraInfoFormId,
                    ExtraInfoFormTitle = c.ExtraInfoForm != null ? c.ExtraInfoForm.Title : null,
                    MemberCount = c.Members.Count(m => m.Status == "Active"),
                    SubGroupCount = c.SubGroups.Count(),
                    PendingRegistrationsCount = c.Registrations.Count(r => r.Status == "Pending"),
                    ReportsCount = c.Reports.Count(),
                    CloudDocsCount = c.CloudDocuments.Count(),
                    Leaders = c.Members
                        .Where(m => m.Status == "Active" && (m.Role == "Chairperson" || m.Role == "CoChair" || m.Role == "Secretary" || m.Role == "Coordinator"))
                        .Select(m => new
                        {
                            m.UserProfileId,
                            FullName = m.UserProfile != null ? (m.UserProfile.FirstName + " " + m.UserProfile.LastName).Trim() : "Leader",
                            m.Role,
                            m.CustomRoleTitle
                        })
                        .ToList(),
                    c.CreatedAt,
                    c.UpdatedAt
                })
                .ToListAsync(cancellationToken);

            return Ok(ApiResponse<object>.SuccessResponse(items, "Managed list retrieved."));
        }

        /// <summary>
        /// Retrieves comprehensive 360-degree details for a single committee or sub-group, accessible to Console Admins
        /// and members who belong to (or have visibility of) the committee.
        /// </summary>
        /// <param name="id">Target committee ID.</param>
        /// <param name="cancellationToken">Request cancellation token.</param>
        /// <returns>Detailed committee workspace payload including roster, sub-groups, cloud shelf, and recent reports.</returns>
        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetCommitteeDetails(Guid id, CancellationToken cancellationToken)
        {
            var currentUserId = GetCurrentUserId();
            var isAdmin = IsCurrentUserConsoleAdmin();

            var committee = await _db.BcpCommittees
                .AsNoTracking()
                .Include(c => c.ExtraInfoForm)
                .Include(c => c.ParentCommittee)
                .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

            if (committee == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Requested record not found.", errorCode: StandardErrorCodes.RecordNotFound));
            }

            var members = await _db.BcpCommitteeMembers
                .AsNoTracking()
                .Include(m => m.UserProfile)
                .Where(m => m.CommitteeId == id)
                .OrderBy(m => m.Role == "Chairperson" ? 0 : m.Role == "Secretary" ? 1 : m.Role == "Coordinator" ? 2 : 3)
                .ThenBy(m => m.JoinedAt)
                .ToListAsync(cancellationToken);

            var currentMembership = members.FirstOrDefault(m => m.UserProfileId == currentUserId && m.Status == "Active");
            var isGroupLeader = currentMembership != null && GroupLeaderRoles.Contains(currentMembership.Role);
            var canManageGroup = isAdmin || isGroupLeader;

            if (!isAdmin && currentMembership == null && committee.Visibility == "Private")
            {
                return StatusCode(StatusCodes.Status403Forbidden,
                    ApiResponse<object>.FailureResponse("Access denied.", errorCode: StandardErrorCodes.AccessDenied));
            }

            var subGroups = await _db.BcpCommittees
                .AsNoTracking()
                .Where(s => s.ParentCommitteeId == id)
                .Select(s => new
                {
                    s.Id,
                    s.Name,
                    s.Slug,
                    s.IconName,
                    s.Status,
                    s.Visibility,
                    s.MeetingSchedule,
                    MemberCount = s.Members.Count(m => m.Status == "Active")
                })
                .ToListAsync(cancellationToken);

            var reportsQuery = _db.BcpCommitteeReports
                .AsNoTracking()
                .Where(r => r.CommitteeId == id);

            if (!canManageGroup)
            {
                reportsQuery = reportsQuery.Where(r => r.IsSharedWithMembers || r.SubmittedByUserId == currentUserId);
            }

            var reports = await reportsQuery
                .OrderByDescending(r => r.MeetingDate)
                .Take(30)
                .ToListAsync(cancellationToken);

            var cloudShelf = await _db.BcpCommitteeCloudDocuments
                .AsNoTracking()
                .Where(d => d.CommitteeId == id)
                .OrderByDescending(d => d.IsPinnedToShelf)
                .ThenByDescending(d => d.CreatedAt)
                .ToListAsync(cancellationToken);

            var pendingRegistrations = canManageGroup
                ? await _db.BcpCommitteeRegistrations
                    .AsNoTracking()
                    .Where(r => r.CommitteeId == id && r.Status == "Pending")
                    .OrderByDescending(r => r.SubmittedAt)
                    .ToListAsync(cancellationToken)
                : new List<BcpCommitteeRegistration>();

            var settings = await GetOrCreateSettingsAsync(cancellationToken);

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                Committee = new
                {
                    committee.Id,
                    committee.ParentCommitteeId,
                    ParentCommitteeName = committee.ParentCommittee?.Name,
                    committee.Name,
                    committee.Slug,
                    committee.Code,
                    committee.CategoryTag,
                    committee.Description,
                    committee.MissionStatement,
                    committee.MeetingSchedule,
                    committee.MeetingLocationOrLink,
                    committee.CoverBannerUrl,
                    committee.IconName,
                    committee.Visibility,
                    committee.Status,
                    committee.MaxCapacity,
                    committee.AllowExternalRegistration,
                    committee.RequireApproval,
                    committee.ExternalInviteToken,
                    committee.ExtraInfoFormId,
                    ExtraInfoFormTitle = committee.ExtraInfoForm?.Title,
                    ExtraInfoFormFields = committee.ExtraInfoForm != null
                        ? ParseJsonOrDefault<List<CommitteeFormFieldDto>>(committee.ExtraInfoForm.FieldsSchemaJson, new List<CommitteeFormFieldDto>())
                        : new List<CommitteeFormFieldDto>(),
                    committee.CreatedAt,
                    committee.UpdatedAt
                },
                CurrentUserAccess = new
                {
                    IsEnrolled = currentMembership != null,
                    MemberRole = currentMembership?.Role,
                    IsConsoleAdmin = isAdmin,
                    IsGroupLeader = isGroupLeader,
                    CanManageGroup = canManageGroup,
                    CanSubmitReport = canManageGroup || (currentMembership != null && settings.AllowAnyMemberReportSubmission)
                },
                Members = members.Select(m => new
                {
                    m.Id,
                    m.UserProfileId,
                    FullName = m.UserProfile != null ? $"{m.UserProfile.FirstName} {m.UserProfile.LastName}".Trim() : "Member",
                    Email = canManageGroup ? m.UserProfile?.Email : null,
                    PhoneNumber = canManageGroup ? m.UserProfile?.PhoneNumber : null,
                    AvatarUrl = m.UserProfile?.AvatarUrl,
                    Designation = m.UserProfile?.Designation,
                    m.Role,
                    m.CustomRoleTitle,
                    m.Status,
                    ExtraInfoResponses = canManageGroup
                        ? ParseJsonOrDefault<Dictionary<string, object>>(m.ExtraInfoResponsesJson, new Dictionary<string, object>())
                        : null,
                    m.JoinedAt
                }),
                SubGroups = subGroups,
                Reports = reports.Select(MapReportSummary),
                CloudDocuments = cloudShelf,
                PendingRegistrations = pendingRegistrations,
                TenantKey = ResolveCurrentTenantKey()
            }, "Details retrieved."));
        }

        /// <summary>
        /// Creates a new Committee or nested Sub-Group with a unique URL-safe slug for external registration.
        /// </summary>
        /// <param name="dto">Creation payload.</param>
        /// <param name="cancellationToken">Request cancellation token.</param>
        /// <returns>Newly created committee entity.</returns>
        [HttpPost]
        public async Task<IActionResult> CreateCommittee([FromBody] UpsertCommitteeDto dto, CancellationToken cancellationToken)
        {
            if (!IsCurrentUserConsoleAdmin())
            {
                return StatusCode(StatusCodes.Status403Forbidden,
                    ApiResponse<object>.FailureResponse("Access denied.", errorCode: StandardErrorCodes.AccessDenied));
            }

            if (dto == null || string.IsNullOrWhiteSpace(dto.Name))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Required information is missing.", errorCode: StandardErrorCodes.RequiredFieldMissing));
            }

            var baseSlug = GenerateSlug(!string.IsNullOrWhiteSpace(dto.Slug) ? dto.Slug : dto.Name);
            var uniqueSlug = await EnsureUniqueSlugAsync(baseSlug, null, cancellationToken);

            var entity = new BcpCommittee
            {
                Id = Guid.CreateVersion7(),
                ParentCommitteeId = dto.ParentCommitteeId,
                Name = dto.Name.Trim(),
                Slug = uniqueSlug,
                Code = dto.Code?.Trim(),
                CategoryTag = dto.CategoryTag?.Trim(),
                Description = dto.Description?.Trim(),
                MissionStatement = dto.MissionStatement?.Trim(),
                MeetingSchedule = dto.MeetingSchedule?.Trim(),
                MeetingLocationOrLink = dto.MeetingLocationOrLink?.Trim(),
                CoverBannerUrl = dto.CoverBannerUrl?.Trim(),
                IconName = string.IsNullOrWhiteSpace(dto.IconName) ? "diversity_3" : dto.IconName.Trim(),
                Visibility = NormalizeVisibility(dto.Visibility),
                Status = string.IsNullOrWhiteSpace(dto.Status) ? "Active" : dto.Status.Trim(),
                MaxCapacity = dto.MaxCapacity > 0 ? dto.MaxCapacity : null,
                AllowExternalRegistration = dto.AllowExternalRegistration,
                RequireApproval = dto.RequireApproval || string.Equals(dto.Visibility, "ApprovalRequired", StringComparison.OrdinalIgnoreCase),
                ExternalInviteToken = Guid.NewGuid().ToString("N")[..12],
                ExtraInfoFormId = dto.ExtraInfoFormId,
                CreatedByUserId = GetCurrentUserId(),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _db.BcpCommittees.Add(entity);
            await _db.SaveChangesAsync(cancellationToken);

            if (_activityLogger != null)
            {
                await _activityLogger.LogAsync("CREATE_COMMITTEE", $"Created {entity.Name} ({entity.Slug}).", "Committees");
            }

            return Ok(ApiResponse<object>.SuccessResponse(new { entity.Id, entity.Name, entity.Slug, entity.ExternalInviteToken }, "Created successfully."));
        }

        /// <summary>
        /// Updates an existing Committee or Sub-Group's metadata, visibility, schedule, and linked Extra-Info Form.
        /// </summary>
        /// <param name="id">Target committee ID.</param>
        /// <param name="dto">Updated payload.</param>
        /// <param name="cancellationToken">Request cancellation token.</param>
        /// <returns>Updated committee summary.</returns>
        [HttpPut("{id:guid}")]
        public async Task<IActionResult> UpdateCommittee(Guid id, [FromBody] UpsertCommitteeDto dto, CancellationToken cancellationToken)
        {
            var entity = await _db.BcpCommittees.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
            if (entity == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Requested record not found.", errorCode: StandardErrorCodes.RecordNotFound));
            }

            if (!await CanCurrentUserManageCommitteeAsync(id, cancellationToken))
            {
                return StatusCode(StatusCodes.Status403Forbidden,
                    ApiResponse<object>.FailureResponse("Access denied.", errorCode: StandardErrorCodes.AccessDenied));
            }

            if (dto == null || string.IsNullOrWhiteSpace(dto.Name))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Required information is missing.", errorCode: StandardErrorCodes.RequiredFieldMissing));
            }

            if (dto.ParentCommitteeId == id)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("A group cannot be assigned as its own parent.", errorCode: StandardErrorCodes.InvalidRequestData));
            }

            if (!string.IsNullOrWhiteSpace(dto.Slug))
            {
                entity.Slug = await EnsureUniqueSlugAsync(GenerateSlug(dto.Slug), id, cancellationToken);
            }

            entity.ParentCommitteeId = dto.ParentCommitteeId;
            entity.Name = dto.Name.Trim();
            entity.Code = dto.Code?.Trim();
            entity.CategoryTag = dto.CategoryTag?.Trim();
            entity.Description = dto.Description?.Trim();
            entity.MissionStatement = dto.MissionStatement?.Trim();
            entity.MeetingSchedule = dto.MeetingSchedule?.Trim();
            entity.MeetingLocationOrLink = dto.MeetingLocationOrLink?.Trim();
            entity.CoverBannerUrl = dto.CoverBannerUrl?.Trim();
            entity.IconName = string.IsNullOrWhiteSpace(dto.IconName) ? "diversity_3" : dto.IconName.Trim();
            entity.Visibility = NormalizeVisibility(dto.Visibility);
            if (!string.IsNullOrWhiteSpace(dto.Status))
            {
                entity.Status = dto.Status.Trim();
            }
            entity.MaxCapacity = dto.MaxCapacity > 0 ? dto.MaxCapacity : null;
            entity.AllowExternalRegistration = dto.AllowExternalRegistration;
            entity.RequireApproval = dto.RequireApproval || entity.Visibility == "ApprovalRequired";
            entity.ExtraInfoFormId = dto.ExtraInfoFormId;
            entity.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync(cancellationToken);

            return Ok(ApiResponse<object>.SuccessResponse(new { entity.Id, entity.Name, entity.Slug }, "Updated successfully."));
        }

        /// <summary>
        /// Regenerates the external invite security token for a committee link.
        /// </summary>
        /// <param name="id">Target committee ID.</param>
        /// <param name="cancellationToken">Request cancellation token.</param>
        /// <returns>New invite token and slug.</returns>
        [HttpPost("{id:guid}/regenerate-link")]
        public async Task<IActionResult> RegenerateExternalLink(Guid id, CancellationToken cancellationToken)
        {
            if (!await CanCurrentUserManageCommitteeAsync(id, cancellationToken))
            {
                return StatusCode(StatusCodes.Status403Forbidden,
                    ApiResponse<object>.FailureResponse("Access denied.", errorCode: StandardErrorCodes.AccessDenied));
            }

            var entity = await _db.BcpCommittees.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
            if (entity == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Requested record not found.", errorCode: StandardErrorCodes.RecordNotFound));
            }

            entity.ExternalInviteToken = Guid.NewGuid().ToString("N")[..12];
            entity.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);

            return Ok(ApiResponse<object>.SuccessResponse(new { entity.Id, entity.Slug, entity.ExternalInviteToken }, "External invite token regenerated."));
        }

        /// <summary>
        /// Deletes a committee or sub-group along with its child memberships, registrations, and unpinned items
        /// when no nested sub-groups remain attached.
        /// </summary>
        /// <param name="id">Target committee ID.</param>
        /// <param name="cancellationToken">Request cancellation token.</param>
        /// <returns>Deletion confirmation.</returns>
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> DeleteCommittee(Guid id, CancellationToken cancellationToken)
        {
            if (!IsCurrentUserConsoleAdmin())
            {
                return StatusCode(StatusCodes.Status403Forbidden,
                    ApiResponse<object>.FailureResponse("Access denied.", errorCode: StandardErrorCodes.AccessDenied));
            }

            var entity = await _db.BcpCommittees.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
            if (entity == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Requested record not found.", errorCode: StandardErrorCodes.RecordNotFound));
            }

            var hasSubGroups = await _db.BcpCommittees.AnyAsync(s => s.ParentCommitteeId == id, cancellationToken);
            if (hasSubGroups)
            {
                return BadRequest(ApiResponse<object>.FailureResponse(
                    "Remove or reassign nested sub-groups before deleting this record.",
                    errorCode: StandardErrorCodes.InvalidOperationState));
            }

            var members = await _db.BcpCommitteeMembers.Where(m => m.CommitteeId == id).ToListAsync(cancellationToken);
            var regs = await _db.BcpCommitteeRegistrations.Where(r => r.CommitteeId == id).ToListAsync(cancellationToken);
            var reports = await _db.BcpCommitteeReports.Where(r => r.CommitteeId == id).ToListAsync(cancellationToken);
            var docs = await _db.BcpCommitteeCloudDocuments.Where(d => d.CommitteeId == id).ToListAsync(cancellationToken);

            foreach (var d in docs) d.CommitteeId = null;
            _db.BcpCommitteeMembers.RemoveRange(members);
            _db.BcpCommitteeRegistrations.RemoveRange(regs);
            _db.BcpCommitteeReports.RemoveRange(reports);
            _db.BcpCommittees.Remove(entity);

            await _db.SaveChangesAsync(cancellationToken);

            return Ok(ApiResponse.SuccessResponse("Deleted successfully."));
        }

        // =====================================================================
        // 4. ROSTER & DELEGATED LEADERSHIP MICRO-ROLES
        // =====================================================================

        /// <summary>
        /// Searches active workspace users so an administrator or leader can add them directly to a committee roster.
        /// Strictly excludes root SuperAdmin accounts and optionally excludes members already in the target committee.
        /// </summary>
        /// <param name="search">Name or email search query.</param>
        /// <param name="committeeId">Optional target committee ID to exclude existing roster members.</param>
        /// <param name="cancellationToken">Request cancellation token.</param>
        /// <returns>Matching user directory candidates.</returns>
        [HttpGet("candidates")]
        public async Task<IActionResult> SearchWorkspaceUserCandidates(
            [FromQuery] string? search = null,
            [FromQuery] Guid? committeeId = null,
            CancellationToken cancellationToken = default)
        {
            // 1. Strictly exclude root SuperAdmin accounts from roster candidate selections
            var superAdminRole = await _db.Roles.AsNoTracking()
                .FirstOrDefaultAsync(r => r.Name == "SuperAdmin" || r.NormalizedName == "SUPERADMIN", cancellationToken);
            var superAdminUserIds = superAdminRole != null
                ? await _db.UserRoles.AsNoTracking().Where(ur => ur.RoleId == superAdminRole.Id).Select(ur => ur.UserId).ToListAsync(cancellationToken)
                : new List<string>();

            // Exclude Tenant Root Administrator Email from Master Catalog
            string? tenantAdminEmail = null;
            if (_masterCatalogDbContext != null)
            {
                var tenantKey = ResolveCurrentTenantKey();
                if (!string.IsNullOrEmpty(tenantKey))
                {
                    tenantAdminEmail = await _masterCatalogDbContext.MasterTenantCatalogs
                        .AsNoTracking()
                        .Where(t => t.TenantKey == tenantKey)
                        .Select(t => t.AdminEmail)
                        .FirstOrDefaultAsync(cancellationToken);
                }
            }

            var query = _db.Users.AsNoTracking()
                .Where(u => !superAdminUserIds.Contains(u.Id) && u.UserStatus != UserStatus.Deleted && u.UserStatus != UserStatus.Suspended)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(tenantAdminEmail))
            {
                var cleanAdminEmail = tenantAdminEmail.Trim().ToLower();
                query = query.Where(u => u.Email == null || u.Email.ToLower() != cleanAdminEmail);
            }

            query = query.Where(u => u.Email == null || !u.Email.ToLower().Contains("superadmin"));

            // 2. Exclude users who are already enrolled in this committee roster
            if (committeeId.HasValue && committeeId.Value != Guid.Empty)
            {
                var existingMemberUserIds = await _db.BcpCommitteeMembers.AsNoTracking()
                    .Where(m => m.CommitteeId == committeeId.Value)
                    .Select(m => m.UserProfileId)
                    .ToListAsync(cancellationToken);

                if (existingMemberUserIds.Count > 0)
                {
                    query = query.Where(u => !existingMemberUserIds.Contains(u.Id));
                }
            }

            // 3. Search query filter across first name, last name, email, and designation
            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(u =>
                    (u.FirstName != null && u.FirstName.ToLower().Contains(term)) ||
                    (u.LastName != null && u.LastName.ToLower().Contains(term)) ||
                    (u.Email != null && u.Email.ToLower().Contains(term)) ||
                    (u.Designation != null && u.Designation.ToLower().Contains(term)));
            }

            var users = await query
                .OrderBy(u => u.FirstName)
                .ThenBy(u => u.LastName)
                .Take(50)
                .Select(u => new
                {
                    u.Id,
                    FullName = (u.FirstName + " " + u.LastName).Trim(),
                    u.Email,
                    u.PhoneNumber,
                    u.Designation,
                    u.AvatarUrl
                })
                .ToListAsync(cancellationToken);

            return Ok(ApiResponse<object>.SuccessResponse(users, "Candidates retrieved."));
        }

        /// <summary>
        /// Enrolls a workspace user into a committee with an optional delegated role ("Chairperson", "Secretary", "Coordinator", "Member")
        /// and dispatches a real-time notification via <see cref="ICentralNotificationDispatcher"/>.
        /// </summary>
        /// <param name="id">Target committee ID.</param>
        /// <param name="dto">Member assignment payload.</param>
        /// <param name="cancellationToken">Request cancellation token.</param>
        /// <returns>Created or updated membership record.</returns>
        [HttpPost("{id:guid}/members")]
        public async Task<IActionResult> AddMemberToCommittee(Guid id, [FromBody] AddCommitteeMemberDto dto, CancellationToken cancellationToken)
        {
            if (!await CanCurrentUserManageCommitteeAsync(id, cancellationToken))
            {
                return StatusCode(StatusCodes.Status403Forbidden,
                    ApiResponse<object>.FailureResponse("Access denied.", errorCode: StandardErrorCodes.AccessDenied));
            }

            if (dto == null || string.IsNullOrWhiteSpace(dto.UserProfileId))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Required information is missing.", errorCode: StandardErrorCodes.RequiredFieldMissing));
            }

            var committee = await _db.BcpCommittees.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == dto.UserProfileId, cancellationToken);
            if (committee == null || user == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Requested record not found.", errorCode: StandardErrorCodes.RecordNotFound));
            }

            var existing = await _db.BcpCommitteeMembers
                .FirstOrDefaultAsync(m => m.CommitteeId == id && m.UserProfileId == dto.UserProfileId, cancellationToken);

            var role = string.IsNullOrWhiteSpace(dto.Role) ? "Member" : dto.Role.Trim();

            if (existing != null)
            {
                existing.Role = role;
                existing.CustomRoleTitle = dto.CustomRoleTitle?.Trim();
                existing.Status = "Active";
            }
            else
            {
                existing = new BcpCommitteeMember
                {
                    Id = Guid.CreateVersion7(),
                    CommitteeId = id,
                    UserProfileId = dto.UserProfileId,
                    Role = role,
                    CustomRoleTitle = dto.CustomRoleTitle?.Trim(),
                    Status = "Active",
                    AddedByUserId = GetCurrentUserId(),
                    JoinedAt = DateTime.UtcNow
                };
                _db.BcpCommitteeMembers.Add(existing);
            }

            await _db.SaveChangesAsync(cancellationToken);

            var settings = await GetOrCreateSettingsAsync(cancellationToken);
            await DispatchMemberNotificationAsync(
                user,
                $"Added to {committee.Name}",
                $"You have been added to {committee.Name} ({settings.AliasSingular}) as {FormatRoleDisplay(role, settings)}.",
                $"/committees/workspace/view/{committee.Id}",
                NotificationSeverity.Success,
                cancellationToken);

            return Ok(ApiResponse<object>.SuccessResponse(new { existing.Id, existing.Role, existing.Status }, "Member enrolled successfully."));
        }

        /// <summary>
        /// Updates an existing committee member's micro-role, custom title, or membership status.
        /// </summary>
        /// <param name="id">Committee ID.</param>
        /// <param name="memberId">Membership record ID.</param>
        /// <param name="dto">Role/status update payload.</param>
        /// <param name="cancellationToken">Request cancellation token.</param>
        /// <returns>Updated membership status.</returns>
        [HttpPut("{id:guid}/members/{memberId:guid}")]
        public async Task<IActionResult> UpdateCommitteeMember(Guid id, Guid memberId, [FromBody] UpdateCommitteeMemberDto dto, CancellationToken cancellationToken)
        {
            if (!await CanCurrentUserManageCommitteeAsync(id, cancellationToken))
            {
                return StatusCode(StatusCodes.Status403Forbidden,
                    ApiResponse<object>.FailureResponse("Access denied.", errorCode: StandardErrorCodes.AccessDenied));
            }

            var member = await _db.BcpCommitteeMembers
                .Include(m => m.UserProfile)
                .Include(m => m.Committee)
                .FirstOrDefaultAsync(m => m.Id == memberId && m.CommitteeId == id, cancellationToken);

            if (member == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Requested record not found.", errorCode: StandardErrorCodes.RecordNotFound));
            }

            var oldRole = member.Role;
            if (!string.IsNullOrWhiteSpace(dto.Role)) member.Role = dto.Role.Trim();
            member.CustomRoleTitle = dto.CustomRoleTitle?.Trim();
            if (!string.IsNullOrWhiteSpace(dto.Status)) member.Status = dto.Status.Trim();

            await _db.SaveChangesAsync(cancellationToken);

            if (member.UserProfile != null && member.Committee != null && !string.Equals(oldRole, member.Role, StringComparison.OrdinalIgnoreCase))
            {
                var settings = await GetOrCreateSettingsAsync(cancellationToken);
                await DispatchMemberNotificationAsync(
                    member.UserProfile,
                    $"Role Updated in {member.Committee.Name}",
                    $"Your role in {member.Committee.Name} is now {FormatRoleDisplay(member.Role, settings)}.",
                    $"/committees/workspace/view/{member.CommitteeId}",
                    NotificationSeverity.Update,
                    cancellationToken);
            }

            return Ok(ApiResponse<object>.SuccessResponse(new { member.Id, member.Role, member.CustomRoleTitle, member.Status }, "Member updated."));
        }

        /// <summary>
        /// Removes a member from a committee roster.
        /// </summary>
        /// <param name="id">Committee ID.</param>
        /// <param name="memberId">Membership record ID.</param>
        /// <param name="cancellationToken">Request cancellation token.</param>
        /// <returns>Removal confirmation.</returns>
        [HttpDelete("{id:guid}/members/{memberId:guid}")]
        public async Task<IActionResult> RemoveCommitteeMember(Guid id, Guid memberId, CancellationToken cancellationToken)
        {
            if (!await CanCurrentUserManageCommitteeAsync(id, cancellationToken))
            {
                return StatusCode(StatusCodes.Status403Forbidden,
                    ApiResponse<object>.FailureResponse("Access denied.", errorCode: StandardErrorCodes.AccessDenied));
            }

            var member = await _db.BcpCommitteeMembers.FirstOrDefaultAsync(m => m.Id == memberId && m.CommitteeId == id, cancellationToken);
            if (member == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Requested record not found.", errorCode: StandardErrorCodes.RecordNotFound));
            }

            _db.BcpCommitteeMembers.Remove(member);
            await _db.SaveChangesAsync(cancellationToken);

            return Ok(ApiResponse.SuccessResponse("Member removed from roster."));
        }

        // =====================================================================
        // 5. MODULE-INDEPENDENT EXTRA-INFO FORM BUILDER
        // =====================================================================

        /// <summary>
        /// Lists all supplemental Extra-Info forms created inside <c>bcp-committees</c>.
        /// </summary>
        /// <param name="cancellationToken">Request cancellation token.</param>
        /// <returns>List of supplemental forms and usage counts.</returns>
        [HttpGet("forms")]
        public async Task<IActionResult> GetExtraInfoForms(CancellationToken cancellationToken)
        {
            var forms = await _db.BcpCommitteeForms
                .AsNoTracking()
                .OrderByDescending(f => f.IsGlobalDefault)
                .ThenByDescending(f => f.UpdatedAt)
                .ToListAsync(cancellationToken);

            var usageMap = await _db.BcpCommittees
                .AsNoTracking()
                .Where(c => c.ExtraInfoFormId.HasValue)
                .GroupBy(c => c.ExtraInfoFormId!.Value)
                .Select(g => new { FormId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.FormId, x => x.Count, cancellationToken);

            var data = forms.Select(f => new
            {
                f.Id,
                f.Title,
                f.Description,
                f.IsGlobalDefault,
                f.IsActive,
                Fields = ParseJsonOrDefault<List<CommitteeFormFieldDto>>(f.FieldsSchemaJson, new List<CommitteeFormFieldDto>()),
                AttachedCommitteesCount = usageMap.TryGetValue(f.Id, out var cnt) ? cnt : 0,
                f.CreatedAt,
                f.UpdatedAt
            });

            return Ok(ApiResponse<object>.SuccessResponse(data, "Extra-Info forms retrieved."));
        }

        /// <summary>
        /// Creates a new supplemental Extra-Info form capturing committee-specific fields beyond core identity.
        /// </summary>
        /// <param name="dto">Form definition payload.</param>
        /// <param name="cancellationToken">Request cancellation token.</param>
        /// <returns>Created form summary.</returns>
        [HttpPost("forms")]
        public async Task<IActionResult> CreateExtraInfoForm([FromBody] UpsertCommitteeFormDto dto, CancellationToken cancellationToken)
        {
            if (!IsCurrentUserConsoleAdmin())
            {
                return StatusCode(StatusCodes.Status403Forbidden,
                    ApiResponse<object>.FailureResponse("Access denied.", errorCode: StandardErrorCodes.AccessDenied));
            }

            if (dto == null || string.IsNullOrWhiteSpace(dto.Title))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Required information is missing.", errorCode: StandardErrorCodes.RequiredFieldMissing));
            }

            if (dto.IsGlobalDefault)
            {
                var previousDefaults = await _db.BcpCommitteeForms.Where(f => f.IsGlobalDefault).ToListAsync(cancellationToken);
                foreach (var p in previousDefaults) p.IsGlobalDefault = false;
            }

            var entity = new BcpCommitteeForm
            {
                Id = Guid.CreateVersion7(),
                Title = dto.Title.Trim(),
                Description = dto.Description?.Trim(),
                IsGlobalDefault = dto.IsGlobalDefault,
                IsActive = dto.IsActive,
                FieldsSchemaJson = JsonSerializer.Serialize(dto.Fields ?? new List<CommitteeFormFieldDto>()),
                CreatedByUserId = GetCurrentUserId(),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _db.BcpCommitteeForms.Add(entity);
            await _db.SaveChangesAsync(cancellationToken);

            return Ok(ApiResponse<object>.SuccessResponse(new { entity.Id, entity.Title, entity.IsGlobalDefault }, "Form created."));
        }

        /// <summary>
        /// Updates an existing supplemental Extra-Info form schema.
        /// </summary>
        /// <param name="formId">Target form ID.</param>
        /// <param name="dto">Updated form definition.</param>
        /// <param name="cancellationToken">Request cancellation token.</param>
        /// <returns>Updated form summary.</returns>
        [HttpPut("forms/{formId:guid}")]
        public async Task<IActionResult> UpdateExtraInfoForm(Guid formId, [FromBody] UpsertCommitteeFormDto dto, CancellationToken cancellationToken)
        {
            if (!IsCurrentUserConsoleAdmin())
            {
                return StatusCode(StatusCodes.Status403Forbidden,
                    ApiResponse<object>.FailureResponse("Access denied.", errorCode: StandardErrorCodes.AccessDenied));
            }

            var entity = await _db.BcpCommitteeForms.FirstOrDefaultAsync(f => f.Id == formId, cancellationToken);
            if (entity == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Requested record not found.", errorCode: StandardErrorCodes.RecordNotFound));
            }

            if (dto.IsGlobalDefault && !entity.IsGlobalDefault)
            {
                var previousDefaults = await _db.BcpCommitteeForms.Where(f => f.IsGlobalDefault && f.Id != formId).ToListAsync(cancellationToken);
                foreach (var p in previousDefaults) p.IsGlobalDefault = false;
            }

            entity.Title = !string.IsNullOrWhiteSpace(dto.Title) ? dto.Title.Trim() : entity.Title;
            entity.Description = dto.Description?.Trim();
            entity.IsGlobalDefault = dto.IsGlobalDefault;
            entity.IsActive = dto.IsActive;
            entity.FieldsSchemaJson = JsonSerializer.Serialize(dto.Fields ?? new List<CommitteeFormFieldDto>());
            entity.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync(cancellationToken);
            return Ok(ApiResponse<object>.SuccessResponse(new { entity.Id, entity.Title }, "Form updated."));
        }

        /// <summary>
        /// Deletes an Extra-Info form and cleanly detaches it from any linked committees.
        /// </summary>
        /// <param name="formId">Form ID to delete.</param>
        /// <param name="cancellationToken">Request cancellation token.</param>
        /// <returns>Deletion confirmation.</returns>
        [HttpDelete("forms/{formId:guid}")]
        public async Task<IActionResult> DeleteExtraInfoForm(Guid formId, CancellationToken cancellationToken)
        {
            if (!IsCurrentUserConsoleAdmin())
            {
                return StatusCode(StatusCodes.Status403Forbidden,
                    ApiResponse<object>.FailureResponse("Access denied.", errorCode: StandardErrorCodes.AccessDenied));
            }

            var entity = await _db.BcpCommitteeForms.FirstOrDefaultAsync(f => f.Id == formId, cancellationToken);
            if (entity == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Requested record not found.", errorCode: StandardErrorCodes.RecordNotFound));
            }

            var attached = await _db.BcpCommittees.Where(c => c.ExtraInfoFormId == formId).ToListAsync(cancellationToken);
            foreach (var c in attached) c.ExtraInfoFormId = null;

            _db.BcpCommitteeForms.Remove(entity);
            await _db.SaveChangesAsync(cancellationToken);

            return Ok(ApiResponse.SuccessResponse("Form deleted."));
        }

        // =====================================================================
        // 6. REGISTRATIONS & APPLICANT INTAKE QUEUE (INTERNAL + EXTERNAL)
        // =====================================================================

        /// <summary>
        /// Lists join applications across committees (or scoped to committees led by the current user).
        /// </summary>
        /// <param name="committeeId">Optional committee filter.</param>
        /// <param name="status">Optional status filter ("Pending", "Approved", "Declined").</param>
        /// <param name="cancellationToken">Request cancellation token.</param>
        /// <returns>List of applicant intake records with parsed Extra-Info answers.</returns>
        [HttpGet("registrations")]
        public async Task<IActionResult> GetRegistrations(
            [FromQuery] Guid? committeeId = null,
            [FromQuery] string? status = null,
            CancellationToken cancellationToken = default)
        {
            var isAdmin = IsCurrentUserConsoleAdmin();
            var currentUserId = GetCurrentUserId();

            var query = _db.BcpCommitteeRegistrations
                .AsNoTracking()
                .Include(r => r.Committee)
                .AsQueryable();

            if (!isAdmin)
            {
                var ledIds = await _db.BcpCommitteeMembers
                    .AsNoTracking()
                    .Where(m => m.UserProfileId == currentUserId && m.Status == "Active" && GroupLeaderRoles.Contains(m.Role))
                    .Select(m => m.CommitteeId)
                    .ToListAsync(cancellationToken);

                if (ledIds.Count == 0)
                {
                    return StatusCode(StatusCodes.Status403Forbidden,
                        ApiResponse<object>.FailureResponse("Access denied.", errorCode: StandardErrorCodes.AccessDenied));
                }

                query = query.Where(r => ledIds.Contains(r.CommitteeId));
            }

            if (committeeId.HasValue)
            {
                query = query.Where(r => r.CommitteeId == committeeId.Value);
            }

            if (!string.IsNullOrWhiteSpace(status) && !status.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(r => r.Status == status);
            }

            var list = await query
                .OrderByDescending(r => r.SubmittedAt)
                .Take(200)
                .ToListAsync(cancellationToken);

            var data = list.Select(r => new
            {
                r.Id,
                r.CommitteeId,
                CommitteeName = r.Committee?.Name ?? "",
                r.ApplicantUserProfileId,
                r.IsExternalApplicant,
                r.FirstName,
                r.LastName,
                FullName = $"{r.FirstName} {r.LastName}".Trim(),
                r.Email,
                r.PhoneNumber,
                ExtraInfoResponses = ParseJsonOrDefault<Dictionary<string, object>>(r.ExtraInfoResponsesJson, new Dictionary<string, object>()),
                AttachmentUrls = ParseJsonOrDefault<List<string>>(r.AttachmentUrlsJson, new List<string>()),
                r.Status,
                r.ReviewNotes,
                r.ReviewedAt,
                r.SubmittedAt
            });

            return Ok(ApiResponse<object>.SuccessResponse(data, "Registrations retrieved."));
        }

        /// <summary>
        /// Approves, reassigns, or declines an internal or external committee applicant.
        /// Automatically links or provisions a workspace <see cref="Profile"/> when approved and dispatches notifications.
        /// </summary>
        /// <param name="regId">Registration application ID.</param>
        /// <param name="dto">Decision payload ("Approve", "Reassign", "Decline").</param>
        /// <param name="cancellationToken">Request cancellation token.</param>
        /// <returns>Updated registration status.</returns>
        [HttpPost("registrations/{regId:guid}/review")]
        public async Task<IActionResult> ReviewRegistration(Guid regId, [FromBody] ReviewRegistrationDto dto, CancellationToken cancellationToken)
        {
            var reg = await _db.BcpCommitteeRegistrations
                .Include(r => r.Committee)
                .FirstOrDefaultAsync(r => r.Id == regId, cancellationToken);

            if (reg == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Requested record not found.", errorCode: StandardErrorCodes.RecordNotFound));
            }

            if (!await CanCurrentUserManageCommitteeAsync(reg.CommitteeId, cancellationToken))
            {
                return StatusCode(StatusCodes.Status403Forbidden,
                    ApiResponse<object>.FailureResponse("Access denied.", errorCode: StandardErrorCodes.AccessDenied));
            }

            var decision = (dto?.Decision ?? "Approve").Trim();
            var targetCommitteeId = (decision.Equals("Reassign", StringComparison.OrdinalIgnoreCase) && dto?.ReassignCommitteeId.HasValue == true)
                ? dto.ReassignCommitteeId.Value
                : reg.CommitteeId;

            var targetCommittee = await _db.BcpCommittees.FirstOrDefaultAsync(c => c.Id == targetCommitteeId, cancellationToken);
            if (targetCommittee == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Target group could not be found.", errorCode: StandardErrorCodes.RecordNotFound));
            }

            var settings = await GetOrCreateSettingsAsync(cancellationToken);

            if (decision.Equals("Decline", StringComparison.OrdinalIgnoreCase))
            {
                reg.Status = "Declined";
                reg.ReviewNotes = dto?.ReviewNotes?.Trim();
                reg.ReviewedByUserId = GetCurrentUserId();
                reg.ReviewedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync(cancellationToken);

                if (!string.IsNullOrWhiteSpace(reg.ApplicantUserProfileId))
                {
                    var existingUser = await _db.Users.FirstOrDefaultAsync(u => u.Id == reg.ApplicantUserProfileId, cancellationToken);
                    if (existingUser != null)
                    {
                        await DispatchMemberNotificationAsync(
                            existingUser,
                            $"Update on {targetCommittee.Name} Request",
                            $"Your request to join {targetCommittee.Name} was reviewed. {(string.IsNullOrWhiteSpace(reg.ReviewNotes) ? "" : "Note: " + reg.ReviewNotes)}",
                            "/committees/workspace/discover",
                            NotificationSeverity.Failed,
                            cancellationToken);
                    }
                }

                return Ok(ApiResponse<object>.SuccessResponse(new { reg.Id, reg.Status }, "Application declined."));
            }

            // Approve or Reassign -> Resolve or provision user profile
            Profile? memberProfile = null;
            if (!string.IsNullOrWhiteSpace(reg.ApplicantUserProfileId))
            {
                memberProfile = await _db.Users.FirstOrDefaultAsync(u => u.Id == reg.ApplicantUserProfileId, cancellationToken);
            }
            if (memberProfile == null && !string.IsNullOrWhiteSpace(reg.Email))
            {
                var normalizedEmail = reg.Email.Trim().ToLowerInvariant();
                memberProfile = await _db.Users.FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == normalizedEmail, cancellationToken);
            }

            if (memberProfile == null && settings.AutoProvisionMemberOnApprove && _userManager != null)
            {
                memberProfile = new Profile
                {
                    Id = Guid.NewGuid().ToString(),
                    UserName = reg.Email.Trim(),
                    Email = reg.Email.Trim(),
                    EmailConfirmed = true,
                    FirstName = reg.FirstName.Trim(),
                    LastName = reg.LastName.Trim(),
                    PhoneNumber = reg.PhoneNumber?.Trim(),
                    UserStatus = UserStatus.Active
                };

                var tempPassword = $"Oz!{Guid.NewGuid():N}"[..14] + "9aA!";
                var createResult = await _userManager.CreateAsync(memberProfile, tempPassword);
                if (!createResult.Succeeded)
                {
                    memberProfile = null;
                }
            }

            if (memberProfile != null)
            {
                reg.ApplicantUserProfileId = memberProfile.Id;
                var existingMember = await _db.BcpCommitteeMembers
                    .FirstOrDefaultAsync(m => m.CommitteeId == targetCommitteeId && m.UserProfileId == memberProfile.Id, cancellationToken);

                if (existingMember == null)
                {
                    _db.BcpCommitteeMembers.Add(new BcpCommitteeMember
                    {
                        Id = Guid.CreateVersion7(),
                        CommitteeId = targetCommitteeId,
                        UserProfileId = memberProfile.Id,
                        Role = string.IsNullOrWhiteSpace(dto?.AssignedRole) ? "Member" : dto.AssignedRole.Trim(),
                        ExtraInfoResponsesJson = reg.ExtraInfoResponsesJson,
                        Status = "Active",
                        AddedByUserId = GetCurrentUserId(),
                        JoinedAt = DateTime.UtcNow
                    });
                }
                else
                {
                    existingMember.Status = "Active";
                    existingMember.ExtraInfoResponsesJson = reg.ExtraInfoResponsesJson ?? existingMember.ExtraInfoResponsesJson;
                }
            }

            reg.CommitteeId = targetCommitteeId;
            reg.Status = decision.Equals("Reassign", StringComparison.OrdinalIgnoreCase) ? "Reassigned" : "Approved";
            reg.ReviewNotes = dto?.ReviewNotes?.Trim();
            reg.ReviewedByUserId = GetCurrentUserId();
            reg.ReviewedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync(cancellationToken);

            if (memberProfile != null)
            {
                await DispatchMemberNotificationAsync(
                    memberProfile,
                    $"Welcome to {targetCommittee.Name}",
                    $"Your registration for {targetCommittee.Name} ({settings.AliasSingular}) has been approved.",
                    $"/committees/workspace/view/{targetCommittee.Id}",
                    NotificationSeverity.Success,
                    cancellationToken,
                    sendEmail: true);
            }

            return Ok(ApiResponse<object>.SuccessResponse(new { reg.Id, reg.Status, TargetCommitteeId = targetCommitteeId }, "Application approved."));
        }

        // =====================================================================
        // 7. MULTI-MODAL MEETING REPORTS, UPLOADS, GOOGLE DOCS & OZI AI DIGEST
        // =====================================================================

        /// <summary>
        /// Lists meeting reports for Admin Console review or Member Workspace browsing.
        /// </summary>
        /// <param name="committeeId">Optional committee filter.</param>
        /// <param name="reviewStatus">Optional review status filter ("Submitted", "Reviewed", "ActionNeeded").</param>
        /// <param name="cancellationToken">Request cancellation token.</param>
        /// <returns>Chronological list of meeting reports.</returns>
        [HttpGet("reports")]
        public async Task<IActionResult> GetReports(
            [FromQuery] Guid? committeeId = null,
            [FromQuery] string? reviewStatus = null,
            CancellationToken cancellationToken = default)
        {
            var isAdmin = IsCurrentUserConsoleAdmin();
            var currentUserId = GetCurrentUserId();

            var query = _db.BcpCommitteeReports
                .AsNoTracking()
                .Include(r => r.Committee)
                .AsQueryable();

            if (!isAdmin)
            {
                var myMemberships = await _db.BcpCommitteeMembers
                    .AsNoTracking()
                    .Where(m => m.UserProfileId == currentUserId && m.Status == "Active")
                    .Select(m => new { m.CommitteeId, m.Role })
                    .ToListAsync(cancellationToken);

                var myCommitteeIds = myMemberships.Select(m => m.CommitteeId).ToList();
                var ledIds = myMemberships.Where(m => GroupLeaderRoles.Contains(m.Role)).Select(m => m.CommitteeId).ToList();

                query = query.Where(r =>
                    r.SubmittedByUserId == currentUserId ||
                    ledIds.Contains(r.CommitteeId) ||
                    (myCommitteeIds.Contains(r.CommitteeId) && r.IsSharedWithMembers));
            }

            if (committeeId.HasValue)
            {
                query = query.Where(r => r.CommitteeId == committeeId.Value);
            }

            if (!string.IsNullOrWhiteSpace(reviewStatus) && !reviewStatus.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(r => r.ReviewStatus == reviewStatus);
            }

            var reports = await query
                .OrderByDescending(r => r.MeetingDate)
                .ThenByDescending(r => r.CreatedAt)
                .Take(150)
                .ToListAsync(cancellationToken);

            return Ok(ApiResponse<object>.SuccessResponse(reports.Select(MapReportDetail), "Reports retrieved."));
        }

        /// <summary>
        /// Retrieves a single meeting report including full typed minutes, attendance roll-call, uploaded files, and linked cloud notebooks/docs.
        /// </summary>
        /// <param name="reportId">Target report ID.</param>
        /// <param name="cancellationToken">Request cancellation token.</param>
        /// <returns>Complete report payload.</returns>
        [HttpGet("reports/{reportId:guid}")]
        public async Task<IActionResult> GetReportById(Guid reportId, CancellationToken cancellationToken)
        {
            var report = await _db.BcpCommitteeReports
                .AsNoTracking()
                .Include(r => r.Committee)
                .FirstOrDefaultAsync(r => r.Id == reportId, cancellationToken);

            if (report == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Requested record not found.", errorCode: StandardErrorCodes.RecordNotFound));
            }

            var currentUserId = GetCurrentUserId();
            if (!IsCurrentUserConsoleAdmin() && report.SubmittedByUserId != currentUserId)
            {
                var membership = await _db.BcpCommitteeMembers
                    .AsNoTracking()
                    .FirstOrDefaultAsync(m => m.CommitteeId == report.CommitteeId && m.UserProfileId == currentUserId && m.Status == "Active", cancellationToken);

                if (membership == null || (!report.IsSharedWithMembers && !GroupLeaderRoles.Contains(membership.Role)))
                {
                    return StatusCode(StatusCodes.Status403Forbidden,
                        ApiResponse<object>.FailureResponse("Access denied.", errorCode: StandardErrorCodes.AccessDenied));
                }
            }

            return Ok(ApiResponse<object>.SuccessResponse(MapReportDetail(report), "Report retrieved."));
        }

        /// <summary>
        /// Submits a multi-modal Meeting Report supporting rich typed minutes, attendance roll-call, action items,
        /// file uploads, and connected Google Docs / Google Sheets / Cloud Notebooks.
        /// </summary>
        /// <param name="dto">Meeting report creation payload.</param>
        /// <param name="cancellationToken">Request cancellation token.</param>
        /// <returns>Newly created meeting report.</returns>
        [HttpPost("reports")]
        public async Task<IActionResult> SubmitReport([FromBody] SubmitCommitteeReportDto dto, CancellationToken cancellationToken)
        {
            if (dto == null || dto.CommitteeId == Guid.Empty || string.IsNullOrWhiteSpace(dto.Title))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Required information is missing.", errorCode: StandardErrorCodes.RequiredFieldMissing));
            }

            var committee = await _db.BcpCommittees.FirstOrDefaultAsync(c => c.Id == dto.CommitteeId, cancellationToken);
            if (committee == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Requested record not found.", errorCode: StandardErrorCodes.RecordNotFound));
            }

            var currentUserId = GetCurrentUserId();
            var settings = await GetOrCreateSettingsAsync(cancellationToken);
            var isAdmin = IsCurrentUserConsoleAdmin();
            var membership = await _db.BcpCommitteeMembers
                .AsNoTracking()
                .FirstOrDefaultAsync(m => m.CommitteeId == dto.CommitteeId && m.UserProfileId == currentUserId && m.Status == "Active", cancellationToken);

            var canSubmit = isAdmin
                         || (membership != null && (GroupLeaderRoles.Contains(membership.Role) || settings.AllowAnyMemberReportSubmission));

            if (!canSubmit)
            {
                return StatusCode(StatusCodes.Status403Forbidden,
                    ApiResponse<object>.FailureResponse("Only appointed group leaders or administrators can submit reports for this group.", errorCode: StandardErrorCodes.AccessDenied));
            }

            var author = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == currentUserId, cancellationToken);
            var authorName = author != null ? $"{author.FirstName} {author.LastName}".Trim() : (User.Identity?.Name ?? "Member");

            var rollCall = dto.AttendanceRollCall ?? new List<AttendanceRollCallItemDto>();
            var actionItems = dto.ActionItems ?? new List<ReportActionItemDto>();
            var cloudLinks = dto.CloudLinks ?? new List<ReportCloudLinkDto>();

            var report = new BcpCommitteeReport
            {
                Id = Guid.CreateVersion7(),
                CommitteeId = dto.CommitteeId,
                SubmittedByUserId = currentUserId,
                SubmittedByName = string.IsNullOrWhiteSpace(authorName) ? "Member" : authorName,
                Title = dto.Title.Trim(),
                MeetingDate = dto.MeetingDate ?? DateTime.UtcNow,
                Summary = dto.Summary?.Trim(),
                RichMinutesContent = dto.RichMinutesContent,
                DecisionsText = dto.DecisionsText?.Trim(),
                ActionItemsJson = JsonSerializer.Serialize(actionItems),
                AttendanceRollCallJson = JsonSerializer.Serialize(rollCall),
                PresentCount = rollCall.Count > 0 ? rollCall.Count(x => string.Equals(x.Status, "Present", StringComparison.OrdinalIgnoreCase)) : dto.PresentCount,
                ExcusedCount = rollCall.Count > 0 ? rollCall.Count(x => string.Equals(x.Status, "Excused", StringComparison.OrdinalIgnoreCase)) : dto.ExcusedCount,
                AbsentCount = rollCall.Count > 0 ? rollCall.Count(x => string.Equals(x.Status, "Absent", StringComparison.OrdinalIgnoreCase)) : dto.AbsentCount,
                CustomMetricsValuesJson = JsonSerializer.Serialize(dto.CustomMetricsValues ?? new Dictionary<string, decimal>()),
                UploadedFilesJson = JsonSerializer.Serialize(dto.UploadedFiles ?? new List<ReportUploadedFileDto>()),
                CloudLinksJson = JsonSerializer.Serialize(cloudLinks),
                ReviewStatus = "Submitted",
                IsSharedWithMembers = dto.IsSharedWithMembers,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _db.BcpCommitteeReports.Add(report);

            // Also register any newly attached cloud docs onto the committee's shared cloud shelf if requested
            foreach (var link in cloudLinks.Where(l => !string.IsNullOrWhiteSpace(l.Url)))
            {
                var existsOnShelf = await _db.BcpCommitteeCloudDocuments
                    .AnyAsync(d => d.CommitteeId == dto.CommitteeId && d.DocumentUrl == link.Url, cancellationToken);

                if (!existsOnShelf)
                {
                    _db.BcpCommitteeCloudDocuments.Add(new BcpCommitteeCloudDocument
                    {
                        Id = Guid.CreateVersion7(),
                        CommitteeId = dto.CommitteeId,
                        ReportId = report.Id,
                        OwnerUserProfileId = currentUserId,
                        OwnerDisplayName = report.SubmittedByName,
                        Provider = DetectCloudProvider(link.Provider, link.Url),
                        Title = string.IsNullOrWhiteSpace(link.Title) ? "Linked Cloud Document" : link.Title.Trim(),
                        DocumentUrl = link.Url.Trim(),
                        EmbedUrl = BuildCloudEmbedUrl(link.Url.Trim()),
                        ExternalFileId = link.ExternalFileId,
                        ConnectedAccountEmail = link.OwnerEmail,
                        IsPinnedToShelf = link.PinToGroupShelf,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            await _db.SaveChangesAsync(cancellationToken);

            // Notify assigned action-item owners automatically via unified notification pool
            foreach (var item in actionItems.Where(a => !string.IsNullOrWhiteSpace(a.AssigneeUserId)))
            {
                var assignee = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == item.AssigneeUserId, cancellationToken);
                if (assignee != null)
                {
                    await DispatchMemberNotificationAsync(
                        assignee,
                        $"Action Item Assigned in {committee.Name}",
                        $"Task: {item.Task}" + (!string.IsNullOrWhiteSpace(item.DueDate) ? $" (Due: {item.DueDate})" : ""),
                        $"/committees/workspace/view/{committee.Id}",
                        NotificationSeverity.Update,
                        cancellationToken);
                }
            }

            return Ok(ApiResponse<object>.SuccessResponse(new { report.Id, report.Title, report.ReviewStatus }, "Meeting report submitted."));
        }

        /// <summary>
        /// Records official administrative review status ("Reviewed" or "ActionNeeded") and remarks on a submitted report.
        /// </summary>
        /// <param name="reportId">Target report ID.</param>
        /// <param name="dto">Review remarks payload.</param>
        /// <param name="cancellationToken">Request cancellation token.</param>
        /// <returns>Updated report review state.</returns>
        [HttpPost("reports/{reportId:guid}/review")]
        public async Task<IActionResult> ReviewReport(Guid reportId, [FromBody] ReviewCommitteeReportDto dto, CancellationToken cancellationToken)
        {
            if (!IsCurrentUserConsoleAdmin())
            {
                return StatusCode(StatusCodes.Status403Forbidden,
                    ApiResponse<object>.FailureResponse("Access denied.", errorCode: StandardErrorCodes.AccessDenied));
            }

            var report = await _db.BcpCommitteeReports
                .Include(r => r.Committee)
                .FirstOrDefaultAsync(r => r.Id == reportId, cancellationToken);

            if (report == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Requested record not found.", errorCode: StandardErrorCodes.RecordNotFound));
            }

            report.ReviewStatus = string.IsNullOrWhiteSpace(dto?.ReviewStatus) ? "Reviewed" : dto.ReviewStatus.Trim();
            report.AdminRemarks = dto?.AdminRemarks?.Trim();
            report.ReviewedByUserId = GetCurrentUserId();
            report.ReviewedAt = DateTime.UtcNow;
            report.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync(cancellationToken);

            var submitter = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == report.SubmittedByUserId, cancellationToken);
            if (submitter != null)
            {
                await DispatchMemberNotificationAsync(
                    submitter,
                    $"Report Reviewed: {report.Title}",
                    $"Your report for {report.Committee?.Name ?? "your group"} was marked '{report.ReviewStatus}'." +
                    (!string.IsNullOrWhiteSpace(report.AdminRemarks) ? $" Remarks: {report.AdminRemarks}" : ""),
                    $"/committees/workspace/view/{report.CommitteeId}",
                    report.ReviewStatus == "ActionNeeded" ? NotificationSeverity.Failed : NotificationSeverity.Success,
                    cancellationToken);
            }

            return Ok(ApiResponse<object>.SuccessResponse(new { report.Id, report.ReviewStatus, report.AdminRemarks }, "Report review saved."));
        }

        /// <summary>
        /// Generates a concise Ozi AI Executive Digest for a meeting report using the Central Master DB AI Key Pool
        /// (Primary: Google Gemini 2.5 Flash -&gt; Failover: DeepSeek -&gt; Structured Fallback).
        /// </summary>
        /// <param name="reportId">Target report ID.</param>
        /// <param name="cancellationToken">Request cancellation token.</param>
        /// <returns>Generated executive digest text.</returns>
        [HttpPost("reports/{reportId:guid}/ai-digest")]
        public async Task<IActionResult> GenerateAiReportDigest(Guid reportId, CancellationToken cancellationToken)
        {
            var report = await _db.BcpCommitteeReports
                .Include(r => r.Committee)
                .FirstOrDefaultAsync(r => r.Id == reportId, cancellationToken);

            if (report == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Requested record not found.", errorCode: StandardErrorCodes.RecordNotFound));
            }

            if (!await CanCurrentUserManageCommitteeAsync(report.CommitteeId, cancellationToken))
            {
                return StatusCode(StatusCodes.Status403Forbidden,
                    ApiResponse<object>.FailureResponse("Access denied.", errorCode: StandardErrorCodes.AccessDenied));
            }

            var digest = await SynthesizeAiDigestAsync(report, cancellationToken);
            report.AiExecutiveDigest = digest;
            report.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);

            return Ok(ApiResponse<object>.SuccessResponse(new { report.Id, AiExecutiveDigest = digest }, "Executive digest generated."));
        }

        /// <summary>
        /// Uploads a static document, spreadsheet, PDF, image, or audio file attachment for meeting reports or committee forms.
        /// </summary>
        /// <param name="file">Multipart file payload.</param>
        /// <param name="cancellationToken">Request cancellation token.</param>
        /// <returns>Uploaded file metadata and secure URL.</returns>
        [HttpPost("upload-attachment")]
        public async Task<IActionResult> UploadAttachment(IFormFile file, CancellationToken cancellationToken)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("No file selected for upload.", errorCode: StandardErrorCodes.RequiredFieldMissing));
            }

            var settings = await GetOrCreateSettingsAsync(cancellationToken);
            var maxBytes = (long)settings.MaxUploadSizeMb * 1024L * 1024L;
            if (file.Length > maxBytes)
            {
                return BadRequest(ApiResponse<object>.FailureResponse(
                    $"File exceeds the maximum allowed size of {settings.MaxUploadSizeMb} MB.",
                    errorCode: StandardErrorCodes.MediaUploadFailed));
            }

            var ext = Path.GetExtension(file.FileName)?.ToLowerInvariant() ?? string.Empty;
            var allowedExtensions = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".ppt", ".pptx", ".txt",
                ".png", ".jpg", ".jpeg", ".webp", ".mp3", ".m4a", ".wav"
            };

            if (!allowedExtensions.Contains(ext))
            {
                return BadRequest(ApiResponse<object>.FailureResponse(
                    "Unsupported file format. Upload PDF, Word, Excel, CSV, PowerPoint, Image, or Audio files.",
                    errorCode: StandardErrorCodes.MediaUploadFailed));
            }

            string uploadedUrl = string.Empty;
            var isImage = ext is ".png" or ".jpg" or ".jpeg" or ".webp";

            if (_cloudinaryService != null)
            {
                try
                {
                    uploadedUrl = isImage
                        ? await _cloudinaryService.UploadImageAsync(file, "committees")
                        : await _cloudinaryService.UploadRawDocumentAsync(file, "committees-docs");
                }
                catch
                {
                    uploadedUrl = string.Empty;
                }
            }

            if (string.IsNullOrWhiteSpace(uploadedUrl))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Document upload failed.", errorCode: StandardErrorCodes.MediaUploadFailed));
            }

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                FileName = file.FileName,
                FileUrl = uploadedUrl,
                FileType = ext.TrimStart('.').ToUpperInvariant(),
                SizeBytes = file.Length,
                UploadedAt = DateTime.UtcNow
            }, "Attachment uploaded."));
        }

        // =====================================================================
        // 8. MEMBER WORKSPACE HUB, DISCOVERY, 1-CLICK JOIN & CLOUD DOCS VAULT
        // =====================================================================

        /// <summary>
        /// Retrieves all committees and sub-groups the current signed-in member belongs to, along with their role,
        /// pending action items, and dynamic alias labels.
        /// </summary>
        /// <param name="cancellationToken">Request cancellation token.</param>
        /// <returns>Member's enrolled committees and personal workspace summary.</returns>
        [HttpGet("workspace/my")]
        public async Task<IActionResult> GetMyWorkspaceCommittees(CancellationToken cancellationToken)
        {
            var currentUserId = GetCurrentUserId();
            var settings = await GetOrCreateSettingsAsync(cancellationToken);

            var memberships = await _db.BcpCommitteeMembers
                .AsNoTracking()
                .Include(m => m.Committee)
                .ThenInclude(c => c!.ParentCommittee)
                .Where(m => m.UserProfileId == currentUserId && m.Status == "Active" && m.Committee != null && m.Committee.Status == "Active")
                .OrderByDescending(m => m.JoinedAt)
                .ToListAsync(cancellationToken);

            var committeeIds = memberships.Select(m => m.CommitteeId).ToList();

            var reportCounts = await _db.BcpCommitteeReports
                .AsNoTracking()
                .Where(r => committeeIds.Contains(r.CommitteeId))
                .GroupBy(r => r.CommitteeId)
                .Select(g => new { CommitteeId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.CommitteeId, x => x.Count, cancellationToken);

            var memberCounts = await _db.BcpCommitteeMembers
                .AsNoTracking()
                .Where(m => committeeIds.Contains(m.CommitteeId) && m.Status == "Active")
                .GroupBy(m => m.CommitteeId)
                .Select(g => new { CommitteeId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.CommitteeId, x => x.Count, cancellationToken);

            var cloudDocCounts = await _db.BcpCommitteeCloudDocuments
                .AsNoTracking()
                .Where(d => d.CommitteeId.HasValue && committeeIds.Contains(d.CommitteeId.Value))
                .GroupBy(d => d.CommitteeId!.Value)
                .Select(g => new { CommitteeId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.CommitteeId, x => x.Count, cancellationToken);

            var myPendingRequests = await _db.BcpCommitteeRegistrations
                .AsNoTracking()
                .Include(r => r.Committee)
                .Where(r => r.ApplicantUserProfileId == currentUserId && r.Status == "Pending")
                .Select(r => new
                {
                    r.Id,
                    r.CommitteeId,
                    CommitteeName = r.Committee != null ? r.Committee.Name : "",
                    r.SubmittedAt
                })
                .ToListAsync(cancellationToken);

            var items = memberships.Select(m =>
            {
                var c = m.Committee!;
                var isLeader = GroupLeaderRoles.Contains(m.Role);
                return new
                {
                    CommitteeId = c.Id,
                    c.ParentCommitteeId,
                    ParentCommitteeName = c.ParentCommittee?.Name,
                    c.Name,
                    c.Slug,
                    c.CategoryTag,
                    c.Description,
                    c.MissionStatement,
                    c.MeetingSchedule,
                    c.MeetingLocationOrLink,
                    c.CoverBannerUrl,
                    c.IconName,
                    MyRole = m.Role,
                    MyRoleDisplay = FormatRoleDisplay(m.Role, settings),
                    m.CustomRoleTitle,
                    IsLeader = isLeader,
                    CanSubmitReport = isLeader || settings.AllowAnyMemberReportSubmission || IsCurrentUserConsoleAdmin(),
                    MemberCount = memberCounts.TryGetValue(c.Id, out var mc) ? mc : 1,
                    ReportsCount = reportCounts.TryGetValue(c.Id, out var rc) ? rc : 0,
                    CloudDocsCount = cloudDocCounts.TryGetValue(c.Id, out var dc) ? dc : 0,
                    m.JoinedAt
                };
            });

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                Aliases = new
                {
                    settings.AliasSingular,
                    settings.AliasPlural,
                    settings.SubGroupAliasSingular,
                    settings.SubGroupAliasPlural,
                    settings.LeaderTitleAlias,
                    settings.SecretaryTitleAlias
                },
                EnrolledCommittees = items,
                MyPendingRequests = myPendingRequests
            }, "My groups retrieved."));
        }

        /// <summary>
        /// Lists discoverable ("Public" and "ApprovalRequired") committees in the Member Workspace along with their
        /// attached Extra-Info Form schemas so signed-in members can join without re-entering core profile fields.
        /// </summary>
        /// <param name="cancellationToken">Request cancellation token.</param>
        /// <returns>Discoverable committees directory.</returns>
        [HttpGet("workspace/discover")]
        public async Task<IActionResult> DiscoverWorkspaceCommittees(CancellationToken cancellationToken)
        {
            var currentUserId = GetCurrentUserId();
            var settings = await GetOrCreateSettingsAsync(cancellationToken);

            var joinedIds = (await _db.BcpCommitteeMembers
                .AsNoTracking()
                .Where(m => m.UserProfileId == currentUserId && m.Status == "Active")
                .Select(m => m.CommitteeId)
                .ToListAsync(cancellationToken)).ToHashSet();

            var pendingIds = (await _db.BcpCommitteeRegistrations
                .AsNoTracking()
                .Where(r => r.ApplicantUserProfileId == currentUserId && r.Status == "Pending")
                .Select(r => r.CommitteeId)
                .ToListAsync(cancellationToken)).ToHashSet();

            BcpCommitteeForm? defaultForm = null;
            if (settings.DefaultExtraInfoFormId.HasValue)
            {
                defaultForm = await _db.BcpCommitteeForms.AsNoTracking()
                    .FirstOrDefaultAsync(f => f.Id == settings.DefaultExtraInfoFormId.Value && f.IsActive, cancellationToken);
            }
            defaultForm ??= await _db.BcpCommitteeForms.AsNoTracking()
                .FirstOrDefaultAsync(f => f.IsGlobalDefault && f.IsActive, cancellationToken);

            var committees = await _db.BcpCommittees
                .AsNoTracking()
                .Include(c => c.ExtraInfoForm)
                .Include(c => c.ParentCommittee)
                .Where(c => c.Status == "Active" && (c.Visibility == "Public" || c.Visibility == "ApprovalRequired"))
                .OrderBy(c => c.ParentCommitteeId.HasValue)
                .ThenBy(c => c.Name)
                .Select(c => new
                {
                    c.Id,
                    c.ParentCommitteeId,
                    ParentCommitteeName = c.ParentCommittee != null ? c.ParentCommittee.Name : null,
                    c.Name,
                    c.Slug,
                    c.CategoryTag,
                    c.Description,
                    c.MissionStatement,
                    c.MeetingSchedule,
                    c.IconName,
                    c.CoverBannerUrl,
                    c.Visibility,
                    c.RequireApproval,
                    c.MaxCapacity,
                    MemberCount = c.Members.Count(m => m.Status == "Active"),
                    Form = c.ExtraInfoForm != null && c.ExtraInfoForm.IsActive ? c.ExtraInfoForm : null
                })
                .ToListAsync(cancellationToken);

            var data = committees.Select(c =>
            {
                var effectiveForm = c.Form ?? defaultForm;
                return new
                {
                    c.Id,
                    c.ParentCommitteeId,
                    c.ParentCommitteeName,
                    c.Name,
                    c.Slug,
                    c.CategoryTag,
                    c.Description,
                    c.MissionStatement,
                    c.MeetingSchedule,
                    c.IconName,
                    c.CoverBannerUrl,
                    c.Visibility,
                    RequiresApproval = c.RequireApproval || c.Visibility == "ApprovalRequired",
                    c.MaxCapacity,
                    c.MemberCount,
                    IsJoined = joinedIds.Contains(c.Id),
                    IsPendingApproval = pendingIds.Contains(c.Id),
                    ExtraInfoForm = effectiveForm != null ? new
                    {
                        effectiveForm.Id,
                        effectiveForm.Title,
                        effectiveForm.Description,
                        Fields = ParseJsonOrDefault<List<CommitteeFormFieldDto>>(effectiveForm.FieldsSchemaJson, new List<CommitteeFormFieldDto>())
                    } : null
                };
            });

            return Ok(ApiResponse<object>.SuccessResponse(data, "Directory loaded."));
        }

        /// <summary>
        /// Enrolls or submits a join request for an already authenticated workspace member.
        /// Uses their existing <see cref="Profile"/> identity automatically and collects ONLY supplemental Extra-Info answers.
        /// </summary>
        /// <param name="id">Target committee ID.</param>
        /// <param name="dto">Supplemental Extra-Info responses.</param>
        /// <param name="cancellationToken">Request cancellation token.</param>
        /// <returns>Enrollment or pending approval confirmation.</returns>
        [HttpPost("workspace/{id:guid}/join")]
        public async Task<IActionResult> JoinFromWorkspace(Guid id, [FromBody] WorkspaceJoinCommitteeDto? dto, CancellationToken cancellationToken)
        {
            var currentUserId = GetCurrentUserId();
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == currentUserId, cancellationToken);
            var committee = await _db.BcpCommittees.FirstOrDefaultAsync(c => c.Id == id && c.Status == "Active", cancellationToken);

            if (user == null || committee == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Requested record not found.", errorCode: StandardErrorCodes.RecordNotFound));
            }

            if (committee.Visibility == "Private")
            {
                return StatusCode(StatusCodes.Status403Forbidden,
                    ApiResponse<object>.FailureResponse("This group is invite-only.", errorCode: StandardErrorCodes.AccessDenied));
            }

            var existingMember = await _db.BcpCommitteeMembers
                .FirstOrDefaultAsync(m => m.CommitteeId == id && m.UserProfileId == currentUserId, cancellationToken);
            if (existingMember != null && existingMember.Status == "Active")
            {
                return Ok(ApiResponse<object>.SuccessResponse(new { Status = "Joined" }, "You are already a member."));
            }

            if (committee.MaxCapacity.HasValue)
            {
                var currentCount = await _db.BcpCommitteeMembers.CountAsync(m => m.CommitteeId == id && m.Status == "Active", cancellationToken);
                if (currentCount >= committee.MaxCapacity.Value)
                {
                    return BadRequest(ApiResponse<object>.FailureResponse("Maximum member capacity has been reached.", errorCode: StandardErrorCodes.QuotaLimitReached));
                }
            }

            var extraJson = JsonSerializer.Serialize(dto?.ExtraInfoResponses ?? new Dictionary<string, object>());
            var requiresApproval = committee.RequireApproval || committee.Visibility == "ApprovalRequired";

            if (requiresApproval)
            {
                var existingPending = await _db.BcpCommitteeRegistrations
                    .FirstOrDefaultAsync(r => r.CommitteeId == id && r.ApplicantUserProfileId == currentUserId && r.Status == "Pending", cancellationToken);

                if (existingPending == null)
                {
                    _db.BcpCommitteeRegistrations.Add(new BcpCommitteeRegistration
                    {
                        Id = Guid.CreateVersion7(),
                        CommitteeId = id,
                        ApplicantUserProfileId = currentUserId,
                        IsExternalApplicant = false,
                        FirstName = user.FirstName ?? "Member",
                        LastName = user.LastName ?? "",
                        Email = user.Email ?? "",
                        PhoneNumber = user.PhoneNumber,
                        ExtraInfoResponsesJson = extraJson,
                        AttachmentUrlsJson = JsonSerializer.Serialize(dto?.AttachmentUrls ?? new List<string>()),
                        Status = "Pending",
                        SubmittedAt = DateTime.UtcNow
                    });
                    await _db.SaveChangesAsync(cancellationToken);
                }

                return Ok(ApiResponse<object>.SuccessResponse(new { Status = "Pending" }, "Your request has been submitted for approval."));
            }

            if (existingMember != null)
            {
                existingMember.Status = "Active";
                existingMember.ExtraInfoResponsesJson = extraJson;
            }
            else
            {
                _db.BcpCommitteeMembers.Add(new BcpCommitteeMember
                {
                    Id = Guid.CreateVersion7(),
                    CommitteeId = id,
                    UserProfileId = currentUserId,
                    Role = "Member",
                    ExtraInfoResponsesJson = extraJson,
                    Status = "Active",
                    JoinedAt = DateTime.UtcNow
                });
            }

            await _db.SaveChangesAsync(cancellationToken);
            return Ok(ApiResponse<object>.SuccessResponse(new { Status = "Joined", CommitteeId = id }, $"You have joined {committee.Name}."));
        }

        /// <summary>
        /// Lists all connected Google Docs, Google Sheets, Cloud Notebooks, and Excel Online links owned by the member
        /// or shared across their enrolled committees.
        /// </summary>
        /// <param name="cancellationToken">Request cancellation token.</param>
        /// <returns>Personal and group cloud document links.</returns>
        [HttpGet("workspace/cloud-docs")]
        public async Task<IActionResult> GetMyCloudDocuments(CancellationToken cancellationToken)
        {
            var currentUserId = GetCurrentUserId();
            var myCommitteeIds = await _db.BcpCommitteeMembers
                .AsNoTracking()
                .Where(m => m.UserProfileId == currentUserId && m.Status == "Active")
                .Select(m => m.CommitteeId)
                .ToListAsync(cancellationToken);

            var docs = await _db.BcpCommitteeCloudDocuments
                .AsNoTracking()
                .Include(d => d.Committee)
                .Where(d => d.OwnerUserProfileId == currentUserId || (d.CommitteeId.HasValue && myCommitteeIds.Contains(d.CommitteeId.Value)))
                .OrderByDescending(d => d.CreatedAt)
                .ToListAsync(cancellationToken);

            var data = docs.Select(d => new
            {
                d.Id,
                d.CommitteeId,
                CommitteeName = d.Committee?.Name,
                d.OwnerUserProfileId,
                d.OwnerDisplayName,
                IsMine = d.OwnerUserProfileId == currentUserId,
                d.Provider,
                d.Title,
                d.DocumentUrl,
                d.EmbedUrl,
                d.ExternalFileId,
                d.ConnectedAccountEmail,
                d.IsPinnedToShelf,
                d.LastSyncedAt,
                d.CreatedAt
            });

            return Ok(ApiResponse<object>.SuccessResponse(data, "Cloud documents retrieved."));
        }

        /// <summary>
        /// Connects and links a Google Doc, Google Sheet, Google Notebook, Excel Online, or Notion URL to the member's vault
        /// or pins it directly onto a committee's shared document shelf.
        /// </summary>
        /// <param name="dto">Cloud document connection payload.</param>
        /// <param name="cancellationToken">Request cancellation token.</param>
        /// <returns>Saved cloud document link with auto-resolved embed preview URL.</returns>
        [HttpPost("workspace/cloud-docs")]
        public async Task<IActionResult> LinkCloudDocument([FromBody] LinkCloudDocumentDto dto, CancellationToken cancellationToken)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.DocumentUrl))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Required information is missing.", errorCode: StandardErrorCodes.RequiredFieldMissing));
            }

            if (!Uri.TryCreate(dto.DocumentUrl.Trim(), UriKind.Absolute, out var parsedUri) ||
                (parsedUri.Scheme != Uri.UriSchemeHttps && parsedUri.Scheme != Uri.UriSchemeHttp))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Enter a valid https:// cloud document URL.", errorCode: StandardErrorCodes.InvalidRequestData));
            }

            var currentUserId = GetCurrentUserId();
            var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == currentUserId, cancellationToken);
            var displayName = user != null ? $"{user.FirstName} {user.LastName}".Trim() : "Member";

            var provider = DetectCloudProvider(dto.Provider, dto.DocumentUrl);
            var doc = new BcpCommitteeCloudDocument
            {
                Id = Guid.CreateVersion7(),
                CommitteeId = dto.CommitteeId,
                OwnerUserProfileId = currentUserId,
                OwnerDisplayName = displayName,
                Provider = provider,
                Title = string.IsNullOrWhiteSpace(dto.Title) ? $"{provider} Document" : dto.Title.Trim(),
                DocumentUrl = dto.DocumentUrl.Trim(),
                EmbedUrl = BuildCloudEmbedUrl(dto.DocumentUrl.Trim()),
                ExternalFileId = dto.ExternalFileId?.Trim(),
                ConnectedAccountEmail = dto.ConnectedAccountEmail?.Trim(),
                IsPinnedToShelf = dto.IsPinnedToShelf,
                LastSyncedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            };

            _db.BcpCommitteeCloudDocuments.Add(doc);
            await _db.SaveChangesAsync(cancellationToken);

            return Ok(ApiResponse<object>.SuccessResponse(doc, "Cloud document linked."));
        }

        /// <summary>
        /// Disconnects/unlinks a cloud document from the vault or group shelf.
        /// </summary>
        /// <param name="docId">Cloud document record ID.</param>
        /// <param name="cancellationToken">Request cancellation token.</param>
        /// <returns>Unlink confirmation.</returns>
        [HttpDelete("workspace/cloud-docs/{docId:guid}")]
        public async Task<IActionResult> UnlinkCloudDocument(Guid docId, CancellationToken cancellationToken)
        {
            var doc = await _db.BcpCommitteeCloudDocuments.FirstOrDefaultAsync(d => d.Id == docId, cancellationToken);
            if (doc == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Requested record not found.", errorCode: StandardErrorCodes.RecordNotFound));
            }

            var currentUserId = GetCurrentUserId();
            var canRemove = doc.OwnerUserProfileId == currentUserId
                         || IsCurrentUserConsoleAdmin()
                         || (doc.CommitteeId.HasValue && await CanCurrentUserManageCommitteeAsync(doc.CommitteeId.Value, cancellationToken));

            if (!canRemove)
            {
                return StatusCode(StatusCodes.Status403Forbidden,
                    ApiResponse<object>.FailureResponse("Access denied.", errorCode: StandardErrorCodes.AccessDenied));
            }

            _db.BcpCommitteeCloudDocuments.Remove(doc);
            await _db.SaveChangesAsync(cancellationToken);

            return Ok(ApiResponse.SuccessResponse("Cloud document disconnected."));
        }

        // =====================================================================
        // PRIVATE HELPERS (AI KEY POOL, NOTIFICATIONS, RBAC & PARSERS)
        // =====================================================================

        private async Task<BcpCommitteeSettings> GetOrCreateSettingsAsync(CancellationToken cancellationToken)
        {
            var settings = await _db.BcpCommitteeSettings.FirstOrDefaultAsync(cancellationToken);
            if (settings != null) return settings;

            settings = new BcpCommitteeSettings
            {
                Id = Guid.CreateVersion7(),
                AliasSingular = "Committee",
                AliasPlural = "Committees",
                SubGroupAliasSingular = "Sub-Group",
                SubGroupAliasPlural = "Sub-Groups",
                LeaderTitleAlias = "Chairperson",
                SecretaryTitleAlias = "Secretary",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.BcpCommitteeSettings.Add(settings);
            await _db.SaveChangesAsync(cancellationToken);
            return settings;
        }

        private string GetCurrentUserId()
        {
            return User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub")
                ?? User.FindFirstValue("uid")
                ?? string.Empty;
        }

        private bool IsCurrentUserConsoleAdmin()
        {
            var roleClaims = User.FindAll(ClaimTypes.Role).Select(c => c.Value)
                .Concat(User.FindAll("role").Select(c => c.Value));
            return roleClaims.Any(r => ConsoleAdminRoles.Contains(r));
        }

        private async Task<bool> CanCurrentUserManageCommitteeAsync(Guid committeeId, CancellationToken cancellationToken)
        {
            if (IsCurrentUserConsoleAdmin()) return true;
            var userId = GetCurrentUserId();
            if (string.IsNullOrWhiteSpace(userId)) return false;

            return await _db.BcpCommitteeMembers
                .AsNoTracking()
                .AnyAsync(m => m.CommitteeId == committeeId && m.UserProfileId == userId && m.Status == "Active" && GroupLeaderRoles.Contains(m.Role), cancellationToken);
        }

        private string ResolveCurrentTenantKey()
        {
            var candidate = _tenantProvider?.CurrentTenant;
            if (!string.IsNullOrWhiteSpace(candidate)) return candidate.Trim().ToLowerInvariant();
            var headerKey = HttpContext.Request.Headers["X-Tenant-Key"].ToString()?.Trim();
            if (!string.IsNullOrWhiteSpace(headerKey)) return headerKey.ToLowerInvariant();
            var host = HttpContext.Request.Host.Host.ToLowerInvariant();
            var parts = host.Split('.');
            if (parts.Length > 1 && !new[] { "localhost", "127", "www", "api", "central", "admin" }.Contains(parts[0]))
            {
                return parts[0];
            }
            return string.Empty;
        }

        private static string FormatRoleDisplay(string role, BcpCommitteeSettings settings)
        {
            if (string.Equals(role, "Chairperson", StringComparison.OrdinalIgnoreCase)) return settings.LeaderTitleAlias;
            if (string.Equals(role, "Secretary", StringComparison.OrdinalIgnoreCase)) return settings.SecretaryTitleAlias;
            return role;
        }

        private async Task DispatchMemberNotificationAsync(
            Profile recipient,
            string title,
            string message,
            string actionUrl,
            NotificationSeverity severity,
            CancellationToken cancellationToken,
            bool sendEmail = false)
        {
            if (_notificationDispatcher == null) return;
            try
            {
                await _notificationDispatcher.DispatchAsync(new NotificationDispatchPayload
                {
                    TargetType = NotificationDispatchTarget.SingleUser,
                    TargetUserId = recipient.Id,
                    RecipientEmail = recipient.Email,
                    RecipientName = $"{recipient.FirstName} {recipient.LastName}".Trim(),
                    TenantKey = ResolveCurrentTenantKey(),
                    Title = title,
                    Message = message,
                    ActionUrl = actionUrl,
                    Module = "Committees",
                    Icon = "diversity_3",
                    Severity = severity,
                    Category = BcpMessageCategory.General,
                    Priority = BcpMessagePriority.Normal,
                    Channels = sendEmail ? (NotificationChannels.InApp | NotificationChannels.Email) : NotificationChannels.InApp,
                    SendEmailCopy = sendEmail,
                    EmailSubject = title
                }, cancellationToken);
            }
            catch
            {
                // Non-blocking notification safeguard
            }
        }

        /// <summary>
        /// Executes Ozi AI Executive Digest synthesis strictly adhering to Rule 9:
        /// 1. Google Gemini 2.5 Flash via <see cref="MasterCatalogDbContext.MasterAiApiKeys"/>
        /// 2. DeepSeek Chat secondary failover
        /// 3. Deterministic structured digest fallback when external pools are unpopulated.
        /// </summary>
        private async Task<string> SynthesizeAiDigestAsync(BcpCommitteeReport report, CancellationToken cancellationToken)
        {
            var strippedMinutes = Regex.Replace(report.RichMinutesContent ?? string.Empty, "<.*?>", " ");
            var prompt = new StringBuilder()
                .AppendLine("You are Ozi AI inside Ozikol Business Command Center. Produce a crisp, professional 4-bullet Executive Digest of this meeting report.")
                .AppendLine("Highlight: (1) Core Outcome, (2) Key Decisions, (3) Attendance Pulse, and (4) Next Action Items. Do NOT use emojis.")
                .AppendLine($"Group: {report.Committee?.Name}")
                .AppendLine($"Report Title: {report.Title}")
                .AppendLine($"Meeting Date: {report.MeetingDate:yyyy-MM-dd}")
                .AppendLine($"Attendance: {report.PresentCount} Present, {report.ExcusedCount} Excused, {report.AbsentCount} Absent")
                .AppendLine($"Summary: {report.Summary}")
                .AppendLine($"Minutes: {strippedMinutes}")
                .AppendLine($"Decisions: {report.DecisionsText}")
                .AppendLine($"Action Items JSON: {report.ActionItemsJson}")
                .ToString();

            if (_masterCatalogDbContext != null)
            {
                var nowUtc = DateTime.UtcNow;

                // 1. Primary Provider: Google Gemini (Rule 9)
                var geminiKey = await _masterCatalogDbContext.MasterAiApiKeys
                    .Where(k => k.Provider == "Gemini" && k.IsActive
                             && (!k.RateLimitCooldownUntilUtc.HasValue || k.RateLimitCooldownUntilUtc.Value <= nowUtc)
                             && k.TodayRequestsCount < k.DailyQuotaLimit)
                    .OrderBy(k => k.TodayRequestsCount)
                    .FirstOrDefaultAsync(cancellationToken);

                if (geminiKey != null && !string.IsNullOrWhiteSpace(geminiKey.ApiKey))
                {
                    try
                    {
                        using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(20) };
                        var models = new[] { "gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-flash" };
                        foreach (var model in models)
                        {
                            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={geminiKey.ApiKey}";
                            var res = await client.PostAsJsonAsync(url, new
                            {
                                contents = new[] { new { role = "user", parts = new[] { new { text = prompt } } } },
                                generationConfig = new { temperature = 0.2, maxOutputTokens = 600 }
                            }, cancellationToken);

                            if ((int)res.StatusCode == 429)
                            {
                                geminiKey.RateLimitCooldownUntilUtc = DateTime.UtcNow.AddSeconds(300);
                                await _masterCatalogDbContext.SaveChangesAsync(cancellationToken);
                                break;
                            }

                            if (res.IsSuccessStatusCode)
                            {
                                using var doc = await JsonDocument.ParseAsync(await res.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
                                if (doc.RootElement.TryGetProperty("candidates", out var cands) && cands.GetArrayLength() > 0 &&
                                    cands[0].TryGetProperty("content", out var content) &&
                                    content.TryGetProperty("parts", out var parts) && parts.GetArrayLength() > 0 &&
                                    parts[0].TryGetProperty("text", out var txt))
                                {
                                    var resultText = txt.GetString()?.Trim();
                                    if (!string.IsNullOrWhiteSpace(resultText))
                                    {
                                        geminiKey.TodayRequestsCount++;
                                        geminiKey.TotalRequestsCount++;
                                        geminiKey.LastUsedAtUtc = DateTime.UtcNow;
                                        await _masterCatalogDbContext.SaveChangesAsync(cancellationToken);
                                        return resultText;
                                    }
                                }
                            }
                        }
                    }
                    catch
                    {
                        // Fail over seamlessly to secondary provider
                    }
                }

                // 2. Secondary Failover: DeepSeek (Rule 9)
                var deepSeekKey = await _masterCatalogDbContext.MasterAiApiKeys
                    .Where(k => k.Provider == "DeepSeek" && k.IsActive
                             && (!k.RateLimitCooldownUntilUtc.HasValue || k.RateLimitCooldownUntilUtc.Value <= nowUtc)
                             && k.TodayRequestsCount < k.DailyQuotaLimit)
                    .OrderBy(k => k.TodayRequestsCount)
                    .FirstOrDefaultAsync(cancellationToken);

                if (deepSeekKey != null && !string.IsNullOrWhiteSpace(deepSeekKey.ApiKey))
                {
                    try
                    {
                        using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(20) };
                        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", deepSeekKey.ApiKey);
                        var res = await client.PostAsJsonAsync("https://api.deepseek.com/chat/completions", new
                        {
                            model = "deepseek-chat",
                            messages = new[] { new { role = "user", content = prompt } },
                            temperature = 0.2
                        }, cancellationToken);

                        if ((int)res.StatusCode == 429)
                        {
                            deepSeekKey.RateLimitCooldownUntilUtc = DateTime.UtcNow.AddSeconds(120);
                            await _masterCatalogDbContext.SaveChangesAsync(cancellationToken);
                        }
                        else if (res.IsSuccessStatusCode)
                        {
                            using var doc = await JsonDocument.ParseAsync(await res.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
                            if (doc.RootElement.TryGetProperty("choices", out var choices) && choices.GetArrayLength() > 0 &&
                                choices[0].TryGetProperty("message", out var msg) &&
                                msg.TryGetProperty("content", out var content))
                            {
                                var resultText = content.GetString()?.Trim();
                                if (!string.IsNullOrWhiteSpace(resultText))
                                {
                                    deepSeekKey.TodayRequestsCount++;
                                    deepSeekKey.TotalRequestsCount++;
                                    deepSeekKey.LastUsedAtUtc = DateTime.UtcNow;
                                    await _masterCatalogDbContext.SaveChangesAsync(cancellationToken);
                                    return resultText;
                                }
                            }
                        }
                    }
                    catch
                    {
                        // Fall through to deterministic digest
                    }
                }
            }

            // 3. Deterministic In-Memory Executive Digest when external AI pool is unreachable
            var actions = ParseJsonOrDefault<List<ReportActionItemDto>>(report.ActionItemsJson, new List<ReportActionItemDto>());
            var totalHeadcount = report.PresentCount + report.ExcusedCount + report.AbsentCount;
            var outcomeLine = !string.IsNullOrWhiteSpace(report.Summary)
                ? report.Summary
                : (strippedMinutes.Length > 180 ? strippedMinutes[..180].Trim() + "..." : strippedMinutes.Trim());

            return string.Join("\n", new[]
            {
                $"• Core Outcome: {(string.IsNullOrWhiteSpace(outcomeLine) ? report.Title : outcomeLine)}",
                $"• Key Decisions: {(string.IsNullOrWhiteSpace(report.DecisionsText) ? "Recorded in main minutes." : report.DecisionsText)}",
                $"• Attendance Pulse: {report.PresentCount} present out of {(totalHeadcount > 0 ? totalHeadcount : report.PresentCount)} recorded participants.",
                $"• Follow-Up Actions: {actions.Count} action item(s) tracked ({actions.Count(a => a.Status == "Pending")} pending)."
            });
        }

        internal static string GenerateSlug(string input)
        {
            var lower = (input ?? "group").Trim().ToLowerInvariant();
            var cleaned = Regex.Replace(lower, @"[^a-z0-9\s-]", "");
            var hyphenated = Regex.Replace(cleaned, @"[\s-]+", "-").Trim('-');
            return string.IsNullOrWhiteSpace(hyphenated) ? $"group-{Guid.NewGuid():N}"[..12] : hyphenated;
        }

        private async Task<string> EnsureUniqueSlugAsync(string baseSlug, Guid? excludeId, CancellationToken cancellationToken)
        {
            var candidate = baseSlug;
            var suffix = 2;
            while (await _db.BcpCommittees.AnyAsync(c => c.Slug == candidate && (!excludeId.HasValue || c.Id != excludeId.Value), cancellationToken))
            {
                candidate = $"{baseSlug}-{suffix++}";
            }
            return candidate;
        }

        private static string NormalizeVisibility(string? visibility)
        {
            if (string.Equals(visibility, "Private", StringComparison.OrdinalIgnoreCase)) return "Private";
            if (string.Equals(visibility, "ApprovalRequired", StringComparison.OrdinalIgnoreCase)) return "ApprovalRequired";
            return "Public";
        }

        internal static string DetectCloudProvider(string? explicitProvider, string url)
        {
            var u = (url ?? string.Empty).ToLowerInvariant();
            if (u.Contains("docs.google.com/spreadsheets")) return "GoogleSheets";
            if (u.Contains("docs.google.com/presentation")) return "GoogleSlides";
            if (u.Contains("notebooklm.google") || u.Contains("keep.google.com") || u.Contains("colab.research.google")) return "GoogleNotebook";
            if (u.Contains("docs.google.com/document")) return "GoogleDocs";
            if (u.Contains("drive.google.com")) return "GoogleDrive";
            if (u.Contains("onedrive.live.com") || u.Contains("sharepoint.com") || u.Contains("1drv.ms") || u.Contains("office.com")) return "ExcelOnline";
            if (u.Contains("onenote.com")) return "OneNote";
            if (u.Contains("notion.so") || u.Contains("notion.site")) return "Notion";
            return !string.IsNullOrWhiteSpace(explicitProvider) ? explicitProvider.Trim() : "CloudLink";
        }

        internal static string BuildCloudEmbedUrl(string url)
        {
            if (string.IsNullOrWhiteSpace(url)) return string.Empty;
            if (url.Contains("docs.google.com/", StringComparison.OrdinalIgnoreCase))
            {
                var stripped = Regex.Replace(url, @"/(edit|view).*$", "/preview", RegexOptions.IgnoreCase);
                return stripped;
            }
            return url;
        }

        /// <summary>
        /// Deserializes a JSON string into target type <typeparamref name="T"/>, returning <paramref name="defaultValue"/> on empty or parsing failure.
        /// </summary>
        /// <typeparam name="T">Target deserialization type.</typeparam>
        /// <param name="json">Raw JSON string.</param>
        /// <param name="defaultValue">Default value if json is missing or invalid.</param>
        /// <returns>Deserialized instance or default value.</returns>
        internal static T ParseJsonOrDefault<T>(string? json, T defaultValue)
        {
            if (string.IsNullOrWhiteSpace(json)) return defaultValue;
            try
            {
                return JsonSerializer.Deserialize<T>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? defaultValue;
            }
            catch
            {
                return defaultValue;
            }
        }

        private static object MapReportSummary(BcpCommitteeReport r) => new
        {
            r.Id,
            r.CommitteeId,
            r.Title,
            r.SubmittedByUserId,
            r.SubmittedByName,
            r.MeetingDate,
            r.Summary,
            r.PresentCount,
            r.ExcusedCount,
            r.AbsentCount,
            UploadedFilesCount = ParseJsonOrDefault<List<ReportUploadedFileDto>>(r.UploadedFilesJson, new List<ReportUploadedFileDto>()).Count,
            CloudLinksCount = ParseJsonOrDefault<List<ReportCloudLinkDto>>(r.CloudLinksJson, new List<ReportCloudLinkDto>()).Count,
            ActionItemsCount = ParseJsonOrDefault<List<ReportActionItemDto>>(r.ActionItemsJson, new List<ReportActionItemDto>()).Count,
            HasAiDigest = !string.IsNullOrWhiteSpace(r.AiExecutiveDigest),
            r.ReviewStatus,
            r.AdminRemarks,
            r.IsSharedWithMembers,
            r.CreatedAt
        };

        private static object MapReportDetail(BcpCommitteeReport r) => new
        {
            r.Id,
            r.CommitteeId,
            CommitteeName = r.Committee?.Name ?? "",
            r.Title,
            r.SubmittedByUserId,
            r.SubmittedByName,
            r.MeetingDate,
            r.Summary,
            r.RichMinutesContent,
            r.DecisionsText,
            ActionItems = ParseJsonOrDefault<List<ReportActionItemDto>>(r.ActionItemsJson, new List<ReportActionItemDto>()),
            AttendanceRollCall = ParseJsonOrDefault<List<AttendanceRollCallItemDto>>(r.AttendanceRollCallJson, new List<AttendanceRollCallItemDto>()),
            r.PresentCount,
            r.ExcusedCount,
            r.AbsentCount,
            CustomMetricsValues = ParseJsonOrDefault<Dictionary<string, decimal>>(r.CustomMetricsValuesJson, new Dictionary<string, decimal>()),
            UploadedFiles = ParseJsonOrDefault<List<ReportUploadedFileDto>>(r.UploadedFilesJson, new List<ReportUploadedFileDto>()),
            CloudLinks = ParseJsonOrDefault<List<ReportCloudLinkDto>>(r.CloudLinksJson, new List<ReportCloudLinkDto>()),
            r.AiExecutiveDigest,
            r.ReviewStatus,
            r.AdminRemarks,
            r.ReviewedAt,
            r.IsSharedWithMembers,
            r.CreatedAt,
            r.UpdatedAt
        };
    }

    // =========================================================================
    // REQUEST & RESPONSE DATA TRANSFER OBJECTS (DTOs)
    // =========================================================================

    /// <summary>
    /// Defines an optional numeric KPI metric captured on committee meeting reports.
    /// </summary>
    public class CommitteeMetricSchemaDto
    {
        /// <summary>Unique metric identifier key.</summary>
        public string Key { get; set; } = string.Empty;
        /// <summary>Display label shown on the report composer.</summary>
        public string Label { get; set; } = string.Empty;
        /// <summary>Optional unit label (e.g. "Hours", "People").</summary>
        public string? Unit { get; set; }
    }

    /// <summary>
    /// Payload for updating workspace committee settings and terminology aliases.
    /// </summary>
    public class UpdateCommitteeSettingsDto
    {
        /// <summary>Singular alias (e.g. "Ministry", "Actor Group").</summary>
        public string AliasSingular { get; set; } = "Committee";
        /// <summary>Plural alias (e.g. "Ministries", "Actor Groups").</summary>
        public string AliasPlural { get; set; } = "Committees";
        /// <summary>Singular sub-group alias (e.g. "Unit", "Cast").</summary>
        public string SubGroupAliasSingular { get; set; } = "Sub-Group";
        /// <summary>Plural sub-group alias (e.g. "Units", "Casts").</summary>
        public string SubGroupAliasPlural { get; set; } = "Sub-Groups";
        /// <summary>Leader role display alias (e.g. "Chairperson", "Director").</summary>
        public string LeaderTitleAlias { get; set; } = "Chairperson";
        /// <summary>Secretary role display alias (e.g. "Secretary", "Stage Manager").</summary>
        public string SecretaryTitleAlias { get; set; } = "Secretary";
        /// <summary>Allows external public registration links.</summary>
        public bool AllowExternalRegistration { get; set; } = true;
        /// <summary>Requires approval for external applicants.</summary>
        public bool RequireApprovalForExternal { get; set; } = true;
        /// <summary>Auto-provisions a member profile when an external applicant is approved.</summary>
        public bool AutoProvisionMemberOnApprove { get; set; } = true;
        /// <summary>Optional default Extra-Info form ID.</summary>
        public Guid? DefaultExtraInfoFormId { get; set; }
        /// <summary>Allows Google Docs / Sheets / Cloud Notebook linking.</summary>
        public bool AllowGoogleCloudLinking { get; set; } = true;
        /// <summary>Allows ordinary members to submit reports.</summary>
        public bool AllowAnyMemberReportSubmission { get; set; } = false;
        /// <summary>Maximum upload file size in MB.</summary>
        public int MaxUploadSizeMb { get; set; } = 25;
        /// <summary>Report reminder cadence ("None", "Weekly", "BiWeekly", "Monthly").</summary>
        public string ReportReminderCadence { get; set; } = "Monthly";
        /// <summary>Optional custom numeric report KPIs.</summary>
        public List<CommitteeMetricSchemaDto>? CustomReportMetrics { get; set; }
    }

    /// <summary>
    /// Payload for creating or updating a Committee or nested Sub-Group.
    /// </summary>
    public class UpsertCommitteeDto
    {
        /// <summary>Optional parent committee ID when creating a nested Sub-Group.</summary>
        public Guid? ParentCommitteeId { get; set; }
        /// <summary>Display name.</summary>
        public string Name { get; set; } = string.Empty;
        /// <summary>Optional custom URL slug.</summary>
        public string? Slug { get; set; }
        /// <summary>Short reference code.</summary>
        public string? Code { get; set; }
        /// <summary>Classification tag.</summary>
        public string? CategoryTag { get; set; }
        /// <summary>Detailed description.</summary>
        public string? Description { get; set; }
        /// <summary>Short mission statement.</summary>
        public string? MissionStatement { get; set; }
        /// <summary>Recurring meeting schedule text.</summary>
        public string? MeetingSchedule { get; set; }
        /// <summary>Physical venue or online meeting URL.</summary>
        public string? MeetingLocationOrLink { get; set; }
        /// <summary>Cover banner URL.</summary>
        public string? CoverBannerUrl { get; set; }
        /// <summary>Material Symbol icon name.</summary>
        public string IconName { get; set; } = "diversity_3";
        /// <summary>Visibility tier: "Public", "ApprovalRequired", or "Private".</summary>
        public string Visibility { get; set; } = "Public";
        /// <summary>Lifecycle status: "Active", "Suspended", or "Archived".</summary>
        public string Status { get; set; } = "Active";
        /// <summary>Optional maximum roster capacity.</summary>
        public int? MaxCapacity { get; set; }
        /// <summary>Enables external registration link.</summary>
        public bool AllowExternalRegistration { get; set; } = true;
        /// <summary>Requires approval before enrollment.</summary>
        public bool RequireApproval { get; set; } = false;
        /// <summary>Optional attached Extra-Info Form ID.</summary>
        public Guid? ExtraInfoFormId { get; set; }
    }

    /// <summary>
    /// Payload for directly enrolling a workspace user into a committee.
    /// </summary>
    public class AddCommitteeMemberDto
    {
        /// <summary>Target UserProfile ID.</summary>
        public string UserProfileId { get; set; } = string.Empty;
        /// <summary>Micro-role ("Chairperson", "CoChair", "Secretary", "Coordinator", "Member").</summary>
        public string Role { get; set; } = "Member";
        /// <summary>Optional custom portfolio badge.</summary>
        public string? CustomRoleTitle { get; set; }
    }

    /// <summary>
    /// Payload for updating a member's committee role or status.
    /// </summary>
    public class UpdateCommitteeMemberDto
    {
        /// <summary>Updated micro-role.</summary>
        public string? Role { get; set; }
        /// <summary>Updated custom badge title.</summary>
        public string? CustomRoleTitle { get; set; }
        /// <summary>Updated status ("Active", "Suspended").</summary>
        public string? Status { get; set; }
    }

    /// <summary>
    /// Schema definition for a single field in an Extra-Info Form.
    /// </summary>
    public class CommitteeFormFieldDto
    {
        /// <summary>Field unique ID.</summary>
        public string Id { get; set; } = Guid.NewGuid().ToString("N")[..8];
        /// <summary>Field machine key.</summary>
        public string Key { get; set; } = string.Empty;
        /// <summary>Human-readable question label.</summary>
        public string Label { get; set; } = string.Empty;
        /// <summary>Input control type ("text", "textarea", "number", "select", "multiselect", "date", "url", "file", "checkbox").</summary>
        public string Type { get; set; } = "text";
        /// <summary>Clean format placeholder.</summary>
        public string? Placeholder { get; set; }
        /// <summary>Marks field mandatory.</summary>
        public bool Required { get; set; }
        /// <summary>Options list for select / multiselect controls.</summary>
        public List<string>? Options { get; set; }
        /// <summary>Optional helper hint text.</summary>
        public string? HelpText { get; set; }
    }

    /// <summary>
    /// Payload for creating or updating an Extra-Info Form.
    /// </summary>
    public class UpsertCommitteeFormDto
    {
        /// <summary>Form title.</summary>
        public string Title { get; set; } = string.Empty;
        /// <summary>Form instructions.</summary>
        public string? Description { get; set; }
        /// <summary>Sets as default across groups without an explicit form.</summary>
        public bool IsGlobalDefault { get; set; }
        /// <summary>Active flag.</summary>
        public bool IsActive { get; set; } = true;
        /// <summary>Ordered extra-info fields.</summary>
        public List<CommitteeFormFieldDto>? Fields { get; set; }
    }

    /// <summary>
    /// Payload for reviewing an applicant registration.
    /// </summary>
    public class ReviewRegistrationDto
    {
        /// <summary>"Approve", "Reassign", or "Decline".</summary>
        public string Decision { get; set; } = "Approve";
        /// <summary>Target committee ID when reassigning.</summary>
        public Guid? ReassignCommitteeId { get; set; }
        /// <summary>Initial role upon approval.</summary>
        public string AssignedRole { get; set; } = "Member";
        /// <summary>Optional reviewer notes.</summary>
        public string? ReviewNotes { get; set; }
    }

    /// <summary>
    /// Payload for signed-in member 1-click join with supplemental Extra-Info answers.
    /// </summary>
    public class WorkspaceJoinCommitteeDto
    {
        /// <summary>Extra-Info question responses.</summary>
        public Dictionary<string, object>? ExtraInfoResponses { get; set; }
        /// <summary>Optional uploaded file URLs.</summary>
        public List<string>? AttachmentUrls { get; set; }
    }

    /// <summary>
    /// Attendance roll-call entry inside a meeting report.
    /// </summary>
    public class AttendanceRollCallItemDto
    {
        /// <summary>Member UserProfile ID.</summary>
        public string UserId { get; set; } = string.Empty;
        /// <summary>Member full name.</summary>
        public string FullName { get; set; } = string.Empty;
        /// <summary>"Present", "Excused", or "Absent".</summary>
        public string Status { get; set; } = "Present";
    }

    /// <summary>
    /// Follow-up action item tracked inside a meeting report.
    /// </summary>
    public class ReportActionItemDto
    {
        /// <summary>Action item ID.</summary>
        public string Id { get; set; } = Guid.NewGuid().ToString("N")[..8];
        /// <summary>Action description.</summary>
        public string Task { get; set; } = string.Empty;
        /// <summary>Optional assigned member UserProfile ID.</summary>
        public string? AssigneeUserId { get; set; }
        /// <summary>Assigned member display name.</summary>
        public string? AssigneeName { get; set; }
        /// <summary>Target due date string.</summary>
        public string? DueDate { get; set; }
        /// <summary>"Pending" or "Done".</summary>
        public string Status { get; set; } = "Pending";
    }

    /// <summary>
    /// Static uploaded file descriptor attached to a meeting report.
    /// </summary>
    public class ReportUploadedFileDto
    {
        /// <summary>Original file name.</summary>
        public string FileName { get; set; } = string.Empty;
        /// <summary>Accessible download URL.</summary>
        public string FileUrl { get; set; } = string.Empty;
        /// <summary>Uppercase file extension/type.</summary>
        public string? FileType { get; set; }
        /// <summary>File size in bytes.</summary>
        public long SizeBytes { get; set; }
    }

    /// <summary>
    /// Live Google Doc / Sheet / Notebook or Cloud URL descriptor attached to a meeting report.
    /// </summary>
    public class ReportCloudLinkDto
    {
        /// <summary>Link entry ID.</summary>
        public string Id { get; set; } = Guid.NewGuid().ToString("N")[..8];
        /// <summary>Cloud provider identifier.</summary>
        public string? Provider { get; set; }
        /// <summary>Document title.</summary>
        public string Title { get; set; } = string.Empty;
        /// <summary>Canonical cloud document URL.</summary>
        public string Url { get; set; } = string.Empty;
        /// <summary>External Google Drive file ID if selected via Google Picker.</summary>
        public string? ExternalFileId { get; set; }
        /// <summary>Connected Google account email.</summary>
        public string? OwnerEmail { get; set; }
        /// <summary>When true, pins this cloud doc to the committee's permanent shelf.</summary>
        public bool PinToGroupShelf { get; set; } = true;
    }

    /// <summary>
    /// Payload for submitting a multi-modal meeting report.
    /// </summary>
    public class SubmitCommitteeReportDto
    {
        /// <summary>Target committee ID.</summary>
        public Guid CommitteeId { get; set; }
        /// <summary>Meeting or report headline.</summary>
        public string Title { get; set; } = string.Empty;
        /// <summary>Date of the session.</summary>
        public DateTime? MeetingDate { get; set; }
        /// <summary>Executive summary.</summary>
        public string? Summary { get; set; }
        /// <summary>Typed meeting minutes content.</summary>
        public string? RichMinutesContent { get; set; }
        /// <summary>Key resolutions / decisions.</summary>
        public string? DecisionsText { get; set; }
        /// <summary>Assigned follow-up action items.</summary>
        public List<ReportActionItemDto>? ActionItems { get; set; }
        /// <summary>Roster attendance roll-call.</summary>
        public List<AttendanceRollCallItemDto>? AttendanceRollCall { get; set; }
        /// <summary>Manual present headcount when roll-call list is omitted.</summary>
        public int PresentCount { get; set; }
        /// <summary>Manual excused headcount.</summary>
        public int ExcusedCount { get; set; }
        /// <summary>Manual absent headcount.</summary>
        public int AbsentCount { get; set; }
        /// <summary>Optional custom numeric KPI values.</summary>
        public Dictionary<string, decimal>? CustomMetricsValues { get; set; }
        /// <summary>Uploaded files list.</summary>
        public List<ReportUploadedFileDto>? UploadedFiles { get; set; }
        /// <summary>Connected Google Docs / Sheets / Cloud Notebook links.</summary>
        public List<ReportCloudLinkDto>? CloudLinks { get; set; }
        /// <summary>Whether group members can read this report.</summary>
        public bool IsSharedWithMembers { get; set; } = true;
    }

    /// <summary>
    /// Payload for administrative review of a submitted report.
    /// </summary>
    public class ReviewCommitteeReportDto
    {
        /// <summary>"Reviewed" or "ActionNeeded".</summary>
        public string ReviewStatus { get; set; } = "Reviewed";
        /// <summary>Official administrative remarks.</summary>
        public string? AdminRemarks { get; set; }
    }

    /// <summary>
    /// Payload for linking a Google Doc, Google Sheet, Notebook, or Cloud URL to the vault or group shelf.
    /// </summary>
    public class LinkCloudDocumentDto
    {
        /// <summary>Optional committee ID when pinning to a group's shared shelf.</summary>
        public Guid? CommitteeId { get; set; }
        /// <summary>Provider identifier ("GoogleDocs", "GoogleSheets", "GoogleNotebook", "ExcelOnline", etc.).</summary>
        public string? Provider { get; set; }
        /// <summary>Document title.</summary>
        public string Title { get; set; } = string.Empty;
        /// <summary>Cloud document URL.</summary>
        public string DocumentUrl { get; set; } = string.Empty;
        /// <summary>Optional external file ID from Google Picker.</summary>
        public string? ExternalFileId { get; set; }
        /// <summary>Connected Google / cloud account email.</summary>
        public string? ConnectedAccountEmail { get; set; }
        /// <summary>Whether to pin to the committee's shared shelf.</summary>
        public bool IsPinnedToShelf { get; set; } = true;
    }
}
