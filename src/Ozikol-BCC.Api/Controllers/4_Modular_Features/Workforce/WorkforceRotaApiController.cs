using static Ozikol_BCC.Domain.Enum.Enum;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Application.Interfaces.Services;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Api.Authorization;
using Ozikol_BCC.Infrastructure.TenantSupport;
using Ozikol_BCC.Persistence.EF.SQL;

namespace Ozikol_BCC.Api.Controllers
{
    /// <summary>
    /// Core operational API controller for Staff Rota &amp; Shift Management (<c>bcp-staff-rota</c>).
    /// Manages 24/7 cross-midnight shift scheduling, client site geofences, guard shift confirmations,
    /// peer shift swaps, open-shift claims, and staff leave blackouts.
    /// </summary>
    [ApiController]
    [Route("api/workforce")]
    [RequireFeature("bcp-staff-rota")]
    [Tags("Workforce Rota & Shift Operations")]
    public class WorkforceRotaApiController : ControllerBase
    {
        private readonly DashboardDbContext _db;
        private readonly MasterCatalogDbContext? _master;
        private readonly ICentralNotificationDispatcher? _notificationDispatcher;
        private readonly ITenantProvider? _tenantProvider;
        private readonly ITenantFeatureGateService? _featureGateService;
        private readonly UserManager<Profile>? _userManager;

        /// <summary>
        /// In-memory single-use invitation registry ensuring resilient one-time token tracking.
        /// </summary>
        private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, Invitation> _memoryInvitations =
            new(StringComparer.Ordinal);

        /// <summary>
        /// Computes a compact 64-character lookup key suitable for the <see cref="Invitation.Token"/> column (<c>StringLength(100)</c>).
        /// </summary>
        private static string ComputeTokenStorageKey(string rawToken)
        {
            if (string.IsNullOrWhiteSpace(rawToken)) return string.Empty;
            var trimmed = rawToken.Trim();
            if (trimmed.Length <= 96) return trimmed;
            var hash = SHA256.HashData(Encoding.UTF8.GetBytes(trimmed));
            return Convert.ToHexString(hash).ToLowerInvariant();
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="WorkforceRotaApiController"/> class.
        /// </summary>
        public WorkforceRotaApiController(
            DashboardDbContext db,
            MasterCatalogDbContext? master = null,
            ICentralNotificationDispatcher? notificationDispatcher = null,
            ITenantProvider? tenantProvider = null,
            ITenantFeatureGateService? featureGateService = null,
            UserManager<Profile>? userManager = null)
        {
            _db = db;
            _master = master;
            _notificationDispatcher = notificationDispatcher;
            _tenantProvider = tenantProvider;
            _featureGateService = featureGateService;
            _userManager = userManager;
        }

        private string CurrentTenantKey => ResolveCurrentTenantKey();
        private string CurrentUserId => User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "anonymous";
        private string CurrentUserName => User.FindFirst(ClaimTypes.Name)?.Value ?? User.FindFirst("name")?.Value ?? "Staff Member";

        /// <summary>
        /// Resolves the active running currency code and symbol for the current tenant from the Central Master Catalog database.
        /// Defaults to NGN / ₦ if unconfigured or unreachable.
        /// </summary>
        private async Task<(string Code, string Symbol)> ResolveTenantCurrencyAsync(CancellationToken ct = default)
        {
            if (_master == null) return ("NGN", "₦");
            try
            {
                var tenantKey = CurrentTenantKey;
                var tenant = await _master.MasterTenantCatalogs.AsNoTracking()
                    .FirstOrDefaultAsync(t => t.TenantKey.ToLower() == tenantKey.ToLower(), ct);

                var currCode = !string.IsNullOrWhiteSpace(tenant?.DefaultCurrencyCode)
                    ? tenant.DefaultCurrencyCode.Trim().ToUpperInvariant()
                    : "NGN";

                var rateObj = await _master.MasterCurrencyRates.AsNoTracking()
                    .FirstOrDefaultAsync(r => r.IsActive && r.CurrencyCode.ToUpper() == currCode, ct);

                var symbol = rateObj?.CurrencySymbol ?? (currCode == "NGN" ? "₦" : "$");
                return (currCode, symbol);
            }
            catch
            {
                return ("NGN", "₦");
            }
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
            return "default";
        }

        // =========================================================================
        // 1. CLIENT SITES & POSTS
        // =========================================================================

        /// <summary>
        /// Retrieves the list of active client operating sites with geofence profiles and post assignment instructions.
        /// </summary>
        [HttpGet("sites")]
        public async Task<ActionResult<ApiResponse<List<ClientSiteDto>>>> GetSites(CancellationToken ct)
        {
            var sites = await _db.BcpClientSites
                .AsNoTracking()
                .Where(s => s.TenantKey == CurrentTenantKey && s.IsActive)
                .OrderBy(s => s.SiteName)
                .Select(s => new ClientSiteDto
                {
                    Id = s.Id,
                    SiteCode = s.SiteCode,
                    SiteName = s.SiteName,
                    Address = s.Address,
                    City = s.City,
                    PostalCode = s.PostalCode,
                    Latitude = s.Latitude,
                    Longitude = s.Longitude,
                    GeofenceRadiusMeters = s.GeofenceRadiusMeters,
                    EmergencyContactName = s.EmergencyContactName,
                    EmergencyContactEmail = s.EmergencyContactEmail,
                    EmergencyContactPhone = s.EmergencyContactPhone,
                    SiteAssignmentInstructions = s.SiteAssignmentInstructions,
                    RequiredSiaLicenceType = s.RequiredSiaLicenceType,
                    ActiveShiftsCount = s.Shifts.Count(sh => sh.Status == "Scheduled" || sh.Status == "InProgress"),
                    ClientOrganizationId = s.ClientOrganizationId,
                    ClientOrganizationName = s.ClientOrganizationName
                })
                .ToListAsync(ct);

            return Ok(ApiResponse<List<ClientSiteDto>>.SuccessResponse(sites, "Client sites retrieved successfully."));
        }

        /// <summary>
        /// Retrieves a single client operating site by ID.
        /// </summary>
        [HttpGet("sites/{id:guid}")]
        public async Task<ActionResult<ApiResponse<ClientSiteDto>>> GetSiteById(Guid id, CancellationToken ct)
        {
            var s = await _db.BcpClientSites
                .AsNoTracking()
                .Where(s => s.TenantKey == CurrentTenantKey && s.Id == id && s.IsActive)
                .Select(s => new ClientSiteDto
                {
                    Id = s.Id,
                    SiteCode = s.SiteCode,
                    SiteName = s.SiteName,
                    Address = s.Address,
                    City = s.City,
                    PostalCode = s.PostalCode,
                    Latitude = s.Latitude,
                    Longitude = s.Longitude,
                    GeofenceRadiusMeters = s.GeofenceRadiusMeters,
                    EmergencyContactName = s.EmergencyContactName,
                    EmergencyContactEmail = s.EmergencyContactEmail,
                    EmergencyContactPhone = s.EmergencyContactPhone,
                    SiteAssignmentInstructions = s.SiteAssignmentInstructions,
                    RequiredSiaLicenceType = s.RequiredSiaLicenceType,
                    ActiveShiftsCount = s.Shifts.Count(sh => sh.Status == "Scheduled" || sh.Status == "InProgress"),
                    ClientOrganizationId = s.ClientOrganizationId,
                    ClientOrganizationName = s.ClientOrganizationName
                })
                .FirstOrDefaultAsync(ct);

            if (s == null)
            {
                return NotFound(ApiResponse<ClientSiteDto>.FailureResponse("Client site not found.", errorCode: "ERR-2004"));
            }

            return Ok(ApiResponse<ClientSiteDto>.SuccessResponse(s, "Client site retrieved successfully."));
        }

        /// <summary>
        /// Retrieves complete operational duty activity, past/present/future shifts, rostered personnel,
        /// and fine records for a specific client site.
        /// </summary>
        [HttpGet("sites/{siteId:guid}/activity")]
        public async Task<ActionResult<ApiResponse<SiteActivityResponse>>> GetSiteActivity(Guid siteId, CancellationToken ct)
        {
            var site = await _db.BcpClientSites
                .AsNoTracking()
                .Where(s => s.TenantKey == CurrentTenantKey && s.Id == siteId && s.IsActive)
                .Select(s => new ClientSiteDto
                {
                    Id = s.Id,
                    SiteCode = s.SiteCode,
                    SiteName = s.SiteName,
                    Address = s.Address,
                    City = s.City,
                    PostalCode = s.PostalCode,
                    Latitude = s.Latitude,
                    Longitude = s.Longitude,
                    GeofenceRadiusMeters = s.GeofenceRadiusMeters,
                    EmergencyContactName = s.EmergencyContactName,
                    EmergencyContactPhone = s.EmergencyContactPhone,
                    SiteAssignmentInstructions = s.SiteAssignmentInstructions,
                    RequiredSiaLicenceType = s.RequiredSiaLicenceType,
                    ActiveShiftsCount = s.Shifts.Count(sh => sh.Status == "Scheduled" || sh.Status == "InProgress"),
                    ClientOrganizationId = s.ClientOrganizationId,
                    ClientOrganizationName = s.ClientOrganizationName
                })
                .FirstOrDefaultAsync(ct);

            if (site == null)
            {
                return NotFound(ApiResponse<SiteActivityResponse>.FailureResponse("Client site not found.", errorCode: "ERR-2004"));
            }

            var shifts = await _db.BcpShifts
                .AsNoTracking()
                .Include(s => s.AttendanceRecord)
                .Where(s => s.TenantKey == CurrentTenantKey && s.ClientSiteId == siteId)
                .OrderByDescending(s => s.StartsAtUtc)
                .Select(s => new ShiftDto
                {
                    Id = s.Id,
                    ShiftCode = s.ShiftCode,
                    ClientSiteId = s.ClientSiteId,
                    SiteName = site.SiteName,
                    SiteAddress = site.Address,
                    PostName = s.PostName,
                    FacilityName = s.FacilityName,
                    Address = s.Address,
                    PostCode = s.PostCode,
                    EventTag = s.EventTag,
                    AssignedUserId = s.AssignedUserId,
                    AssignedUserName = s.AssignedUserName,
                    StartsAtUtc = s.StartsAtUtc,
                    EndsAtUtc = s.EndsAtUtc,
                    IsOvernight = s.IsOvernight,
                    BreakMinutes = s.BreakMinutes,
                    PlannedDurationHours = s.PlannedDurationHours,
                    HourlyPayRate = s.HourlyPayRate,
                    HourlyChargeRate = s.HourlyChargeRate,
                    RequiredWorkspaceStationId = s.RequiredWorkspaceStationId,
                    RequiredWorkspaceStationName = s.RequiredWorkspaceStationName,
                    Status = s.Status,
                    IsConfirmedByGuard = s.IsConfirmedByGuard,
                    ConfirmedAtUtc = s.ConfirmedAtUtc,
                    AcceptanceDeadlineUtc = s.AcceptanceDeadlineUtc,
                    Notes = s.Notes,
                    IsClockedIn = s.AttendanceRecord != null && s.AttendanceRecord.ClockInUtc.HasValue && !s.AttendanceRecord.ClockOutUtc.HasValue,
                    IsClockedOut = s.AttendanceRecord != null && s.AttendanceRecord.ClockOutUtc.HasValue,
                    ReportSubmissionUtc = s.ReportSubmissionUtc,
                    ReportContent = s.ReportContent,
                    FineAttached = s.FineAttached,
                    FineAmount = s.FineAmount,
                    FineReason = s.FineReason,
                    FineAuthorizedBy = s.FineAuthorizedBy,
                    FineStatus = s.FineStatus,
                    ClockInUtc = s.AttendanceRecord != null ? s.AttendanceRecord.ClockInUtc : null,
                    ClockOutUtc = s.AttendanceRecord != null ? s.AttendanceRecord.ClockOutUtc : null,
                    IsClockInGeofenceVerified = s.AttendanceRecord != null && s.AttendanceRecord.IsClockInGeofenceVerified,
                    IsClockOutGeofenceVerified = s.AttendanceRecord != null && s.AttendanceRecord.IsClockOutGeofenceVerified,
                    ClockInDistanceFromSiteMeters = s.AttendanceRecord != null ? s.AttendanceRecord.ClockInDistanceFromSiteMeters : null,
                    LateArrivalMinutes = s.AttendanceRecord != null ? s.AttendanceRecord.LateArrivalMinutes : 0,
                    IsFlagged = s.AttendanceRecord != null && s.AttendanceRecord.IsFlagged,
                    FlagReason = s.AttendanceRecord != null ? s.AttendanceRecord.FlagReason : null,
                    ActualDurationHours = s.AttendanceRecord != null ? s.AttendanceRecord.ActualDurationHours : null,
                    BillableHours = s.AttendanceRecord != null ? s.AttendanceRecord.BillableHours : null,
                    ClockInPhotoUrl = s.AttendanceRecord != null ? s.AttendanceRecord.ClockInPhotoUrl : null,
                    ClockOutPhotoUrl = s.AttendanceRecord != null ? s.AttendanceRecord.ClockOutPhotoUrl : null,
                    SupervisorNotes = s.AttendanceRecord != null ? s.AttendanceRecord.SupervisorNotes : null,
                    SupervisorApproved = s.AttendanceRecord != null && s.AttendanceRecord.SupervisorApproved
                })
                .ToListAsync(ct);

            var roster = shifts
                .Where(s => !string.IsNullOrWhiteSpace(s.AssignedUserId))
                .GroupBy(s => s.AssignedUserId!)
                .Select(g =>
                {
                    var first = g.First();
                    var totalHours = g.Sum(x => x.ActualDurationHours ?? x.PlannedDurationHours);
                    var completedCount = g.Count(x => x.Status == "Completed");
                    var lateCount = g.Count(x => x.LateArrivalMinutes > 0);
                    var onTimePercent = g.Count() > 0 ? Math.Round(((g.Count() - lateCount) / (decimal)g.Count()) * 100, 1) : 100m;

                    return new SiteStaffRosterItemDto
                    {
                        UserId = g.Key,
                        FullName = first.AssignedUserName ?? "Staff Member",
                        JobTitle = first.PostName,
                        TotalShiftsAtSite = g.Count(),
                        CompletedShiftsAtSite = completedCount,
                        TotalHoursAtSite = totalHours,
                        PunctualityScorePercent = onTimePercent,
                        LastDutyDateUtc = g.Max(x => x.StartsAtUtc),
                        TotalFinesAmount = g.Where(x => x.FineAttached).Sum(x => x.FineAmount ?? 0m)
                    };
                })
                .OrderByDescending(r => r.TotalShiftsAtSite)
                .ToList();

            var response = new SiteActivityResponse
            {
                Site = site,
                TotalShiftsCount = shifts.Count,
                ActiveShiftsCount = shifts.Count(s => s.Status == "InProgress"),
                CompletedShiftsCount = shifts.Count(s => s.Status == "Completed"),
                ScheduledShiftsCount = shifts.Count(s => s.Status == "Scheduled" || s.Status == "Confirmed"),
                TotalHoursLogged = shifts.Sum(s => s.ActualDurationHours ?? (s.Status == "Completed" ? s.PlannedDurationHours : 0m)),
                TotalFinesAmount = shifts.Where(s => s.FineAttached).Sum(s => s.FineAmount ?? 0m),
                UniqueStaffCount = roster.Count,
                Shifts = shifts,
                StaffRoster = roster
            };

            return Ok(ApiResponse<SiteActivityResponse>.SuccessResponse(response, "Site duty activity retrieved successfully."));
        }

        /// <summary>
        /// Retrieves full duty inspection details, attendance telemetry, occurrence report, and attached fines for a single shift.
        /// </summary>
        [HttpGet("shifts/{id:guid}/report")]
        public async Task<ActionResult<ApiResponse<ShiftDto>>> GetShiftDutyReport(Guid id, CancellationToken ct)
        {
            return await GetShift(id, ct);
        }

        /// <summary>
        /// Submits or updates the post duty report, occurrence book entries, security observations, and optional administrative fines.
        /// </summary>
        [HttpPost("shifts/{id:guid}/report")]
        public async Task<ActionResult<ApiResponse<bool>>> SubmitShiftDutyReport(Guid id, [FromBody] SubmitDutyReportRequest request, CancellationToken ct)
        {
            var shift = await _db.BcpShifts.FirstOrDefaultAsync(s => s.Id == id && s.TenantKey == CurrentTenantKey, ct);
            if (shift == null)
            {
                return NotFound(ApiResponse<bool>.FailureResponse("Shift record not found.", errorCode: "ERR-2004"));
            }

            shift.ReportContent = request.ReportContent;
            shift.ReportSubmissionUtc = DateTime.UtcNow;
            if (!string.IsNullOrWhiteSpace(request.DutyStatus))
            {
                shift.Status = request.DutyStatus;
            }

            shift.FineAttached = request.FineAttached;
            if (request.FineAttached)
            {
                shift.FineAmount = request.FineAmount;
                shift.FineReason = request.FineReason;
                shift.FineAuthorizedBy = !string.IsNullOrWhiteSpace(request.FineAuthorizedBy) ? request.FineAuthorizedBy : CurrentUserName;
                shift.FineStatus = !string.IsNullOrWhiteSpace(request.FineStatus) ? request.FineStatus : "Applied";
            }
            else
            {
                shift.FineAmount = null;
                shift.FineReason = null;
                shift.FineAuthorizedBy = null;
                shift.FineStatus = null;
            }

            shift.UpdatedUtc = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);

            return Ok(ApiResponse<bool>.SuccessResponse(true, "Duty report and fine records saved successfully."));
        }

        /// <summary>
        /// Retrieves duty execution history and aggregated performance metrics for a specific staff member.
        /// </summary>
        [HttpGet("members/{userId}/duty-history")]
        public async Task<ActionResult<ApiResponse<StaffDutyHistoryResponse>>> GetStaffDutyHistory(string userId, CancellationToken ct)
        {
            var profile = await _db.BcpShiftStaffProfiles
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.TenantKey == CurrentTenantKey && p.UserId == userId, ct);

            var shifts = await _db.BcpShifts
                .AsNoTracking()
                .Include(s => s.ClientSite)
                .Include(s => s.AttendanceRecord)
                .Where(s => s.TenantKey == CurrentTenantKey && s.AssignedUserId == userId)
                .OrderByDescending(s => s.StartsAtUtc)
                .Select(s => new ShiftDto
                {
                    Id = s.Id,
                    ShiftCode = s.ShiftCode,
                    ClientSiteId = s.ClientSiteId,
                    SiteName = s.ClientSite != null ? s.ClientSite.SiteName : "Unknown Venue",
                    SiteAddress = s.ClientSite != null ? s.ClientSite.Address : string.Empty,
                    PostName = s.PostName,
                    FacilityName = s.FacilityName,
                    Address = s.Address,
                    PostCode = s.PostCode,
                    EventTag = s.EventTag,
                    AssignedUserId = s.AssignedUserId,
                    AssignedUserName = s.AssignedUserName,
                    StartsAtUtc = s.StartsAtUtc,
                    EndsAtUtc = s.EndsAtUtc,
                    IsOvernight = s.IsOvernight,
                    BreakMinutes = s.BreakMinutes,
                    PlannedDurationHours = s.PlannedDurationHours,
                    HourlyPayRate = s.HourlyPayRate,
                    HourlyChargeRate = s.HourlyChargeRate,
                    Status = s.Status,
                    Notes = s.Notes,
                    IsClockedIn = s.AttendanceRecord != null && s.AttendanceRecord.ClockInUtc.HasValue && !s.AttendanceRecord.ClockOutUtc.HasValue,
                    IsClockedOut = s.AttendanceRecord != null && s.AttendanceRecord.ClockOutUtc.HasValue,
                    ReportSubmissionUtc = s.ReportSubmissionUtc,
                    ReportContent = s.ReportContent,
                    FineAttached = s.FineAttached,
                    FineAmount = s.FineAmount,
                    FineReason = s.FineReason,
                    FineAuthorizedBy = s.FineAuthorizedBy,
                    FineStatus = s.FineStatus,
                    ClockInUtc = s.AttendanceRecord != null ? s.AttendanceRecord.ClockInUtc : null,
                    ClockOutUtc = s.AttendanceRecord != null ? s.AttendanceRecord.ClockOutUtc : null,
                    IsClockInGeofenceVerified = s.AttendanceRecord != null && s.AttendanceRecord.IsClockInGeofenceVerified,
                    IsClockOutGeofenceVerified = s.AttendanceRecord != null && s.AttendanceRecord.IsClockOutGeofenceVerified,
                    ClockInDistanceFromSiteMeters = s.AttendanceRecord != null ? s.AttendanceRecord.ClockInDistanceFromSiteMeters : null,
                    LateArrivalMinutes = s.AttendanceRecord != null ? s.AttendanceRecord.LateArrivalMinutes : 0,
                    IsFlagged = s.AttendanceRecord != null && s.AttendanceRecord.IsFlagged,
                    FlagReason = s.AttendanceRecord != null ? s.AttendanceRecord.FlagReason : null,
                    ActualDurationHours = s.AttendanceRecord != null ? s.AttendanceRecord.ActualDurationHours : null,
                    BillableHours = s.AttendanceRecord != null ? s.AttendanceRecord.BillableHours : null,
                    SupervisorNotes = s.AttendanceRecord != null ? s.AttendanceRecord.SupervisorNotes : null,
                    SupervisorApproved = s.AttendanceRecord != null && s.AttendanceRecord.SupervisorApproved
                })
                .ToListAsync(ct);

            var completedShifts = shifts.Where(s => s.Status == "Completed").ToList();
            var totalHours = shifts.Sum(s => s.ActualDurationHours ?? (s.Status == "Completed" ? s.PlannedDurationHours : 0m));
            var totalFines = shifts.Where(s => s.FineAttached).Sum(s => s.FineAmount ?? 0m);
            var lateCount = shifts.Count(s => s.LateArrivalMinutes > 0);
            var punctualityScore = shifts.Count > 0 ? Math.Round(((shifts.Count - lateCount) / (decimal)shifts.Count) * 100, 1) : 100m;

            var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct);
            var fullName = user != null ? $"{user.FirstName} {user.LastName}".Trim() : (shifts.FirstOrDefault()?.AssignedUserName ?? "Staff Member");
            if (string.IsNullOrWhiteSpace(fullName)) fullName = "Staff Member";

            var response = new StaffDutyHistoryResponse
            {
                UserId = userId,
                FullName = fullName,
                JobTitle = profile?.JobTitle ?? "Staff",
                TotalShiftsCount = shifts.Count,
                CompletedShiftsCount = completedShifts.Count,
                TotalHoursWorked = totalHours,
                PunctualityScorePercent = profile != null ? profile.PunctualityScorePercent : punctualityScore,
                TotalFinesCount = shifts.Count(s => s.FineAttached),
                TotalFinesAmount = totalFines,
                Shifts = shifts
            };

            return Ok(ApiResponse<StaffDutyHistoryResponse>.SuccessResponse(response, "Staff duty history retrieved successfully."));
        }

        /// <summary>
        /// Creates or updates a client site profile, including GPS geofence boundary coordinates and emergency contact details.
        /// </summary>
        [HttpPost("sites")]
        public async Task<ActionResult<ApiResponse<Guid>>> UpsertSite([FromBody] UpsertClientSiteRequest request, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(request.SiteName))
            {
                return BadRequest(ApiResponse<Guid>.FailureResponse("Site / Venue name is mandatory.", errorCode: "ERR-2002"));
            }

            if (string.IsNullOrWhiteSpace(request.SiteCode))
            {
                request.SiteCode = "LOC-" + Guid.NewGuid().ToString("N")[..6].ToUpperInvariant();
            }

            BcpClientSite site;
            if (request.Id.HasValue && request.Id != Guid.Empty)
            {
                site = await _db.BcpClientSites.FirstOrDefaultAsync(s => s.Id == request.Id.Value && s.TenantKey == CurrentTenantKey, ct);
                if (site == null)
                {
                    return NotFound(ApiResponse<Guid>.FailureResponse("Client site not found.", errorCode: "ERR-2004"));
                }
            }
            else
            {
                site = new BcpClientSite
                {
                    Id = Guid.CreateVersion7(),
                    TenantKey = CurrentTenantKey,
                    CreatedUtc = DateTime.UtcNow
                };
                _db.BcpClientSites.Add(site);
            }

            site.SiteCode = request.SiteCode.Trim().ToUpperInvariant();
            site.SiteName = request.SiteName.Trim();
            site.Address = request.Address?.Trim() ?? string.Empty;
            site.City = request.City?.Trim() ?? string.Empty;
            site.PostalCode = request.PostalCode?.Trim() ?? string.Empty;
            site.Latitude = request.Latitude;
            site.Longitude = request.Longitude;
            site.GeofenceRadiusMeters = request.GeofenceRadiusMeters > 0 ? request.GeofenceRadiusMeters : 150;
            site.EmergencyContactName = request.EmergencyContactName?.Trim();
            site.EmergencyContactEmail = request.EmergencyContactEmail?.Trim();
            site.EmergencyContactPhone = request.EmergencyContactPhone?.Trim();
            site.SiteAssignmentInstructions = request.SiteAssignmentInstructions?.Trim();
            site.RequiredSiaLicenceType = request.RequiredSiaLicenceType?.Trim();
            site.ClientOrganizationId = request.ClientOrganizationId;
            if (request.ClientOrganizationId.HasValue && request.ClientOrganizationId != Guid.Empty)
            {
                var org = await _db.BcpClientOrganizations.FirstOrDefaultAsync(o => o.Id == request.ClientOrganizationId.Value && o.TenantKey == CurrentTenantKey, ct);
                site.ClientOrganizationName = org?.Name;
            }
            else
            {
                site.ClientOrganizationName = null;
            }
            site.UpdatedUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);
            return Ok(ApiResponse<Guid>.SuccessResponse(site.Id, "Client site saved successfully."));
        }

        // =========================================================================
        // 2. SHIFTS & ROSTER SCHEDULING (Single Source of Truth)
        // =========================================================================

        /// <summary>
        /// Queries scheduled shifts across a specific date range with optional filtering by site, guard, or status.
        /// </summary>
        [HttpGet("shifts")]
        public async Task<ActionResult<ApiResponse<List<ShiftDto>>>> GetShifts(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] Guid? siteId,
            [FromQuery] string? userId,
            [FromQuery] string? status,
            CancellationToken ct)
        {
            var query = _db.BcpShifts
                .AsNoTracking()
                .Include(s => s.ClientSite)
                .Include(s => s.AttendanceRecord)
                .Where(s => s.TenantKey == CurrentTenantKey);

            if (startDate.HasValue)
                query = query.Where(s => s.StartsAtUtc >= startDate.Value.ToUniversalTime());
            if (endDate.HasValue)
                query = query.Where(s => s.EndsAtUtc <= endDate.Value.ToUniversalTime());
            if (siteId.HasValue && siteId != Guid.Empty)
                query = query.Where(s => s.ClientSiteId == siteId.Value);
            if (!string.IsNullOrWhiteSpace(userId))
                query = query.Where(s => s.AssignedUserId == userId);
            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(s => s.Status == status);

            var shifts = await query
                .OrderBy(s => s.StartsAtUtc)
                .Select(s => new ShiftDto
                {
                    Id = s.Id,
                    ShiftCode = s.ShiftCode,
                    ClientSiteId = s.ClientSiteId,
                    SiteName = s.ClientSite != null ? s.ClientSite.SiteName : "Unknown Site",
                    SiteAddress = s.ClientSite != null ? s.ClientSite.Address : string.Empty,
                    PostName = s.PostName,
                    FacilityName = s.FacilityName,
                    Address = s.Address,
                    PostCode = s.PostCode,
                    EventTag = s.EventTag,
                    AssignedUserId = s.AssignedUserId,
                    AssignedUserName = s.AssignedUserName,
                    StartsAtUtc = s.StartsAtUtc,
                    EndsAtUtc = s.EndsAtUtc,
                    IsOvernight = s.IsOvernight,
                    BreakMinutes = s.BreakMinutes,
                    PlannedDurationHours = s.PlannedDurationHours,
                    HourlyPayRate = s.HourlyPayRate,
                    HourlyChargeRate = s.HourlyChargeRate,
                    RequiredWorkspaceStationId = s.RequiredWorkspaceStationId,
                    RequiredWorkspaceStationName = s.RequiredWorkspaceStationName,
                    Status = s.Status,
                    IsConfirmedByGuard = s.IsConfirmedByGuard,
                    ConfirmedAtUtc = s.ConfirmedAtUtc,
                    AcceptanceDeadlineUtc = s.AcceptanceDeadlineUtc,
                    AcceptanceCountdownMinutes = s.AcceptanceDeadlineUtc.HasValue ? (int)Math.Max(0, (s.AcceptanceDeadlineUtc.Value - DateTime.UtcNow).TotalMinutes) : null,
                    Notes = s.Notes,
                    IsClockedIn = s.AttendanceRecord != null && s.AttendanceRecord.ClockInUtc.HasValue && !s.AttendanceRecord.ClockOutUtc.HasValue,
                    IsClockedOut = s.AttendanceRecord != null && s.AttendanceRecord.ClockOutUtc.HasValue,
                    ReportSubmissionUtc = s.ReportSubmissionUtc,
                    ReportContent = s.ReportContent,
                    FineAttached = s.FineAttached,
                    FineAmount = s.FineAmount,
                    FineReason = s.FineReason,
                    FineAuthorizedBy = s.FineAuthorizedBy,
                    FineStatus = s.FineStatus,
                    ClockInUtc = s.AttendanceRecord != null ? s.AttendanceRecord.ClockInUtc : null,
                    ClockOutUtc = s.AttendanceRecord != null ? s.AttendanceRecord.ClockOutUtc : null,
                    IsClockInGeofenceVerified = s.AttendanceRecord != null && s.AttendanceRecord.IsClockInGeofenceVerified,
                    IsClockOutGeofenceVerified = s.AttendanceRecord != null && s.AttendanceRecord.IsClockOutGeofenceVerified,
                    ClockInDistanceFromSiteMeters = s.AttendanceRecord != null ? s.AttendanceRecord.ClockInDistanceFromSiteMeters : null,
                    LateArrivalMinutes = s.AttendanceRecord != null ? s.AttendanceRecord.LateArrivalMinutes : 0,
                    IsFlagged = s.AttendanceRecord != null && s.AttendanceRecord.IsFlagged,
                    FlagReason = s.AttendanceRecord != null ? s.AttendanceRecord.FlagReason : null,
                    ActualDurationHours = s.AttendanceRecord != null ? s.AttendanceRecord.ActualDurationHours : null,
                    BillableHours = s.AttendanceRecord != null ? s.AttendanceRecord.BillableHours : null,
                    ClockInPhotoUrl = s.AttendanceRecord != null ? s.AttendanceRecord.ClockInPhotoUrl : null,
                    ClockOutPhotoUrl = s.AttendanceRecord != null ? s.AttendanceRecord.ClockOutPhotoUrl : null,
                    SupervisorNotes = s.AttendanceRecord != null ? s.AttendanceRecord.SupervisorNotes : null,
                    SupervisorApproved = s.AttendanceRecord != null && s.AttendanceRecord.SupervisorApproved
                })
                .ToListAsync(ct);

            return Ok(ApiResponse<List<ShiftDto>>.SuccessResponse(shifts, "Shifts retrieved successfully."));
        }

        /// <summary>
        /// Returns all upcoming and current shifts assigned specifically to the logged-in member.
        /// </summary>
        [HttpGet("shifts/my")]
        public async Task<ActionResult<ApiResponse<List<ShiftDto>>>> GetMyShifts(CancellationToken ct)
        {
            var nowUtc = DateTime.UtcNow.AddHours(-12); // Include recent shifts
            var myShifts = await _db.BcpShifts
                .AsNoTracking()
                .Include(s => s.ClientSite)
                .Include(s => s.AttendanceRecord)
                .Where(s => s.TenantKey == CurrentTenantKey && s.AssignedUserId == CurrentUserId && s.EndsAtUtc >= nowUtc)
                .OrderBy(s => s.StartsAtUtc)
                .Select(s => new ShiftDto
                {
                    Id = s.Id,
                    ShiftCode = s.ShiftCode,
                    ClientSiteId = s.ClientSiteId,
                    SiteName = s.ClientSite != null ? s.ClientSite.SiteName : "Site",
                    SiteAddress = s.ClientSite != null ? s.ClientSite.Address : string.Empty,
                    PostName = s.PostName,
                    FacilityName = s.FacilityName,
                    Address = s.Address,
                    PostCode = s.PostCode,
                    EventTag = s.EventTag,
                    AssignedUserId = s.AssignedUserId,
                    AssignedUserName = s.AssignedUserName,
                    StartsAtUtc = s.StartsAtUtc,
                    EndsAtUtc = s.EndsAtUtc,
                    IsOvernight = s.IsOvernight,
                    BreakMinutes = s.BreakMinutes,
                    PlannedDurationHours = s.PlannedDurationHours,
                    HourlyPayRate = s.HourlyPayRate,
                    HourlyChargeRate = s.HourlyChargeRate,
                    RequiredWorkspaceStationId = s.RequiredWorkspaceStationId,
                    RequiredWorkspaceStationName = s.RequiredWorkspaceStationName,
                    Status = s.Status,
                    IsConfirmedByGuard = s.IsConfirmedByGuard,
                    ConfirmedAtUtc = s.ConfirmedAtUtc,
                    AcceptanceDeadlineUtc = s.AcceptanceDeadlineUtc,
                    AcceptanceCountdownMinutes = s.AcceptanceDeadlineUtc.HasValue ? (int)Math.Max(0, (s.AcceptanceDeadlineUtc.Value - DateTime.UtcNow).TotalMinutes) : null,
                    Notes = s.Notes,
                    SiteAssignmentInstructions = s.ClientSite != null ? s.ClientSite.SiteAssignmentInstructions : null,
                    EmergencyContactPhone = s.ClientSite != null ? s.ClientSite.EmergencyContactPhone : null,
                    IsClockedIn = s.AttendanceRecord != null && s.AttendanceRecord.ClockInUtc.HasValue && !s.AttendanceRecord.ClockOutUtc.HasValue,
                    IsClockedOut = s.AttendanceRecord != null && s.AttendanceRecord.ClockOutUtc.HasValue
                })
                .ToListAsync(ct);

            return Ok(ApiResponse<List<ShiftDto>>.SuccessResponse(myShifts, "Personal shift roster retrieved."));
        }

        /// <summary>
        /// Returns all unassigned open shifts available for claiming by active staff members.
        /// </summary>
        [HttpGet("shifts/open")]
        public async Task<ActionResult<ApiResponse<List<ShiftDto>>>> GetOpenShifts(CancellationToken ct)
        {
            var nowUtc = DateTime.UtcNow;
            var openShifts = await _db.BcpShifts
                .AsNoTracking()
                .Include(s => s.ClientSite)
                .Where(s => s.TenantKey == CurrentTenantKey &&
                            (string.IsNullOrEmpty(s.AssignedUserId) || s.Status == "Open" || s.Status == "Draft") &&
                            s.EndsAtUtc >= nowUtc)
                .OrderBy(s => s.StartsAtUtc)
                .Select(s => new ShiftDto
                {
                    Id = s.Id,
                    ShiftCode = s.ShiftCode,
                    ClientSiteId = s.ClientSiteId,
                    SiteName = s.ClientSite != null ? s.ClientSite.SiteName : "Site",
                    SiteAddress = s.ClientSite != null ? s.ClientSite.Address : string.Empty,
                    PostName = s.PostName,
                    FacilityName = s.FacilityName,
                    Address = s.Address,
                    PostCode = s.PostCode,
                    EventTag = s.EventTag,
                    StartsAtUtc = s.StartsAtUtc,
                    EndsAtUtc = s.EndsAtUtc,
                    IsOvernight = s.IsOvernight,
                    BreakMinutes = s.BreakMinutes,
                    PlannedDurationHours = s.PlannedDurationHours,
                    HourlyPayRate = s.HourlyPayRate,
                    HourlyChargeRate = s.HourlyChargeRate,
                    Status = "Open",
                    Notes = s.Notes,
                    SiteAssignmentInstructions = s.ClientSite != null ? s.ClientSite.SiteAssignmentInstructions : null
                })
                .ToListAsync(ct);

            return Ok(ApiResponse<List<ShiftDto>>.SuccessResponse(openShifts, "Open shifts retrieved."));
        }

        /// <summary>
        /// Allows the signed-in member to claim an unassigned open shift directly from the rota market.
        /// </summary>
        [HttpPost("shifts/{id}/claim")]
        public async Task<ActionResult<ApiResponse<bool>>> ClaimOpenShiftDirect(Guid id, CancellationToken ct)
        {
            var shift = await _db.BcpShifts
                .FirstOrDefaultAsync(s => s.Id == id && s.TenantKey == CurrentTenantKey, ct);

            if (shift == null)
            {
                return NotFound(ApiResponse<bool>.FailureResponse("Shift not found.", errorCode: "ERR-4004"));
            }

            if (!string.IsNullOrEmpty(shift.AssignedUserId) && shift.AssignedUserId != CurrentUserId)
            {
                return Conflict(ApiResponse<bool>.FailureResponse("This shift has already been claimed by another officer.", errorCode: "ERR-2005"));
            }

            shift.AssignedUserId = CurrentUserId;
            shift.AssignedUserName = CurrentUserName;
            shift.Status = "Assigned";
            shift.IsConfirmedByGuard = true;
            shift.ConfirmedAtUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);
            return Ok(ApiResponse<bool>.SuccessResponse(true, "Shift claimed successfully. It has been added to your schedule."));
        }

        /// <summary>
        /// Returns past duty history and attendance records for the current staff member's timesheet calculations.
        /// </summary>
        [HttpGet("shifts/timesheets")]
        public async Task<ActionResult<ApiResponse<List<ShiftDto>>>> GetMyTimesheets(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            CancellationToken ct)
        {
            var query = _db.BcpShifts
                .AsNoTracking()
                .Include(s => s.ClientSite)
                .Include(s => s.AttendanceRecord)
                .Where(s => s.TenantKey == CurrentTenantKey && s.AssignedUserId == CurrentUserId);

            if (startDate.HasValue)
                query = query.Where(s => s.StartsAtUtc >= startDate.Value.ToUniversalTime());
            if (endDate.HasValue)
                query = query.Where(s => s.EndsAtUtc <= endDate.Value.ToUniversalTime());

            var history = await query
                .OrderByDescending(s => s.StartsAtUtc)
                .Select(s => new ShiftDto
                {
                    Id = s.Id,
                    ShiftCode = s.ShiftCode,
                    ClientSiteId = s.ClientSiteId,
                    SiteName = s.ClientSite != null ? s.ClientSite.SiteName : "Site",
                    SiteAddress = s.ClientSite != null ? s.ClientSite.Address : string.Empty,
                    PostName = s.PostName,
                    FacilityName = s.FacilityName,
                    StartsAtUtc = s.StartsAtUtc,
                    EndsAtUtc = s.EndsAtUtc,
                    PlannedDurationHours = s.PlannedDurationHours,
                    BreakMinutes = s.BreakMinutes,
                    HourlyPayRate = s.HourlyPayRate,
                    Status = s.Status,
                    IsConfirmedByGuard = s.IsConfirmedByGuard,
                    IsClockedIn = s.AttendanceRecord != null && s.AttendanceRecord.ClockInUtc.HasValue,
                    IsClockedOut = s.AttendanceRecord != null && s.AttendanceRecord.ClockOutUtc.HasValue,
                    ClockInUtc = s.AttendanceRecord != null ? s.AttendanceRecord.ClockInUtc : null,
                    ClockOutUtc = s.AttendanceRecord != null ? s.AttendanceRecord.ClockOutUtc : null,
                    ActualDurationHours = s.AttendanceRecord != null && s.AttendanceRecord.ClockInUtc.HasValue && s.AttendanceRecord.ClockOutUtc.HasValue
                        ? (decimal)Math.Round((s.AttendanceRecord.ClockOutUtc.Value - s.AttendanceRecord.ClockInUtc.Value).TotalHours, 2)
                        : s.PlannedDurationHours,
                    FineAttached = s.FineAttached,
                    FineAmount = s.FineAmount,
                    FineReason = s.FineReason,
                    FineAuthorizedBy = s.FineAuthorizedBy,
                    FineStatus = s.FineStatus,
                    ReportSubmissionUtc = s.ReportSubmissionUtc,
                    ReportContent = s.ReportContent
                })
                .ToListAsync(ct);

            return Ok(ApiResponse<List<ShiftDto>>.SuccessResponse(history, "Timesheets retrieved."));
        }

        /// <summary>
        /// Returns all time-off and absence requests submitted by the logged-in staff member.
        /// </summary>
        [HttpGet("leave/my")]
        public async Task<ActionResult<ApiResponse<List<BcpShiftLeaveRequest>>>> GetMyLeaveRequests(CancellationToken ct)
        {
            var requests = await _db.BcpShiftLeaveRequests
                .AsNoTracking()
                .Where(l => l.TenantKey == CurrentTenantKey && l.UserId == CurrentUserId)
                .OrderByDescending(l => l.CreatedUtc)
                .ToListAsync(ct);

            return Ok(ApiResponse<List<BcpShiftLeaveRequest>>.SuccessResponse(requests, "Staff leave records retrieved."));
        }

        /// <summary>
        /// Creates a new planned shift with automatic cross-midnight overnight detection, break deduction,
        /// and rest-period/double-booking conflict checks.
        /// </summary>
        [HttpPost("shifts")]
        public async Task<ActionResult<ApiResponse<Guid>>> CreateShift([FromBody] CreateShiftRequest request, CancellationToken ct)
        {
            if (request.ClientSiteId == Guid.Empty || request.StartsAtUtc >= request.EndsAtUtc)
            {
                return BadRequest(ApiResponse<Guid>.FailureResponse("Valid site and end time greater than start time are required.", errorCode: "ERR-2001"));
            }

            var startUtc = request.StartsAtUtc.ToUniversalTime();
            var endUtc = request.EndsAtUtc.ToUniversalTime();

            // Conflict Check: Double-booking prevention
            if (!string.IsNullOrWhiteSpace(request.AssignedUserId))
            {
                var hasOverlap = await _db.BcpShifts.AnyAsync(s =>
                    s.TenantKey == CurrentTenantKey &&
                    s.AssignedUserId == request.AssignedUserId &&
                    s.Status != "Cancelled" &&
                    s.StartsAtUtc < endUtc &&
                    s.EndsAtUtc > startUtc, ct);

                if (hasOverlap)
                {
                    return Conflict(ApiResponse<Guid>.FailureResponse("This officer is already scheduled for another shift during these hours.", errorCode: "ERR-2005"));
                }
            }

            // Cross-Midnight Overnight Shift Calculation
            bool isOvernight = endUtc.Date > startUtc.Date;
            int breakMins = request.BreakMinutes >= 0 ? request.BreakMinutes : 0;
            decimal totalHours = (decimal)(endUtc - startUtc).TotalHours;
            decimal plannedNetHours = Math.Max(0, totalHours - (breakMins / 60.0m));

            // Generate deterministic shift reference code
            var countToday = await _db.BcpShifts.CountAsync(s => s.TenantKey == CurrentTenantKey && s.StartsAtUtc.Date == startUtc.Date, ct);
            var shiftCode = $"SHF-{startUtc:yyyyMMdd}-{countToday + 1:D3}";

            var shift = new BcpShift
            {
                Id = Guid.CreateVersion7(),
                TenantKey = CurrentTenantKey,
                ShiftCode = shiftCode,
                ClientSiteId = request.ClientSiteId,
                AssignedUserId = request.AssignedUserId,
                AssignedUserName = request.AssignedUserName,
                PostName = string.IsNullOrWhiteSpace(request.PostName) ? "General Post" : request.PostName.Trim(),
                FacilityName = request.FacilityName?.Trim(),
                Address = request.Address?.Trim(),
                PostCode = request.PostCode?.Trim(),
                EventTag = request.EventTag?.Trim(),
                StartsAtUtc = startUtc,
                EndsAtUtc = endUtc,
                IsOvernight = isOvernight,
                BreakMinutes = breakMins,
                PlannedDurationHours = Math.Round(plannedNetHours, 2),
                RequiredWorkspaceStationId = request.RequiredWorkspaceStationId,
                RequiredWorkspaceStationName = request.RequiredWorkspaceStationName,
                HourlyPayRate = request.HourlyPayRate,
                HourlyChargeRate = request.HourlyChargeRate,
                AcceptanceDeadlineUtc = request.AcceptanceDeadlineUtc,
                Status = "Scheduled",
                IsConfirmedByGuard = false,
                Notes = request.Notes?.Trim(),
                CreatedByUserId = CurrentUserId,
                CreatedUtc = DateTime.UtcNow
            };

            _db.BcpShifts.Add(shift);
            await _db.SaveChangesAsync(ct);

            // Dispatch notification to assigned guard
            if (!string.IsNullOrWhiteSpace(shift.AssignedUserId) && _notificationDispatcher != null)
            {
                try
                {
                    await _notificationDispatcher.DispatchAsync(new NotificationDispatchPayload
                    {
                        TargetType = NotificationDispatchTarget.SingleUser,
                        TargetUserId = shift.AssignedUserId,
                        TenantKey = CurrentTenantKey,
                        Title = "New Shift Assigned",
                        Message = $"You have been assigned to shift {shift.ShiftCode} ({startUtc:ddd, dd MMM HH:mm} - {endUtc:HH:mm}). Please review and confirm.",
                        Category = BcpMessageCategory.General,
                        Severity = NotificationSeverity.NewFeature,
                        Channels = NotificationChannels.InApp,
                        Module = "Workforce",
                        Icon = "calendar_month",
                        ActionUrl = "/workforce/my-shifts"
                    }, ct);
                }
                catch
                {
                    // Non-blocking notification dispatch
                }
            }

            return Ok(ApiResponse<Guid>.SuccessResponse(shift.Id, $"Shift {shift.ShiftCode} created successfully."));
        }

        /// <summary>
        /// Allows a scheduled guard to review and confirm acceptance of their assigned shift.
        /// </summary>
        [HttpPost("shifts/{id}/confirm")]
        public async Task<ActionResult<ApiResponse<bool>>> ConfirmShift(Guid id, CancellationToken ct)
        {
            var shift = await _db.BcpShifts.FirstOrDefaultAsync(s => s.Id == id && s.TenantKey == CurrentTenantKey, ct);
            if (shift == null)
            {
                return NotFound(ApiResponse<bool>.FailureResponse("Shift not found.", errorCode: "ERR-2004"));
            }

            shift.IsConfirmedByGuard = true;
            shift.ConfirmedAtUtc = DateTime.UtcNow;
            shift.Status = "Confirmed";
            shift.UpdatedUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);
            return Ok(ApiResponse<bool>.SuccessResponse(true, "Shift confirmed successfully."));
        }

        /// <summary>
        /// Retrieves detailed information for a single scheduled shift.
        /// </summary>
        /// <param name="id">Unique identifier of the shift.</param>
        /// <param name="ct">Cancellation token.</param>
        /// <returns>Populated shift data transfer object.</returns>
        [HttpGet("shifts/{id:guid}")]
        public async Task<ActionResult<ApiResponse<ShiftDto>>> GetShift(Guid id, CancellationToken ct)
        {
            var s = await _db.BcpShifts
                .AsNoTracking()
                .Include(x => x.ClientSite)
                .Include(x => x.AttendanceRecord)
                .FirstOrDefaultAsync(x => x.Id == id && x.TenantKey == CurrentTenantKey, ct);

            if (s == null)
            {
                return NotFound(ApiResponse<ShiftDto>.FailureResponse("Shift not found.", errorCode: "ERR-2004"));
            }

            var dto = new ShiftDto
            {
                Id = s.Id,
                ShiftCode = s.ShiftCode,
                ClientSiteId = s.ClientSiteId,
                SiteName = s.ClientSite != null ? s.ClientSite.SiteName : "Unknown Site",
                SiteAddress = s.ClientSite != null ? s.ClientSite.Address : string.Empty,
                PostName = s.PostName,
                FacilityName = s.FacilityName,
                Address = s.Address,
                PostCode = s.PostCode,
                EventTag = s.EventTag,
                AssignedUserId = s.AssignedUserId,
                AssignedUserName = s.AssignedUserName,
                StartsAtUtc = s.StartsAtUtc,
                EndsAtUtc = s.EndsAtUtc,
                IsOvernight = s.IsOvernight,
                BreakMinutes = s.BreakMinutes,
                PlannedDurationHours = s.PlannedDurationHours,
                HourlyPayRate = s.HourlyPayRate,
                HourlyChargeRate = s.HourlyChargeRate,
                RequiredWorkspaceStationId = s.RequiredWorkspaceStationId,
                RequiredWorkspaceStationName = s.RequiredWorkspaceStationName,
                Status = s.Status,
                IsConfirmedByGuard = s.IsConfirmedByGuard,
                ConfirmedAtUtc = s.ConfirmedAtUtc,
                AcceptanceDeadlineUtc = s.AcceptanceDeadlineUtc,
                AcceptanceCountdownMinutes = s.AcceptanceDeadlineUtc.HasValue ? (int)Math.Max(0, (s.AcceptanceDeadlineUtc.Value - DateTime.UtcNow).TotalMinutes) : null,
                Notes = s.Notes,
                IsClockedIn = s.AttendanceRecord != null && s.AttendanceRecord.ClockInUtc.HasValue && !s.AttendanceRecord.ClockOutUtc.HasValue,
                IsClockedOut = s.AttendanceRecord != null && s.AttendanceRecord.ClockOutUtc.HasValue,
                ReportSubmissionUtc = s.ReportSubmissionUtc,
                ReportContent = s.ReportContent,
                FineAttached = s.FineAttached,
                FineAmount = s.FineAmount,
                FineReason = s.FineReason,
                FineAuthorizedBy = s.FineAuthorizedBy,
                FineStatus = s.FineStatus,
                ClockInUtc = s.AttendanceRecord?.ClockInUtc,
                ClockOutUtc = s.AttendanceRecord?.ClockOutUtc,
                IsClockInGeofenceVerified = s.AttendanceRecord?.IsClockInGeofenceVerified ?? false,
                IsClockOutGeofenceVerified = s.AttendanceRecord?.IsClockOutGeofenceVerified ?? false,
                ClockInDistanceFromSiteMeters = s.AttendanceRecord?.ClockInDistanceFromSiteMeters,
                LateArrivalMinutes = s.AttendanceRecord?.LateArrivalMinutes ?? 0,
                IsFlagged = s.AttendanceRecord?.IsFlagged ?? false,
                FlagReason = s.AttendanceRecord?.FlagReason,
                ActualDurationHours = s.AttendanceRecord?.ActualDurationHours,
                BillableHours = s.AttendanceRecord?.BillableHours,
                ClockInPhotoUrl = s.AttendanceRecord?.ClockInPhotoUrl,
                ClockOutPhotoUrl = s.AttendanceRecord?.ClockOutPhotoUrl,
                SupervisorNotes = s.AttendanceRecord?.SupervisorNotes,
                SupervisorApproved = s.AttendanceRecord?.SupervisorApproved ?? false
            };

            return Ok(ApiResponse<ShiftDto>.SuccessResponse(dto, "Shift details retrieved successfully."));
        }

        /// <summary>
        /// Updates an existing scheduled shift with recalculation of net working hours and overnight detection.
        /// </summary>
        /// <param name="id">Unique identifier of the shift to update.</param>
        /// <param name="request">Updated shift parameters.</param>
        /// <param name="ct">Cancellation token.</param>
        /// <returns>ID of the updated shift.</returns>
        [HttpPut("shifts/{id:guid}")]
        public async Task<ActionResult<ApiResponse<Guid>>> UpdateShift(Guid id, [FromBody] UpdateShiftRequest request, CancellationToken ct)
        {
            var shift = await _db.BcpShifts.FirstOrDefaultAsync(s => s.Id == id && s.TenantKey == CurrentTenantKey, ct);
            if (shift == null)
            {
                return NotFound(ApiResponse<Guid>.FailureResponse("Shift not found.", errorCode: "ERR-2004"));
            }

            if (request.ClientSiteId == Guid.Empty || request.StartsAtUtc >= request.EndsAtUtc)
            {
                return BadRequest(ApiResponse<Guid>.FailureResponse("Valid work location and end time greater than start time are required.", errorCode: "ERR-2001"));
            }

            var startUtc = request.StartsAtUtc.ToUniversalTime();
            var endUtc = request.EndsAtUtc.ToUniversalTime();

            // Double-booking conflict check (excluding current shift)
            if (!string.IsNullOrWhiteSpace(request.AssignedUserId))
            {
                var hasOverlap = await _db.BcpShifts.AnyAsync(s =>
                    s.TenantKey == CurrentTenantKey &&
                    s.Id != id &&
                    s.AssignedUserId == request.AssignedUserId &&
                    s.Status != "Cancelled" &&
                    s.StartsAtUtc < endUtc &&
                    s.EndsAtUtc > startUtc, ct);

                if (hasOverlap)
                {
                    return Conflict(ApiResponse<Guid>.FailureResponse("This staff member is already scheduled for another shift during these hours.", errorCode: "ERR-2005"));
                }
            }

            bool isOvernight = endUtc.Date > startUtc.Date;
            int breakMins = request.BreakMinutes >= 0 ? request.BreakMinutes : 0;
            decimal totalHours = (decimal)(endUtc - startUtc).TotalHours;
            decimal plannedNetHours = Math.Max(0, totalHours - (breakMins / 60.0m));

            shift.ClientSiteId = request.ClientSiteId;
            shift.AssignedUserId = request.AssignedUserId;
            shift.AssignedUserName = request.AssignedUserName;
            shift.PostName = string.IsNullOrWhiteSpace(request.PostName) ? "General Assignment" : request.PostName.Trim();
            shift.FacilityName = request.FacilityName?.Trim();
            shift.Address = request.Address?.Trim();
            shift.PostCode = request.PostCode?.Trim();
            shift.EventTag = request.EventTag?.Trim();
            shift.StartsAtUtc = startUtc;
            shift.EndsAtUtc = endUtc;
            shift.IsOvernight = isOvernight;
            shift.BreakMinutes = breakMins;
            shift.PlannedDurationHours = Math.Round(plannedNetHours, 2);
            shift.RequiredWorkspaceStationId = request.RequiredWorkspaceStationId;
            shift.RequiredWorkspaceStationName = request.RequiredWorkspaceStationName;
            shift.HourlyPayRate = request.HourlyPayRate;
            shift.HourlyChargeRate = request.HourlyChargeRate;
            shift.AcceptanceDeadlineUtc = request.AcceptanceDeadlineUtc;
            shift.Status = string.IsNullOrWhiteSpace(request.Status) ? shift.Status : request.Status.Trim();
            shift.Notes = request.Notes?.Trim();
            shift.UpdatedUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);
            return Ok(ApiResponse<Guid>.SuccessResponse(shift.Id, $"Shift {shift.ShiftCode} updated successfully."));
        }

        /// <summary>
        /// Deletes or cancels a planned shift.
        /// </summary>
        /// <param name="id">Shift identifier.</param>
        /// <param name="ct">Cancellation token.</param>
        /// <returns>Success confirmation.</returns>
        [HttpDelete("shifts/{id:guid}")]
        public async Task<ActionResult<ApiResponse<bool>>> DeleteShift(Guid id, CancellationToken ct)
        {
            var shift = await _db.BcpShifts
                .Include(s => s.AttendanceRecord)
                .FirstOrDefaultAsync(s => s.Id == id && s.TenantKey == CurrentTenantKey, ct);

            if (shift == null)
            {
                return NotFound(ApiResponse<bool>.FailureResponse("Shift not found.", errorCode: "ERR-2004"));
            }

            // If an active attendance record exists, cancel rather than hard-deleting
            if (shift.AttendanceRecord != null)
            {
                shift.Status = "Cancelled";
                shift.UpdatedUtc = DateTime.UtcNow;
            }
            else
            {
                _db.BcpShifts.Remove(shift);
            }

            await _db.SaveChangesAsync(ct);
            return Ok(ApiResponse<bool>.SuccessResponse(true, "Shift removed successfully."));
        }

        /// <summary>
        /// Generates recurring or daily working schedules across a calendar date range.
        /// Supports standard daily routines (e.g. 8 to 5 Mon–Fri), rotational shift patterns, and custom day selections.
        /// </summary>
        /// <param name="request">Batch schedule creation specification.</param>
        /// <param name="ct">Cancellation token.</param>
        /// <returns>Collection of created shift IDs and generated summary.</returns>
        [HttpPost("shifts/batch-schedule")]
        public async Task<ActionResult<ApiResponse<List<Guid>>>> BatchCreateShiftSchedule(
            [FromBody] BatchCreateShiftScheduleRequest request,
            CancellationToken ct)
        {
            if (request.ClientSiteId == Guid.Empty)
            {
                return BadRequest(ApiResponse<List<Guid>>.FailureResponse("Valid work location is required.", errorCode: "ERR-2001"));
            }

            if (request.StartDate.Date > request.EndDate.Date)
            {
                return BadRequest(ApiResponse<List<Guid>>.FailureResponse("Start date cannot be later than end date.", errorCode: "ERR-2002"));
            }

            // Parse daily start and end times
            if (!TimeSpan.TryParse(request.StartTime, out var startTimeSpan))
            {
                startTimeSpan = new TimeSpan(8, 0, 0);
            }
            if (!TimeSpan.TryParse(request.EndTime, out var endTimeSpan))
            {
                endTimeSpan = new TimeSpan(17, 0, 0);
            }

            var daysOfWeek = request.SelectedDaysOfWeek != null && request.SelectedDaysOfWeek.Count > 0
                ? request.SelectedDaysOfWeek
                : new List<int> { 1, 2, 3, 4, 5 }; // Default Monday to Friday

            var generatedShifts = new List<BcpShift>();
            var currentDate = request.StartDate.Date;
            var endDate = request.EndDate.Date;

            // Determine if daily window crosses midnight
            bool isCrossMidnight = endTimeSpan <= startTimeSpan;

            int breakMins = request.BreakMinutes >= 0 ? request.BreakMinutes : 0;
            decimal durationHours = isCrossMidnight
                ? (decimal)(24 - startTimeSpan.TotalHours + endTimeSpan.TotalHours)
                : (decimal)(endTimeSpan - startTimeSpan).TotalHours;
            decimal plannedNetHours = Math.Max(0, durationHours - (breakMins / 60.0m));

            int shiftSequence = await _db.BcpShifts.CountAsync(s => s.TenantKey == CurrentTenantKey && s.StartsAtUtc.Date == DateTime.UtcNow.Date, ct);

            while (currentDate <= endDate)
            {
                // DayOfWeek in .NET: Sunday = 0, Monday = 1 ... Saturday = 6
                int dayNumber = (int)currentDate.DayOfWeek;
                if (daysOfWeek.Contains(dayNumber))
                {
                    var shiftStartLocal = currentDate.Add(startTimeSpan);
                    var shiftEndLocal = isCrossMidnight
                        ? currentDate.AddDays(1).Add(endTimeSpan)
                        : currentDate.Add(endTimeSpan);

                    var startUtc = DateTime.SpecifyKind(shiftStartLocal, DateTimeKind.Utc);
                    var endUtc = DateTime.SpecifyKind(shiftEndLocal, DateTimeKind.Utc);

                    // Skip conflict if assigned user already has shift
                    if (!string.IsNullOrWhiteSpace(request.AssignedUserId))
                    {
                        var hasOverlap = await _db.BcpShifts.AnyAsync(s =>
                            s.TenantKey == CurrentTenantKey &&
                            s.AssignedUserId == request.AssignedUserId &&
                            s.Status != "Cancelled" &&
                            s.StartsAtUtc < endUtc &&
                            s.EndsAtUtc > startUtc, ct);

                        if (hasOverlap)
                        {
                            currentDate = currentDate.AddDays(1);
                            continue;
                        }
                    }

                    shiftSequence++;
                    var shiftCode = $"SHF-{currentDate:yyyyMMdd}-{shiftSequence:D3}";

                    var shift = new BcpShift
                    {
                        Id = Guid.CreateVersion7(),
                        TenantKey = CurrentTenantKey,
                        ShiftCode = shiftCode,
                        ClientSiteId = request.ClientSiteId,
                        AssignedUserId = request.AssignedUserId,
                        AssignedUserName = request.AssignedUserName,
                        PostName = string.IsNullOrWhiteSpace(request.PostName) ? "General Assignment" : request.PostName.Trim(),
                        FacilityName = request.FacilityName?.Trim(),
                        Address = request.Address?.Trim(),
                        PostCode = request.PostCode?.Trim(),
                        EventTag = request.EventTag?.Trim() ?? request.SchedulePattern,
                        StartsAtUtc = startUtc,
                        EndsAtUtc = endUtc,
                        IsOvernight = isCrossMidnight,
                        BreakMinutes = breakMins,
                        PlannedDurationHours = Math.Round(plannedNetHours, 2),
                        RequiredWorkspaceStationId = request.RequiredWorkspaceStationId,
                        RequiredWorkspaceStationName = request.RequiredWorkspaceStationName,
                        HourlyPayRate = request.HourlyPayRate,
                        HourlyChargeRate = request.HourlyChargeRate,
                        AcceptanceDeadlineUtc = request.AcceptanceDeadlineUtc,
                        Status = "Scheduled",
                        IsConfirmedByGuard = false,
                        Notes = request.Notes?.Trim(),
                        CreatedByUserId = CurrentUserId,
                        CreatedUtc = DateTime.UtcNow
                    };

                    generatedShifts.Add(shift);
                }

                currentDate = currentDate.AddDays(1);
            }

            if (generatedShifts.Count == 0)
            {
                return BadRequest(ApiResponse<List<Guid>>.FailureResponse("No working shifts were generated. Please verify selected days of week and date range."));
            }

            _db.BcpShifts.AddRange(generatedShifts);
            await _db.SaveChangesAsync(ct);

            // Notify assigned member if applicable
            if (!string.IsNullOrWhiteSpace(request.AssignedUserId) && _notificationDispatcher != null)
            {
                try
                {
                    await _notificationDispatcher.DispatchAsync(new NotificationDispatchPayload
                    {
                        TargetType = NotificationDispatchTarget.SingleUser,
                        TargetUserId = request.AssignedUserId,
                        TenantKey = CurrentTenantKey,
                        Title = "New Recurring Schedule Assigned",
                        Message = $"You have been assigned {generatedShifts.Count} scheduled working shifts between {request.StartDate:dd MMM yyyy} and {request.EndDate:dd MMM yyyy}.",
                        Category = BcpMessageCategory.General,
                        Severity = NotificationSeverity.NewFeature,
                        Channels = NotificationChannels.InApp,
                        Module = "Workforce",
                        Icon = "calendar_month",
                        ActionUrl = "/workforce/my-shifts"
                    }, ct);
                }
                catch
                {
                    // Non-blocking notification dispatch
                }
            }

            var ids = generatedShifts.Select(s => s.Id).ToList();
            return Ok(ApiResponse<List<Guid>>.SuccessResponse(ids, $"Successfully generated {generatedShifts.Count} scheduled shifts."));
        }

        // =========================================================================
        // 3. SHIFT SWAPS & OPEN SHIFTS
        // =========================================================================

        /// <summary>
        /// Initiates a peer shift swap request or posts an assigned shift to the open claim market.
        /// </summary>
        [HttpPost("swaps")]
        public async Task<ActionResult<ApiResponse<Guid>>> RequestSwap([FromBody] CreateSwapRequest request, CancellationToken ct)
        {
            var shift = await _db.BcpShifts.FirstOrDefaultAsync(s => s.Id == request.ShiftId && s.TenantKey == CurrentTenantKey, ct);
            if (shift == null)
            {
                return NotFound(ApiResponse<Guid>.FailureResponse("Shift not found.", errorCode: "ERR-2004"));
            }

            var swap = new BcpShiftSwapRequest
            {
                Id = Guid.CreateVersion7(),
                TenantKey = CurrentTenantKey,
                ShiftId = shift.Id,
                RequestingUserId = CurrentUserId,
                RequestingUserName = CurrentUserName,
                OfferedToUserId = request.OfferedToUserId,
                OfferedToUserName = request.OfferedToUserName,
                TargetShiftId = request.TargetShiftId,
                Reason = request.Reason?.Trim(),
                Status = string.IsNullOrWhiteSpace(request.OfferedToUserId) ? "PendingSupervisor" : "PendingPeer",
                CreatedUtc = DateTime.UtcNow
            };

            _db.BcpShiftSwapRequests.Add(swap);
            await _db.SaveChangesAsync(ct);

            return Ok(ApiResponse<Guid>.SuccessResponse(swap.Id, "Shift swap request submitted for approval."));
        }

        /// <summary>
        /// Claims an open or offered shift from the workforce shift market.
        /// </summary>
        [HttpPost("swaps/{id}/claim")]
        public async Task<ActionResult<ApiResponse<bool>>> ClaimOpenShift(Guid id, CancellationToken ct)
        {
            var swap = await _db.BcpShiftSwapRequests
                .Include(s => s.Shift)
                .FirstOrDefaultAsync(s => s.Id == id && s.TenantKey == CurrentTenantKey, ct);

            if (swap == null || swap.Shift == null)
            {
                return NotFound(ApiResponse<bool>.FailureResponse("Swap request not found.", errorCode: "ERR-2004"));
            }

            swap.OfferedToUserId = CurrentUserId;
            swap.OfferedToUserName = CurrentUserName;
            swap.Status = "PendingSupervisor";

            await _db.SaveChangesAsync(ct);
            return Ok(ApiResponse<bool>.SuccessResponse(true, "Shift claimed. Pending supervisor approval."));
        }

        /// <summary>
        /// Approves or rejects a shift swap, automatically updating shift ownership upon approval.
        /// </summary>
        [HttpPost("swaps/{id}/review")]
        public async Task<ActionResult<ApiResponse<bool>>> ReviewSwap(
            Guid id,
            [FromBody] ReviewSwapRequest review,
            CancellationToken ct)
        {
            var swap = await _db.BcpShiftSwapRequests
                .Include(s => s.Shift)
                .FirstOrDefaultAsync(s => s.Id == id && s.TenantKey == CurrentTenantKey, ct);

            if (swap == null || swap.Shift == null)
            {
                return NotFound(ApiResponse<bool>.FailureResponse("Swap request not found.", errorCode: "ERR-2004"));
            }

            if (review.IsApproved)
            {
                swap.Status = "Approved";
                swap.SupervisorApprovedBy = CurrentUserName;
                swap.SupervisorApprovedAtUtc = DateTime.UtcNow;

                // Transfer Shift to new officer
                if (!string.IsNullOrWhiteSpace(swap.OfferedToUserId))
                {
                    swap.Shift.AssignedUserId = swap.OfferedToUserId;
                    swap.Shift.AssignedUserName = swap.OfferedToUserName;
                    swap.Shift.IsConfirmedByGuard = false;
                    swap.Shift.Status = "Scheduled";
                    swap.Shift.UpdatedUtc = DateTime.UtcNow;
                }
            }
            else
            {
                swap.Status = "Rejected";
                swap.SupervisorApprovedBy = CurrentUserName;
                swap.SupervisorApprovedAtUtc = DateTime.UtcNow;
                swap.SupervisorRejectionReason = review.RejectionReason;
            }

            await _db.SaveChangesAsync(ct);
            return Ok(ApiResponse<bool>.SuccessResponse(true, review.IsApproved ? "Swap approved and shift transferred." : "Swap request rejected."));
        }

        // =========================================================================
        // 4. LEAVE & TIME-OFF REQUESTS
        // =========================================================================

        /// <summary>
        /// Submits a staff leave request to black out unavailability from the scheduling calendar.
        /// </summary>
        [HttpPost("leave")]
        public async Task<ActionResult<ApiResponse<Guid>>> RequestLeave([FromBody] SubmitLeaveRequest request, CancellationToken ct)
        {
            if (request.StartDate > request.EndDate)
            {
                return BadRequest(ApiResponse<Guid>.FailureResponse("End date must be after start date.", errorCode: "ERR-2001"));
            }

            var days = (decimal)(request.EndDate - request.StartDate).TotalDays + 1;
            var leave = new BcpShiftLeaveRequest
            {
                Id = Guid.CreateVersion7(),
                TenantKey = CurrentTenantKey,
                UserId = CurrentUserId,
                UserName = CurrentUserName,
                LeaveType = string.IsNullOrWhiteSpace(request.LeaveType) ? "Annual" : request.LeaveType,
                StartDate = request.StartDate.Date,
                EndDate = request.EndDate.Date,
                TotalDays = Math.Max(1.0m, Math.Round(days, 1)),
                Reason = request.Reason?.Trim(),
                AttachmentUrl = request.AttachmentUrl?.Trim(),
                Status = "Pending",
                CreatedUtc = DateTime.UtcNow
            };

            _db.BcpShiftLeaveRequests.Add(leave);
            await _db.SaveChangesAsync(ct);

            return Ok(ApiResponse<Guid>.SuccessResponse(leave.Id, "Leave request submitted for review."));
        }

        // =========================================================================
        // 5. STAFF ONBOARDING & INVITATION
        // =========================================================================

        /// <summary>
        /// Enrolls a staff member into the workforce rota system, configuring their job title,
        /// contracted hours, default hourly rate, and triggers a transactional onboarding email.
        /// </summary>
        [HttpPost("members/enroll")]
        public async Task<ActionResult<ApiResponse<Guid>>> EnrollStaffMember([FromBody] EnrollStaffMemberRequest request, CancellationToken ct)
        {
            var userId = request.UserId?.Trim();
            if (string.IsNullOrWhiteSpace(userId))
            {
                userId = Guid.CreateVersion7().ToString();
            }

            var profile = await _db.BcpShiftStaffProfiles
                .FirstOrDefaultAsync(p => p.TenantKey == CurrentTenantKey && p.UserId == userId, ct);

            if (profile == null)
            {
                profile = new BcpShiftStaffProfile
                {
                    Id = Guid.CreateVersion7(),
                    TenantKey = CurrentTenantKey,
                    UserId = userId,
                    CreatedUtc = DateTime.UtcNow
                };
                _db.BcpShiftStaffProfiles.Add(profile);
            }

            profile.JobTitle = string.IsNullOrWhiteSpace(request.JobTitle) ? "Staff Member" : request.JobTitle.Trim();
            profile.DefaultHourlyRate = request.DefaultHourlyRate;
            profile.ContractedWeeklyHours = request.ContractedWeeklyHours;
            if (!string.IsNullOrWhiteSpace(request.PreferredWorkingTime)) profile.PreferredWorkingTime = request.PreferredWorkingTime.Trim();
            if (!string.IsNullOrWhiteSpace(request.WorkingAvailability)) profile.WorkingAvailability = request.WorkingAvailability.Trim();
            profile.IsActive = true;
            profile.UpdatedUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);

            // Trigger Transactional Welcome & Onboarding Email via Central Notification Dispatcher
            if (_notificationDispatcher != null && (!string.IsNullOrWhiteSpace(request.Email) || !string.IsNullOrWhiteSpace(userId)))
            {
                try
                {
                    await _notificationDispatcher.DispatchAsync(new NotificationDispatchPayload
                    {
                        TargetType = NotificationDispatchTarget.SingleUser,
                        TargetUserId = userId,
                        RecipientEmail = request.Email?.Trim(),
                        RecipientName = request.FullName?.Trim() ?? "Staff Member",
                        TenantKey = CurrentTenantKey,
                        Title = "Welcome to Your Workforce Rota & Shift Workspace",
                        Message = $"Hello {request.FullName ?? "Team Member"},\n\nYou have been invited to join the Workforce Rota system as a **{profile.JobTitle}**.\n\nPlease log in to your workspace to configure your availability, upload required compliance documents, and set your shift reminder preferences.",
                        Category = BcpMessageCategory.Account,
                        Severity = NotificationSeverity.NewFeature,
                        Channels = NotificationChannels.InApp | NotificationChannels.Email,
                        SendEmailCopy = true,
                        Module = "Workforce",
                        Icon = "badge",
                        ActionUrl = "/workforce/workspace/my-shifts"
                    }, ct);
                }
                catch
                {
                    // Non-blocking notification dispatch
                }
            }

            return Ok(ApiResponse<Guid>.SuccessResponse(profile.Id, "Staff member successfully enrolled and onboarding email dispatched."));
        }

        private static string GenerateOnboardingToken(string tenantKey, string email, DateTime expiresUtc)
        {
            var payload = $"{tenantKey.ToLowerInvariant()}:{email.Trim().ToLowerInvariant()}:{expiresUtc.Ticks}";
            var secret = "Ozikol-Bcp-Workforce-Onboarding-Key-2026!";
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
            var hash = Convert.ToBase64String(hmac.ComputeHash(Encoding.UTF8.GetBytes(payload)));
            var combined = $"{payload}:{hash}";
            return Convert.ToBase64String(Encoding.UTF8.GetBytes(combined))
                .Replace("+", "-").Replace("/", "_").Replace("=", "");
        }

        private static bool TryValidateOnboardingToken(string token, out string tenantKey, out string email, out DateTime expiresUtc)
        {
            tenantKey = string.Empty;
            email = string.Empty;
            expiresUtc = DateTime.MinValue;
            try
            {
                var incoming = token.Replace("-", "+").Replace("_", "/");
                switch (incoming.Length % 4)
                {
                    case 2: incoming += "=="; break;
                    case 3: incoming += "="; break;
                }
                var raw = Encoding.UTF8.GetString(Convert.FromBase64String(incoming));
                var parts = raw.Split(':');
                if (parts.Length != 4) return false;

                tenantKey = parts[0];
                email = parts[1];
                if (!long.TryParse(parts[2], out var ticks)) return false;
                expiresUtc = new DateTime(ticks, DateTimeKind.Utc);
                var signature = parts[3];

                if (expiresUtc < DateTime.UtcNow) return false;

                var payload = $"{tenantKey}:{email}:{ticks}";
                var secret = "Ozikol-Bcp-Workforce-Onboarding-Key-2026!";
                using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
                var expectedHash = Convert.ToBase64String(hmac.ComputeHash(Encoding.UTF8.GetBytes(payload)));
                return string.Equals(signature, expectedHash, StringComparison.Ordinal);
            }
            catch
            {
                return false;
            }
        }

        /// <summary>
        /// Generates a secure 7-day single-use onboarding token and dispatches an invitation email for staff self-enrollment.
        /// </summary>
        [HttpPost("members/invite")]
        [HttpPost("rota/members/invite")]
        public async Task<ActionResult<ApiResponse<object>>> InviteWorkforceMember([FromBody] InviteWorkforceMemberRequest request, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Email address is mandatory for dispatching an invitation."));
            }

            var email = request.Email.Trim().ToLowerInvariant();
            var fullName = string.IsNullOrWhiteSpace(request.FullName) ? "Team Member" : request.FullName.Trim();
            var phoneNumber = request.PhoneNumber?.Trim();
            var expiresUtc = DateTime.UtcNow.AddDays(7);
            var token = Guid.NewGuid().ToString("N")[..14].ToLowerInvariant();
            var tokenKey = ComputeTokenStorageKey(token);

            // Persist single-use invitation record so the link can only be redeemed once
            var invitationRecord = new Invitation
            {
                Id = Guid.CreateVersion7(),
                FullName = fullName,
                Email = email,
                PhoneNumber = phoneNumber,
                Token = tokenKey,
                IsUsed = false,
                CreatedUtc = DateTime.UtcNow,
                ExpiresUtc = expiresUtc
            };
            _memoryInvitations[tokenKey] = invitationRecord;

            try
            {
                _db.Invitations.Add(invitationRecord);
                await _db.SaveChangesAsync(ct);
            }
            catch
            {
                _db.Entry(invitationRecord).State = EntityState.Detached;
            }

            var onboardingUrl = $"/workforce/onboarding/{token}";

            // Resolve full client origin for clickable external email link
            var clientOrigin = Request.Headers.Origin.FirstOrDefault();
            if (string.IsNullOrWhiteSpace(clientOrigin))
            {
                var referer = Request.Headers.Referer.FirstOrDefault();
                if (!string.IsNullOrWhiteSpace(referer) && Uri.TryCreate(referer, UriKind.Absolute, out var refUri))
                {
                    clientOrigin = $"{refUri.Scheme}://{refUri.Authority}";
                }
            }
            var fullEmailActionUrl = !string.IsNullOrWhiteSpace(clientOrigin)
                ? $"{clientOrigin.TrimEnd('/')}{onboardingUrl}"
                : onboardingUrl;

            var emailSent = false;
            var emailError = string.Empty;

            // Trigger Transactional Invitation Email via Mailcow SMTP
            if (_notificationDispatcher != null)
            {
                try
                {
                    var customNote = !string.IsNullOrWhiteSpace(request.WelcomeNote)
                        ? $"\n\n**Note from Administrator:**\n_{request.WelcomeNote.Trim()}_\n"
                        : string.Empty;

                    var roleText = !string.IsNullOrWhiteSpace(request.JobTitle)
                        ? $" as a **{request.JobTitle.Trim()}**"
                        : string.Empty;

                    var dispatchResult = await _notificationDispatcher.DispatchAsync(new NotificationDispatchPayload
                    {
                        TargetType = NotificationDispatchTarget.SingleUser,
                        RecipientEmail = email,
                        RecipientName = fullName,
                        TenantKey = CurrentTenantKey,
                        Title = !string.IsNullOrWhiteSpace(request.JobTitle)
                            ? $"Invitation to Join Workforce Rota as {request.JobTitle.Trim()}"
                            : "Invitation to Complete Your Workforce Registration",
                        Message = $"Hello {fullName},\n\nYou have been invited to join the workforce team{roleText}.{customNote}\n\nPlease click the button below to complete your registration form using your single-use onboarding link.",
                        Category = BcpMessageCategory.Account,
                        Severity = NotificationSeverity.NewFeature,
                        Channels = NotificationChannels.Email,
                        SendEmailCopy = true,
                        Module = "Workforce",
                        Icon = "badge",
                        ActionUrl = fullEmailActionUrl
                    }, ct);

                    emailSent = dispatchResult.DispatchedEmailCount > 0;
                    if (!emailSent && dispatchResult.Errors.Count > 0)
                    {
                        emailError = string.Join(" ", dispatchResult.Errors);
                    }
                }
                catch (Exception ex)
                {
                    // Non-blocking notification dispatch
                    emailError = ex.Message;
                }
            }

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                Email = email,
                FullName = fullName,
                PhoneNumber = phoneNumber,
                JobTitle = request.JobTitle,
                ExpiresUtc = expiresUtc,
                Token = token,
                OnboardingUrl = onboardingUrl,
                FullOnboardingUrl = fullEmailActionUrl,
                EmailSent = emailSent,
                EmailError = emailError
            }, emailSent
                ? $"Invitation email sent to {email} and single-use link generated."
                : "Single-use invitation link generated. Copy and share the link below."));
        }

        /// <summary>
        /// Directly provisions a staff member's identity account, employment terms, SIA credentials, and sends password setup instructions.
        /// </summary>
        [HttpPost("members/direct-enroll")]
        [HttpPost("rota/members/direct-enroll")]
        public async Task<ActionResult<ApiResponse<Guid>>> DirectEnrollMember([FromBody] DirectEnrollMemberRequest request, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest(ApiResponse<Guid>.FailureResponse("Email address is mandatory."));
            }

            var email = request.Email.Trim().ToLowerInvariant();
            var firstName = request.FirstName?.Trim() ?? string.Empty;
            var lastName = request.LastName?.Trim() ?? string.Empty;
            var fullName = $"{firstName} {lastName}".Trim();
            if (string.IsNullOrWhiteSpace(fullName)) fullName = "Staff Member";

            Profile? user = null;
            if (_userManager != null)
            {
                user = await _userManager.FindByEmailAsync(email);
            }
            else
            {
                user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);
            }

            string userId;
            if (user == null)
            {
                userId = Guid.CreateVersion7().ToString();
                var tempPassword = string.IsNullOrWhiteSpace(request.Password) ? $"Ozi@{Guid.NewGuid().ToString("N")[..6]}!" : request.Password;

                var customAttrs = new Dictionary<string, object>();
                if (request.CustomAttributes != null)
                {
                    foreach (var kv in request.CustomAttributes)
                    {
                        customAttrs[kv.Key] = kv.Value;
                    }
                }
                if (!string.IsNullOrWhiteSpace(request.EmergencyContactName) || !string.IsNullOrWhiteSpace(request.EmergencyContactPhone))
                {
                    customAttrs["emergencyContact"] = new
                    {
                        name = request.EmergencyContactName?.Trim(),
                        relationship = request.EmergencyContactRelationship?.Trim(),
                        phone = request.EmergencyContactPhone?.Trim()
                    };
                }
                if (!string.IsNullOrWhiteSpace(request.BankName) || !string.IsNullOrWhiteSpace(request.AccountNumber))
                {
                    customAttrs["bankDetails"] = new
                    {
                        bankName = request.BankName?.Trim(),
                        accountHolder = request.AccountHolderName?.Trim() ?? fullName,
                        sortCode = request.SortCode?.Trim(),
                        accountNumber = request.AccountNumber?.Trim(),
                        nationalInsurance = request.NationalInsuranceNumber?.Trim()
                    };
                }

                user = new Profile
                {
                    Id = userId,
                    UserName = email,
                    Email = email,
                    FirstName = firstName,
                    LastName = lastName,
                    PhoneNumber = request.PhoneNumber?.Trim(),
                    MemberId = $"WRK-{new Random().Next(1000, 9999)}",
                    Designation = string.IsNullOrWhiteSpace(request.JobTitle) ? "Staff Member" : request.JobTitle.Trim(),
                    UserStatus = UserStatus.Active,
                    EmailConfirmed = true,
                    MustChangePassword = request.MustChangePassword,
                    CustomAttributesJson = customAttrs.Count > 0 ? JsonSerializer.Serialize(customAttrs) : null,
                    JoinDate = DateTime.UtcNow
                };

                if (_userManager != null)
                {
                    var createResult = await _userManager.CreateAsync(user, tempPassword);
                    if (!createResult.Succeeded)
                    {
                        var firstError = createResult.Errors.FirstOrDefault()?.Description ?? "Failed to create identity account.";
                        return BadRequest(ApiResponse<Guid>.FailureResponse(firstError));
                    }
                }
                else
                {
                    _db.Users.Add(user);
                    await _db.SaveChangesAsync(ct);
                }
            }
            else
            {
                userId = user.Id;
            }

            // Provision or update BcpShiftStaffProfile
            var staffProfile = await _db.BcpShiftStaffProfiles
                .FirstOrDefaultAsync(p => p.TenantKey == CurrentTenantKey && p.UserId == userId, ct);

            if (staffProfile == null)
            {
                staffProfile = new BcpShiftStaffProfile
                {
                    Id = Guid.CreateVersion7(),
                    TenantKey = CurrentTenantKey,
                    UserId = userId,
                    CreatedUtc = DateTime.UtcNow
                };
                _db.BcpShiftStaffProfiles.Add(staffProfile);
            }

            staffProfile.JobTitle = string.IsNullOrWhiteSpace(request.JobTitle) ? "Staff Member" : request.JobTitle.Trim();
            staffProfile.StaffTypeId = request.StaffTypeId;
            staffProfile.StaffTypeName = !string.IsNullOrWhiteSpace(request.StaffTypeName) ? request.StaffTypeName.Trim() : "Permanent";
            staffProfile.DefaultHourlyRate = request.DefaultHourlyRate;
            staffProfile.ContractedWeeklyHours = request.ContractedWeeklyHours;
            if (!string.IsNullOrWhiteSpace(request.PreferredWorkingTime)) staffProfile.PreferredWorkingTime = request.PreferredWorkingTime.Trim();
            if (!string.IsNullOrWhiteSpace(request.WorkingAvailability)) staffProfile.WorkingAvailability = request.WorkingAvailability.Trim();
            staffProfile.IsActive = true;
            staffProfile.UpdatedUtc = DateTime.UtcNow;

            // Provision compliance documents & credentials dynamically (Zero Hardcoding)
            if (request.ComplianceDocuments != null && request.ComplianceDocuments.Count > 0)
            {
                foreach (var item in request.ComplianceDocuments)
                {
                    if (string.IsNullOrWhiteSpace(item.DocumentType)) continue;

                    var docType = item.DocumentType.Trim();
                    var doc = await _db.BcpShiftDocuments
                        .FirstOrDefaultAsync(d => d.TenantKey == CurrentTenantKey && d.UserId == userId && d.DocumentType == docType, ct);

                    if (doc == null)
                    {
                        doc = new BcpShiftDocument
                        {
                            Id = Guid.CreateVersion7(),
                            TenantKey = CurrentTenantKey,
                            UserId = userId,
                            DocumentType = docType,
                            UploadedBy = "Company",
                            CreatedUtc = DateTime.UtcNow
                        };
                        _db.BcpShiftDocuments.Add(doc);
                    }

                    doc.DocumentName = !string.IsNullOrWhiteSpace(item.DocumentName)
                        ? item.DocumentName.Trim()
                        : $"{docType}_{item.ReferenceNumber ?? "Record"}";
                    doc.Description = item.Description ?? $"{docType} credential record";
                    doc.ReferenceNumber = item.ReferenceNumber?.Trim();
                    doc.FileUrl = !string.IsNullOrWhiteSpace(item.FileUrl) ? item.FileUrl : "verified://admin-record";
                    doc.ExpiryDateUtc = item.ExpiryDateUtc;
                    doc.IsVerified = item.IsVerified;
                    doc.UpdatedUtc = DateTime.UtcNow;
                }
            }
            else if (!string.IsNullOrWhiteSpace(request.SiaLicenseNumber))
            {
                // Backward-compatible fallback for legacy payloads
                var docType = !string.IsNullOrWhiteSpace(request.SiaLicenseSector) ? request.SiaLicenseSector.Trim() : "Professional License";
                var doc = await _db.BcpShiftDocuments
                    .FirstOrDefaultAsync(d => d.TenantKey == CurrentTenantKey && d.UserId == userId && (d.DocumentType == docType || d.DocumentType == "SIA License"), ct);

                if (doc == null)
                {
                    doc = new BcpShiftDocument
                    {
                        Id = Guid.CreateVersion7(),
                        TenantKey = CurrentTenantKey,
                        UserId = userId,
                        DocumentType = docType,
                        UploadedBy = "Company",
                        CreatedUtc = DateTime.UtcNow
                    };
                    _db.BcpShiftDocuments.Add(doc);
                }

                doc.DocumentType = docType;
                doc.DocumentName = $"{docType}_{request.SiaLicenseNumber.Trim()}";
                doc.Description = $"License / Credential: {request.SiaLicenseNumber.Trim()}";
                doc.ReferenceNumber = request.SiaLicenseNumber.Trim();
                doc.FileUrl = "verified://admin-record";
                doc.ExpiryDateUtc = request.SiaLicenseExpiryDate;
                doc.UpdatedUtc = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync(ct);

            // Send Credentials & Password Setup Link via Central Notification Dispatcher
            if (_notificationDispatcher != null)
            {
                try
                {
                    await _notificationDispatcher.DispatchAsync(new NotificationDispatchPayload
                    {
                        TargetType = NotificationDispatchTarget.SingleUser,
                        TargetUserId = userId,
                        RecipientEmail = email,
                        RecipientName = fullName,
                        TenantKey = CurrentTenantKey,
                        Title = "Your Workforce Account Has Been Created",
                        Message = $"Hello {fullName},\n\nAn administrator has pre-enrolled you into the Workforce Rota system as a **{staffProfile.JobTitle}**.\n\nPlease sign in with your email (`{email}`) to review your rota schedule, confirm shifts, and set your permanent password.",
                        Category = BcpMessageCategory.Account,
                        Severity = NotificationSeverity.NewFeature,
                        Channels = NotificationChannels.InApp | NotificationChannels.Email,
                        SendEmailCopy = true,
                        Module = "Workforce",
                        Icon = "badge",
                        ActionUrl = "/auth/login"
                    }, ct);
                }
                catch
                {
                    // Non-blocking notification dispatch
                }
            }

            return Ok(ApiResponse<Guid>.SuccessResponse(staffProfile.Id, "Staff member successfully enrolled into workforce system."));
        }

        /// <summary>
        /// Validates a member onboarding token for public self-activation and enforces single-use redemption.
        /// </summary>
        [HttpGet("members/verify-token")]
        [HttpGet("rota/members/verify-token")]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<object>>> VerifyOnboardingToken(
            [FromQuery] string token,
            [FromQuery] string? email,
            CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(token))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Onboarding token is required."));
            }

            var tokenKey = ComputeTokenStorageKey(token);

            // 1. Check single-use Invitation registry first
            Invitation? inv = null;
            try
            {
                inv = await _db.Invitations.AsNoTracking().FirstOrDefaultAsync(i => i.Token == tokenKey || i.Token == token, ct);
            }
            catch
            {
                // Fallback to in-memory invitation store if table is not yet migrated
            }
            if (inv == null && _memoryInvitations.TryGetValue(tokenKey, out var memInv))
            {
                inv = memInv;
            }

            if (inv != null)
            {
                if (inv.IsUsed)
                {
                    return StatusCode(410, ApiResponse<object>.FailureResponse("This invitation link has already been used and is no longer valid."));
                }
                if (inv.ExpiresUtc.HasValue && inv.ExpiresUtc.Value < DateTime.UtcNow)
                {
                    return BadRequest(ApiResponse<object>.FailureResponse("This invitation link has expired. Please request a new invitation from your administrator."));
                }

                return Ok(ApiResponse<object>.SuccessResponse(new
                {
                    TenantKey = CurrentTenantKey,
                    Email = inv.Email,
                    FullName = inv.FullName,
                    PhoneNumber = inv.PhoneNumber,
                    ExpiresUtc = inv.ExpiresUtc,
                    IsValid = true
                }, "Invitation token verified successfully."));
            }

            // 2. Fallback to cryptographic token check
            if (!TryValidateOnboardingToken(token, out var tenantKey, out var tokenEmail, out var expiresUtc))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("The invitation token is invalid or has expired. Please contact your administrator for a new invite link."));
            }

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                TenantKey = tenantKey,
                Email = tokenEmail,
                ExpiresUtc = expiresUtc,
                IsValid = true
            }, "Invitation token verified successfully."));
        }

        /// <summary>
        /// Completes member self-registration: sets password, stores registration form custom attributes &amp; compliance details, and invalidates the one-time token.
        /// </summary>
        [HttpPost("members/complete-onboarding")]
        [HttpPost("rota/members/complete-onboarding")]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<object>>> CompleteMemberOnboarding(
            [FromBody] CompleteMemberOnboardingRequest request,
            CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(request.Token))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Invalid or expired invitation token."));
            }

            var tokenKey = ComputeTokenStorageKey(request.Token);
            Invitation? inv = null;
            try
            {
                inv = await _db.Invitations.FirstOrDefaultAsync(i => i.Token == tokenKey || i.Token == request.Token, ct);
            }
            catch
            {
                // Fallback to in-memory invitation store
            }
            if (inv == null && _memoryInvitations.TryGetValue(tokenKey, out var memInv))
            {
                inv = memInv;
            }

            string tenantKey = CurrentTenantKey;
            string tokenEmail = string.Empty;

            if (inv != null)
            {
                if (inv.IsUsed)
                {
                    return StatusCode(410, ApiResponse<object>.FailureResponse("This invitation link has already been used and is no longer valid."));
                }
                if (inv.ExpiresUtc.HasValue && inv.ExpiresUtc.Value < DateTime.UtcNow)
                {
                    return BadRequest(ApiResponse<object>.FailureResponse("This invitation link has expired."));
                }
                tokenEmail = inv.Email;
            }
            else if (!TryValidateOnboardingToken(request.Token, out tenantKey, out tokenEmail, out _))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Invalid or expired invitation token."));
            }

            if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Password must be at least 6 characters."));
            }

            var email = tokenEmail.ToLowerInvariant();
            var firstName = request.FirstName?.Trim() ?? string.Empty;
            var lastName = request.LastName?.Trim() ?? string.Empty;
            var fullName = $"{firstName} {lastName}".Trim();
            if (string.IsNullOrWhiteSpace(fullName)) fullName = request.FullName?.Trim() ?? inv?.FullName ?? "Staff Member";

            Profile? user = null;
            if (_userManager != null)
            {
                user = await _userManager.FindByEmailAsync(email);
            }
            else
            {
                user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);
            }

            var customAttrs = new Dictionary<string, object>();
            if (request.CustomAttributes != null)
            {
                foreach (var kv in request.CustomAttributes)
                {
                    customAttrs[kv.Key] = kv.Value;
                }
            }
            if (!string.IsNullOrWhiteSpace(request.EmergencyContactName) || !string.IsNullOrWhiteSpace(request.EmergencyContactPhone))
            {
                customAttrs["emergencyContact"] = new
                {
                    name = request.EmergencyContactName?.Trim(),
                    relationship = request.EmergencyContactRelationship?.Trim(),
                    phone = request.EmergencyContactPhone?.Trim()
                };
            }
            if (!string.IsNullOrWhiteSpace(request.BankName) || !string.IsNullOrWhiteSpace(request.AccountNumber))
            {
                customAttrs["bankDetails"] = new
                {
                    bankName = request.BankName?.Trim(),
                    accountHolder = request.AccountHolderName?.Trim() ?? fullName,
                    sortCode = request.SortCode?.Trim(),
                    accountNumber = request.AccountNumber?.Trim(),
                    nationalInsurance = request.NationalInsuranceNumber?.Trim()
                };
            }

            if (user == null)
            {
                user = new Profile
                {
                    Id = Guid.CreateVersion7().ToString(),
                    UserName = email,
                    Email = email,
                    FirstName = firstName,
                    LastName = lastName,
                    PhoneNumber = request.PhoneNumber?.Trim(),
                    MemberId = $"WRK-{new Random().Next(1000, 9999)}",
                    Designation = string.IsNullOrWhiteSpace(request.JobTitle) ? "Staff Member" : request.JobTitle.Trim(),
                    UserStatus = UserStatus.Active,
                    EmailConfirmed = true,
                    MustChangePassword = false,
                    CustomAttributesJson = customAttrs.Count > 0 ? JsonSerializer.Serialize(customAttrs) : null,
                    JoinDate = DateTime.UtcNow
                };

                if (_userManager != null)
                {
                    var createResult = await _userManager.CreateAsync(user, request.Password);
                    if (!createResult.Succeeded)
                    {
                        var err = createResult.Errors.FirstOrDefault()?.Description ?? "Failed to create member account.";
                        return BadRequest(ApiResponse<object>.FailureResponse(err));
                    }
                }
                else
                {
                    _db.Users.Add(user);
                    await _db.SaveChangesAsync(ct);
                }
            }
            else
            {
                user.FirstName = !string.IsNullOrWhiteSpace(firstName) ? firstName : user.FirstName;
                user.LastName = !string.IsNullOrWhiteSpace(lastName) ? lastName : user.LastName;
                user.PhoneNumber = !string.IsNullOrWhiteSpace(request.PhoneNumber) ? request.PhoneNumber.Trim() : user.PhoneNumber;
                user.CustomAttributesJson = customAttrs.Count > 0 ? JsonSerializer.Serialize(customAttrs) : user.CustomAttributesJson;
                user.MustChangePassword = false;

                if (_userManager != null)
                {
                    var resetToken = await _userManager.GeneratePasswordResetTokenAsync(user);
                    await _userManager.ResetPasswordAsync(user, resetToken, request.Password);
                    await _userManager.UpdateAsync(user);
                }
                else
                {
                    await _db.SaveChangesAsync(ct);
                }
            }

            // Provision or update BcpShiftStaffProfile
            var staffProfile = await _db.BcpShiftStaffProfiles
                .FirstOrDefaultAsync(p => p.TenantKey == tenantKey && p.UserId == user.Id, ct);

            if (staffProfile == null)
            {
                staffProfile = new BcpShiftStaffProfile
                {
                    Id = Guid.CreateVersion7(),
                    TenantKey = tenantKey,
                    UserId = user.Id,
                    CreatedUtc = DateTime.UtcNow
                };
                _db.BcpShiftStaffProfiles.Add(staffProfile);
            }

            if (!string.IsNullOrWhiteSpace(request.JobTitle))
            {
                staffProfile.JobTitle = request.JobTitle.Trim();
            }
            if (request.StaffTypeId.HasValue)
            {
                staffProfile.StaffTypeId = request.StaffTypeId.Value;
            }
            if (!string.IsNullOrWhiteSpace(request.StaffTypeName))
            {
                staffProfile.StaffTypeName = request.StaffTypeName.Trim();
            }
            staffProfile.IsActive = true;
            staffProfile.UpdatedUtc = DateTime.UtcNow;

            // Provision compliance documents & credentials dynamically (Zero Hardcoding)
            if (request.ComplianceDocuments != null && request.ComplianceDocuments.Count > 0)
            {
                foreach (var item in request.ComplianceDocuments)
                {
                    if (string.IsNullOrWhiteSpace(item.DocumentType)) continue;

                    var docType = item.DocumentType.Trim();
                    var doc = await _db.BcpShiftDocuments
                        .FirstOrDefaultAsync(d => d.TenantKey == tenantKey && d.UserId == user.Id && d.DocumentType == docType, ct);

                    if (doc == null)
                    {
                        doc = new BcpShiftDocument
                        {
                            Id = Guid.CreateVersion7(),
                            TenantKey = tenantKey,
                            UserId = user.Id,
                            DocumentType = docType,
                            UploadedBy = "Staff",
                            CreatedUtc = DateTime.UtcNow
                        };
                        _db.BcpShiftDocuments.Add(doc);
                    }

                    doc.DocumentName = !string.IsNullOrWhiteSpace(item.DocumentName)
                        ? item.DocumentName.Trim()
                        : $"{docType}_{item.ReferenceNumber ?? "Record"}";
                    doc.Description = item.Description ?? $"{docType} self-declaration record";
                    doc.ReferenceNumber = item.ReferenceNumber?.Trim();
                    doc.FileUrl = !string.IsNullOrWhiteSpace(item.FileUrl) ? item.FileUrl : "verified://staff-self-declaration";
                    doc.ExpiryDateUtc = item.ExpiryDateUtc;
                    doc.UpdatedUtc = DateTime.UtcNow;
                }
            }
            else if (!string.IsNullOrWhiteSpace(request.SiaLicenseNumber))
            {
                // Backward-compatible fallback for legacy forms
                var docType = !string.IsNullOrWhiteSpace(request.SiaLicenseSector) ? request.SiaLicenseSector.Trim() : "Professional License";
                var doc = await _db.BcpShiftDocuments
                    .FirstOrDefaultAsync(d => d.TenantKey == tenantKey && d.UserId == user.Id && (d.DocumentType == docType || d.DocumentType == "SIA License"), ct);

                if (doc == null)
                {
                    doc = new BcpShiftDocument
                    {
                        Id = Guid.CreateVersion7(),
                        TenantKey = tenantKey,
                        UserId = user.Id,
                        DocumentType = docType,
                        UploadedBy = "Staff",
                        CreatedUtc = DateTime.UtcNow
                    };
                    _db.BcpShiftDocuments.Add(doc);
                }

                doc.DocumentType = docType;
                doc.DocumentName = $"{docType}_{request.SiaLicenseNumber.Trim()}";
                doc.Description = $"License / Credential: {request.SiaLicenseNumber.Trim()}";
                doc.ReferenceNumber = request.SiaLicenseNumber.Trim();
                doc.FileUrl = "verified://staff-self-declaration";
                doc.ExpiryDateUtc = request.SiaLicenseExpiryDate;
                doc.UpdatedUtc = DateTime.UtcNow;
            }

            if (inv != null)
            {
                inv.IsUsed = true;
            }
            if (_memoryInvitations.TryGetValue(tokenKey, out var memInvToClose))
            {
                memInvToClose.IsUsed = true;
            }

            await _db.SaveChangesAsync(ct);

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                UserId = user.Id,
                Email = email,
                FullName = fullName
            }, "Account onboarding complete. You may now sign in to your workspace."));
        }

        /// <summary>
        /// Returns all enrolled workforce staff members with aggregated ratings, completed shifts, and punctuality scores.
        /// </summary>
        [HttpGet("members")]
        public async Task<ActionResult<ApiResponse<List<StaffMemberDto>>>> GetStaffMembers(CancellationToken ct)
        {
            var profiles = await _db.BcpShiftStaffProfiles
                .AsNoTracking()
                .Where(p => p.TenantKey == CurrentTenantKey && p.IsActive)
                .OrderBy(p => p.JobTitle)
                .ToListAsync(ct);

            // Cross-reference with central users table where available
            var userIds = profiles.Select(p => p.UserId).Distinct().ToList();
            var users = await _db.Users
                .AsNoTracking()
                .Where(u => userIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => new { u.FullName, u.Email, u.PhoneNumber, u.AvatarUrl }, ct);

            var result = profiles.Select(p =>
            {
                users.TryGetValue(p.UserId, out var u);
                return new StaffMemberDto
                {
                    ProfileId = p.Id,
                    UserId = p.UserId,
                    FullName = u?.FullName ?? "Staff Member",
                    Email = u?.Email ?? string.Empty,
                    PhoneNumber = u?.PhoneNumber,
                    AvatarUrl = u?.AvatarUrl,
                    JobTitle = p.JobTitle,
                    StaffTypeId = p.StaffTypeId,
                    StaffTypeName = p.StaffTypeName,
                    DefaultHourlyRate = p.DefaultHourlyRate,
                    ContractedWeeklyHours = p.ContractedWeeklyHours,
                    PreferredWorkingTime = p.PreferredWorkingTime,
                    WorkingAvailability = p.WorkingAvailability,
                    WeeklyAvailabilityJson = p.WeeklyAvailabilityJson,
                    AverageRating = p.AverageRating,
                    TotalRatingsCount = p.TotalRatingsCount,
                    TotalShiftsCompleted = p.TotalShiftsCompleted,
                    PunctualityScorePercent = p.PunctualityScorePercent,
                    NoShowCount = p.NoShowCount,
                    IsActive = p.IsActive,
                    EnrolledUtc = p.CreatedUtc
                };
            }).ToList();

            return Ok(ApiResponse<List<StaffMemberDto>>.SuccessResponse(result, "Workforce staff members retrieved."));
        }

        // =========================================================================
        // 6. GRAPHICAL ANALYTICS & KPIS
        // =========================================================================

        /// <summary>
        /// Computes graphical analytics, KPIs, fulfillment rates, punctuality scores, and labor spend for administrators.
        /// </summary>
        [HttpGet("analytics")]
        public async Task<ActionResult<ApiResponse<WorkforceAnalyticsDto>>> GetWorkforceAnalytics(CancellationToken ct)
        {
            var nowUtc = DateTime.UtcNow;
            var thirtyDaysAgo = nowUtc.AddDays(-30);

            var shifts = await _db.BcpShifts
                .AsNoTracking()
                .Include(s => s.ClientSite)
                .Include(s => s.AttendanceRecord)
                .Where(s => s.TenantKey == CurrentTenantKey && s.StartsAtUtc >= thirtyDaysAgo)
                .ToListAsync(ct);

            int totalShifts = shifts.Count;
            int completedShifts = shifts.Count(s => s.Status == "Completed");
            int openShifts = shifts.Count(s => string.IsNullOrWhiteSpace(s.AssignedUserId));
            int activeOnDuty = shifts.Count(s => s.AttendanceRecord != null && s.AttendanceRecord.ClockInUtc.HasValue && !s.AttendanceRecord.ClockOutUtc.HasValue);

            decimal scheduledHours = shifts.Sum(s => s.PlannedDurationHours);
            decimal workedHours = shifts.Where(s => s.AttendanceRecord?.ActualDurationHours != null).Sum(s => s.AttendanceRecord!.ActualDurationHours!.Value);

            decimal totalSpend = shifts.Sum(s =>
            {
                var rate = s.HourlyPayRate ?? 0;
                var hours = s.AttendanceRecord?.BillableHours ?? s.PlannedDurationHours;
                return rate * hours;
            });

            decimal fulfillmentRate = totalShifts > 0
                ? Math.Round(((decimal)(totalShifts - openShifts) / totalShifts) * 100m, 1)
                : 0.0m;

            var attendances = shifts.Where(s => s.AttendanceRecord != null).Select(s => s.AttendanceRecord!).ToList();
            int onTimeCount = attendances.Count(a => a.LateArrivalMinutes <= 5 && !a.IsFlagged);
            int lateCount = attendances.Count(a => a.LateArrivalMinutes > 5);
            int geofenceViolations = attendances.Count(a => !a.IsClockInGeofenceVerified);
            int noShows = shifts.Count(s => s.Status == "Absent");

            decimal punctualityPercent = attendances.Count > 0
                ? Math.Round(((decimal)onTimeCount / attendances.Count) * 100m, 1)
                : 0.0m;

            var siteBreakdowns = shifts
                .GroupBy(s => new { s.ClientSiteId, SiteName = s.ClientSite?.SiteName ?? "Unassigned Venue" })
                .Select(g => new SiteHoursBreakdownDto
                {
                    SiteId = g.Key.ClientSiteId,
                    SiteName = g.Key.SiteName,
                    TotalHours = g.Sum(s => s.AttendanceRecord?.BillableHours ?? s.PlannedDurationHours),
                    TotalSpend = g.Sum(s => (s.HourlyPayRate ?? 0) * (s.AttendanceRecord?.BillableHours ?? s.PlannedDurationHours)),
                    ShiftCount = g.Count()
                })
                .OrderByDescending(b => b.TotalHours)
                .ToList();

            var (currCode, currSymbol) = await ResolveTenantCurrencyAsync(ct);

            var dto = new WorkforceAnalyticsDto
            {
                CurrencyCode = currCode,
                CurrencySymbol = currSymbol,
                ShiftFulfillmentRatePercent = fulfillmentRate,
                OverallPunctualityPercent = punctualityPercent,
                ActiveOnDutyCount = activeOnDuty,
                TotalScheduledHours = Math.Round(scheduledHours, 1),
                TotalWorkedHours = Math.Round(workedHours, 1),
                TotalGrossLaborSpend = Math.Round(totalSpend, 2),
                TotalShiftsCount = totalShifts,
                CompletedShiftsCount = completedShifts,
                OpenShiftsCount = openShifts,
                FlaggedAttendanceCount = attendances.Count(a => a.IsFlagged),
                SiteBreakdowns = siteBreakdowns,
                AttendanceDistribution = new AttendanceDistributionDto
                {
                    OnTime = onTimeCount,
                    LateArrivals = lateCount,
                    GeofenceViolations = geofenceViolations,
                    NoShows = noShows
                }
            };

            return Ok(ApiResponse<WorkforceAnalyticsDto>.SuccessResponse(dto, "Workforce graphical analytics computed successfully."));
        }

        /// <summary>
        /// Retrieves the active tenant running currency code and symbol configured in the Central Master Catalog.
        /// </summary>
        [HttpGet("currency")]
        public async Task<ActionResult<ApiResponse<object>>> GetTenantCurrency(CancellationToken ct)
        {
            var (code, symbol) = await ResolveTenantCurrencyAsync(ct);
            return Ok(ApiResponse<object>.SuccessResponse(new { currencyCode = code, currencySymbol = symbol }, "Tenant currency resolved successfully."));
        }

        // =========================================================================
        // 7. STAFF PERFORMANCE RATINGS
        // =========================================================================

        /// <summary>
        /// Submits a supervisor or manager post-shift evaluation rating for a staff member,
        /// automatically recalculating the worker's average rating and punctuality score.
        /// </summary>
        [HttpPost("ratings")]
        public async Task<ActionResult<ApiResponse<Guid>>> SubmitStaffRating([FromBody] SubmitRatingRequest request, CancellationToken ct)
        {
            var shift = await _db.BcpShifts
                .FirstOrDefaultAsync(s => s.Id == request.ShiftId && s.TenantKey == CurrentTenantKey, ct);

            if (shift == null)
            {
                return NotFound(ApiResponse<Guid>.FailureResponse("Shift not found.", errorCode: "ERR-2004"));
            }

            var rating = new BcpShiftStaffRating
            {
                Id = Guid.CreateVersion7(),
                TenantKey = CurrentTenantKey,
                ShiftId = shift.Id,
                UserId = request.UserId,
                RatedByUserId = CurrentUserId,
                RatedByUserName = CurrentUserName,
                RatingStars = Math.Clamp(request.RatingStars, 1, 5),
                PunctualityScore = Math.Clamp(request.PunctualityScore, 1, 5),
                FeedbackNotes = request.FeedbackNotes?.Trim(),
                CreatedUtc = DateTime.UtcNow
            };

            _db.BcpShiftStaffRatings.Add(rating);
            await _db.SaveChangesAsync(ct);

            // Update Staff Profile Aggregates
            var profile = await _db.BcpShiftStaffProfiles
                .FirstOrDefaultAsync(p => p.TenantKey == CurrentTenantKey && p.UserId == request.UserId, ct);

            if (profile != null)
            {
                var allRatings = await _db.BcpShiftStaffRatings
                    .Where(r => r.TenantKey == CurrentTenantKey && r.UserId == request.UserId)
                    .ToListAsync(ct);

                profile.TotalRatingsCount = allRatings.Count;
                profile.AverageRating = Math.Round((decimal)allRatings.Average(r => r.RatingStars), 2);
                profile.PunctualityScorePercent = Math.Round(((decimal)allRatings.Count(r => r.PunctualityScore >= 4) / allRatings.Count) * 100m, 1);
                profile.UpdatedUtc = DateTime.UtcNow;

                await _db.SaveChangesAsync(ct);
            }

            return Ok(ApiResponse<Guid>.SuccessResponse(rating.Id, "Staff rating successfully recorded."));
        }

        /// <summary>
        /// Returns all supervisor ratings and feedback for a specific staff member.
        /// </summary>
        [HttpGet("ratings/{userId}")]
        public async Task<ActionResult<ApiResponse<List<StaffRatingDto>>>> GetStaffRatings(string userId, CancellationToken ct)
        {
            var ratings = await _db.BcpShiftStaffRatings
                .AsNoTracking()
                .Where(r => r.TenantKey == CurrentTenantKey && r.UserId == userId)
                .OrderByDescending(r => r.CreatedUtc)
                .Select(r => new StaffRatingDto
                {
                    Id = r.Id,
                    ShiftId = r.ShiftId,
                    UserId = r.UserId,
                    RatedByUserId = r.RatedByUserId,
                    RatedByUserName = r.RatedByUserName,
                    RatingStars = r.RatingStars,
                    PunctualityScore = r.PunctualityScore,
                    FeedbackNotes = r.FeedbackNotes,
                    CreatedUtc = r.CreatedUtc
                })
                .ToListAsync(ct);

            return Ok(ApiResponse<List<StaffRatingDto>>.SuccessResponse(ratings, "Staff ratings retrieved."));
        }

        // =========================================================================
        // 8. TRI-STATE AVAILABILITY MANAGEMENT
        // =========================================================================

        /// <summary>
        /// Returns availability records for the current user or a targeted worker.
        /// </summary>
        [HttpGet("availability")]
        public async Task<ActionResult<ApiResponse<List<StaffAvailabilityDto>>>> GetAvailability(
            [FromQuery] string? userId,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate,
            CancellationToken ct)
        {
            var targetUserId = string.IsNullOrWhiteSpace(userId) ? CurrentUserId : userId.Trim();
            var query = _db.BcpShiftAvailabilities
                .AsNoTracking()
                .Where(a => a.TenantKey == CurrentTenantKey && a.UserId == targetUserId);

            if (fromDate.HasValue)
            {
                query = query.Where(a => a.TargetDate >= fromDate.Value.Date);
            }
            if (toDate.HasValue)
            {
                query = query.Where(a => a.TargetDate <= toDate.Value.Date);
            }

            var list = await query
                .OrderBy(a => a.TargetDate)
                .Select(a => new StaffAvailabilityDto
                {
                    Id = a.Id,
                    UserId = a.UserId,
                    TargetDate = a.TargetDate,
                    State = a.State,
                    UnavailableFromTime = a.UnavailableFromTime,
                    UnavailableToTime = a.UnavailableToTime,
                    Reason = a.Reason
                })
                .ToListAsync(ct);

            return Ok(ApiResponse<List<StaffAvailabilityDto>>.SuccessResponse(list, "Availability schedule retrieved."));
        }

        /// <summary>
        /// Creates or updates a tri-state availability entry (Available, Unavailable, PartlyUnavailable) for a specific date.
        /// </summary>
        [HttpPost("availability")]
        public async Task<ActionResult<ApiResponse<Guid>>> UpsertAvailability([FromBody] UpsertAvailabilityRequest request, CancellationToken ct)
        {
            var targetDate = request.TargetDate.Date;
            var record = await _db.BcpShiftAvailabilities
                .FirstOrDefaultAsync(a => a.TenantKey == CurrentTenantKey && a.UserId == CurrentUserId && a.TargetDate == targetDate, ct);

            if (record == null)
            {
                record = new BcpShiftAvailability
                {
                    Id = Guid.CreateVersion7(),
                    TenantKey = CurrentTenantKey,
                    UserId = CurrentUserId,
                    TargetDate = targetDate,
                    CreatedUtc = DateTime.UtcNow
                };
                _db.BcpShiftAvailabilities.Add(record);
            }

            record.State = string.IsNullOrWhiteSpace(request.State) ? "Available" : request.State.Trim();
            record.UnavailableFromTime = request.UnavailableFromTime;
            record.UnavailableToTime = request.UnavailableToTime;
            record.Reason = request.Reason?.Trim();
            record.UpdatedUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);
            return Ok(ApiResponse<Guid>.SuccessResponse(record.Id, "Availability updated successfully."));
        }

        // =========================================================================
        // 9. COMPLIANCE & DOCUMENT VAULT
        // =========================================================================

        /// <summary>
        /// Returns compliance credentials, licenses, and proof documents uploaded by staff.
        /// </summary>
        [HttpGet("documents")]
        public async Task<ActionResult<ApiResponse<List<StaffDocumentDto>>>> GetDocuments([FromQuery] string? userId, CancellationToken ct)
        {
            var targetUserId = string.IsNullOrWhiteSpace(userId) ? CurrentUserId : userId.Trim();
            var docs = await _db.BcpShiftDocuments
                .AsNoTracking()
                .Where(d => d.TenantKey == CurrentTenantKey && d.UserId == targetUserId)
                .OrderByDescending(d => d.CreatedUtc)
                .Select(d => new StaffDocumentDto
                {
                    Id = d.Id,
                    UserId = d.UserId,
                    DocumentType = d.DocumentType,
                    DocumentName = d.DocumentName,
                    Description = d.Description,
                    ReferenceNumber = d.ReferenceNumber,
                    FileUrl = d.FileUrl,
                    UploadedBy = d.UploadedBy,
                    ExpiryDateUtc = d.ExpiryDateUtc,
                    IsVerified = d.IsVerified,
                    CreatedUtc = d.CreatedUtc
                })
                .ToListAsync(ct);

            return Ok(ApiResponse<List<StaffDocumentDto>>.SuccessResponse(docs, "Compliance documents retrieved."));
        }

        /// <summary>
        /// Uploads a new staff credential, license scan, right-to-work proof, or baseline headshot.
        /// </summary>
        [HttpPost("documents")]
        public async Task<ActionResult<ApiResponse<Guid>>> UploadDocument([FromBody] UploadDocumentRequest request, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(request.FileUrl) || string.IsNullOrWhiteSpace(request.DocumentName))
            {
                return BadRequest(ApiResponse<Guid>.FailureResponse("Document name and file URL are mandatory.", errorCode: "ERR-2002"));
            }

            var targetUserId = !string.IsNullOrWhiteSpace(request.UserId) ? request.UserId.Trim() : CurrentUserId;

            var doc = new BcpShiftDocument
            {
                Id = Guid.CreateVersion7(),
                TenantKey = CurrentTenantKey,
                UserId = targetUserId,
                DocumentType = string.IsNullOrWhiteSpace(request.DocumentType) ? "General" : request.DocumentType.Trim(),
                DocumentName = request.DocumentName.Trim(),
                Description = request.Description?.Trim(),
                ReferenceNumber = request.ReferenceNumber?.Trim(),
                FileUrl = request.FileUrl.Trim(),
                UploadedBy = CurrentUserName,
                ExpiryDateUtc = request.ExpiryDateUtc,
                IsVerified = false,
                CreatedUtc = DateTime.UtcNow
            };

            _db.BcpShiftDocuments.Add(doc);
            await _db.SaveChangesAsync(ct);

            return Ok(ApiResponse<Guid>.SuccessResponse(doc.Id, "Compliance document uploaded successfully."));
        }

        // =========================================================================
        // 10. CUSTOM NOTIFICATION & REMINDER PREFERENCES
        // =========================================================================

        /// <summary>
        /// Returns the staff member's personalized 3-slot shift departure reminder schedule.
        /// </summary>
        [HttpGet("notifications/preferences")]
        public async Task<ActionResult<ApiResponse<StaffNotificationPreferenceDto>>> GetNotificationPreferences(CancellationToken ct)
        {
            var pref = await _db.BcpShiftNotificationPreferences
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.TenantKey == CurrentTenantKey && p.UserId == CurrentUserId, ct);

            var dto = new StaffNotificationPreferenceDto
            {
                Id = pref?.Id ?? Guid.Empty,
                UserId = CurrentUserId,
                Slot1MinutesBefore = pref?.Slot1MinutesBefore ?? 1440,
                EnableSlot1 = pref?.EnableSlot1 ?? true,
                Slot2MinutesBefore = pref?.Slot2MinutesBefore ?? 240,
                EnableSlot2 = pref?.EnableSlot2 ?? true,
                Slot3MinutesBefore = pref?.Slot3MinutesBefore ?? 30,
                EnableSlot3 = pref?.EnableSlot3 ?? true,
                EnableInApp = pref?.EnableInApp ?? true,
                EnableEmail = pref?.EnableEmail ?? true,
                EnableWhatsApp = pref?.EnableWhatsApp ?? true,
                PreferredContactPhone = pref?.PreferredContactPhone
            };

            return Ok(ApiResponse<StaffNotificationPreferenceDto>.SuccessResponse(dto, "Notification preferences retrieved."));
        }

        /// <summary>
        /// Updates the staff member's custom 3-slot shift reminder schedule and delivery channel toggles.
        /// </summary>
        [HttpPost("notifications/preferences")]
        public async Task<ActionResult<ApiResponse<bool>>> UpdateNotificationPreferences(
            [FromBody] UpdateNotificationPreferenceRequest request,
            CancellationToken ct)
        {
            var pref = await _db.BcpShiftNotificationPreferences
                .FirstOrDefaultAsync(p => p.TenantKey == CurrentTenantKey && p.UserId == CurrentUserId, ct);

            if (pref == null)
            {
                pref = new BcpShiftNotificationPreference
                {
                    Id = Guid.CreateVersion7(),
                    TenantKey = CurrentTenantKey,
                    UserId = CurrentUserId,
                    CreatedUtc = DateTime.UtcNow
                };
                _db.BcpShiftNotificationPreferences.Add(pref);
            }

            pref.Slot1MinutesBefore = Math.Max(1, request.Slot1MinutesBefore);
            pref.EnableSlot1 = request.EnableSlot1;
            pref.Slot2MinutesBefore = Math.Max(1, request.Slot2MinutesBefore);
            pref.EnableSlot2 = request.EnableSlot2;
            pref.Slot3MinutesBefore = Math.Max(1, request.Slot3MinutesBefore);
            pref.EnableSlot3 = request.EnableSlot3;
            pref.EnableInApp = request.EnableInApp;
            pref.EnableEmail = request.EnableEmail;
            pref.EnableWhatsApp = request.EnableWhatsApp;
            pref.PreferredContactPhone = request.PreferredContactPhone?.Trim();
            pref.UpdatedUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);
            return Ok(ApiResponse<bool>.SuccessResponse(true, "Shift reminder preferences updated successfully."));
        }

        // =========================================================================
        // 11. STAFF TYPES GOVERNANCE & SETTINGS
        // =========================================================================

        /// <summary>
        /// Ensures compulsory baseline staff types (Permanent, Temporary, Contractor) exist for the tenant.
        /// Invoked dynamically upon first query or staff enrollment to guarantee 100% availability.
        /// </summary>
        private async Task EnsureDefaultStaffTypesAsync(string tenantKey, CancellationToken ct = default)
        {
            if (await _db.BcpStaffTypes.AnyAsync(t => t.TenantKey == tenantKey, ct))
            {
                return;
            }

            var cleanKey = tenantKey.Trim().ToLowerInvariant();
            var defaults = new List<BcpStaffType>
            {
                new BcpStaffType
                {
                    Id = Guid.CreateVersion7(),
                    TenantKey = cleanKey,
                    Name = "Permanent",
                    Code = "permanent",
                    Description = "Permanent contract staff member with guaranteed full-time or part-time baseline hours.",
                    DefaultContractedHours = 40.0m,
                    IsCompulsory = true,
                    IsActive = true,
                    SortOrder = 1,
                    CreatedUtc = DateTime.UtcNow
                },
                new BcpStaffType
                {
                    Id = Guid.CreateVersion7(),
                    TenantKey = cleanKey,
                    Name = "Temporary",
                    Code = "temporary",
                    Description = "Temporary, casual, or zero-hours staff assigned to flexible shifts or seasonal post demands.",
                    DefaultContractedHours = 0.0m,
                    IsCompulsory = true,
                    IsActive = true,
                    SortOrder = 2,
                    CreatedUtc = DateTime.UtcNow
                },
                new BcpStaffType
                {
                    Id = Guid.CreateVersion7(),
                    TenantKey = cleanKey,
                    Name = "Contractor",
                    Code = "contractor",
                    Description = "External agency contractor or self-employed specialist engaged on specific assignments.",
                    DefaultContractedHours = 0.0m,
                    IsCompulsory = false,
                    IsActive = true,
                    SortOrder = 3,
                    CreatedUtc = DateTime.UtcNow
                }
            };

            _db.BcpStaffTypes.AddRange(defaults);
            await _db.SaveChangesAsync(ct);
        }

        /// <summary>
        /// Retrieves all configured staff employment types for the current tenant without auto-seeding hardcoded defaults.
        /// </summary>
        [HttpGet("staff-types")]
        public async Task<ActionResult<ApiResponse<List<BcpStaffTypeDto>>>> GetStaffTypes(CancellationToken ct)
        {
            var types = await _db.BcpStaffTypes
                .AsNoTracking()
                .Where(t => t.TenantKey == CurrentTenantKey)
                .OrderBy(t => t.SortOrder)
                .ThenBy(t => t.Name)
                .ToListAsync(ct);

            // Calculate staff count per type
            var counts = await _db.BcpShiftStaffProfiles
                .AsNoTracking()
                .Where(p => p.TenantKey == CurrentTenantKey && p.IsActive && p.StaffTypeId != null)
                .GroupBy(p => p.StaffTypeId!.Value)
                .Select(g => new { StaffTypeId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.StaffTypeId, x => x.Count, ct);

            var dtos = types.Select(t => new BcpStaffTypeDto
            {
                Id = t.Id,
                Name = t.Name,
                Code = t.Code,
                Description = t.Description,
                DefaultContractedHours = t.DefaultContractedHours,
                IsCompulsory = t.IsCompulsory,
                IsActive = t.IsActive,
                SortOrder = t.SortOrder,
                EnrolledStaffCount = counts.TryGetValue(t.Id, out var c) ? c : 0
            }).ToList();

            return Ok(ApiResponse<List<BcpStaffTypeDto>>.SuccessResponse(dtos, "Staff types retrieved successfully."));
        }

        /// <summary>
        /// Creates a new custom staff employment type for the tenant workspace.
        /// </summary>
        [HttpPost("staff-types")]
        public async Task<ActionResult<ApiResponse<BcpStaffTypeDto>>> CreateStaffType([FromBody] CreateStaffTypeRequest request, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(ApiResponse<BcpStaffTypeDto>.FailureResponse("Staff type name is required."));
            }

            var cleanName = request.Name.Trim();
            var cleanCode = !string.IsNullOrWhiteSpace(request.Code)
                ? request.Code.Trim().ToLowerInvariant().Replace(" ", "-")
                : cleanName.ToLowerInvariant().Replace(" ", "-");

            bool exists = await _db.BcpStaffTypes
                .AnyAsync(t => t.TenantKey == CurrentTenantKey && (t.Name.ToLower() == cleanName.ToLower() || t.Code == cleanCode), ct);

            if (exists)
            {
                return BadRequest(ApiResponse<BcpStaffTypeDto>.FailureResponse($"A staff type with name '{cleanName}' or code '{cleanCode}' already exists."));
            }

            var staffType = new BcpStaffType
            {
                Id = Guid.CreateVersion7(),
                TenantKey = CurrentTenantKey,
                Name = cleanName,
                Code = cleanCode,
                Description = request.Description?.Trim() ?? string.Empty,
                DefaultContractedHours = request.DefaultContractedHours >= 0 ? request.DefaultContractedHours : 0m,
                IsCompulsory = false,
                IsActive = true,
                SortOrder = request.SortOrder,
                CreatedUtc = DateTime.UtcNow
            };

            _db.BcpStaffTypes.Add(staffType);
            await _db.SaveChangesAsync(ct);

            var dto = new BcpStaffTypeDto
            {
                Id = staffType.Id,
                Name = staffType.Name,
                Code = staffType.Code,
                Description = staffType.Description,
                DefaultContractedHours = staffType.DefaultContractedHours,
                IsCompulsory = staffType.IsCompulsory,
                IsActive = staffType.IsActive,
                SortOrder = staffType.SortOrder,
                EnrolledStaffCount = 0
            };

            return Ok(ApiResponse<BcpStaffTypeDto>.SuccessResponse(dto, "Staff type created successfully."));
        }

        /// <summary>
        /// Updates an existing staff employment type's name, description, default hours, and status.
        /// </summary>
        [HttpPut("staff-types/{id:guid}")]
        public async Task<ActionResult<ApiResponse<BcpStaffTypeDto>>> UpdateStaffType(Guid id, [FromBody] UpdateStaffTypeRequest request, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(ApiResponse<BcpStaffTypeDto>.FailureResponse("Staff type name is required."));
            }

            var staffType = await _db.BcpStaffTypes
                .FirstOrDefaultAsync(t => t.Id == id && t.TenantKey == CurrentTenantKey, ct);

            if (staffType == null)
            {
                return NotFound(ApiResponse<BcpStaffTypeDto>.FailureResponse("Staff type not found."));
            }

            staffType.Name = request.Name.Trim();
            staffType.Description = request.Description?.Trim() ?? string.Empty;
            staffType.DefaultContractedHours = request.DefaultContractedHours >= 0 ? request.DefaultContractedHours : 0m;

            // Compulsory types cannot be disabled
            if (staffType.IsCompulsory)
            {
                staffType.IsActive = true;
            }
            else
            {
                staffType.IsActive = request.IsActive;
            }

            staffType.SortOrder = request.SortOrder;
            staffType.UpdatedUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);

            var count = await _db.BcpShiftStaffProfiles
                .CountAsync(p => p.TenantKey == CurrentTenantKey && p.StaffTypeId == staffType.Id && p.IsActive, ct);

            var dto = new BcpStaffTypeDto
            {
                Id = staffType.Id,
                Name = staffType.Name,
                Code = staffType.Code,
                Description = staffType.Description,
                DefaultContractedHours = staffType.DefaultContractedHours,
                IsCompulsory = staffType.IsCompulsory,
                IsActive = staffType.IsActive,
                SortOrder = staffType.SortOrder,
                EnrolledStaffCount = count
            };

            return Ok(ApiResponse<BcpStaffTypeDto>.SuccessResponse(dto, "Staff type updated successfully."));
        }

        /// <summary>
        /// Deletes a non-compulsory staff type. Platform compulsory types (Permanent, Temporary) cannot be removed.
        /// </summary>
        [HttpDelete("staff-types/{id:guid}")]
        public async Task<ActionResult<ApiResponse<bool>>> DeleteStaffType(Guid id, CancellationToken ct)
        {
            var staffType = await _db.BcpStaffTypes
                .FirstOrDefaultAsync(t => t.Id == id && t.TenantKey == CurrentTenantKey, ct);

            if (staffType == null)
            {
                return NotFound(ApiResponse<bool>.FailureResponse("Staff type not found."));
            }

            if (staffType.IsCompulsory)
            {
                return BadRequest(ApiResponse<bool>.FailureResponse($"'{staffType.Name}' is a compulsory platform staff type and cannot be deleted."));
            }

            bool inUse = await _db.BcpShiftStaffProfiles
                .AnyAsync(p => p.TenantKey == CurrentTenantKey && p.StaffTypeId == id && p.IsActive, ct);

            if (inUse)
            {
                return BadRequest(ApiResponse<bool>.FailureResponse($"Cannot delete '{staffType.Name}' because active staff members are currently assigned to this type. Reassign staff before deleting."));
            }

            _db.BcpStaffTypes.Remove(staffType);
            await _db.SaveChangesAsync(ct);

            return Ok(ApiResponse<bool>.SuccessResponse(true, $"Staff type '{staffType.Name}' deleted successfully."));
        }

        // =========================================================================
        // 12. JOB ROLES & PAY RATES
        // =========================================================================

        private async Task EnsureDefaultJobRolesAndPoliciesAsync(string tenantKey, CancellationToken ct = default)
        {
            var cleanKey = tenantKey.Trim().ToLowerInvariant();

            if (!await _db.BcpJobRoles.AnyAsync(r => r.TenantKey == cleanKey, ct))
            {
                var defaults = new List<BcpJobRole>
                {
                    new BcpJobRole { Id = Guid.CreateVersion7(), TenantKey = cleanKey, Title = "SIA Door Supervisor", Code = "DS", Description = "Licensed door supervisor managing access control, patron safety, and front-of-house security.", CompensationBasis = "Hourly", DefaultHourlyRate = 15.00m, BillingChargeRate = 22.50m, MandatorySiaSector = "Door Supervision", BadgeColor = "#0050E5", IsActive = true, SortOrder = 1, CreatedUtc = DateTime.UtcNow },
                    new BcpJobRole { Id = Guid.CreateVersion7(), TenantKey = cleanKey, Title = "Static Security Guard", Code = "SG", Description = "Manned guarding for corporate offices, reception desks, and perimeter patrol routes.", CompensationBasis = "Hourly", DefaultHourlyRate = 13.50m, BillingChargeRate = 20.00m, MandatorySiaSector = "Security Guarding", BadgeColor = "#059669", IsActive = true, SortOrder = 2, CreatedUtc = DateTime.UtcNow },
                    new BcpJobRole { Id = Guid.CreateVersion7(), TenantKey = cleanKey, Title = "CCTV Controller", Code = "CCTV", Description = "Licensed control room operator monitoring live video feeds, intrusion alarms, and remote dispatches.", CompensationBasis = "Hourly", DefaultHourlyRate = 16.00m, BillingChargeRate = 24.00m, MandatorySiaSector = "CCTV", BadgeColor = "#7C3AED", IsActive = true, SortOrder = 3, CreatedUtc = DateTime.UtcNow },
                    new BcpJobRole { Id = Guid.CreateVersion7(), TenantKey = cleanKey, Title = "Mobile Patrol Officer", Code = "MPO", Description = "Vehicle-equipped patrol specialist conducting scheduled lockups, unlocks, and alarm responses.", CompensationBasis = "Hourly", DefaultHourlyRate = 14.50m, BillingChargeRate = 21.50m, MandatorySiaSector = "Security Guarding", BadgeColor = "#2563EB", IsActive = true, SortOrder = 4, CreatedUtc = DateTime.UtcNow },
                    new BcpJobRole { Id = Guid.CreateVersion7(), TenantKey = cleanKey, Title = "Event Steward", Code = "ES", Description = "Crowd management, ticket verification, and hospitality guidance for events and festivals.", CompensationBasis = "Hourly", DefaultHourlyRate = 12.50m, BillingChargeRate = 18.00m, MandatorySiaSector = "None", BadgeColor = "#D97706", IsActive = true, SortOrder = 5, CreatedUtc = DateTime.UtcNow },
                    new BcpJobRole { Id = Guid.CreateVersion7(), TenantKey = cleanKey, Title = "Healthcare / Care Worker", Code = "HCW", Description = "Certified care worker providing residential and post care support.", CompensationBasis = "Hourly", DefaultHourlyRate = 16.50m, BillingChargeRate = 25.00m, MandatorySiaSector = "None", BadgeColor = "#EC4899", IsActive = true, SortOrder = 6, CreatedUtc = DateTime.UtcNow },
                    new BcpJobRole { Id = Guid.CreateVersion7(), TenantKey = cleanKey, Title = "Office Administrator", Code = "ADM", Description = "Full-time daily administrative executive managing business operations, records, and correspondence.", CompensationBasis = "Monthly", MonthlySalary = 250000m, ContractedWeeklyHours = 40.0m, MandatorySiaSector = "None", BadgeColor = "#6366F1", IsActive = true, SortOrder = 7, CreatedUtc = DateTime.UtcNow }
                };
                _db.BcpJobRoles.AddRange(defaults);
            }

            if (!await _db.BcpWorkforcePolicySettings.AnyAsync(p => p.TenantKey == cleanKey, ct))
            {
                _db.BcpWorkforcePolicySettings.Add(new BcpWorkforcePolicySetting
                {
                    Id = Guid.CreateVersion7(),
                    TenantKey = cleanKey,
                    StandardWeeklyHours = 40.0m,
                    MaxPermissibleWeeklyHours = 48.0m,
                    MaxConsecutiveWorkingDays = 6,
                    Enforce48HourWeeklyCap = true,
                    DayShiftStart = "07:00",
                    DayShiftEnd = "19:00",
                    NightShiftStart = "19:00",
                    NightShiftEnd = "07:00",
                    NightPremiumHourlyAllowance = 1.50m,
                    EnableNightPremium = false,
                    BreakMinutesFor6Hours = 30,
                    BreakMinutesFor8Hours = 45,
                    BreakMinutesFor12Hours = 60,
                    IsBreakPaid = false,
                    BreakLoggingMode = "AutomaticDeduction",
                    RequireUniformSizes = true,
                    RequireDrivingLicense = true,
                    RequireMedicalAllergies = true,
                    RequireDbsCriminalDisclosure = true,
                    CreatedUtc = DateTime.UtcNow
                });
            }

            await _db.SaveChangesAsync(ct);
        }

        /// <summary>
        /// Retrieves all configured job roles for the tenant workspace without auto-seeding hardcoded roles.
        /// </summary>
        [HttpGet("job-roles")]
        public async Task<ActionResult<ApiResponse<List<BcpJobRoleDto>>>> GetJobRoles(CancellationToken ct)
        {
            var roles = await _db.BcpJobRoles
                .AsNoTracking()
                .Where(r => r.TenantKey == CurrentTenantKey)
                .OrderBy(r => r.SortOrder)
                .ThenBy(r => r.Title)
                .ToListAsync(ct);

            var counts = await _db.BcpShiftStaffProfiles
                .AsNoTracking()
                .Where(p => p.TenantKey == CurrentTenantKey && p.IsActive)
                .GroupBy(p => p.JobTitle)
                .Select(g => new { JobTitle = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.JobTitle, x => x.Count, ct);

            var dtos = roles.Select(r => new BcpJobRoleDto
            {
                Id = r.Id,
                Title = r.Title,
                Code = r.Code,
                Description = r.Description,
                CompensationBasis = r.CompensationBasis ?? "Hourly",
                MonthlySalary = r.MonthlySalary,
                ContractedWeeklyHours = r.ContractedWeeklyHours,
                DefaultHourlyRate = r.DefaultHourlyRate,
                BillingChargeRate = r.BillingChargeRate,
                MandatorySiaSector = r.MandatorySiaSector,
                BadgeColor = r.BadgeColor,
                IsActive = r.IsActive,
                SortOrder = r.SortOrder,
                EnrolledStaffCount = counts.TryGetValue(r.Title, out var c) ? c : 0
            }).ToList();

            return Ok(ApiResponse<List<BcpJobRoleDto>>.SuccessResponse(dtos, "Job roles retrieved successfully."));
        }

        /// <summary>
        /// Creates a new operational job role.
        /// </summary>
        [HttpPost("job-roles")]
        public async Task<ActionResult<ApiResponse<BcpJobRoleDto>>> CreateJobRole([FromBody] CreateJobRoleRequest request, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(request.Title))
            {
                return BadRequest(ApiResponse<BcpJobRoleDto>.FailureResponse("Job role title is required."));
            }

            try
            {
                var cleanTitle = request.Title.Trim();
                var cleanCode = !string.IsNullOrWhiteSpace(request.Code)
                    ? request.Code.Trim().ToUpperInvariant()
                    : cleanTitle[..Math.Min(4, cleanTitle.Length)].ToUpperInvariant();

                bool exists = await _db.BcpJobRoles
                    .AnyAsync(r => r.TenantKey == CurrentTenantKey && r.Title.ToLower() == cleanTitle.ToLower(), ct);

                if (exists)
                {
                    return BadRequest(ApiResponse<BcpJobRoleDto>.FailureResponse($"A job role with title '{cleanTitle}' already exists."));
                }

                var role = new BcpJobRole
                {
                    Id = Guid.CreateVersion7(),
                    TenantKey = CurrentTenantKey,
                    Title = cleanTitle,
                    Code = cleanCode,
                    Description = request.Description?.Trim() ?? string.Empty,
                    CompensationBasis = !string.IsNullOrWhiteSpace(request.CompensationBasis) ? request.CompensationBasis.Trim() : "Hourly",
                    MonthlySalary = request.MonthlySalary,
                    ContractedWeeklyHours = request.ContractedWeeklyHours,
                    DefaultHourlyRate = request.DefaultHourlyRate,
                    BillingChargeRate = request.BillingChargeRate,
                    MandatorySiaSector = request.MandatorySiaSector?.Trim() ?? "None",
                    BadgeColor = !string.IsNullOrWhiteSpace(request.BadgeColor) ? request.BadgeColor.Trim() : "#0050E5",
                    IsActive = true,
                    SortOrder = request.SortOrder,
                    CreatedUtc = DateTime.UtcNow
                };

                _db.BcpJobRoles.Add(role);
                await _db.SaveChangesAsync(ct);

                var dto = new BcpJobRoleDto
                {
                    Id = role.Id,
                    Title = role.Title,
                    Code = role.Code,
                    Description = role.Description,
                    CompensationBasis = role.CompensationBasis,
                    MonthlySalary = role.MonthlySalary,
                    ContractedWeeklyHours = role.ContractedWeeklyHours,
                    DefaultHourlyRate = role.DefaultHourlyRate,
                    BillingChargeRate = role.BillingChargeRate,
                    MandatorySiaSector = role.MandatorySiaSector,
                    BadgeColor = role.BadgeColor,
                    IsActive = role.IsActive,
                    SortOrder = role.SortOrder,
                    EnrolledStaffCount = 0
                };

                return Ok(ApiResponse<BcpJobRoleDto>.SuccessResponse(dto, "Job role created successfully."));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<BcpJobRoleDto>.FailureResponse(
                    $"Unable to save job role: {ex.InnerException?.Message ?? ex.Message}. Please verify database schema is up-to-date."));
            }
        }

        /// <summary>
        /// Updates an operational job role.
        /// </summary>
        [HttpPut("job-roles/{id:guid}")]
        public async Task<ActionResult<ApiResponse<BcpJobRoleDto>>> UpdateJobRole(Guid id, [FromBody] UpdateJobRoleRequest request, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(request.Title))
            {
                return BadRequest(ApiResponse<BcpJobRoleDto>.FailureResponse("Job role title is required."));
            }

            var role = await _db.BcpJobRoles
                .FirstOrDefaultAsync(r => r.Id == id && r.TenantKey == CurrentTenantKey, ct);

            if (role == null)
            {
                return NotFound(ApiResponse<BcpJobRoleDto>.FailureResponse("Job role not found."));
            }

            role.Title = request.Title.Trim();
            role.Code = !string.IsNullOrWhiteSpace(request.Code) ? request.Code.Trim().ToUpperInvariant() : role.Code;
            role.Description = request.Description?.Trim() ?? string.Empty;
            role.CompensationBasis = !string.IsNullOrWhiteSpace(request.CompensationBasis) ? request.CompensationBasis.Trim() : role.CompensationBasis;
            role.MonthlySalary = request.MonthlySalary;
            role.ContractedWeeklyHours = request.ContractedWeeklyHours;
            role.DefaultHourlyRate = request.DefaultHourlyRate;
            role.BillingChargeRate = request.BillingChargeRate;
            role.MandatorySiaSector = request.MandatorySiaSector?.Trim() ?? "None";
            role.BadgeColor = !string.IsNullOrWhiteSpace(request.BadgeColor) ? request.BadgeColor.Trim() : role.BadgeColor;
            role.IsActive = request.IsActive;
            role.SortOrder = request.SortOrder;
            role.UpdatedUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);

            var count = await _db.BcpShiftStaffProfiles
                .CountAsync(p => p.TenantKey == CurrentTenantKey && p.JobTitle == role.Title && p.IsActive, ct);

            var dto = new BcpJobRoleDto
            {
                Id = role.Id,
                Title = role.Title,
                Code = role.Code,
                Description = role.Description,
                CompensationBasis = role.CompensationBasis,
                MonthlySalary = role.MonthlySalary,
                ContractedWeeklyHours = role.ContractedWeeklyHours,
                DefaultHourlyRate = role.DefaultHourlyRate,
                BillingChargeRate = role.BillingChargeRate,
                MandatorySiaSector = role.MandatorySiaSector,
                BadgeColor = role.BadgeColor,
                IsActive = role.IsActive,
                SortOrder = role.SortOrder,
                EnrolledStaffCount = count
            };

            return Ok(ApiResponse<BcpJobRoleDto>.SuccessResponse(dto, "Job role updated successfully."));
        }

        /// <summary>
        /// Deletes an operational job role if no active staff profiles are currently assigned.
        /// </summary>
        [HttpDelete("job-roles/{id:guid}")]
        public async Task<ActionResult<ApiResponse<bool>>> DeleteJobRole(Guid id, CancellationToken ct)
        {
            var role = await _db.BcpJobRoles
                .FirstOrDefaultAsync(r => r.Id == id && r.TenantKey == CurrentTenantKey, ct);

            if (role == null)
            {
                return NotFound(ApiResponse<bool>.FailureResponse("Job role not found."));
            }

            bool inUse = await _db.BcpShiftStaffProfiles
                .AnyAsync(p => p.TenantKey == CurrentTenantKey && p.JobTitle == role.Title && p.IsActive, ct);

            if (inUse)
            {
                return BadRequest(ApiResponse<bool>.FailureResponse($"Cannot delete '{role.Title}' because active staff members are currently assigned to this role."));
            }

            _db.BcpJobRoles.Remove(role);
            await _db.SaveChangesAsync(ct);

            return Ok(ApiResponse<bool>.SuccessResponse(true, $"Job role '{role.Title}' deleted successfully."));
        }

        // =========================================================================
        // 13. WORKFORCE OPERATIONAL POLICIES
        // =========================================================================

        /// <summary>
        /// Retrieves the current tenant's working hours, Day/Night windows, meal break deductions, and custom onboarding questionnaires.
        /// </summary>
        [HttpGet("settings/policies")]
        public async Task<ActionResult<ApiResponse<BcpWorkforcePolicySettingDto>>> GetWorkforcePolicies(CancellationToken ct)
        {
            var policy = await _db.BcpWorkforcePolicySettings
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.TenantKey == CurrentTenantKey, ct);

            var (currCode, currSymbol) = await ResolveTenantCurrencyAsync(ct);

            var dto = new BcpWorkforcePolicySettingDto
            {
                CurrencyCode = currCode,
                CurrencySymbol = currSymbol,
                StandardWeeklyHours = policy?.StandardWeeklyHours ?? 40.0m,
                MaxPermissibleWeeklyHours = policy?.MaxPermissibleWeeklyHours ?? 48.0m,
                MaxConsecutiveWorkingDays = policy?.MaxConsecutiveWorkingDays ?? 6,
                Enforce48HourWeeklyCap = policy?.Enforce48HourWeeklyCap ?? true,
                DayShiftStart = policy?.DayShiftStart ?? "07:00",
                DayShiftEnd = policy?.DayShiftEnd ?? "19:00",
                NightShiftStart = policy?.NightShiftStart ?? "19:00",
                NightShiftEnd = policy?.NightShiftEnd ?? "07:00",
                NightPremiumHourlyAllowance = policy?.NightPremiumHourlyAllowance ?? 1.50m,
                EnableNightPremium = policy?.EnableNightPremium ?? false,
                BreakMinutesFor6Hours = policy?.BreakMinutesFor6Hours ?? 30,
                BreakMinutesFor8Hours = policy?.BreakMinutesFor8Hours ?? 45,
                BreakMinutesFor12Hours = policy?.BreakMinutesFor12Hours ?? 60,
                IsBreakPaid = policy?.IsBreakPaid ?? false,
                BreakLoggingMode = policy?.BreakLoggingMode ?? "AutomaticDeduction",
                RequireUniformSizes = policy?.RequireUniformSizes ?? true,
                RequireDrivingLicense = policy?.RequireDrivingLicense ?? true,
                RequireMedicalAllergies = policy?.RequireMedicalAllergies ?? true,
                RequireDbsCriminalDisclosure = policy?.RequireDbsCriminalDisclosure ?? true,
                CustomQuestionsJson = policy?.CustomQuestionsJson
            };

            return Ok(ApiResponse<BcpWorkforcePolicySettingDto>.SuccessResponse(dto, "Workforce policies retrieved successfully."));
        }

        /// <summary>
        /// Updates the tenant's operational workforce policies (Working hours, shift windows, breaks, custom forms).
        /// </summary>
        [HttpPut("settings/policies")]
        public async Task<ActionResult<ApiResponse<BcpWorkforcePolicySettingDto>>> UpdateWorkforcePolicies(
            [FromBody] UpdateWorkforcePolicyRequest request,
            CancellationToken ct)
        {
            var policy = await _db.BcpWorkforcePolicySettings
                .FirstOrDefaultAsync(p => p.TenantKey == CurrentTenantKey, ct);

            if (policy == null)
            {
                policy = new BcpWorkforcePolicySetting
                {
                    Id = Guid.CreateVersion7(),
                    TenantKey = CurrentTenantKey,
                    CreatedUtc = DateTime.UtcNow
                };
                _db.BcpWorkforcePolicySettings.Add(policy);
            }

            policy.StandardWeeklyHours = Math.Clamp(request.StandardWeeklyHours, 10m, 80m);
            policy.MaxPermissibleWeeklyHours = Math.Clamp(request.MaxPermissibleWeeklyHours, 20m, 100m);
            policy.MaxConsecutiveWorkingDays = Math.Clamp(request.MaxConsecutiveWorkingDays, 1, 14);
            policy.Enforce48HourWeeklyCap = request.Enforce48HourWeeklyCap;

            policy.DayShiftStart = !string.IsNullOrWhiteSpace(request.DayShiftStart) ? request.DayShiftStart.Trim() : "07:00";
            policy.DayShiftEnd = !string.IsNullOrWhiteSpace(request.DayShiftEnd) ? request.DayShiftEnd.Trim() : "19:00";
            policy.NightShiftStart = !string.IsNullOrWhiteSpace(request.NightShiftStart) ? request.NightShiftStart.Trim() : "19:00";
            policy.NightShiftEnd = !string.IsNullOrWhiteSpace(request.NightShiftEnd) ? request.NightShiftEnd.Trim() : "07:00";
            policy.NightPremiumHourlyAllowance = Math.Max(0m, request.NightPremiumHourlyAllowance);
            policy.EnableNightPremium = request.EnableNightPremium;

            policy.BreakMinutesFor6Hours = Math.Clamp(request.BreakMinutesFor6Hours, 0, 120);
            policy.BreakMinutesFor8Hours = Math.Clamp(request.BreakMinutesFor8Hours, 0, 180);
            policy.BreakMinutesFor12Hours = Math.Clamp(request.BreakMinutesFor12Hours, 0, 240);
            policy.IsBreakPaid = request.IsBreakPaid;
            policy.BreakLoggingMode = !string.IsNullOrWhiteSpace(request.BreakLoggingMode) ? request.BreakLoggingMode.Trim() : "AutomaticDeduction";

            policy.RequireUniformSizes = request.RequireUniformSizes;
            policy.RequireDrivingLicense = request.RequireDrivingLicense;
            policy.RequireMedicalAllergies = request.RequireMedicalAllergies;
            policy.RequireDbsCriminalDisclosure = request.RequireDbsCriminalDisclosure;
            policy.CustomQuestionsJson = request.CustomQuestionsJson;
            policy.UpdatedUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);

            var (currCode, currSymbol) = await ResolveTenantCurrencyAsync(ct);

            var dto = new BcpWorkforcePolicySettingDto
            {
                CurrencyCode = currCode,
                CurrencySymbol = currSymbol,
                StandardWeeklyHours = policy.StandardWeeklyHours,
                MaxPermissibleWeeklyHours = policy.MaxPermissibleWeeklyHours,
                MaxConsecutiveWorkingDays = policy.MaxConsecutiveWorkingDays,
                Enforce48HourWeeklyCap = policy.Enforce48HourWeeklyCap,
                DayShiftStart = policy.DayShiftStart,
                DayShiftEnd = policy.DayShiftEnd,
                NightShiftStart = policy.NightShiftStart,
                NightShiftEnd = policy.NightShiftEnd,
                NightPremiumHourlyAllowance = policy.NightPremiumHourlyAllowance,
                EnableNightPremium = policy.EnableNightPremium,
                BreakMinutesFor6Hours = policy.BreakMinutesFor6Hours,
                BreakMinutesFor8Hours = policy.BreakMinutesFor8Hours,
                BreakMinutesFor12Hours = policy.BreakMinutesFor12Hours,
                IsBreakPaid = policy.IsBreakPaid,
                BreakLoggingMode = policy.BreakLoggingMode,
                RequireUniformSizes = policy.RequireUniformSizes,
                RequireDrivingLicense = policy.RequireDrivingLicense,
                RequireMedicalAllergies = policy.RequireMedicalAllergies,
                RequireDbsCriminalDisclosure = policy.RequireDbsCriminalDisclosure,
                CustomQuestionsJson = policy.CustomQuestionsJson
            };

            return Ok(ApiResponse<BcpWorkforcePolicySettingDto>.SuccessResponse(dto, "Workforce operational policies updated successfully."));
        }

        // =========================================================================
        // 13B. DOCUMENT CATEGORIES & REGULATORY COMPLIANCE POLICIES
        // =========================================================================

        private async Task EnsureDefaultDocumentCategoriesAsync(string tenantKey, CancellationToken ct = default)
        {
            var cleanKey = tenantKey.Trim().ToLowerInvariant();

            if (!await _db.BcpDocumentCategories.AnyAsync(c => c.TenantKey == cleanKey, ct))
            {
                var defaults = new List<BcpDocumentCategory>
                {
                    new BcpDocumentCategory
                    {
                        Id = Guid.CreateVersion7(),
                        TenantKey = cleanKey,
                        Name = "Right to Work / Passport",
                        Code = "RTW",
                        Description = "Proof of nationality, passport scan, immigration share code, or verified national ID.",
                        IsMandatory = true,
                        RequiresExpiryDate = true,
                        IsActive = true,
                        SortOrder = 1,
                        CreatedUtc = DateTime.UtcNow
                    },
                    new BcpDocumentCategory
                    {
                        Id = Guid.CreateVersion7(),
                        TenantKey = cleanKey,
                        Name = "Proof of Address",
                        Code = "POA",
                        Description = "Recent utility bill, bank statement, or council tax bill issued within the last 3 months.",
                        IsMandatory = true,
                        RequiresExpiryDate = false,
                        IsActive = true,
                        SortOrder = 2,
                        CreatedUtc = DateTime.UtcNow
                    },
                    new BcpDocumentCategory
                    {
                        Id = Guid.CreateVersion7(),
                        TenantKey = cleanKey,
                        Name = "Professional License / Registration",
                        Code = "LIC",
                        Description = "Sector badge, statutory operating licence, or professional regulatory body registration.",
                        IsMandatory = false,
                        RequiresExpiryDate = true,
                        IsActive = true,
                        SortOrder = 3,
                        CreatedUtc = DateTime.UtcNow
                    },
                    new BcpDocumentCategory
                    {
                        Id = Guid.CreateVersion7(),
                        TenantKey = cleanKey,
                        Name = "Background Check / DBS",
                        Code = "DBS",
                        Description = "Criminal record disclosure certificate, basic/enhanced DBS, or police vetting clearance.",
                        IsMandatory = false,
                        RequiresExpiryDate = true,
                        IsActive = true,
                        SortOrder = 4,
                        CreatedUtc = DateTime.UtcNow
                    },
                    new BcpDocumentCategory
                    {
                        Id = Guid.CreateVersion7(),
                        TenantKey = cleanKey,
                        Name = "Training & Certifications",
                        Code = "TRN",
                        Description = "First aid at work, fire safety, health & safety certifications, or accredited diplomas.",
                        IsMandatory = false,
                        RequiresExpiryDate = true,
                        IsActive = true,
                        SortOrder = 5,
                        CreatedUtc = DateTime.UtcNow
                    }
                };

                _db.BcpDocumentCategories.AddRange(defaults);
                await _db.SaveChangesAsync(ct);
            }
        }

        /// <summary>
        /// Retrieves all configured compliance document categories for the tenant workspace without auto-seeding hardcoded defaults.
        /// </summary>
        [HttpGet("document-categories")]
        public async Task<ActionResult<ApiResponse<List<BcpDocumentCategoryDto>>>> GetDocumentCategories(CancellationToken ct)
        {
            var categories = await _db.BcpDocumentCategories
                .AsNoTracking()
                .Where(c => c.TenantKey == CurrentTenantKey)
                .OrderBy(c => c.SortOrder)
                .ThenBy(c => c.Name)
                .ToListAsync(ct);

            var docCounts = await _db.BcpShiftDocuments
                .AsNoTracking()
                .Where(d => d.TenantKey == CurrentTenantKey)
                .GroupBy(d => d.DocumentType)
                .Select(g => new { DocumentType = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.DocumentType, x => x.Count, ct);

            var dtos = categories.Select(c => new BcpDocumentCategoryDto
            {
                Id = c.Id,
                Name = c.Name,
                Code = c.Code,
                Description = c.Description,
                IsMandatory = c.IsMandatory,
                RequiresExpiryDate = c.RequiresExpiryDate,
                IsActive = c.IsActive,
                SortOrder = c.SortOrder,
                UploadedDocumentsCount = (docCounts.TryGetValue(c.Name, out var countByName) ? countByName : 0)
                    + (docCounts.TryGetValue(c.Code, out var countByCode) ? countByCode : 0)
            }).ToList();

            return Ok(ApiResponse<List<BcpDocumentCategoryDto>>.SuccessResponse(dtos, "Document categories retrieved successfully."));
        }

        /// <summary>
        /// Creates a new compliance document category for the tenant.
        /// </summary>
        [HttpPost("document-categories")]
        public async Task<ActionResult<ApiResponse<BcpDocumentCategoryDto>>> CreateDocumentCategory(
            [FromBody] CreateDocumentCategoryRequest request,
            CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(ApiResponse<BcpDocumentCategoryDto>.FailureResponse("Document category name is required."));
            }

            var cleanName = request.Name.Trim();
            var cleanCode = !string.IsNullOrWhiteSpace(request.Code)
                ? request.Code.Trim().ToUpperInvariant()
                : cleanName.Replace(" ", "").ToUpperInvariant()[..Math.Min(4, cleanName.Replace(" ", "").Length)];

            var exists = await _db.BcpDocumentCategories
                .AnyAsync(c => c.TenantKey == CurrentTenantKey && (c.Code == cleanCode || c.Name.ToLower() == cleanName.ToLower()), ct);

            if (exists)
            {
                return BadRequest(ApiResponse<BcpDocumentCategoryDto>.FailureResponse($"A document category with name '{cleanName}' or code '{cleanCode}' already exists."));
            }

            var category = new BcpDocumentCategory
            {
                Id = Guid.CreateVersion7(),
                TenantKey = CurrentTenantKey,
                Name = cleanName,
                Code = cleanCode,
                Description = request.Description?.Trim(),
                IsMandatory = request.IsMandatory,
                RequiresExpiryDate = request.RequiresExpiryDate,
                IsActive = true,
                SortOrder = request.SortOrder,
                CreatedUtc = DateTime.UtcNow
            };

            _db.BcpDocumentCategories.Add(category);
            await _db.SaveChangesAsync(ct);

            var dto = new BcpDocumentCategoryDto
            {
                Id = category.Id,
                Name = category.Name,
                Code = category.Code,
                Description = category.Description,
                IsMandatory = category.IsMandatory,
                RequiresExpiryDate = category.RequiresExpiryDate,
                IsActive = category.IsActive,
                SortOrder = category.SortOrder,
                UploadedDocumentsCount = 0
            };

            return Ok(ApiResponse<BcpDocumentCategoryDto>.SuccessResponse(dto, $"Document category '{category.Name}' created successfully."));
        }

        /// <summary>
        /// Updates an existing compliance document category.
        /// </summary>
        [HttpPut("document-categories/{id:guid}")]
        public async Task<ActionResult<ApiResponse<BcpDocumentCategoryDto>>> UpdateDocumentCategory(
            Guid id,
            [FromBody] UpdateDocumentCategoryRequest request,
            CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(ApiResponse<BcpDocumentCategoryDto>.FailureResponse("Document category name is required."));
            }

            var category = await _db.BcpDocumentCategories
                .FirstOrDefaultAsync(c => c.TenantKey == CurrentTenantKey && c.Id == id, ct);

            if (category == null)
            {
                return NotFound(ApiResponse<BcpDocumentCategoryDto>.FailureResponse("Document category not found."));
            }

            var cleanName = request.Name.Trim();
            var cleanCode = !string.IsNullOrWhiteSpace(request.Code)
                ? request.Code.Trim().ToUpperInvariant()
                : category.Code;

            var duplicate = await _db.BcpDocumentCategories
                .AnyAsync(c => c.TenantKey == CurrentTenantKey && c.Id != id && (c.Code == cleanCode || c.Name.ToLower() == cleanName.ToLower()), ct);

            if (duplicate)
            {
                return BadRequest(ApiResponse<BcpDocumentCategoryDto>.FailureResponse($"Another document category already uses the name '{cleanName}' or code '{cleanCode}'."));
            }

            category.Name = cleanName;
            category.Code = cleanCode;
            category.Description = request.Description?.Trim();
            category.IsMandatory = request.IsMandatory;
            category.RequiresExpiryDate = request.RequiresExpiryDate;
            category.IsActive = request.IsActive;
            category.SortOrder = request.SortOrder;
            category.UpdatedUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);

            var docCount = await _db.BcpShiftDocuments
                .CountAsync(d => d.TenantKey == CurrentTenantKey && (d.DocumentType == category.Name || d.DocumentType == category.Code), ct);

            var dto = new BcpDocumentCategoryDto
            {
                Id = category.Id,
                Name = category.Name,
                Code = category.Code,
                Description = category.Description,
                IsMandatory = category.IsMandatory,
                RequiresExpiryDate = category.RequiresExpiryDate,
                IsActive = category.IsActive,
                SortOrder = category.SortOrder,
                UploadedDocumentsCount = docCount
            };

            return Ok(ApiResponse<BcpDocumentCategoryDto>.SuccessResponse(dto, $"Document category '{category.Name}' updated successfully."));
        }

        /// <summary>
        /// Deletes a compliance document category if no staff member documents are assigned to it.
        /// </summary>
        [HttpDelete("document-categories/{id:guid}")]
        public async Task<ActionResult<ApiResponse<bool>>> DeleteDocumentCategory(Guid id, CancellationToken ct)
        {
            var category = await _db.BcpDocumentCategories
                .FirstOrDefaultAsync(c => c.TenantKey == CurrentTenantKey && c.Id == id, ct);

            if (category == null)
            {
                return NotFound(ApiResponse<bool>.FailureResponse("Document category not found."));
            }

            bool inUse = await _db.BcpShiftDocuments
                .AnyAsync(d => d.TenantKey == CurrentTenantKey && (d.DocumentType == category.Name || d.DocumentType == category.Code), ct);

            if (inUse)
            {
                return BadRequest(ApiResponse<bool>.FailureResponse($"Cannot delete document category '{category.Name}' because active documents are registered under it. Deactivate it instead."));
            }

            _db.BcpDocumentCategories.Remove(category);
            await _db.SaveChangesAsync(ct);

            return Ok(ApiResponse<bool>.SuccessResponse(true, $"Document category '{category.Name}' deleted successfully."));
        }

        // =========================================================================
        // 14. CLIENT ORGANIZATIONS & OPERATING SITES HIERARCHY
        // =========================================================================

        /// <summary>
        /// Retrieves all master client enterprise organizations with their linked operational site counts.
        /// </summary>
        [HttpGet("client-organizations")]
        public async Task<ActionResult<ApiResponse<List<ClientOrganizationDto>>>> GetClientOrganizations(CancellationToken ct)
        {
            var orgs = await _db.BcpClientOrganizations
                .AsNoTracking()
                .Include(o => o.Sites)
                .Where(o => o.TenantKey == CurrentTenantKey)
                .OrderBy(o => o.Name)
                .ToListAsync(ct);

            var dtos = orgs.Select(o => new ClientOrganizationDto
            {
                Id = o.Id,
                Name = o.Name,
                OrganizationCode = o.OrganizationCode,
                BillingEmail = o.BillingEmail,
                BillingPhone = o.BillingPhone,
                Address = o.Address,
                City = o.City,
                PostalCode = o.PostalCode,
                PaymentTermsDays = o.PaymentTermsDays,
                AccountManagerName = o.AccountManagerName,
                IsActive = o.IsActive,
                LinkedSitesCount = o.Sites.Count(s => s.IsActive),
                CreatedUtc = o.CreatedUtc
            }).ToList();

            return Ok(ApiResponse<List<ClientOrganizationDto>>.SuccessResponse(dtos, "Client organizations retrieved successfully."));
        }

        /// <summary>
        /// Creates a new master client enterprise organization.
        /// </summary>
        [HttpPost("client-organizations")]
        public async Task<ActionResult<ApiResponse<ClientOrganizationDto>>> CreateClientOrganization(
            [FromBody] CreateClientOrganizationRequest request,
            CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(ApiResponse<ClientOrganizationDto>.FailureResponse("Organization name is required."));
            }

            var cleanName = request.Name.Trim();
            var cleanCode = !string.IsNullOrWhiteSpace(request.OrganizationCode)
                ? request.OrganizationCode.Trim().ToUpperInvariant()
                : cleanName[..Math.Min(4, cleanName.Length)].ToUpperInvariant();

            var org = new BcpClientOrganization
            {
                Id = Guid.CreateVersion7(),
                TenantKey = CurrentTenantKey,
                Name = cleanName,
                OrganizationCode = cleanCode,
                BillingEmail = !string.IsNullOrWhiteSpace(request.BillingEmail) ? request.BillingEmail.Trim().ToLowerInvariant() : "billing@company.com",
                BillingPhone = request.BillingPhone?.Trim(),
                Address = request.Address?.Trim(),
                City = request.City?.Trim(),
                PostalCode = request.PostalCode?.Trim(),
                PaymentTermsDays = request.PaymentTermsDays > 0 ? request.PaymentTermsDays : 30,
                AccountManagerName = request.AccountManagerName?.Trim(),
                IsActive = true,
                CreatedUtc = DateTime.UtcNow
            };

            _db.BcpClientOrganizations.Add(org);
            await _db.SaveChangesAsync(ct);

            var dto = new ClientOrganizationDto
            {
                Id = org.Id,
                Name = org.Name,
                OrganizationCode = org.OrganizationCode,
                BillingEmail = org.BillingEmail,
                BillingPhone = org.BillingPhone,
                Address = org.Address,
                City = org.City,
                PostalCode = org.PostalCode,
                PaymentTermsDays = org.PaymentTermsDays,
                AccountManagerName = org.AccountManagerName,
                IsActive = org.IsActive,
                LinkedSitesCount = 0,
                CreatedUtc = org.CreatedUtc
            };

            return Ok(ApiResponse<ClientOrganizationDto>.SuccessResponse(dto, "Client organization created successfully."));
        }

        /// <summary>
        /// Updates a master client enterprise organization.
        /// </summary>
        [HttpPut("client-organizations/{id:guid}")]
        public async Task<ActionResult<ApiResponse<ClientOrganizationDto>>> UpdateClientOrganization(
            Guid id,
            [FromBody] CreateClientOrganizationRequest request,
            CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(ApiResponse<ClientOrganizationDto>.FailureResponse("Organization name is required."));
            }

            var org = await _db.BcpClientOrganizations
                .FirstOrDefaultAsync(o => o.Id == id && o.TenantKey == CurrentTenantKey, ct);

            if (org == null)
            {
                return NotFound(ApiResponse<ClientOrganizationDto>.FailureResponse("Client organization not found."));
            }

            org.Name = request.Name.Trim();
            org.OrganizationCode = !string.IsNullOrWhiteSpace(request.OrganizationCode) ? request.OrganizationCode.Trim().ToUpperInvariant() : org.OrganizationCode;
            org.BillingEmail = !string.IsNullOrWhiteSpace(request.BillingEmail) ? request.BillingEmail.Trim().ToLowerInvariant() : org.BillingEmail;
            org.BillingPhone = request.BillingPhone?.Trim();
            org.Address = request.Address?.Trim();
            org.City = request.City?.Trim();
            org.PostalCode = request.PostalCode?.Trim();
            org.PaymentTermsDays = request.PaymentTermsDays > 0 ? request.PaymentTermsDays : 30;
            org.AccountManagerName = request.AccountManagerName?.Trim();
            org.UpdatedUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);

            int sitesCount = await _db.BcpClientSites
                .CountAsync(s => s.TenantKey == CurrentTenantKey && s.ClientOrganizationId == org.Id && s.IsActive, ct);

            var dto = new ClientOrganizationDto
            {
                Id = org.Id,
                Name = org.Name,
                OrganizationCode = org.OrganizationCode,
                BillingEmail = org.BillingEmail,
                BillingPhone = org.BillingPhone,
                Address = org.Address,
                City = org.City,
                PostalCode = org.PostalCode,
                PaymentTermsDays = org.PaymentTermsDays,
                AccountManagerName = org.AccountManagerName,
                IsActive = org.IsActive,
                LinkedSitesCount = sitesCount,
                CreatedUtc = org.CreatedUtc
            };

            return Ok(ApiResponse<ClientOrganizationDto>.SuccessResponse(dto, "Client organization updated successfully."));
        }

        /// <summary>
        /// Deletes a client organization if no active client sites are linked.
        /// </summary>
        [HttpDelete("client-organizations/{id:guid}")]
        public async Task<ActionResult<ApiResponse<bool>>> DeleteClientOrganization(Guid id, CancellationToken ct)
        {
            var org = await _db.BcpClientOrganizations
                .FirstOrDefaultAsync(o => o.Id == id && o.TenantKey == CurrentTenantKey, ct);

            if (org == null)
            {
                return NotFound(ApiResponse<bool>.FailureResponse("Client organization not found."));
            }

            bool inUse = await _db.BcpClientSites
                .AnyAsync(s => s.TenantKey == CurrentTenantKey && s.ClientOrganizationId == id && s.IsActive, ct);

            if (inUse)
            {
                return BadRequest(ApiResponse<bool>.FailureResponse($"Cannot delete '{org.Name}' because active client operating sites are currently linked to this organization."));
            }

            _db.BcpClientOrganizations.Remove(org);
            await _db.SaveChangesAsync(ct);

            return Ok(ApiResponse<bool>.SuccessResponse(true, $"Client organization '{org.Name}' deleted successfully."));
        }

        // =========================================================================
        // 15. DEDICATED STAFF MEMBER PROFILE & COMPLIANCE HUB
        // =========================================================================

        /// <summary>
        /// Retrieves complete detailed profile for a staff member including personal details,
        /// emergency contacts, payroll/banking, SIA licenses, custom form answers, and shift history statistics.
        /// </summary>
        [HttpGet("members/{userId}")]
        public async Task<ActionResult<ApiResponse<StaffMemberDetailDto>>> GetStaffMemberDetail(string userId, CancellationToken ct)
        {
            var profile = await _db.BcpShiftStaffProfiles
                .AsNoTracking()
                .Include(p => p.StaffType)
                .FirstOrDefaultAsync(p => p.TenantKey == CurrentTenantKey && p.UserId == userId, ct);

            var user = await _db.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == userId, ct);

            if (profile == null && user == null)
            {
                return NotFound(ApiResponse<StaffMemberDetailDto>.FailureResponse("Staff member profile not found."));
            }

            // Documents
            var docs = await _db.BcpShiftDocuments
                .AsNoTracking()
                .Where(d => d.TenantKey == CurrentTenantKey && d.UserId == userId)
                .OrderByDescending(d => d.CreatedUtc)
                .ToListAsync(ct);

            // Recent Shifts
            var recentShifts = await _db.BcpShifts
                .AsNoTracking()
                .Include(s => s.ClientSite)
                .Include(s => s.AttendanceRecord)
                .Where(s => s.TenantKey == CurrentTenantKey && s.AssignedUserId == userId)
                .OrderByDescending(s => s.StartsAtUtc)
                .Take(20)
                .ToListAsync(ct);

            // Parse Custom Attributes JSON (Emergency Contact, Banking, Custom Forms)
            var customJson = user?.CustomAttributesJson;
            JsonElement customObj = default;
            if (!string.IsNullOrWhiteSpace(customJson))
            {
                try
                {
                    using var doc = JsonDocument.Parse(customJson);
                    customObj = doc.RootElement.Clone();
                }
                catch { }
            }

            var emergencyName = string.Empty;
            var emergencyRel = string.Empty;
            var emergencyPhone = string.Empty;
            var bankName = string.Empty;
            var accountHolder = string.Empty;
            var sortCode = string.Empty;
            var accountNumber = string.Empty;
            var nationalInsurance = string.Empty;
            var uniformSizes = string.Empty;
            var drivingLicenseStatus = string.Empty;
            var medicalDisclosures = string.Empty;
            var dbsDisclosure = string.Empty;
            var optOut48Hours = false;

            if (customObj.ValueKind == JsonValueKind.Object)
            {
                if (customObj.TryGetProperty("emergencyContact", out var ec))
                {
                    if (ec.TryGetProperty("name", out var n)) emergencyName = n.GetString() ?? "";
                    if (ec.TryGetProperty("relationship", out var r)) emergencyRel = r.GetString() ?? "";
                    if (ec.TryGetProperty("phone", out var p)) emergencyPhone = p.GetString() ?? "";
                }
                if (customObj.TryGetProperty("bankDetails", out var bd))
                {
                    if (bd.TryGetProperty("bankName", out var b)) bankName = b.GetString() ?? "";
                    if (bd.TryGetProperty("accountHolder", out var ah)) accountHolder = ah.GetString() ?? "";
                    if (bd.TryGetProperty("sortCode", out var sc)) sortCode = sc.GetString() ?? "";
                    if (bd.TryGetProperty("accountNumber", out var an)) accountNumber = an.GetString() ?? "";
                    if (bd.TryGetProperty("nationalInsurance", out var ni)) nationalInsurance = ni.GetString() ?? "";
                }
                if (customObj.TryGetProperty("uniformSizes", out var u)) uniformSizes = u.GetString() ?? "";
                if (customObj.TryGetProperty("drivingLicenseStatus", out var dl)) drivingLicenseStatus = dl.GetString() ?? "";
                if (customObj.TryGetProperty("medicalDisclosures", out var md)) medicalDisclosures = md.GetString() ?? "";
                if (customObj.TryGetProperty("dbsDisclosure", out var dd)) dbsDisclosure = dd.GetString() ?? "";
                if (customObj.TryGetProperty("optOut48Hours", out var opt)) optOut48Hours = opt.GetBoolean();
            }

            var (currCode, currSymbol) = await ResolveTenantCurrencyAsync(ct);

            var dto = new StaffMemberDetailDto
            {
                UserId = userId,
                ProfileId = profile?.Id ?? Guid.Empty,
                FirstName = user?.FirstName ?? "Staff",
                LastName = user?.LastName ?? "Member",
                FullName = user?.FullName ?? $"{user?.FirstName} {user?.LastName}".Trim(),
                Email = user?.Email ?? "",
                PhoneNumber = user?.PhoneNumber,
                MemberId = user?.MemberId ?? "WRK-0000",
                JobTitle = profile?.JobTitle ?? user?.Designation ?? "Staff Member",
                StaffTypeId = profile?.StaffTypeId,
                StaffTypeName = profile?.StaffTypeName ?? "Permanent",
                DefaultHourlyRate = profile?.DefaultHourlyRate,
                ContractedWeeklyHours = profile?.ContractedWeeklyHours ?? 40.0m,
                PreferredWorkingTime = profile?.PreferredWorkingTime ?? "Any",
                WorkingAvailability = profile?.WorkingAvailability ?? "Available",
                WeeklyAvailabilityJson = profile?.WeeklyAvailabilityJson,
                AverageRating = profile?.AverageRating ?? 5.0m,
                TotalRatingsCount = profile?.TotalRatingsCount ?? 0,
                TotalShiftsCompleted = profile?.TotalShiftsCompleted ?? 0,
                PunctualityScorePercent = profile?.PunctualityScorePercent ?? 100.0m,
                NoShowCount = profile?.NoShowCount ?? 0,
                IsActive = profile?.IsActive ?? true,
                EnrolledUtc = profile?.CreatedUtc ?? user?.JoinDate ?? DateTime.UtcNow,
                CurrencyCode = currCode,
                CurrencySymbol = currSymbol,

                EmergencyContactName = emergencyName,
                EmergencyContactRelationship = emergencyRel,
                EmergencyContactPhone = emergencyPhone,

                BankName = bankName,
                AccountHolderName = accountHolder,
                SortCode = sortCode,
                AccountNumber = accountNumber,
                NationalInsuranceNumber = nationalInsurance,

                UniformSizes = uniformSizes,
                DrivingLicenseStatus = drivingLicenseStatus,
                MedicalDisclosures = medicalDisclosures,
                DbsDisclosure = dbsDisclosure,
                OptOut48Hours = optOut48Hours,

                Documents = docs.Select(d => new StaffDocumentDto
                {
                    Id = d.Id,
                    UserId = d.UserId,
                    DocumentType = d.DocumentType,
                    DocumentName = d.DocumentName,
                    Description = d.Description,
                    FileUrl = d.FileUrl,
                    ExpiryDateUtc = d.ExpiryDateUtc,
                    IsVerified = d.IsVerified,
                    CreatedUtc = d.CreatedUtc
                }).ToList(),

                RecentShifts = recentShifts.Select(s => new ShiftDto
                {
                    Id = s.Id,
                    ClientSiteId = s.ClientSiteId,
                    SiteName = s.ClientSite?.SiteName ?? "Unassigned Site",
                    ClientSiteName = s.ClientSite?.SiteName ?? "Unassigned Site",
                    PostName = s.PostName,
                    StartsAtUtc = s.StartsAtUtc,
                    EndsAtUtc = s.EndsAtUtc,
                    PlannedDurationHours = s.PlannedDurationHours,
                    BreakMinutes = s.BreakMinutes,
                    HourlyPayRate = s.HourlyPayRate,
                    Status = s.Status,
                    IsConfirmedByGuard = s.IsConfirmedByGuard
                }).ToList()
            };

            return Ok(ApiResponse<StaffMemberDetailDto>.SuccessResponse(dto, "Staff member profile retrieved successfully."));
        }

        /// <summary>
        /// Updates a staff member's complete profile information, including emergency contacts,
        /// banking remittance, job role designation, contracted hours override, and 48-hour opt-out status.
        /// </summary>
        [HttpPut("members/{userId}")]
        public async Task<ActionResult<ApiResponse<bool>>> UpdateStaffMemberDetail(
            string userId,
            [FromBody] UpdateStaffMemberDetailRequest request,
            CancellationToken ct)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
            var profile = await _db.BcpShiftStaffProfiles.FirstOrDefaultAsync(p => p.TenantKey == CurrentTenantKey && p.UserId == userId, ct);

            if (user == null && profile == null)
            {
                return NotFound(ApiResponse<bool>.FailureResponse("Staff member not found."));
            }

            if (user != null)
            {
                if (!string.IsNullOrWhiteSpace(request.FirstName)) user.FirstName = request.FirstName.Trim();
                if (!string.IsNullOrWhiteSpace(request.LastName)) user.LastName = request.LastName.Trim();
                if (!string.IsNullOrWhiteSpace(request.PhoneNumber)) user.PhoneNumber = request.PhoneNumber.Trim();

                // Parse and update custom attributes
                var customDict = new Dictionary<string, object>();
                if (!string.IsNullOrWhiteSpace(user.CustomAttributesJson))
                {
                    try
                    {
                        var parsed = JsonSerializer.Deserialize<Dictionary<string, object>>(user.CustomAttributesJson);
                        if (parsed != null) customDict = parsed;
                    }
                    catch { }
                }

                customDict["emergencyContact"] = new
                {
                    name = request.EmergencyContactName?.Trim(),
                    relationship = request.EmergencyContactRelationship?.Trim(),
                    phone = request.EmergencyContactPhone?.Trim()
                };

                customDict["bankDetails"] = new
                {
                    bankName = request.BankName?.Trim(),
                    accountHolder = request.AccountHolderName?.Trim() ?? user.FullName,
                    sortCode = request.SortCode?.Trim(),
                    accountNumber = request.AccountNumber?.Trim(),
                    nationalInsurance = request.NationalInsuranceNumber?.Trim()
                };

                if (request.UniformSizes != null) customDict["uniformSizes"] = request.UniformSizes.Trim();
                if (request.DrivingLicenseStatus != null) customDict["drivingLicenseStatus"] = request.DrivingLicenseStatus.Trim();
                if (request.MedicalDisclosures != null) customDict["medicalDisclosures"] = request.MedicalDisclosures.Trim();
                if (request.DbsDisclosure != null) customDict["dbsDisclosure"] = request.DbsDisclosure.Trim();
                customDict["optOut48Hours"] = request.OptOut48Hours;

                user.CustomAttributesJson = JsonSerializer.Serialize(customDict);
            }

            if (profile == null)
            {
                profile = new BcpShiftStaffProfile
                {
                    Id = Guid.CreateVersion7(),
                    TenantKey = CurrentTenantKey,
                    UserId = userId,
                    CreatedUtc = DateTime.UtcNow
                };
                _db.BcpShiftStaffProfiles.Add(profile);
            }

            if (!string.IsNullOrWhiteSpace(request.JobTitle)) profile.JobTitle = request.JobTitle.Trim();
            if (request.StaffTypeId.HasValue) profile.StaffTypeId = request.StaffTypeId.Value;
            if (!string.IsNullOrWhiteSpace(request.StaffTypeName)) profile.StaffTypeName = request.StaffTypeName.Trim();
            if (request.DefaultHourlyRate.HasValue) profile.DefaultHourlyRate = request.DefaultHourlyRate.Value;
            if (request.ContractedWeeklyHours.HasValue) profile.ContractedWeeklyHours = request.ContractedWeeklyHours.Value;
            if (!string.IsNullOrWhiteSpace(request.PreferredWorkingTime)) profile.PreferredWorkingTime = request.PreferredWorkingTime.Trim();
            if (!string.IsNullOrWhiteSpace(request.WorkingAvailability)) profile.WorkingAvailability = request.WorkingAvailability.Trim();
            if (request.WeeklyAvailabilityJson != null) profile.WeeklyAvailabilityJson = request.WeeklyAvailabilityJson;
            profile.IsActive = request.IsActive;
            profile.UpdatedUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);
            return Ok(ApiResponse<bool>.SuccessResponse(true, "Staff member profile updated successfully."));
        }
    }

    // =========================================================================
    // DTO CONTRACTS
    // =========================================================================

    public class ClientSiteDto
    {
        public Guid Id { get; set; }
        public string SiteCode { get; set; } = string.Empty;
        public string SiteName { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string PostalCode { get; set; } = string.Empty;
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public int GeofenceRadiusMeters { get; set; }
        public string? EmergencyContactName { get; set; }
        public string? EmergencyContactEmail { get; set; }
        public string? EmergencyContactPhone { get; set; }
        public string? SiteAssignmentInstructions { get; set; }
        public string? RequiredSiaLicenceType { get; set; }
        public int ActiveShiftsCount { get; set; }
        public Guid? ClientOrganizationId { get; set; }
        public string? ClientOrganizationName { get; set; }
    }

    public class UpsertClientSiteRequest
    {
        public Guid? Id { get; set; }
        public string SiteCode { get; set; } = string.Empty;
        public string SiteName { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? PostalCode { get; set; }
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public int GeofenceRadiusMeters { get; set; } = 150;
        public string? EmergencyContactName { get; set; }
        public string? EmergencyContactEmail { get; set; }
        public string? EmergencyContactPhone { get; set; }
        public string? SiteAssignmentInstructions { get; set; }
        public string? RequiredSiaLicenceType { get; set; }
        public Guid? ClientOrganizationId { get; set; }
        public string? ClientOrganizationName { get; set; }
    }

    public class ShiftDto
    {
        public Guid Id { get; set; }
        public string ShiftCode { get; set; } = string.Empty;
        public Guid ClientSiteId { get; set; }
        public string SiteName { get; set; } = string.Empty;
        public string? ClientSiteName { get; set; }
        public string SiteAddress { get; set; } = string.Empty;
        public string PostName { get; set; } = string.Empty;
        public string? FacilityName { get; set; }
        public string? Address { get; set; }
        public string? PostCode { get; set; }
        public string? EventTag { get; set; }
        public string? AssignedUserId { get; set; }
        public string? AssignedUserName { get; set; }
        public DateTime StartsAtUtc { get; set; }
        public DateTime EndsAtUtc { get; set; }
        public bool IsOvernight { get; set; }
        public int BreakMinutes { get; set; }
        public decimal PlannedDurationHours { get; set; }
        public decimal? HourlyPayRate { get; set; }
        public decimal? HourlyChargeRate { get; set; }
        public Guid? RequiredWorkspaceStationId { get; set; }
        public string? RequiredWorkspaceStationName { get; set; }
        public string Status { get; set; } = "Scheduled";
        public bool IsConfirmedByGuard { get; set; }
        public DateTime? ConfirmedAtUtc { get; set; }
        public DateTime? AcceptanceDeadlineUtc { get; set; }
        public int? AcceptanceCountdownMinutes { get; set; }
        public string? Notes { get; set; }
        public string? SiteAssignmentInstructions { get; set; }
        public string? EmergencyContactPhone { get; set; }
        public bool IsClockedIn { get; set; }
        public bool IsClockedOut { get; set; }

        // Duty Report Fields
        public DateTime? ReportSubmissionUtc { get; set; }
        public string? ReportContent { get; set; }

        // Fine & Penalty Fields
        public bool FineAttached { get; set; }
        public decimal? FineAmount { get; set; }
        public string? FineReason { get; set; }
        public string? FineAuthorizedBy { get; set; }
        public string? FineStatus { get; set; }

        // Attendance Execution Telemetry
        public DateTime? ClockInUtc { get; set; }
        public DateTime? ClockOutUtc { get; set; }
        public bool IsClockInGeofenceVerified { get; set; }
        public bool IsClockOutGeofenceVerified { get; set; }
        public double? ClockInDistanceFromSiteMeters { get; set; }
        public int LateArrivalMinutes { get; set; }
        public bool IsFlagged { get; set; }
        public string? FlagReason { get; set; }
        public decimal? ActualDurationHours { get; set; }
        public decimal? BillableHours { get; set; }
        public string? ClockInPhotoUrl { get; set; }
        public string? ClockOutPhotoUrl { get; set; }
        public string? SupervisorNotes { get; set; }
        public bool SupervisorApproved { get; set; }
    }

    public class CreateShiftRequest
    {
        public Guid ClientSiteId { get; set; }
        public string? AssignedUserId { get; set; }
        public string? AssignedUserName { get; set; }
        public string PostName { get; set; } = "General Post";
        public string? FacilityName { get; set; }
        public string? Address { get; set; }
        public string? PostCode { get; set; }
        public string? EventTag { get; set; }
        public DateTime StartsAtUtc { get; set; }
        public DateTime EndsAtUtc { get; set; }
        public int BreakMinutes { get; set; } = 0;
        public Guid? RequiredWorkspaceStationId { get; set; }
        public string? RequiredWorkspaceStationName { get; set; }
        public decimal? HourlyPayRate { get; set; }
        public decimal? HourlyChargeRate { get; set; }
        public DateTime? AcceptanceDeadlineUtc { get; set; }
        public string? Notes { get; set; }
    }

    /// <summary>
    /// Payload for updating an existing scheduled shift.
    /// </summary>
    public class UpdateShiftRequest
    {
        public Guid ClientSiteId { get; set; }
        public string? AssignedUserId { get; set; }
        public string? AssignedUserName { get; set; }
        public string PostName { get; set; } = "General Assignment";
        public string? FacilityName { get; set; }
        public string? Address { get; set; }
        public string? PostCode { get; set; }
        public string? EventTag { get; set; }
        public DateTime StartsAtUtc { get; set; }
        public DateTime EndsAtUtc { get; set; }
        public int BreakMinutes { get; set; }
        public decimal? HourlyPayRate { get; set; }
        public decimal? HourlyChargeRate { get; set; }
        public Guid? RequiredWorkspaceStationId { get; set; }
        public string? RequiredWorkspaceStationName { get; set; }
        public DateTime? AcceptanceDeadlineUtc { get; set; }
        public string Status { get; set; } = "Scheduled";
        public string? Notes { get; set; }
    }

    /// <summary>
    /// Payload for generating recurring or daily schedule batches across a date range.
    /// </summary>
    public class BatchCreateShiftScheduleRequest
    {
        public Guid ClientSiteId { get; set; }
        public string? AssignedUserId { get; set; }
        public string? AssignedUserName { get; set; }
        public string PostName { get; set; } = "General Assignment";
        public string? FacilityName { get; set; }
        public string? Address { get; set; }
        public string? PostCode { get; set; }
        public string? EventTag { get; set; }
        public string? Notes { get; set; }

        public string SchedulePattern { get; set; } = "Daily"; // "Daily", "ShiftRota", "AdHoc"
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string StartTime { get; set; } = "08:00"; // "HH:mm"
        public string EndTime { get; set; } = "17:00";   // "HH:mm"
        public List<int> SelectedDaysOfWeek { get; set; } = new() { 1, 2, 3, 4, 5 }; // 1=Mon .. 5=Fri
        public int BreakMinutes { get; set; } = 60;

        public string CompensationBasis { get; set; } = "Hourly";
        public decimal? HourlyPayRate { get; set; }
        public decimal? HourlyChargeRate { get; set; }
        public decimal? MonthlySalary { get; set; }
        public bool TrackOvertime { get; set; }
        public decimal OvertimeThresholdHours { get; set; } = 8.0m;

        public Guid? RequiredWorkspaceStationId { get; set; }
        public string? RequiredWorkspaceStationName { get; set; }
        public DateTime? AcceptanceDeadlineUtc { get; set; }
    }

    public class CreateSwapRequest
    {
        public Guid ShiftId { get; set; }
        public string? OfferedToUserId { get; set; }
        public string? OfferedToUserName { get; set; }
        public Guid? TargetShiftId { get; set; }
        public string? Reason { get; set; }
    }

    public class ReviewSwapRequest
    {
        public bool IsApproved { get; set; }
        public string? RejectionReason { get; set; }
    }

    public class SubmitLeaveRequest
    {
        public string LeaveType { get; set; } = "Annual";
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string? Reason { get; set; }
        public string? AttachmentUrl { get; set; }
    }

    public class EnrollStaffMemberRequest
    {
        public string? UserId { get; set; }
        public string? Email { get; set; }
        public string? FullName { get; set; }
        public string? PhoneNumber { get; set; }
        public string JobTitle { get; set; } = "Staff Member";
        public decimal? DefaultHourlyRate { get; set; }
        public decimal? ContractedWeeklyHours { get; set; }
        public string? PreferredWorkingTime { get; set; }
        public string? WorkingAvailability { get; set; }
    }

    public class StaffMemberDto
    {
        public Guid ProfileId { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string? AvatarUrl { get; set; }
        public string JobTitle { get; set; } = "Staff Member";
        public Guid? StaffTypeId { get; set; }
        public string StaffTypeName { get; set; } = "Permanent";
        public decimal? DefaultHourlyRate { get; set; }
        public decimal? ContractedWeeklyHours { get; set; }
        public string PreferredWorkingTime { get; set; } = "Any";
        public string WorkingAvailability { get; set; } = "Available";
        public string? WeeklyAvailabilityJson { get; set; }
        public decimal AverageRating { get; set; }
        public int TotalRatingsCount { get; set; }
        public int TotalShiftsCompleted { get; set; }
        public decimal PunctualityScorePercent { get; set; }
        public int NoShowCount { get; set; }
        public bool IsActive { get; set; }
        public DateTime EnrolledUtc { get; set; }
    }

    public class WorkforceAnalyticsDto
    {
        public string CurrencyCode { get; set; } = "NGN";
        public string CurrencySymbol { get; set; } = "₦";
        public decimal ShiftFulfillmentRatePercent { get; set; }
        public decimal OverallPunctualityPercent { get; set; }
        public int ActiveOnDutyCount { get; set; }
        public decimal TotalScheduledHours { get; set; }
        public decimal TotalWorkedHours { get; set; }
        public decimal TotalGrossLaborSpend { get; set; }
        public int TotalShiftsCount { get; set; }
        public int CompletedShiftsCount { get; set; }
        public int OpenShiftsCount { get; set; }
        public int FlaggedAttendanceCount { get; set; }
        public List<SiteHoursBreakdownDto> SiteBreakdowns { get; set; } = new();
        public AttendanceDistributionDto AttendanceDistribution { get; set; } = new();
    }

    public class SiteHoursBreakdownDto
    {
        public Guid SiteId { get; set; }
        public string SiteName { get; set; } = string.Empty;
        public decimal TotalHours { get; set; }
        public decimal TotalSpend { get; set; }
        public int ShiftCount { get; set; }
    }

    public class AttendanceDistributionDto
    {
        public int OnTime { get; set; }
        public int LateArrivals { get; set; }
        public int GeofenceViolations { get; set; }
        public int NoShows { get; set; }
    }

    public class SubmitRatingRequest
    {
        public Guid ShiftId { get; set; }
        public string UserId { get; set; } = string.Empty;
        public int RatingStars { get; set; } = 5;
        public int PunctualityScore { get; set; } = 5;
        public string? FeedbackNotes { get; set; }
    }

    public class StaffRatingDto
    {
        public Guid Id { get; set; }
        public Guid ShiftId { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string RatedByUserId { get; set; } = string.Empty;
        public string? RatedByUserName { get; set; }
        public int RatingStars { get; set; }
        public int PunctualityScore { get; set; }
        public string? FeedbackNotes { get; set; }
        public DateTime CreatedUtc { get; set; }
    }

    public class UpsertAvailabilityRequest
    {
        public DateTime TargetDate { get; set; }
        public string State { get; set; } = "Available";
        public TimeSpan? UnavailableFromTime { get; set; }
        public TimeSpan? UnavailableToTime { get; set; }
        public string? Reason { get; set; }
    }

    public class StaffAvailabilityDto
    {
        public Guid Id { get; set; }
        public string UserId { get; set; } = string.Empty;
        public DateTime TargetDate { get; set; }
        public string State { get; set; } = "Available";
        public TimeSpan? UnavailableFromTime { get; set; }
        public TimeSpan? UnavailableToTime { get; set; }
        public string? Reason { get; set; }
    }

    public class UploadDocumentRequest
    {
        public string? UserId { get; set; }
        public string DocumentType { get; set; } = "General";
        public string DocumentName { get; set; } = string.Empty;
        public string? ReferenceNumber { get; set; }
        public string? Description { get; set; }
        public string FileUrl { get; set; } = string.Empty;
        public DateTime? ExpiryDateUtc { get; set; }
    }

    public class StaffDocumentDto
    {
        public Guid Id { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string DocumentType { get; set; } = "General";
        public string DocumentName { get; set; } = string.Empty;
        public string? ReferenceNumber { get; set; }
        public string? Description { get; set; }
        public string FileUrl { get; set; } = string.Empty;
        public string UploadedBy { get; set; } = "Staff";
        public DateTime? ExpiryDateUtc { get; set; }
        public bool IsVerified { get; set; }
        public DateTime CreatedUtc { get; set; }
    }

    /// <summary>
    /// Represents a dynamic compliance document submission during enrollment or onboarding.
    /// </summary>
    public class StaffDocumentSubmissionDto
    {
        public Guid? CategoryId { get; set; }
        public string DocumentType { get; set; } = "General";
        public string? DocumentName { get; set; }
        public string? ReferenceNumber { get; set; }
        public string? Description { get; set; }
        public string? FileUrl { get; set; }
        public DateTime? ExpiryDateUtc { get; set; }
        public bool IsVerified { get; set; }
    }

    /// <summary>
    /// Data transfer object for tenant-governed compliance document categories.
    /// </summary>
    public class BcpDocumentCategoryDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsMandatory { get; set; }
        public bool RequiresExpiryDate { get; set; }
        public bool IsActive { get; set; }
        public int SortOrder { get; set; }
        public int UploadedDocumentsCount { get; set; }
    }

    /// <summary>
    /// Request contract for creating a document category.
    /// </summary>
    public class CreateDocumentCategoryRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Code { get; set; }
        public string? Description { get; set; }
        public bool IsMandatory { get; set; }
        public bool RequiresExpiryDate { get; set; } = true;
        public int SortOrder { get; set; } = 0;
    }

    /// <summary>
    /// Request contract for updating a document category.
    /// </summary>
    public class UpdateDocumentCategoryRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Code { get; set; }
        public string? Description { get; set; }
        public bool IsMandatory { get; set; }
        public bool RequiresExpiryDate { get; set; }
        public bool IsActive { get; set; } = true;
        public int SortOrder { get; set; } = 0;
    }

    public class UpdateNotificationPreferenceRequest
    {
        public int Slot1MinutesBefore { get; set; } = 1440;
        public bool EnableSlot1 { get; set; } = true;
        public int Slot2MinutesBefore { get; set; } = 240;
        public bool EnableSlot2 { get; set; } = true;
        public int Slot3MinutesBefore { get; set; } = 30;
        public bool EnableSlot3 { get; set; } = true;
        public bool EnableInApp { get; set; } = true;
        public bool EnableEmail { get; set; } = true;
        public bool EnableWhatsApp { get; set; } = true;
        public string? PreferredContactPhone { get; set; }
    }

    public class StaffNotificationPreferenceDto
    {
        public Guid Id { get; set; }
        public string UserId { get; set; } = string.Empty;
        public int Slot1MinutesBefore { get; set; }
        public bool EnableSlot1 { get; set; }
        public int Slot2MinutesBefore { get; set; }
        public bool EnableSlot2 { get; set; }
        public int Slot3MinutesBefore { get; set; }
        public bool EnableSlot3 { get; set; }
        public bool EnableInApp { get; set; }
        public bool EnableEmail { get; set; }
        public bool EnableWhatsApp { get; set; }
        public string? PreferredContactPhone { get; set; }
    }

    public class InviteWorkforceMemberRequest
    {
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string JobTitle { get; set; } = "Staff Member";
        public Guid? StaffTypeId { get; set; }
        public string StaffTypeName { get; set; } = "Permanent";
        public decimal? DefaultHourlyRate { get; set; }
        public decimal? ContractedWeeklyHours { get; set; }
        public string? WelcomeNote { get; set; }
        public List<Guid>? RequiredDocumentCategoryIds { get; set; }
        public bool RequireSiaLicense { get; set; } = true;
        public bool RequireEmergencyContact { get; set; } = true;
        public bool RequireBankDetails { get; set; } = true;
        public bool RequireRightToWork { get; set; } = false;
        public bool RequireProofOfAddress { get; set; } = false;
    }

    public class DirectEnrollMemberRequest
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string? Password { get; set; }
        public bool MustChangePassword { get; set; } = true;

        public string JobTitle { get; set; } = "Staff Member";
        public Guid? StaffTypeId { get; set; }
        public string StaffTypeName { get; set; } = "Permanent";
        public decimal? DefaultHourlyRate { get; set; }
        public decimal? ContractedWeeklyHours { get; set; }
        public string? PreferredWorkingTime { get; set; }
        public string? WorkingAvailability { get; set; }
        public Guid? AssignedSiteId { get; set; }

        public Dictionary<string, object>? CustomAttributes { get; set; }
        public List<StaffDocumentSubmissionDto>? ComplianceDocuments { get; set; }
        public string? SiaLicenseNumber { get; set; }
        public string? SiaLicenseSector { get; set; }
        public DateTime? SiaLicenseExpiryDate { get; set; }

        public string? EmergencyContactName { get; set; }
        public string? EmergencyContactRelationship { get; set; }
        public string? EmergencyContactPhone { get; set; }

        public string? BankName { get; set; }
        public string? AccountHolderName { get; set; }
        public string? SortCode { get; set; }
        public string? AccountNumber { get; set; }
        public string? NationalInsuranceNumber { get; set; }
    }

    public class CompleteMemberOnboardingRequest
    {
        public string Token { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? FullName { get; set; }
        public string? PhoneNumber { get; set; }
        public string? JobTitle { get; set; }
        public Guid? StaffTypeId { get; set; }
        public string? StaffTypeName { get; set; }

        public Dictionary<string, object>? CustomAttributes { get; set; }
        public List<StaffDocumentSubmissionDto>? ComplianceDocuments { get; set; }
        public string? SiaLicenseNumber { get; set; }
        public string? SiaLicenseSector { get; set; }
        public DateTime? SiaLicenseExpiryDate { get; set; }

        public string? EmergencyContactName { get; set; }
        public string? EmergencyContactRelationship { get; set; }
        public string? EmergencyContactPhone { get; set; }

        public string? BankName { get; set; }
        public string? AccountHolderName { get; set; }
        public string? SortCode { get; set; }
        public string? AccountNumber { get; set; }
        public string? NationalInsuranceNumber { get; set; }
    }

    public class BcpStaffTypeDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal DefaultContractedHours { get; set; }
        public bool IsCompulsory { get; set; }
        public bool IsActive { get; set; }
        public int SortOrder { get; set; }
        public int EnrolledStaffCount { get; set; }
    }

    public class CreateStaffTypeRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Code { get; set; }
        public string? Description { get; set; }
        public decimal DefaultContractedHours { get; set; } = 40.0m;
        public int SortOrder { get; set; } = 0;
    }

    public class UpdateStaffTypeRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal DefaultContractedHours { get; set; }
        public bool IsActive { get; set; } = true;
        public int SortOrder { get; set; } = 0;
    }

    public class BcpJobRoleDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string CompensationBasis { get; set; } = "Hourly";
        public decimal? MonthlySalary { get; set; }
        public decimal? ContractedWeeklyHours { get; set; }
        public decimal? DefaultHourlyRate { get; set; }
        public decimal? BillingChargeRate { get; set; }
        public string MandatorySiaSector { get; set; } = "None";
        public string BadgeColor { get; set; } = "#0050E5";
        public bool IsActive { get; set; }
        public int SortOrder { get; set; }
        public int EnrolledStaffCount { get; set; }
    }

    public class CreateJobRoleRequest
    {
        public string Title { get; set; } = string.Empty;
        public string? Code { get; set; }
        public string? Description { get; set; }
        public string? CompensationBasis { get; set; } = "Hourly";
        public decimal? MonthlySalary { get; set; }
        public decimal? ContractedWeeklyHours { get; set; }
        public decimal? DefaultHourlyRate { get; set; }
        public decimal? BillingChargeRate { get; set; }
        public string? MandatorySiaSector { get; set; }
        public string? BadgeColor { get; set; }
        public int SortOrder { get; set; } = 0;
    }

    public class UpdateJobRoleRequest
    {
        public string Title { get; set; } = string.Empty;
        public string? Code { get; set; }
        public string? Description { get; set; }
        public string? CompensationBasis { get; set; } = "Hourly";
        public decimal? MonthlySalary { get; set; }
        public decimal? ContractedWeeklyHours { get; set; }
        public decimal? DefaultHourlyRate { get; set; }
        public decimal? BillingChargeRate { get; set; }
        public string? MandatorySiaSector { get; set; }
        public string? BadgeColor { get; set; }
        public bool IsActive { get; set; } = true;
        public int SortOrder { get; set; } = 0;
    }

    public class BcpWorkforcePolicySettingDto
    {
        public string CurrencyCode { get; set; } = "NGN";
        public string CurrencySymbol { get; set; } = "₦";
        public decimal StandardWeeklyHours { get; set; }
        public decimal MaxPermissibleWeeklyHours { get; set; }
        public int MaxConsecutiveWorkingDays { get; set; }
        public bool Enforce48HourWeeklyCap { get; set; }
        public string DayShiftStart { get; set; } = "07:00";
        public string DayShiftEnd { get; set; } = "19:00";
        public string NightShiftStart { get; set; } = "19:00";
        public string NightShiftEnd { get; set; } = "07:00";
        public decimal NightPremiumHourlyAllowance { get; set; }
        public bool EnableNightPremium { get; set; }
        public int BreakMinutesFor6Hours { get; set; }
        public int BreakMinutesFor8Hours { get; set; }
        public int BreakMinutesFor12Hours { get; set; }
        public bool IsBreakPaid { get; set; }
        public string BreakLoggingMode { get; set; } = "AutomaticDeduction";
        public bool RequireUniformSizes { get; set; }
        public bool RequireDrivingLicense { get; set; }
        public bool RequireMedicalAllergies { get; set; }
        public bool RequireDbsCriminalDisclosure { get; set; }
        public string? CustomQuestionsJson { get; set; }
    }

    public class UpdateWorkforcePolicyRequest
    {
        public decimal StandardWeeklyHours { get; set; } = 40.0m;
        public decimal MaxPermissibleWeeklyHours { get; set; } = 48.0m;
        public int MaxConsecutiveWorkingDays { get; set; } = 6;
        public bool Enforce48HourWeeklyCap { get; set; } = true;
        public string? DayShiftStart { get; set; }
        public string? DayShiftEnd { get; set; }
        public string? NightShiftStart { get; set; }
        public string? NightShiftEnd { get; set; }
        public decimal NightPremiumHourlyAllowance { get; set; }
        public bool EnableNightPremium { get; set; }
        public int BreakMinutesFor6Hours { get; set; } = 30;
        public int BreakMinutesFor8Hours { get; set; } = 45;
        public int BreakMinutesFor12Hours { get; set; } = 60;
        public bool IsBreakPaid { get; set; }
        public string? BreakLoggingMode { get; set; }
        public bool RequireUniformSizes { get; set; } = true;
        public bool RequireDrivingLicense { get; set; } = true;
        public bool RequireMedicalAllergies { get; set; } = true;
        public bool RequireDbsCriminalDisclosure { get; set; } = true;
        public string? CustomQuestionsJson { get; set; }
    }

    public class ClientOrganizationDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string OrganizationCode { get; set; } = string.Empty;
        public string BillingEmail { get; set; } = string.Empty;
        public string? BillingPhone { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? PostalCode { get; set; }
        public int PaymentTermsDays { get; set; } = 30;
        public string? AccountManagerName { get; set; }
        public bool IsActive { get; set; }
        public int LinkedSitesCount { get; set; }
        public DateTime CreatedUtc { get; set; }
    }

    public class CreateClientOrganizationRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? OrganizationCode { get; set; }
        public string? BillingEmail { get; set; }
        public string? BillingPhone { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? PostalCode { get; set; }
        public int PaymentTermsDays { get; set; } = 30;
        public string? AccountManagerName { get; set; }
    }

    public class StaffMemberDetailDto
    {
        public string UserId { get; set; } = string.Empty;
        public Guid ProfileId { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string MemberId { get; set; } = string.Empty;
        public string JobTitle { get; set; } = "Staff Member";
        public Guid? StaffTypeId { get; set; }
        public string StaffTypeName { get; set; } = "Permanent";
        public decimal? DefaultHourlyRate { get; set; }
        public decimal ContractedWeeklyHours { get; set; }
        public string PreferredWorkingTime { get; set; } = "Any";
        public string WorkingAvailability { get; set; } = "Available";
        public string? WeeklyAvailabilityJson { get; set; }
        public decimal AverageRating { get; set; }
        public int TotalRatingsCount { get; set; }
        public int TotalShiftsCompleted { get; set; }
        public decimal PunctualityScorePercent { get; set; }
        public int NoShowCount { get; set; }
        public bool IsActive { get; set; }
        public DateTime EnrolledUtc { get; set; }
        public string CurrencyCode { get; set; } = "NGN";
        public string CurrencySymbol { get; set; } = "₦";

        // Emergency Contact
        public string EmergencyContactName { get; set; } = string.Empty;
        public string EmergencyContactRelationship { get; set; } = string.Empty;
        public string EmergencyContactPhone { get; set; } = string.Empty;

        // Payroll & Banking
        public string BankName { get; set; } = string.Empty;
        public string AccountHolderName { get; set; } = string.Empty;
        public string SortCode { get; set; } = string.Empty;
        public string AccountNumber { get; set; } = string.Empty;
        public string NationalInsuranceNumber { get; set; } = string.Empty;

        // Custom Onboarding Responses
        public string UniformSizes { get; set; } = string.Empty;
        public string DrivingLicenseStatus { get; set; } = string.Empty;
        public string MedicalDisclosures { get; set; } = string.Empty;
        public string DbsDisclosure { get; set; } = string.Empty;
        public bool OptOut48Hours { get; set; }

        public List<StaffDocumentDto> Documents { get; set; } = new();
        public List<ShiftDto> RecentShifts { get; set; } = new();
    }

    public class UpdateStaffMemberDetailRequest
    {
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? PhoneNumber { get; set; }
        public string? JobTitle { get; set; }
        public Guid? StaffTypeId { get; set; }
        public string? StaffTypeName { get; set; }
        public decimal? DefaultHourlyRate { get; set; }
        public decimal? ContractedWeeklyHours { get; set; }
        public string? PreferredWorkingTime { get; set; }
        public string? WorkingAvailability { get; set; }
        public string? WeeklyAvailabilityJson { get; set; }
        public bool IsActive { get; set; } = true;

        public string? EmergencyContactName { get; set; }
        public string? EmergencyContactRelationship { get; set; }
        public string? EmergencyContactPhone { get; set; }

        public string? BankName { get; set; }
        public string? AccountHolderName { get; set; }
        public string? SortCode { get; set; }
        public string? AccountNumber { get; set; }
        public string? NationalInsuranceNumber { get; set; }

        public string? UniformSizes { get; set; }
        public string? DrivingLicenseStatus { get; set; }
        public string? MedicalDisclosures { get; set; }
        public string? DbsDisclosure { get; set; }
        public bool OptOut48Hours { get; set; }
    }

    public class SiteActivityResponse
    {
        public ClientSiteDto? Site { get; set; }
        public int TotalShiftsCount { get; set; }
        public int ActiveShiftsCount { get; set; }
        public int CompletedShiftsCount { get; set; }
        public int ScheduledShiftsCount { get; set; }
        public decimal TotalHoursLogged { get; set; }
        public decimal TotalFinesAmount { get; set; }
        public int UniqueStaffCount { get; set; }
        public List<ShiftDto> Shifts { get; set; } = new();
        public List<SiteStaffRosterItemDto> StaffRoster { get; set; } = new();
    }

    public class SiteStaffRosterItemDto
    {
        public string UserId { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string JobTitle { get; set; } = string.Empty;
        public int TotalShiftsAtSite { get; set; }
        public int CompletedShiftsAtSite { get; set; }
        public decimal TotalHoursAtSite { get; set; }
        public decimal PunctualityScorePercent { get; set; }
        public DateTime LastDutyDateUtc { get; set; }
        public decimal TotalFinesAmount { get; set; }
    }

    public class SubmitDutyReportRequest
    {
        public string? ReportContent { get; set; }
        public string? DutyStatus { get; set; }
        public bool FineAttached { get; set; }
        public decimal? FineAmount { get; set; }
        public string? FineReason { get; set; }
        public string? FineAuthorizedBy { get; set; }
        public string? FineStatus { get; set; }
    }

    public class StaffDutyHistoryResponse
    {
        public string UserId { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string JobTitle { get; set; } = string.Empty;
        public int TotalShiftsCount { get; set; }
        public int CompletedShiftsCount { get; set; }
        public decimal TotalHoursWorked { get; set; }
        public decimal PunctualityScorePercent { get; set; }
        public int TotalFinesCount { get; set; }
        public decimal TotalFinesAmount { get; set; }
        public List<ShiftDto> Shifts { get; set; } = new();
    }
}

