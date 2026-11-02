using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Application.Services;
using Ozikol_BCC.Domain.Models;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Api.Controllers
{
    /// <summary>
    /// Multi-Channel Message Templates API (Email, SMS, In-App Notifications).
    /// Allows administrators to manage, customize, preview, and reset communication templates.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Route("api/MessageTemplates")]
    [Authorize]
    public class MessageTemplatesApiController : ControllerBase
    {
        private readonly IMessageTemplateService _templateService;

        public MessageTemplatesApiController(IMessageTemplateService templateService)
        {
            _templateService = templateService;
        }

        /// <summary>
        /// Retrieves all communication templates for the tenant.
        /// </summary>
        [HttpGet]
        [Authorize(Roles = "SuperAdmin,Admin,IdentityManager,SystemAdministrator")]
        public async Task<IActionResult> GetAllTemplates()
        {
            var templates = await _templateService.GetAllTemplatesAsync();
            return Ok(ApiResponse<List<BcpMessageTemplate>>.SuccessResponse(templates, "Message templates retrieved successfully."));
        }

        /// <summary>
        /// Retrieves single template by event type and delivery channel.
        /// </summary>
        [HttpGet("{eventType}/{channel}")]
        [Authorize(Roles = "SuperAdmin,Admin,IdentityManager,SystemAdministrator")]
        public async Task<IActionResult> GetTemplate(BcpEventType eventType, BcpMessageChannel channel)
        {
            var template = await _templateService.GetTemplateAsync(eventType, channel);
            if (template == null) return NotFound(ApiResponse<object>.FailureResponse("Template not found."));
            return Ok(ApiResponse<BcpMessageTemplate>.SuccessResponse(template));
        }

        /// <summary>
        /// Updates or customizes a message template.
        /// </summary>
        [HttpPut("{eventType}/{channel}")]
        [Authorize(Roles = "SuperAdmin,Admin,IdentityManager,SystemAdministrator")]
        public async Task<IActionResult> SaveTemplate(
            BcpEventType eventType,
            BcpMessageChannel channel,
            [FromBody] SaveMessageTemplateRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.BodyTemplate))
                return BadRequest(ApiResponse<object>.FailureResponse("Template body is required."));

            var userEmail = User.FindFirstValue(ClaimTypes.Email) ?? User.Identity?.Name ?? "Admin";
            var saved = await _templateService.SaveTemplateAsync(
                eventType,
                channel,
                request.Name ?? $"{eventType} ({channel})",
                request.SubjectTemplate,
                request.BodyTemplate,
                request.IsActive ?? true,
                userEmail);

            return Ok(ApiResponse<BcpMessageTemplate>.SuccessResponse(saved, "Message template saved successfully."));
        }

        /// <summary>
        /// Resets a template back to factory system defaults.
        /// </summary>
        [HttpPost("{eventType}/{channel}/reset")]
        [Authorize(Roles = "SuperAdmin,Admin,IdentityManager,SystemAdministrator")]
        public async Task<IActionResult> ResetToDefault(BcpEventType eventType, BcpMessageChannel channel)
        {
            var reset = await _templateService.ResetToDefaultAsync(eventType, channel);
            return Ok(ApiResponse<BcpMessageTemplate>.SuccessResponse(reset, "Template reset to system default."));
        }

        /// <summary>
        /// Previews a template with mock placeholder interpolation data.
        /// </summary>
        [HttpPost("preview")]
        [Authorize(Roles = "SuperAdmin,Admin,IdentityManager,SystemAdministrator")]
        public async Task<IActionResult> PreviewTemplate([FromBody] PreviewTemplateRequest request)
        {
            var origin = Request.Headers.Origin.FirstOrDefault() 
                ?? Request.Headers.Referer.FirstOrDefault() 
                ?? $"{Request.Scheme}://{Request.Host}";

            var samplePlaceholders = request.SamplePlaceholders ?? new Dictionary<string, string>
            {
                { "FullName", "First Last" },
                { "FirstName", "First" },
                { "LastName", "Last" },
                { "Email", "user@company.com" },
                { "PhoneNumber", "+0 (000) 000-0000" },
                { "MemberId", "MB-2026-0042" },
                { "OtpCode", "849201" },
                { "TemporaryPassword", "Pass@Temp99" },
                { "PortalUrl", origin.TrimEnd('/') },
                { "OrganizationName", "Workspace Organization" },
                { "Designation", "Principal Lead" },
                { "CategoryName", "General Management" },
                { "Status", "Active" },
                { "IndicatorTitle", "Quarterly Governance Score" },
                { "Score", "94.5" },
                { "Period", "Q3-2026" }
            };

            var (subject, body) = await _templateService.RenderMessageAsync(
                request.EventType,
                request.Channel,
                samplePlaceholders,
                request.SubjectTemplate,
                request.BodyTemplate);

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                Subject = subject,
                Body = body,
                request.Channel,
                request.EventType
            }, "Preview generated successfully."));
        }
    }

    public class SaveMessageTemplateRequest
    {
        public string? Name { get; set; }
        public string? SubjectTemplate { get; set; }
        public string BodyTemplate { get; set; } = string.Empty;
        public bool? IsActive { get; set; } = true;
    }

    public class PreviewTemplateRequest
    {
        public BcpEventType EventType { get; set; }
        public BcpMessageChannel Channel { get; set; }
        public string? SubjectTemplate { get; set; }
        public string? BodyTemplate { get; set; }
        public Dictionary<string, string>? SamplePlaceholders { get; set; }
    }
}
