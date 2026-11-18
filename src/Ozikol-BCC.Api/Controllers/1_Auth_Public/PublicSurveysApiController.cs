using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Api.Authorization;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;

namespace Ozikol_BCC.Api.Controllers
{
    /// <summary>
    /// Public endpoint for respondents to load and submit standalone surveys (<c>bcp-form-builder</c>).
    /// Completely separate from Website CMS <c>WebsiteContentApiController</c>.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [AllowAnonymous]
    [RequireFeature("bcp-form-builder")]
    [Tags("Public Survey Runner")]
    public class PublicSurveysApiController : ControllerBase
    {
        private readonly DashboardDbContext _context;

        /// <summary>
        /// Initializes a new instance of the <see cref="PublicSurveysApiController"/> class.
        /// </summary>
        public PublicSurveysApiController(DashboardDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Loads a published standalone survey by its slug.
        /// </summary>
        [HttpGet("{slug}")]
        public async Task<IActionResult> GetPublicSurvey(string slug)
        {
            var clean = (slug ?? string.Empty).Trim().ToLowerInvariant();
            var survey = await _context.BcpSurveyForms
                .Include(s => s.Fields.OrderBy(f => f.SortOrder))
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Slug == clean && s.IsPublished);

            if (survey == null)
                return NotFound(ApiResponse.FailureResponse("Survey not found or no longer accepting responses."));

            return Ok(ApiResponse<object>.SuccessResponse(survey, "Survey loaded."));
        }

        /// <summary>
        /// Submits a respondent's answers to a published standalone survey.
        /// </summary>
        [HttpPost("{slug}/submit")]
        public async Task<IActionResult> SubmitPublicSurvey(string slug, [FromBody] Dictionary<string, object?>? answers)
        {
            var clean = (slug ?? string.Empty).Trim().ToLowerInvariant();
            var survey = await _context.BcpSurveyForms
                .Include(s => s.Fields)
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Slug == clean && s.IsPublished);

            if (survey == null)
                return NotFound(ApiResponse.FailureResponse("Survey not found or no longer accepting responses."));

            if (!survey.AllowAnonymous && User.Identity?.IsAuthenticated != true)
                return Unauthorized(ApiResponse.FailureResponse("Please sign in to submit this survey."));

            var data = answers ?? new Dictionary<string, object?>();
            var missing = new List<string>();
            foreach (var field in survey.Fields.Where(f => f.IsRequired))
            {
                if (!data.TryGetValue(field.FieldKey, out var val) || val == null || string.IsNullOrWhiteSpace(val.ToString()))
                    missing.Add(field.Label);
            }

            if (missing.Count > 0)
                return BadRequest(ApiResponse.FailureResponse($"Please answer all required questions: {string.Join(", ", missing)}"));

            var submission = new BcpSurveySubmission
            {
                Id = Guid.CreateVersion7(),
                BcpSurveyFormId = survey.Id,
                DataJson = JsonSerializer.Serialize(data),
                RespondentUserId = User.Identity?.IsAuthenticated == true ? User.FindFirstValue(ClaimTypes.NameIdentifier) : null,
                Status = "New",
                SubmittedAtUtc = DateTime.UtcNow,
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString()
            };

            _context.BcpSurveySubmissions.Add(submission);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                submissionId = submission.Id,
                message = survey.SuccessMessage,
                showSuccessPage = survey.ShowSuccessPage,
                successPageTitle = survey.SuccessPageTitle ?? "Thank You for Your Response!",
                successPageButtonText = survey.SuccessPageButtonText ?? "Submit Another Response"
            }, survey.SuccessMessage));
        }
    }
}
