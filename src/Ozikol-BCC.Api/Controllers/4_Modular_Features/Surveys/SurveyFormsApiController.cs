using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol_BCC.Api.Authorization;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Domain.Constants;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;

namespace Ozikol_BCC.Api.Controllers
{
    /// <summary>
    /// Administrative controller for the independent Survey &amp; Form Builder (<c>bcp-form-builder</c>) modular feature.
    /// Completely separate from Website CMS <c>PageForms</c>.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Policy = AuthPolicies.FormStudio)]
    [RequireFeature("bcp-form-builder")]
    [Tags("Modular Feature - Survey & Form Builder")]
    public class SurveyFormsApiController : ControllerBase
    {
        private readonly DashboardDbContext _context;
        private readonly ILogger<SurveyFormsApiController> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="SurveyFormsApiController"/> class.
        /// </summary>
        public SurveyFormsApiController(DashboardDbContext context, ILogger<SurveyFormsApiController> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Lists all standalone surveys with field and submission counts.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetSurveys()
        {
            var surveys = await _context.BcpSurveyForms
                .AsNoTracking()
                .OrderByDescending(s => s.CreatedAtUtc)
                .Select(s => new
                {
                    s.Id,
                    s.Title,
                    s.Slug,
                    s.Description,
                    s.IsPublished,
                    s.AllowAnonymous,
                    s.ShowSuccessPage,
                    s.SuccessPageTitle,
                    s.SuccessMessage,
                    s.SuccessPageButtonText,
                    s.CreatedAtUtc,
                    s.UpdatedAtUtc,
                    FieldCount = s.Fields.Count,
                    SubmissionCount = s.Submissions.Count
                })
                .ToListAsync();

            return Ok(ApiResponse<object>.SuccessResponse(surveys, "Surveys retrieved successfully."));
        }

        /// <summary>
        /// Retrieves a single survey and its ordered fields by ID.
        /// </summary>
        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetSurveyById(Guid id)
        {
            var survey = await _context.BcpSurveyForms
                .Include(s => s.Fields.OrderBy(f => f.SortOrder))
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == id);

            if (survey == null)
                return NotFound(ApiResponse.FailureResponse("Survey not found."));

            return Ok(ApiResponse<object>.SuccessResponse(survey, "Survey retrieved successfully."));
        }

        /// <summary>
        /// Creates a new standalone survey with its ordered questions.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CreateSurvey([FromBody] SurveyFormUpsertDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Title))
                return BadRequest(ApiResponse.FailureResponse("Survey title is required."));

            var rawSlug = string.IsNullOrWhiteSpace(dto.Slug)
                ? dto.Title.Trim().ToLowerInvariant().Replace(" ", "-")
                : dto.Slug.Trim().ToLowerInvariant();
            var cleanSlug = Regex.Replace(rawSlug, @"[^a-z0-9\-]", "").Trim('-');
            if (string.IsNullOrWhiteSpace(cleanSlug))
                cleanSlug = $"survey-{Guid.NewGuid().ToString("N")[..6]}";

            if (await _context.BcpSurveyForms.AnyAsync(s => s.Slug == cleanSlug))
                cleanSlug = $"{cleanSlug}-{Guid.NewGuid().ToString("N")[..4]}";

            var survey = new BcpSurveyForm
            {
                Id = Guid.CreateVersion7(),
                Title = dto.Title.Trim(),
                Slug = cleanSlug,
                Description = dto.Description?.Trim(),
                IsPublished = dto.IsPublished,
                AllowAnonymous = dto.AllowAnonymous,
                ShowSuccessPage = dto.ShowSuccessPage,
                SuccessPageTitle = string.IsNullOrWhiteSpace(dto.SuccessPageTitle) ? "Thank You for Your Response!" : dto.SuccessPageTitle.Trim(),
                SuccessMessage = string.IsNullOrWhiteSpace(dto.SuccessMessage) ? "Your survey response has been recorded." : dto.SuccessMessage.Trim(),
                SuccessPageButtonText = string.IsNullOrWhiteSpace(dto.SuccessPageButtonText) ? "Submit Another Response" : dto.SuccessPageButtonText.Trim(),
                CreatedAtUtc = DateTime.UtcNow
            };

            if (dto.Fields != null)
            {
                int order = 1;
                foreach (var f in dto.Fields)
                {
                    survey.Fields.Add(new BcpSurveyFormField
                    {
                        Id = Guid.CreateVersion7(),
                        BcpSurveyFormId = survey.Id,
                        FieldKey = SanitizeFieldKey(f.FieldKey, f.Label, order),
                        Label = f.Label?.Trim() ?? $"Question {order}",
                        Placeholder = f.Placeholder?.Trim(),
                        FieldType = string.IsNullOrWhiteSpace(f.FieldType) ? "text" : f.FieldType.Trim().ToLowerInvariant(),
                        OptionsJson = f.OptionsJson,
                        IsRequired = f.IsRequired,
                        SortOrder = f.SortOrder > 0 ? f.SortOrder : order
                    });
                    order++;
                }
            }

            _context.BcpSurveyForms.Add(survey);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(survey, "Survey created successfully."));
        }

        /// <summary>
        /// Updates an existing standalone survey and reconciles its questions.
        /// </summary>
        [HttpPut("{id:guid}")]
        public async Task<IActionResult> UpdateSurvey(Guid id, [FromBody] SurveyFormUpsertDto dto)
        {
            var survey = await _context.BcpSurveyForms
                .Include(s => s.Fields)
                .FirstOrDefaultAsync(s => s.Id == id);

            if (survey == null)
                return NotFound(ApiResponse.FailureResponse("Survey not found."));

            survey.Title = dto.Title.Trim();
            survey.Description = dto.Description?.Trim();
            survey.IsPublished = dto.IsPublished;
            survey.AllowAnonymous = dto.AllowAnonymous;
            survey.ShowSuccessPage = dto.ShowSuccessPage;
            survey.SuccessPageTitle = string.IsNullOrWhiteSpace(dto.SuccessPageTitle) ? "Thank You for Your Response!" : dto.SuccessPageTitle.Trim();
            survey.SuccessMessage = string.IsNullOrWhiteSpace(dto.SuccessMessage) ? "Your survey response has been recorded." : dto.SuccessMessage.Trim();
            survey.SuccessPageButtonText = string.IsNullOrWhiteSpace(dto.SuccessPageButtonText) ? "Submit Another Response" : dto.SuccessPageButtonText.Trim();
            survey.UpdatedAtUtc = DateTime.UtcNow;

            var existingFields = survey.Fields.ToList();
            var incoming = dto.Fields ?? new List<SurveyFormFieldDto>();
            var incomingIds = incoming.Where(f => f.Id.HasValue && f.Id.Value != Guid.Empty).Select(f => f.Id!.Value).ToHashSet();

            var toRemove = existingFields.Where(f => !incomingIds.Contains(f.Id)).ToList();
            if (toRemove.Count > 0)
                _context.BcpSurveyFormFields.RemoveRange(toRemove);

            int order = 1;
            foreach (var f in incoming)
            {
                var existing = f.Id.HasValue && f.Id.Value != Guid.Empty
                    ? existingFields.FirstOrDefault(x => x.Id == f.Id.Value)
                    : null;

                if (existing != null)
                {
                    existing.FieldKey = SanitizeFieldKey(f.FieldKey, f.Label, order);
                    existing.Label = f.Label?.Trim() ?? existing.Label;
                    existing.Placeholder = f.Placeholder?.Trim();
                    existing.FieldType = string.IsNullOrWhiteSpace(f.FieldType) ? "text" : f.FieldType.Trim().ToLowerInvariant();
                    existing.OptionsJson = f.OptionsJson;
                    existing.IsRequired = f.IsRequired;
                    existing.SortOrder = f.SortOrder > 0 ? f.SortOrder : order;
                }
                else
                {
                    _context.BcpSurveyFormFields.Add(new BcpSurveyFormField
                    {
                        Id = Guid.CreateVersion7(),
                        BcpSurveyFormId = survey.Id,
                        FieldKey = SanitizeFieldKey(f.FieldKey, f.Label, order),
                        Label = f.Label?.Trim() ?? $"Question {order}",
                        Placeholder = f.Placeholder?.Trim(),
                        FieldType = string.IsNullOrWhiteSpace(f.FieldType) ? "text" : f.FieldType.Trim().ToLowerInvariant(),
                        OptionsJson = f.OptionsJson,
                        IsRequired = f.IsRequired,
                        SortOrder = f.SortOrder > 0 ? f.SortOrder : order
                    });
                }
                order++;
            }

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(survey, "Survey updated successfully."));
        }

        /// <summary>
        /// Deletes a standalone survey and its responses.
        /// </summary>
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> DeleteSurvey(Guid id)
        {
            var survey = await _context.BcpSurveyForms.FirstOrDefaultAsync(s => s.Id == id);
            if (survey == null)
                return NotFound(ApiResponse.FailureResponse("Survey not found."));

            _context.BcpSurveyForms.Remove(survey);
            await _context.SaveChangesAsync();
            return Ok(ApiResponse.SuccessResponse("Survey deleted successfully."));
        }

        /// <summary>
        /// Retrieves paginated submissions for a standalone survey.
        /// </summary>
        [HttpGet("{id:guid}/submissions")]
        public async Task<IActionResult> GetSubmissions(Guid id, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            var query = _context.BcpSurveySubmissions
                .AsNoTracking()
                .Where(s => s.BcpSurveyFormId == id)
                .OrderByDescending(s => s.SubmittedAtUtc);

            var totalCount = await query.CountAsync();
            var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

            return Ok(ApiResponse<object>.SuccessResponse(new { items, totalCount, page, pageSize }, "Survey responses retrieved."));
        }

        /// <summary>
        /// Deletes a single survey response.
        /// </summary>
        [HttpDelete("submissions/{submissionId:guid}")]
        public async Task<IActionResult> DeleteSubmission(Guid submissionId)
        {
            var sub = await _context.BcpSurveySubmissions.FirstOrDefaultAsync(s => s.Id == submissionId);
            if (sub == null)
                return NotFound(ApiResponse.FailureResponse("Response not found."));

            _context.BcpSurveySubmissions.Remove(sub);
            await _context.SaveChangesAsync();
            return Ok(ApiResponse.SuccessResponse("Response deleted."));
        }

        private static string SanitizeFieldKey(string? rawKey, string? label, int order)
        {
            var source = !string.IsNullOrWhiteSpace(rawKey) ? rawKey : (label ?? $"q_{order}");
            var snake = Regex.Replace(source.Trim().ToLowerInvariant(), @"[^a-z0-9]+", "_").Trim('_');
            return string.IsNullOrWhiteSpace(snake) ? $"q_{order}" : snake;
        }
    }

    public class SurveyFormUpsertDto
    {
        public string Title { get; set; } = string.Empty;
        public string? Slug { get; set; }
        public string? Description { get; set; }
        public bool IsPublished { get; set; } = true;
        public bool AllowAnonymous { get; set; } = true;
        public bool ShowSuccessPage { get; set; } = true;
        public string? SuccessPageTitle { get; set; }
        public string? SuccessMessage { get; set; }
        public string? SuccessPageButtonText { get; set; }
        public List<SurveyFormFieldDto>? Fields { get; set; }
    }

    public class SurveyFormFieldDto
    {
        public Guid? Id { get; set; }
        public string FieldKey { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public string? Placeholder { get; set; }
        public string FieldType { get; set; } = "text";
        public string? OptionsJson { get; set; }
        public bool IsRequired { get; set; }
        public int SortOrder { get; set; }
    }
}
