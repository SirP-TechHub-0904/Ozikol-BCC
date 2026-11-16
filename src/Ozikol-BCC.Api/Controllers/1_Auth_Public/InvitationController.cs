using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Application.Interfaces.Services;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using System;
using System.Threading;
using System.Threading.Tasks;
using Ozikol_BCC.Api.Models;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Api.Controllers
{
    /// <summary>
    /// API for creating one‑time invitation links and consuming them.
    /// </summary>
    [ApiController]
    [Route("api/workforce/invitations")]
    [AllowAnonymous]
    public class InvitationController : ControllerBase
    {
        private readonly DashboardDbContext _db;
        private readonly ILogger<InvitationController> _logger;
        private readonly ICentralNotificationDispatcher? _notificationDispatcher;

        /// <summary>
        /// Initializes a new instance of the <see cref="InvitationController"/> class.
        /// </summary>
        public InvitationController(
            DashboardDbContext db,
            ILogger<InvitationController> logger,
            ICentralNotificationDispatcher? notificationDispatcher = null)
        {
            _db = db;
            _logger = logger;
            _notificationDispatcher = notificationDispatcher;
        }

        /// <summary>
        /// Creates a new invitation and returns the generated one‑time link.
        /// </summary>
        /// <param name="request">Invitation details (full name, email, phone).</param>
        /// <param name="ct">Cancellation token.</param>
        /// <returns>Success response containing the invitation URL.</returns>
        [HttpPost]
        public async Task<ActionResult<ApiResponse<string>>> CreateInvitation([FromBody] CreateInvitationRequest request, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(request.FullName) || string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest(ApiResponse<string>.FailureResponse("Full name and email are required.", errorCode: "ERR-INV-001"));
            }

            var invitation = new Invitation
            {
                FullName = request.FullName.Trim(),
                Email = request.Email.Trim(),
                PhoneNumber = request.PhoneNumber?.Trim(),
                Token = Guid.NewGuid().ToString("N"),
                CreatedUtc = DateTime.UtcNow,
                ExpiresUtc = DateTime.UtcNow.AddDays(7) // optional expiry
            };

            await _db.Invitations.AddAsync(invitation, ct);
            await _db.SaveChangesAsync(ct);

            var link = $"{Request.Scheme}://{Request.Host}/invite/{invitation.Token}";
            _logger.LogInformation("Invitation link generated for {Email}: {Link}", invitation.Email, link);

            if (_notificationDispatcher != null)
            {
                await _notificationDispatcher.DispatchAsync(new NotificationDispatchPayload
                {
                    TargetType = NotificationDispatchTarget.SingleUser,
                    RecipientEmail = invitation.Email,
                    RecipientName = invitation.FullName,
                    Title = "You Are Invited to Join Our Workforce",
                    Message = $"Hi {invitation.FullName}, you have been invited to onboard. Open your invitation link: {link}",
                    EmailSubject = "Workforce Onboarding Invitation",
                    EmailHtmlBody = $@"
                        <p>Hi <strong>{System.Net.WebUtility.HtmlEncode(invitation.FullName)}</strong>,</p>
                        <p>You have been invited to complete your workforce onboarding. Click the button below to accept your one-time invitation (valid for 7 days):</p>
                        <div style='margin:24px 0; text-align:center;'>
                            <a href='{link}' style='background-color:#0050e5; color:#ffffff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold; display:inline-block;'>Accept Invitation</a>
                        </div>",
                    ActionUrl = link,
                    Category = BcpMessageCategory.General,
                    Priority = BcpMessagePriority.High,
                    Severity = NotificationSeverity.NewFeature,
                    Channels = NotificationChannels.Email,
                    SendEmailCopy = true,
                    Module = "Workforce"
                }, ct);
            }

            return Ok(ApiResponse<string>.SuccessResponse(link, "Invitation created and dispatched successfully."));
        }

        /// <summary>
        /// Consumes a one‑time invitation token. If valid, returns the invitation data and marks it used.
        /// Subsequent calls return 410 Gone.
        /// </summary>
        /// <param name="token">The invitation token from the URL.</param>
        /// <param name="ct">Cancellation token.</param>
        /// <returns>Invitation details or error.</returns>
        [HttpGet("{token}")]
        public async Task<ActionResult<ApiResponse<InvitationDto>>> Redeem(string token, CancellationToken ct)
        {
            var invitation = await _db.Invitations
                .AsTracking()
                .FirstOrDefaultAsync(i => i.Token == token, ct);

            if (invitation == null)
            {
                return NotFound(ApiResponse<InvitationDto>.FailureResponse("Invitation not found.", errorCode: "ERR-INV-002"));
            }

            if (invitation.IsUsed)
            {
                return StatusCode(410, ApiResponse<InvitationDto>.FailureResponse("Invitation already used.", errorCode: "ERR-INV-003"));
            }

            // Mark as used and persist.
            invitation.IsUsed = true;
            await _db.SaveChangesAsync(ct);

            var dto = new InvitationDto
            {
                FullName = invitation.FullName,
                Email = invitation.Email,
                PhoneNumber = invitation.PhoneNumber,
                Token = invitation.Token,
                CreatedUtc = invitation.CreatedUtc,
                ExpiresUtc = invitation.ExpiresUtc
            };

            return Ok(ApiResponse<InvitationDto>.SuccessResponse(dto, "Invitation redeemed."));
        }
    }

    /// <summary>
    /// Request payload for creating an invitation.
    /// </summary>
    public class CreateInvitationRequest
    {
        /// <summary>Full name of the invitee.</summary>
        public string FullName { get; set; } = string.Empty;
        /// <summary>Email address of the invitee.</summary>
        public string Email { get; set; } = string.Empty;
        /// <summary>Optional phone number.</summary>
        public string? PhoneNumber { get; set; }
    }

    /// <summary>
    /// DTO returned after a successful redeem.
    /// </summary>
    public class InvitationDto
    {
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string Token { get; set; } = string.Empty;
        public DateTime CreatedUtc { get; set; }
        public DateTime? ExpiresUtc { get; set; }
    }
}

