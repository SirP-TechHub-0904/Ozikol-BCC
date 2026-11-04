using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Application.Common.Errors;
using Ozikol_BCC.Application.Interfaces.Services;
using Ozikol_BCC.Application.Services.Cloudinary;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Infrastructure.TenantSupport;
using Ozikol_BCC.Persistence.EF.SQL;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Api.Controllers
{
    /// <summary>
    /// Publicly accessible onboarding controller for external Committee / Sub-Group registration links
    /// (<c>/api/public/committees</c>). Supports tenant-branded discovery, Extra-Info supplemental form rendering,
    /// smart existing-member detection, and secure attachment uploads without requiring prior login.
    /// </summary>
    [ApiController]
    [Route("api/public/committees")]
    [AllowAnonymous]
    [Tags("Committees Public Registration Portal")]
    public class PublicCommitteesApiController : ControllerBase
    {
        private readonly DashboardDbContext _db;
        private readonly ICentralNotificationDispatcher? _notificationDispatcher;
        private readonly ICloudinaryService? _cloudinaryService;
        private readonly ITenantProvider? _tenantProvider;
        private readonly ITenantFeatureGateService? _featureGateService;

        /// <summary>
        /// Initializes a new instance of the <see cref="PublicCommitteesApiController"/> class.
        /// </summary>
        /// <param name="db">Tenant database context resolved via <see cref="TenantScopeMiddleware"/>.</param>
        /// <param name="notificationDispatcher">Unified notification dispatcher.</param>
        /// <param name="cloudinaryService">Managed document upload service.</param>
        /// <param name="tenantProvider">Active tenant context provider.</param>
        /// <param name="featureGateService">Tenant modular feature gate evaluator.</param>
        public PublicCommitteesApiController(
            DashboardDbContext db,
            ICentralNotificationDispatcher? notificationDispatcher = null,
            ICloudinaryService? cloudinaryService = null,
            ITenantProvider? tenantProvider = null,
            ITenantFeatureGateService? featureGateService = null)
        {
            _db = db;
            _notificationDispatcher = notificationDispatcher;
            _cloudinaryService = cloudinaryService;
            _tenantProvider = tenantProvider;
            _featureGateService = featureGateService;
        }

        /// <summary>
        /// Resolves the current tenant identifier from provider context, custom header, or host subdomain.
        /// </summary>
        /// <param name="explicitTenantKey">Optional explicit tenant key provided in route or query parameters.</param>
        /// <returns>Resolved tenant key or null if unresolvable.</returns>
        private string? ResolveCurrentTenantKey(string? explicitTenantKey = null)
        {
            if (!string.IsNullOrWhiteSpace(explicitTenantKey))
            {
                return explicitTenantKey.Trim().ToLowerInvariant();
            }

            var candidate = _tenantProvider?.CurrentTenant;
            if (!string.IsNullOrWhiteSpace(candidate))
            {
                return candidate.Trim().ToLowerInvariant();
            }

            var headerKey = HttpContext.Request.Headers["X-Tenant-Key"].ToString()?.Trim();
            if (!string.IsNullOrWhiteSpace(headerKey))
            {
                return headerKey.ToLowerInvariant();
            }

            var host = HttpContext.Request.Host.Host.ToLowerInvariant();
            var parts = host.Split('.');
            if (parts.Length > 1 && !new[] { "localhost", "127", "www", "api", "central", "admin" }.Contains(parts[0]))
            {
                return parts[0];
            }

            return null;
        }

        /// <summary>
        /// Evaluates whether the Committees &amp; Sub-Groups modular capability (<c>bcp-committees</c>)
        /// is active and subscribed for the current tenant workspace.
        /// </summary>
        /// <param name="explicitTenantKey">Optional tenant key passed from route or payload.</param>
        /// <param name="cancellationToken">Request cancellation token.</param>
        /// <returns>True if active and entitled; otherwise false.</returns>
        private async Task<bool> IsFeatureActiveAsync(string? explicitTenantKey, CancellationToken cancellationToken)
        {
            if (_featureGateService == null)
            {
                return true;
            }

            var tenantKey = ResolveCurrentTenantKey(explicitTenantKey);
            if (string.IsNullOrWhiteSpace(tenantKey))
            {
                return true;
            }

            return await _featureGateService.IsFeatureActiveAsync(tenantKey, "bcp-committees", cancellationToken);
        }

        /// <summary>
        /// Retrieves the tenant's public directory of externally open committees/sub-groups, brand identity,
        /// dynamic terminology aliases, and signed-in user identity (if the visitor already holds a valid session).
        /// </summary>
        /// <param name="tenantKey">Optional explicit tenant key provided in query or header.</param>
        /// <param name="cancellationToken">Request cancellation token.</param>
        /// <returns>Public onboarding directory payload.</returns>
        [HttpGet("directory")]
        public async Task<IActionResult> GetPublicDirectory([FromQuery] string? tenantKey = null, CancellationToken cancellationToken = default)
        {
            var resolvedTenant = ResolveCurrentTenantKey(tenantKey);
            using var explicitScope = !string.IsNullOrWhiteSpace(resolvedTenant) && _tenantProvider != null
                ? _tenantProvider.BeginScope(resolvedTenant)
                : null;

            if (!await IsFeatureActiveAsync(resolvedTenant, cancellationToken))
            {
                return NotFound(ApiResponse<object>.FailureResponse("Page not found.", errorCode: StandardErrorCodes.RecordNotFound));
            }

            var settings = await _db.BcpCommitteeSettings.AsNoTracking().FirstOrDefaultAsync(cancellationToken)
                        ?? new BcpCommitteeSettings();

            var site = await _db.MisWebsiteSettings.AsNoTracking().FirstOrDefaultAsync(cancellationToken);
            var brandName = !string.IsNullOrWhiteSpace(site?.BrandName)
                ? site.BrandName
                : (!string.IsNullOrWhiteSpace(site?.CompanyName) ? site.CompanyName : "Organization Workspace");

            if (!settings.AllowExternalRegistration)
            {
                return StatusCode(StatusCodes.Status403Forbidden,
                    ApiResponse<object>.FailureResponse("External registration is currently closed for this workspace.", errorCode: StandardErrorCodes.InvalidOperationState));
            }

            BcpCommitteeForm? defaultForm = null;
            if (settings.DefaultExtraInfoFormId.HasValue)
            {
                defaultForm = await _db.BcpCommitteeForms.AsNoTracking()
                    .FirstOrDefaultAsync(f => f.Id == settings.DefaultExtraInfoFormId.Value && f.IsActive, cancellationToken);
            }
            defaultForm ??= await _db.BcpCommitteeForms.AsNoTracking()
                .FirstOrDefaultAsync(f => f.IsGlobalDefault && f.IsActive, cancellationToken);

            var openCommittees = await _db.BcpCommittees
                .AsNoTracking()
                .Include(c => c.ExtraInfoForm)
                .Include(c => c.ParentCommittee)
                .Where(c => c.Status == "Active" && c.AllowExternalRegistration && c.Visibility != "Private")
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
                    c.MaxCapacity,
                    MemberCount = c.Members.Count(m => m.Status == "Active"),
                    Form = c.ExtraInfoForm != null && c.ExtraInfoForm.IsActive ? c.ExtraInfoForm : null
                })
                .ToListAsync(cancellationToken);

            var currentUserProfile = await ResolveSignedInProfileAsync(cancellationToken);

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                Brand = new
                {
                    BrandName = brandName,
                    LogoUrl = site?.CompanyLogoUrl,
                    IconUrl = site?.CompanyIconUrl,
                    TenantKey = _tenantProvider?.CurrentTenant ?? HttpContext.Request.Headers["X-Tenant-Key"].ToString()
                },
                Aliases = new
                {
                    settings.AliasSingular,
                    settings.AliasPlural,
                    settings.SubGroupAliasSingular,
                    settings.SubGroupAliasPlural,
                    settings.LeaderTitleAlias
                },
                SignedInMember = currentUserProfile != null ? new
                {
                    currentUserProfile.Id,
                    currentUserProfile.FirstName,
                    currentUserProfile.LastName,
                    currentUserProfile.Email,
                    currentUserProfile.PhoneNumber
                } : null,
                Committees = openCommittees.Select(c =>
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
                        c.MaxCapacity,
                        c.MemberCount,
                        ExtraInfoForm = effectiveForm != null ? new
                        {
                            effectiveForm.Id,
                            effectiveForm.Title,
                            effectiveForm.Description,
                            Fields = CommitteesApiController.ParseJsonOrDefault<List<CommitteeFormFieldDto>>(effectiveForm.FieldsSchemaJson, new List<CommitteeFormFieldDto>())
                        } : null
                    };
                })
            }, "Public directory loaded."));
        }

        /// <summary>
        /// Retrieves a single committee's public registration landing data by URL slug (and optional invite token for private groups).
        /// </summary>
        /// <param name="groupSlug">URL-safe slug of the target committee.</param>
        /// <param name="token">Optional invite token enabling invite-only external registration.</param>
        /// <param name="tenantKey">Optional explicit tenant key override.</param>
        /// <param name="cancellationToken">Request cancellation token.</param>
        /// <returns>Single committee public registration metadata and Extra-Info schema.</returns>
        [HttpGet("{groupSlug}")]
        public async Task<IActionResult> GetPublicCommitteeBySlug(
            string groupSlug,
            [FromQuery] string? token = null,
            [FromQuery] string? tenantKey = null,
            CancellationToken cancellationToken = default)
        {
            var resolvedTenant = ResolveCurrentTenantKey(tenantKey);
            using var explicitScope = !string.IsNullOrWhiteSpace(resolvedTenant) && _tenantProvider != null
                ? _tenantProvider.BeginScope(resolvedTenant)
                : null;

            if (!await IsFeatureActiveAsync(resolvedTenant, cancellationToken))
            {
                return NotFound(ApiResponse<object>.FailureResponse("Page not found.", errorCode: StandardErrorCodes.RecordNotFound));
            }

            var settings = await _db.BcpCommitteeSettings.AsNoTracking().FirstOrDefaultAsync(cancellationToken)
                        ?? new BcpCommitteeSettings();

            if (!settings.AllowExternalRegistration)
            {
                return StatusCode(StatusCodes.Status403Forbidden,
                    ApiResponse<object>.FailureResponse("External registration is currently closed.", errorCode: StandardErrorCodes.InvalidOperationState));
            }

            var normalizedSlug = (groupSlug ?? string.Empty).Trim().ToLowerInvariant();
            var committee = await _db.BcpCommittees
                .AsNoTracking()
                .Include(c => c.ExtraInfoForm)
                .Include(c => c.ParentCommittee)
                .FirstOrDefaultAsync(c => c.Slug.ToLower() == normalizedSlug && c.Status == "Active", cancellationToken);

            if (committee == null || !committee.AllowExternalRegistration)
            {
                return NotFound(ApiResponse<object>.FailureResponse("This registration link is unavailable or inactive.", errorCode: StandardErrorCodes.RecordNotFound));
            }

            // Enforce invite token when visibility is Private
            if (committee.Visibility == "Private" &&
                (string.IsNullOrWhiteSpace(token) || !string.Equals(committee.ExternalInviteToken, token.Trim(), StringComparison.Ordinal)))
            {
                return StatusCode(StatusCodes.Status403Forbidden,
                    ApiResponse<object>.FailureResponse("A valid private invitation link is required to join this group.", errorCode: StandardErrorCodes.AccessDenied));
            }

            BcpCommitteeForm? effectiveForm = committee.ExtraInfoForm != null && committee.ExtraInfoForm.IsActive
                ? committee.ExtraInfoForm
                : null;

            if (effectiveForm == null && settings.DefaultExtraInfoFormId.HasValue)
            {
                effectiveForm = await _db.BcpCommitteeForms.AsNoTracking()
                    .FirstOrDefaultAsync(f => f.Id == settings.DefaultExtraInfoFormId.Value && f.IsActive, cancellationToken);
            }
            effectiveForm ??= await _db.BcpCommitteeForms.AsNoTracking()
                .FirstOrDefaultAsync(f => f.IsGlobalDefault && f.IsActive, cancellationToken);

            var site = await _db.MisWebsiteSettings.AsNoTracking().FirstOrDefaultAsync(cancellationToken);
            var brandName = !string.IsNullOrWhiteSpace(site?.BrandName)
                ? site.BrandName
                : (!string.IsNullOrWhiteSpace(site?.CompanyName) ? site.CompanyName : "Organization Workspace");

            var currentUserProfile = await ResolveSignedInProfileAsync(cancellationToken);
            var memberCount = await _db.BcpCommitteeMembers.CountAsync(m => m.CommitteeId == committee.Id && m.Status == "Active", cancellationToken);

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                Brand = new
                {
                    BrandName = brandName,
                    LogoUrl = site?.CompanyLogoUrl,
                    IconUrl = site?.CompanyIconUrl,
                    TenantKey = _tenantProvider?.CurrentTenant ?? HttpContext.Request.Headers["X-Tenant-Key"].ToString()
                },
                Aliases = new
                {
                    settings.AliasSingular,
                    settings.AliasPlural,
                    settings.SubGroupAliasSingular,
                    settings.SubGroupAliasPlural
                },
                SignedInMember = currentUserProfile != null ? new
                {
                    currentUserProfile.Id,
                    currentUserProfile.FirstName,
                    currentUserProfile.LastName,
                    currentUserProfile.Email,
                    currentUserProfile.PhoneNumber
                } : null,
                Committee = new
                {
                    committee.Id,
                    committee.ParentCommitteeId,
                    ParentCommitteeName = committee.ParentCommittee?.Name,
                    committee.Name,
                    committee.Slug,
                    committee.CategoryTag,
                    committee.Description,
                    committee.MissionStatement,
                    committee.MeetingSchedule,
                    committee.IconName,
                    committee.CoverBannerUrl,
                    committee.MaxCapacity,
                    MemberCount = memberCount,
                    RequiresApproval = settings.RequireApprovalForExternal || committee.RequireApproval || committee.Visibility == "ApprovalRequired",
                    ExtraInfoForm = effectiveForm != null ? new
                    {
                        effectiveForm.Id,
                        effectiveForm.Title,
                        effectiveForm.Description,
                        Fields = CommitteesApiController.ParseJsonOrDefault<List<CommitteeFormFieldDto>>(effectiveForm.FieldsSchemaJson, new List<CommitteeFormFieldDto>())
                    } : null
                }
            }, "Public group registration loaded."));
        }

        /// <summary>
        /// Submits an external registration application.
        /// If the visitor is already signed in (or matches an existing workspace member by email), links their core profile automatically
        /// while saving their supplemental Extra-Info answers.
        /// </summary>
        /// <param name="dto">External registration payload.</param>
        /// <param name="tenantKey">Optional explicit tenant key provided in query or header.</param>
        /// <param name="cancellationToken">Request cancellation token.</param>
        /// <returns>Enrollment or pending review confirmation.</returns>
        [HttpPost("register")]
        public async Task<IActionResult> SubmitExternalRegistration(
            [FromBody] PublicCommitteeRegisterDto dto,
            [FromQuery] string? tenantKey = null,
            CancellationToken cancellationToken = default)
        {
            var resolvedTenant = ResolveCurrentTenantKey(tenantKey);
            using var explicitScope = !string.IsNullOrWhiteSpace(resolvedTenant) && _tenantProvider != null
                ? _tenantProvider.BeginScope(resolvedTenant)
                : null;

            if (!await IsFeatureActiveAsync(resolvedTenant, cancellationToken))
            {
                return NotFound(ApiResponse<object>.FailureResponse("Page not found.", errorCode: StandardErrorCodes.RecordNotFound));
            }

            if (dto == null || dto.CommitteeId == Guid.Empty)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Required information is missing.", errorCode: StandardErrorCodes.RequiredFieldMissing));
            }

            var settings = await _db.BcpCommitteeSettings.AsNoTracking().FirstOrDefaultAsync(cancellationToken)
                        ?? new BcpCommitteeSettings();

            if (!settings.AllowExternalRegistration)
            {
                return StatusCode(StatusCodes.Status403Forbidden,
                    ApiResponse<object>.FailureResponse("External registration is currently closed.", errorCode: StandardErrorCodes.InvalidOperationState));
            }

            var committee = await _db.BcpCommittees
                .FirstOrDefaultAsync(c => c.Id == dto.CommitteeId && c.Status == "Active", cancellationToken);

            if (committee == null || !committee.AllowExternalRegistration)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Requested record not found.", errorCode: StandardErrorCodes.RecordNotFound));
            }

            if (committee.Visibility == "Private" &&
                (string.IsNullOrWhiteSpace(dto.InviteToken) || !string.Equals(committee.ExternalInviteToken, dto.InviteToken.Trim(), StringComparison.Ordinal)))
            {
                return StatusCode(StatusCodes.Status403Forbidden,
                    ApiResponse<object>.FailureResponse("A valid invitation link is required.", errorCode: StandardErrorCodes.AccessDenied));
            }

            if (committee.MaxCapacity.HasValue)
            {
                var currentCount = await _db.BcpCommitteeMembers.CountAsync(m => m.CommitteeId == committee.Id && m.Status == "Active", cancellationToken);
                if (currentCount >= committee.MaxCapacity.Value)
                {
                    return BadRequest(ApiResponse<object>.FailureResponse("Maximum member capacity has been reached.", errorCode: StandardErrorCodes.QuotaLimitReached));
                }
            }

            var signedInUser = await ResolveSignedInProfileAsync(cancellationToken);
            var firstName = signedInUser?.FirstName ?? dto.FirstName?.Trim() ?? string.Empty;
            var lastName = signedInUser?.LastName ?? dto.LastName?.Trim() ?? string.Empty;
            var email = signedInUser?.Email ?? dto.Email?.Trim() ?? string.Empty;
            var phone = signedInUser?.PhoneNumber ?? dto.PhoneNumber?.Trim();

            if (string.IsNullOrWhiteSpace(firstName) || string.IsNullOrWhiteSpace(email))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("First name and email address are required.", errorCode: StandardErrorCodes.RequiredFieldMissing));
            }

            // Smart lookup: match existing member by email even if not currently signed in
            var matchedUser = signedInUser;
            if (matchedUser == null)
            {
                var normalizedEmail = email.ToLowerInvariant();
                matchedUser = await _db.Users.FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == normalizedEmail, cancellationToken);
            }

            if (matchedUser != null)
            {
                var alreadyMember = await _db.BcpCommitteeMembers
                    .AnyAsync(m => m.CommitteeId == committee.Id && m.UserProfileId == matchedUser.Id && m.Status == "Active", cancellationToken);

                if (alreadyMember)
                {
                    return Ok(ApiResponse<object>.SuccessResponse(new { Status = "AlreadyEnrolled" }, $"You are already an active member of {committee.Name}."));
                }
            }

            var extraJson = JsonSerializer.Serialize(dto.ExtraInfoResponses ?? new Dictionary<string, object>());
            var requiresApproval = settings.RequireApprovalForExternal || committee.RequireApproval || committee.Visibility == "ApprovalRequired" || matchedUser == null;

            if (!requiresApproval && matchedUser != null)
            {
                _db.BcpCommitteeMembers.Add(new BcpCommitteeMember
                {
                    Id = Guid.CreateVersion7(),
                    CommitteeId = committee.Id,
                    UserProfileId = matchedUser.Id,
                    Role = "Member",
                    ExtraInfoResponsesJson = extraJson,
                    Status = "Active",
                    JoinedAt = DateTime.UtcNow
                });
                await _db.SaveChangesAsync(cancellationToken);
                return Ok(ApiResponse<object>.SuccessResponse(new { Status = "Joined", CommitteeName = committee.Name }, $"You have been enrolled into {committee.Name}."));
            }

            var duplicatePending = await _db.BcpCommitteeRegistrations
                .AnyAsync(r => r.CommitteeId == committee.Id && r.Email.ToLower() == email.ToLowerInvariant() && r.Status == "Pending", cancellationToken);

            if (duplicatePending)
            {
                return Ok(ApiResponse<object>.SuccessResponse(new { Status = "Pending" }, "Your registration is already in the review queue."));
            }

            var reg = new BcpCommitteeRegistration
            {
                Id = Guid.CreateVersion7(),
                CommitteeId = committee.Id,
                ApplicantUserProfileId = matchedUser?.Id,
                IsExternalApplicant = signedInUser == null,
                FirstName = firstName,
                LastName = lastName,
                Email = email,
                PhoneNumber = phone,
                ExtraInfoResponsesJson = extraJson,
                AttachmentUrlsJson = JsonSerializer.Serialize(dto.AttachmentUrls ?? new List<string>()),
                Status = "Pending",
                SubmittedAt = DateTime.UtcNow
            };

            _db.BcpCommitteeRegistrations.Add(reg);
            await _db.SaveChangesAsync(cancellationToken);

            // Notify appointed leaders of this committee via unified notification pool
            if (_notificationDispatcher != null)
            {
                var leaders = await _db.BcpCommitteeMembers
                    .AsNoTracking()
                    .Include(m => m.UserProfile)
                    .Where(m => m.CommitteeId == committee.Id && m.Status == "Active" &&
                                (m.Role == "Chairperson" || m.Role == "Secretary" || m.Role == "Coordinator"))
                    .Select(m => m.UserProfile)
                    .Where(u => u != null)
                    .ToListAsync(cancellationToken);

                foreach (var leader in leaders)
                {
                    try
                    {
                        await _notificationDispatcher.DispatchAsync(new NotificationDispatchPayload
                        {
                            TargetType = NotificationDispatchTarget.SingleUser,
                            TargetUserId = leader!.Id,
                            RecipientEmail = leader.Email,
                            RecipientName = $"{leader.FirstName} {leader.LastName}".Trim(),
                            TenantKey = _tenantProvider?.CurrentTenant ?? string.Empty,
                            Title = $"New {settings.AliasSingular} Registration: {committee.Name}",
                            Message = $"{firstName} {lastName} ({email}) submitted a registration for {committee.Name}.",
                            ActionUrl = $"/committees/workspace/view/{committee.Id}",
                            Module = "Committees",
                            Icon = "how_to_reg",
                            Severity = NotificationSeverity.Update,
                            Channels = NotificationChannels.InApp
                        }, cancellationToken);
                    }
                    catch
                    {
                        // Non-blocking notification safeguard
                    }
                }
            }

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                RegistrationId = reg.Id,
                Status = "Pending",
                CommitteeName = committee.Name
            }, $"Your registration for {committee.Name} has been submitted for review."));
        }

        /// <summary>
        /// Uploads a supplemental form attachment (e.g. CV, portfolio PDF, audition photo) during external registration.
        /// </summary>
        /// <param name="file">Multipart file payload.</param>
        /// <param name="tenantKey">Optional explicit tenant key override.</param>
        /// <param name="cancellationToken">Request cancellation token.</param>
        /// <returns>Uploaded attachment URL.</returns>
        [HttpPost("upload")]
        public async Task<IActionResult> UploadPublicRegistrationFile(IFormFile file, [FromQuery] string? tenantKey = null, CancellationToken cancellationToken = default)
        {
            var resolvedTenant = ResolveCurrentTenantKey(tenantKey);
            using var explicitScope = !string.IsNullOrWhiteSpace(resolvedTenant) && _tenantProvider != null
                ? _tenantProvider.BeginScope(resolvedTenant)
                : null;

            if (!await IsFeatureActiveAsync(resolvedTenant, cancellationToken))
            {
                return NotFound(ApiResponse<object>.FailureResponse("Page not found.", errorCode: StandardErrorCodes.RecordNotFound));
            }

            if (file == null || file.Length == 0)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("No file selected.", errorCode: StandardErrorCodes.RequiredFieldMissing));
            }

            if (file.Length > 15L * 1024L * 1024L)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("File exceeds the 15 MB public upload limit.", errorCode: StandardErrorCodes.MediaUploadFailed));
            }

            var ext = Path.GetExtension(file.FileName)?.ToLowerInvariant() ?? string.Empty;
            var allowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                ".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg", ".webp"
            };
            if (!allowed.Contains(ext))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Upload a PDF, Word, or Image file.", errorCode: StandardErrorCodes.MediaUploadFailed));
            }

            string uploadedUrl = string.Empty;
            if (_cloudinaryService != null)
            {
                try
                {
                    uploadedUrl = ext is ".png" or ".jpg" or ".jpeg" or ".webp"
                        ? await _cloudinaryService.UploadImageAsync(file, "committees-intake")
                        : await _cloudinaryService.UploadRawDocumentAsync(file, "committees-intake");
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

            return Ok(ApiResponse<object>.SuccessResponse(new { FileName = file.FileName, FileUrl = uploadedUrl }, "File uploaded."));
        }

        private async Task<Profile?> ResolveSignedInProfileAsync(CancellationToken cancellationToken)
        {
            if (User?.Identity?.IsAuthenticated != true) return null;
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? User.FindFirstValue("uid");
            if (string.IsNullOrWhiteSpace(userId)) return null;
            return await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        }
    }

    /// <summary>
    /// Payload submitted from the external public committee registration page.
    /// </summary>
    public class PublicCommitteeRegisterDto
    {
        /// <summary>Target committee ID.</summary>
        public Guid CommitteeId { get; set; }
        /// <summary>Optional invite token for invite-only links.</summary>
        public string? InviteToken { get; set; }
        /// <summary>Applicant first name (optional when already signed in).</summary>
        public string? FirstName { get; set; }
        /// <summary>Applicant last name (optional when already signed in).</summary>
        public string? LastName { get; set; }
        /// <summary>Applicant email address (optional when already signed in).</summary>
        public string? Email { get; set; }
        /// <summary>Applicant phone number.</summary>
        public string? PhoneNumber { get; set; }
        /// <summary>Supplemental Extra-Info form responses.</summary>
        public Dictionary<string, object>? ExtraInfoResponses { get; set; }
        /// <summary>Optional uploaded file URLs.</summary>
        public List<string>? AttachmentUrls { get; set; }
    }
}
