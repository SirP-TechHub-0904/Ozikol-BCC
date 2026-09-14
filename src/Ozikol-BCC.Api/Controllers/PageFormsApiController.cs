using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using System.Text.Json;

namespace Ozikol_BCC.Api.Controllers
{
    /// <summary>
    /// Administrative controller for Content CMS Studio to manage custom website forms,
    /// configure questions/fields (pills, dropdowns, inputs, checkboxes), and view incoming leads.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    [Tags("Content CMS - Manage Forms")]
    public class PageFormsApiController : ControllerBase
    {
        private readonly DashboardDbContext _context;
        private readonly ILogger<PageFormsApiController> _logger;

        public PageFormsApiController(DashboardDbContext context, ILogger<PageFormsApiController> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Retrieves all configured forms with field counts and total submission metrics.
        /// </summary>
        /// <returns>List of form summaries.</returns>
        [HttpGet]
        public async Task<IActionResult> GetAllForms()
        {
            var forms = await _context.PageForms
                .AsNoTracking()
                .OrderByDescending(f => f.CreatedAtUtc)
                .Select(f => new
                {
                    f.Id,
                    f.Title,
                    f.FormKey,
                    f.Description,
                    f.SubmitButtonText,
                    f.SuccessMessage,
                    f.NotificationEmail,
                    f.IsActive,
                    f.CreatedAtUtc,
                    f.UpdatedAtUtc,
                    FieldCount = f.Fields.Count,
                    TotalSubmissions = f.Submissions.Count,
                    NewSubmissions = f.Submissions.Count(s => s.Status == "New")
                })
                .ToListAsync();

            return Ok(ApiResponse<object>.SuccessResponse(forms, "Page forms retrieved successfully."));
        }

        /// <summary>
        /// Retrieves a single form by its unique Guid identifier, including all ordered fields.
        /// </summary>
        /// <param name="id">The unique form identifier.</param>
        /// <returns>Full form details and fields.</returns>
        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetFormById(Guid id)
        {
            var form = await _context.PageForms
                .Include(f => f.Fields.OrderBy(fl => fl.SortOrder))
                .AsNoTracking()
                .FirstOrDefaultAsync(f => f.Id == id);

            if (form == null)
            {
                return NotFound(ApiResponse.FailureResponse("Form not found."));
            }

            return Ok(ApiResponse<object>.SuccessResponse(form, "Form retrieved successfully."));
        }

        /// <summary>
        /// Retrieves a single form by its programmatic FormKey, including all ordered fields.
        /// </summary>
        /// <param name="formKey">The unique form key slug (e.g. "service-request", "contact-us").</param>
        /// <returns>Full form details and fields.</returns>
        [HttpGet("by-key/{formKey}")]
        public async Task<IActionResult> GetFormByKey(string formKey)
        {
            var cleanKey = formKey.Trim().ToLowerInvariant();
            var form = await _context.PageForms
                .Include(f => f.Fields.OrderBy(fl => fl.SortOrder))
                .AsNoTracking()
                .FirstOrDefaultAsync(f => f.FormKey == cleanKey);

            if (form == null)
            {
                return NotFound(ApiResponse.FailureResponse($"Form with key '{cleanKey}' was not found."));
            }

            return Ok(ApiResponse<object>.SuccessResponse(form, "Form retrieved successfully."));
        }

        /// <summary>
        /// Creates a new PageForm with its associated fields.
        /// </summary>
        /// <param name="dto">Form creation payload.</param>
        /// <returns>The newly created form.</returns>
        [HttpPost]
        public async Task<IActionResult> CreateForm([FromBody] PageFormUpsertDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Title))
            {
                return BadRequest(ApiResponse.FailureResponse("Form title is required."));
            }

            var cleanKey = (string.IsNullOrWhiteSpace(dto.FormKey)
                ? dto.Title.ToLowerInvariant().Replace(" ", "-").Replace("&", "and")
                : dto.FormKey.Trim().ToLowerInvariant());

            // Sanitize key
            cleanKey = System.Text.RegularExpressions.Regex.Replace(cleanKey, @"[^a-z0-9\-]", "");

            if (await _context.PageForms.AnyAsync(f => f.FormKey == cleanKey))
            {
                return Conflict(ApiResponse.FailureResponse($"A form with key '{cleanKey}' already exists."));
            }

            var form = new PageForm
            {
                Id = Guid.NewGuid(),
                Title = dto.Title.Trim(),
                FormKey = cleanKey,
                Description = dto.Description?.Trim(),
                SubmitButtonText = string.IsNullOrWhiteSpace(dto.SubmitButtonText) ? "Submit" : dto.SubmitButtonText.Trim(),
                SuccessMessage = string.IsNullOrWhiteSpace(dto.SuccessMessage)
                    ? "Thank you! Your submission has been received."
                    : dto.SuccessMessage.Trim(),
                NotificationEmail = dto.NotificationEmail?.Trim(),
                IsActive = dto.IsActive,
                CreatedAtUtc = DateTime.UtcNow
            };

            if (dto.Fields != null && dto.Fields.Count > 0)
            {
                int order = 1;
                foreach (var fieldDto in dto.Fields)
                {
                    form.Fields.Add(new PageFormField
                    {
                        Id = Guid.NewGuid(),
                        PageFormId = form.Id,
                        FieldKey = string.IsNullOrWhiteSpace(fieldDto.FieldKey)
                            ? $"field_{order}"
                            : fieldDto.FieldKey.Trim().ToLowerInvariant(),
                        Label = fieldDto.Label?.Trim() ?? $"Question {order}",
                        Placeholder = fieldDto.Placeholder?.Trim(),
                        FieldType = string.IsNullOrWhiteSpace(fieldDto.FieldType) ? "text" : fieldDto.FieldType.Trim().ToLowerInvariant(),
                        OptionsJson = fieldDto.OptionsJson,
                        IsRequired = fieldDto.IsRequired,
                        SortOrder = fieldDto.SortOrder > 0 ? fieldDto.SortOrder : order,
                        GridWidth = string.IsNullOrWhiteSpace(fieldDto.GridWidth) ? "col-md-12" : fieldDto.GridWidth.Trim(),
                        HelpText = fieldDto.HelpText?.Trim()
                    });
                    order++;
                }
            }

            _context.PageForms.Add(form);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetFormById), new { id = form.Id }, ApiResponse<object>.SuccessResponse(form, "Form created successfully."));
        }

        /// <summary>
        /// Updates an existing PageForm and reconciles its collection of interactive fields.
        /// </summary>
        /// <param name="id">The unique form identifier.</param>
        /// <param name="dto">Form update payload.</param>
        /// <returns>Updated form entity.</returns>
        [HttpPut("{id:guid}")]
        public async Task<IActionResult> UpdateForm(Guid id, [FromBody] PageFormUpsertDto dto)
        {
            var form = await _context.PageForms
                .Include(f => f.Fields)
                .FirstOrDefaultAsync(f => f.Id == id);

            if (form == null)
            {
                return NotFound(ApiResponse.FailureResponse("Form not found."));
            }

            form.Title = dto.Title.Trim();
            form.Description = dto.Description?.Trim();
            form.SubmitButtonText = string.IsNullOrWhiteSpace(dto.SubmitButtonText) ? "Submit" : dto.SubmitButtonText.Trim();
            form.SuccessMessage = string.IsNullOrWhiteSpace(dto.SuccessMessage)
                ? "Thank you! Your submission has been received."
                : dto.SuccessMessage.Trim();
            form.NotificationEmail = dto.NotificationEmail?.Trim();
            form.IsActive = dto.IsActive;
            form.UpdatedAtUtc = DateTime.UtcNow;

            // Reconcile Fields: remove deleted, update existing, add new
            var existingFields = form.Fields.ToList();
            var incomingFields = dto.Fields ?? new List<PageFormFieldDto>();

            var incomingIds = incomingFields.Where(f => f.Id.HasValue).Select(f => f.Id!.Value).ToHashSet();
            var toRemove = existingFields.Where(f => !incomingIds.Contains(f.Id)).ToList();
            _context.PageFormFields.RemoveRange(toRemove);

            int order = 1;
            foreach (var fieldDto in incomingFields)
            {
                var targetOrder = fieldDto.SortOrder > 0 ? fieldDto.SortOrder : order;

                if (fieldDto.Id.HasValue && fieldDto.Id.Value != Guid.Empty)
                {
                    var existing = existingFields.FirstOrDefault(f => f.Id == fieldDto.Id.Value);
                    if (existing != null)
                    {
                        existing.FieldKey = string.IsNullOrWhiteSpace(fieldDto.FieldKey) ? existing.FieldKey : fieldDto.FieldKey.Trim().ToLowerInvariant();
                        existing.Label = fieldDto.Label?.Trim() ?? existing.Label;
                        existing.Placeholder = fieldDto.Placeholder?.Trim();
                        existing.FieldType = string.IsNullOrWhiteSpace(fieldDto.FieldType) ? "text" : fieldDto.FieldType.Trim().ToLowerInvariant();
                        existing.OptionsJson = fieldDto.OptionsJson;
                        existing.IsRequired = fieldDto.IsRequired;
                        existing.SortOrder = targetOrder;
                        existing.GridWidth = string.IsNullOrWhiteSpace(fieldDto.GridWidth) ? "col-md-12" : fieldDto.GridWidth.Trim();
                        existing.HelpText = fieldDto.HelpText?.Trim();
                    }
                }
                else
                {
                    form.Fields.Add(new PageFormField
                    {
                        Id = Guid.NewGuid(),
                        PageFormId = form.Id,
                        FieldKey = string.IsNullOrWhiteSpace(fieldDto.FieldKey) ? $"field_{order}" : fieldDto.FieldKey.Trim().ToLowerInvariant(),
                        Label = fieldDto.Label?.Trim() ?? $"Question {order}",
                        Placeholder = fieldDto.Placeholder?.Trim(),
                        FieldType = string.IsNullOrWhiteSpace(fieldDto.FieldType) ? "text" : fieldDto.FieldType.Trim().ToLowerInvariant(),
                        OptionsJson = fieldDto.OptionsJson,
                        IsRequired = fieldDto.IsRequired,
                        SortOrder = targetOrder,
                        GridWidth = string.IsNullOrWhiteSpace(fieldDto.GridWidth) ? "col-md-12" : fieldDto.GridWidth.Trim(),
                        HelpText = fieldDto.HelpText?.Trim()
                    });
                }
                order++;
            }

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(form, "Form updated successfully."));
        }

        /// <summary>
        /// Deletes a PageForm and all associated fields and submissions.
        /// </summary>
        /// <param name="id">The unique form identifier.</param>
        /// <returns>Success response.</returns>
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> DeleteForm(Guid id)
        {
            var form = await _context.PageForms.FindAsync(id);
            if (form == null)
            {
                return NotFound(ApiResponse.FailureResponse("Form not found."));
            }

            _context.PageForms.Remove(form);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(null, "Form and its submissions deleted successfully."));
        }

        /// <summary>
        /// Retrieves paginated submissions/leads for a specific form, filtered by status or search term.
        /// </summary>
        /// <param name="id">The unique form identifier.</param>
        /// <param name="status">Optional status filter ("New", "Contacted", "Closed").</param>
        /// <param name="search">Optional text search term across submitted data.</param>
        /// <param name="page">Page index (1-based).</param>
        /// <param name="pageSize">Items per page.</param>
        /// <returns>Paginated submissions list.</returns>
        [HttpGet("{id:guid}/submissions")]
        public async Task<IActionResult> GetFormSubmissions(
            Guid id,
            [FromQuery] string? status = null,
            [FromQuery] string? search = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var form = await _context.PageForms
                .Include(f => f.Fields.OrderBy(fl => fl.SortOrder))
                .AsNoTracking()
                .FirstOrDefaultAsync(f => f.Id == id);

            if (form == null)
            {
                return NotFound(ApiResponse.FailureResponse("Form not found."));
            }

            var query = _context.PageFormSubmissions
                .AsNoTracking()
                .Where(s => s.PageFormId == id);

            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(s => s.Status == status.Trim());
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(s => s.DataJson.Contains(term) || (s.AdminNotes != null && s.AdminNotes.Contains(term)));
            }

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(s => s.SubmittedAtUtc)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                Form = new { form.Id, form.Title, form.FormKey, form.Fields },
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                Items = items
            }, "Submissions retrieved successfully."));
        }

        /// <summary>
        /// Updates the status or administrative follow-up notes for an individual submission.
        /// </summary>
        /// <param name="submissionId">The unique submission identifier.</param>
        /// <param name="dto">Update status payload.</param>
        /// <returns>Updated submission.</returns>
        [HttpPut("submissions/{submissionId:guid}/status")]
        public async Task<IActionResult> UpdateSubmissionStatus(Guid submissionId, [FromBody] SubmissionStatusUpdateDto dto)
        {
            var submission = await _context.PageFormSubmissions.FindAsync(submissionId);
            if (submission == null)
            {
                return NotFound(ApiResponse.FailureResponse("Submission not found."));
            }

            if (!string.IsNullOrWhiteSpace(dto.Status))
            {
                submission.Status = dto.Status.Trim();
            }

            if (dto.AdminNotes != null)
            {
                submission.AdminNotes = dto.AdminNotes.Trim();
            }

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(submission, "Submission updated successfully."));
        }

        /// <summary>
        /// Deletes an individual submission entry.
        /// </summary>
        /// <param name="submissionId">The unique submission identifier.</param>
        /// <returns>Success response.</returns>
        [HttpDelete("submissions/{submissionId:guid}")]
        public async Task<IActionResult> DeleteSubmission(Guid submissionId)
        {
            var submission = await _context.PageFormSubmissions.FindAsync(submissionId);
            if (submission == null)
            {
                return NotFound(ApiResponse.FailureResponse("Submission not found."));
            }

            _context.PageFormSubmissions.Remove(submission);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(null, "Submission deleted successfully."));
        }
    }

    /// <summary>
    /// DTO for creating or updating a PageForm.
    /// </summary>
    public class PageFormUpsertDto
    {
        public string Title { get; set; } = string.Empty;
        public string? FormKey { get; set; }
        public string? Description { get; set; }
        public string? SubmitButtonText { get; set; }
        public string? SuccessMessage { get; set; }
        public string? NotificationEmail { get; set; }
        public bool IsActive { get; set; } = true;
        public List<PageFormFieldDto>? Fields { get; set; }
    }

    /// <summary>
    /// DTO for creating or updating a PageFormField.
    /// </summary>
    public class PageFormFieldDto
    {
        public Guid? Id { get; set; }
        public string FieldKey { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public string? Placeholder { get; set; }
        public string FieldType { get; set; } = "text";
        public string? OptionsJson { get; set; }
        public bool IsRequired { get; set; }
        public int SortOrder { get; set; }
        public string? GridWidth { get; set; }
        public string? HelpText { get; set; }
    }

    /// <summary>
    /// DTO for updating submission status or admin notes.
    /// </summary>
    public class SubmissionStatusUpdateDto
    {
        public string? Status { get; set; }
        public string? AdminNotes { get; set; }
    }
}
