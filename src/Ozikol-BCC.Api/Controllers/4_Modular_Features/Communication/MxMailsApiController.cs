using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol_BCC.Api.Authorization;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Domain.Constants;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.EmailServices.Postmark.Interfaces;
using Ozikol_BCC.Persistence.EF.SQL;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Api.Controllers
{
    /// <summary>
    /// Administrator controller for inspecting, filtering, previewing, and retrying
    /// transactional email dispatch logs from the outbound BcpEmailQueue pool.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Policy = AuthPolicies.CommunicationStudio)]
    [RequireFeature("bcp-mass-communication")]
    public class MxMailsApiController : ControllerBase
    {
        private readonly DashboardDbContext _dbContext;
        private readonly IPostmarkEmailService? _emailService;
        private readonly ILogger<MxMailsApiController> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="MxMailsApiController"/> class.
        /// </summary>
        /// <param name="dbContext">The tenant dashboard database context.</param>
        /// <param name="logger">Logger service.</param>
        /// <param name="emailService">Optional Postmark email suite for immediate retry/dispatch.</param>
        public MxMailsApiController(
            DashboardDbContext dbContext,
            ILogger<MxMailsApiController> logger,
            IPostmarkEmailService? emailService = null)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _emailService = emailService;
        }

        /// <summary>
        /// Retrieves paginated email dispatch queue logs with aggregate KPI counts.
        /// </summary>
        /// <param name="search">Optional query string matching recipient email, name, or subject.</param>
        /// <param name="status">Optional status filter: 'All', 'Queued', 'Sent', 'Failed', 'Processing'.</param>
        /// <param name="page">Current 1-based page number.</param>
        /// <param name="pageSize">Number of records per page (default 25, max 100).</param>
        /// <returns>Paginated email log summaries along with queue health statistics.</returns>
        [HttpGet("logs")]
        public async Task<IActionResult> GetEmailLogs(
            [FromQuery] string? search = null,
            [FromQuery] string? status = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 25)
        {
            try
            {
                if (page < 1) page = 1;
                if (pageSize < 5) pageSize = 5;
                if (pageSize > 100) pageSize = 100;

                // 1. Calculate overall queue metrics for live KPI chips
                var totalEmails = await _dbContext.BcpEmailQueue.CountAsync();
                var queuedCount = await _dbContext.BcpEmailQueue.CountAsync(q => q.Status == BcpQueueStatus.Queued);
                var sentCount = await _dbContext.BcpEmailQueue.CountAsync(q => q.Status == BcpQueueStatus.Sent);
                var failedCount = await _dbContext.BcpEmailQueue.CountAsync(q => q.Status == BcpQueueStatus.Failed);
                var processingCount = await _dbContext.BcpEmailQueue.CountAsync(q => q.Status == BcpQueueStatus.Processing);

                // 2. Build filtered query
                var query = _dbContext.BcpEmailQueue.AsNoTracking().AsQueryable();

                if (!string.IsNullOrWhiteSpace(search))
                {
                    var cleanSearch = search.Trim().ToLower();
                    query = query.Where(q =>
                        q.RecipientEmail.ToLower().Contains(cleanSearch) ||
                        (q.RecipientName != null && q.RecipientName.ToLower().Contains(cleanSearch)) ||
                        q.Subject.ToLower().Contains(cleanSearch));
                }

                if (!string.IsNullOrWhiteSpace(status) && !status.Equals("All", StringComparison.OrdinalIgnoreCase))
                {
                    if (Enum.TryParse<BcpQueueStatus>(status, true, out var parsedStatus))
                    {
                        query = query.Where(q => q.Status == parsedStatus);
                    }
                }

                var filteredTotal = await query.CountAsync();

                var items = await query
                    .OrderByDescending(q => q.CreatedAt)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(q => new
                    {
                        q.Id,
                        q.RecipientEmail,
                        q.RecipientName,
                        q.Subject,
                        Category = q.Category.ToString(),
                        Priority = q.Priority.ToString(),
                        Status = q.Status.ToString(),
                        q.Retries,
                        q.MaxRetries,
                        q.LastError,
                        q.ScheduledAt,
                        q.SentAt,
                        q.CreatedAt,
                        HasHtmlBody = !string.IsNullOrWhiteSpace(q.HtmlBody),
                        HasPlainBody = !string.IsNullOrWhiteSpace(q.PlainBody)
                    })
                    .ToListAsync();

                return Ok(ApiResponse<object>.SuccessResponse(new
                {
                    items,
                    totalCount = filteredTotal,
                    page,
                    pageSize,
                    totalPages = (int)Math.Ceiling((double)filteredTotal / pageSize),
                    stats = new
                    {
                        totalEmails,
                        queuedCount,
                        sentCount,
                        failedCount,
                        processingCount
                    }
                }, "Email logs retrieved successfully."));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[MxMailsApiController] Error querying email logs: {Message}", ex.Message);
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to fetch email logs: {ex.Message}"));
            }
        }

        /// <summary>
        /// Retrieves the complete content and metadata of a single email queue record, including HTML and Plain text bodies.
        /// </summary>
        /// <param name="id">The unique GUID identifier of the email record.</param>
        /// <returns>Detailed email content record.</returns>
        [HttpGet("logs/{id:guid}")]
        public async Task<IActionResult> GetEmailDetails(Guid id)
        {
            try
            {
                var email = await _dbContext.BcpEmailQueue.AsNoTracking().FirstOrDefaultAsync(q => q.Id == id);
                if (email == null)
                {
                    return NotFound(ApiResponse<object>.FailureResponse("Email log record not found."));
                }

                return Ok(ApiResponse<object>.SuccessResponse(new
                {
                    email.Id,
                    email.RecipientEmail,
                    email.RecipientName,
                    email.Subject,
                    email.HtmlBody,
                    email.PlainBody,
                    Category = email.Category.ToString(),
                    Priority = email.Priority.ToString(),
                    Status = email.Status.ToString(),
                    email.Retries,
                    email.MaxRetries,
                    email.LastError,
                    email.ScheduledAt,
                    email.SentAt,
                    email.CreatedAt
                }, "Email details retrieved."));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[MxMailsApiController] Error fetching email details for {Id}: {Message}", id, ex.Message);
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to load email details: {ex.Message}"));
            }
        }

        /// <summary>
        /// Manually retries sending a queued or failed email. Dispatches immediately via Postmark if available, or resets status to Queued.
        /// </summary>
        /// <param name="id">The unique GUID identifier of the email record.</param>
        /// <returns>Result of the retry attempt.</returns>
        [HttpPost("logs/{id:guid}/retry")]
        public async Task<IActionResult> RetryEmail(Guid id)
        {
            try
            {
                var email = await _dbContext.BcpEmailQueue.FirstOrDefaultAsync(q => q.Id == id);
                if (email == null)
                {
                    return NotFound(ApiResponse<object>.FailureResponse("Email log record not found."));
                }

                // If Postmark service is registered, dispatch directly for instant delivery
                if (_emailService != null)
                {
                    try
                    {
                        var bodyToSend = !string.IsNullOrWhiteSpace(email.HtmlBody) ? email.HtmlBody : email.PlainBody ?? string.Empty;
                        await _emailService.SendHtmlEmailAsync(
                            to: email.RecipientEmail,
                            subject: email.Subject,
                            htmlBody: bodyToSend,
                            tag: $"manual-retry-{email.Category.ToString().ToLowerInvariant()}");

                        email.Status = BcpQueueStatus.Sent;
                        email.SentAt = DateTime.UtcNow;
                        email.LastError = null;
                        await _dbContext.SaveChangesAsync();

                        _logger.LogInformation("[MxMailsApiController] Manually retried and successfully delivered email {Id} to {Recipient}", id, email.RecipientEmail);
                        return Ok(ApiResponse<object>.SuccessResponse(new { email.Id, Status = "Sent", email.SentAt }, "Email dispatched successfully via Postmark."));
                    }
                    catch (Exception ex)
                    {
                        email.Retries++;
                        email.Status = BcpQueueStatus.Failed;
                        email.LastError = $"Manual retry failed: {ex.Message}";
                        await _dbContext.SaveChangesAsync();

                        _logger.LogWarning(ex, "[MxMailsApiController] Manual retry failed for {Id}: {Msg}", id, ex.Message);
                        return BadRequest(ApiResponse<object>.FailureResponse($"Delivery failed: {ex.Message}"));
                    }
                }
                else
                {
                    // Reset status to Queued for background worker pickup
                    email.Status = BcpQueueStatus.Queued;
                    email.Retries = 0;
                    email.LastError = null;
                    await _dbContext.SaveChangesAsync();

                    return Ok(ApiResponse<object>.SuccessResponse(new { email.Id, Status = "Queued" }, "Email re-queued for background worker delivery."));
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[MxMailsApiController] Error retrying email {Id}: {Message}", id, ex.Message);
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to retry email: {ex.Message}"));
            }
        }

        /// <summary>
        /// Sends a live test email directly to verify outbound mail deliverability and records it in BcpEmailQueue.
        /// </summary>
        /// <param name="request">Recipient email address and optional custom subject/body.</param>
        /// <returns>Delivery status report.</returns>
        [HttpPost("send-test")]
        public async Task<IActionResult> SendTestEmail([FromBody] TestEmailRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.RecipientEmail))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Recipient email address is required."));
            }

            var subject = !string.IsNullOrWhiteSpace(request.Subject)
                ? request.Subject.Trim()
                : "Workspace Outbound Deliverability Test";

            var htmlBody = !string.IsNullOrWhiteSpace(request.HtmlBody)
                ? request.HtmlBody
                : $@"<div style='font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif; padding:32px; background:#f8fafc; color:#0f172a;'>
                    <div style='max-width:560px; margin:0 auto; background:#ffffff; border-radius:16px; border:1px solid #e2e8f0; padding:32px; box-shadow:0 4px 20px rgba(0,0,0,0.04);'>
                        <div style='display:inline-block; padding:6px 12px; background:#eff6ff; color:#0050e5; font-weight:700; font-size:12px; border-radius:9999px; margin-bottom:16px;'>SYSTEM DIAGNOSTIC TEST</div>
                        <h2 style='margin:0 0 12px; font-size:22px; font-weight:800; color:#0f172a;'>Email Deliverability Verified</h2>
                        <p style='margin:0 0 16px; font-size:14px; line-height:1.6; color:#475569;'>This is a live diagnostic verification email dispatched from the <strong>Business Command Center</strong> administration portal.</p>
                        <div style='background:#f1f5f9; border-radius:10px; padding:14px; font-size:13px; font-family:monospace; margin-bottom:20px;'>
                            <div><strong>Recipient:</strong> {request.RecipientEmail}</div>
                            <div><strong>Dispatched At:</strong> {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC</div>
                            <div><strong>Provider:</strong> Postmark Transactional Engine</div>
                        </div>
                        <div style='font-size:12px; color:#94a3b8; border-top:1px solid #f1f5f9; padding-top:16px;'>Workspace Email Subsystem &bull; Diagnostic Telemetry</div>
                    </div>
                </div>";

            var queueRecord = new BcpEmailQueue
            {
                RecipientEmail = request.RecipientEmail.Trim(),
                RecipientName = request.RecipientName?.Trim() ?? "Diagnostic Recipient",
                Subject = subject,
                HtmlBody = htmlBody,
                Category = BcpMessageCategory.Security,
                Priority = BcpMessagePriority.High,
                Status = BcpQueueStatus.Processing,
                CreatedAt = DateTime.UtcNow
            };

            _dbContext.BcpEmailQueue.Add(queueRecord);
            await _dbContext.SaveChangesAsync();

            if (_emailService != null)
            {
                try
                {
                    await _emailService.SendHtmlEmailAsync(
                        to: queueRecord.RecipientEmail,
                        subject: subject,
                        htmlBody: htmlBody,
                        tag: "diagnostic-test-email");

                    queueRecord.Status = BcpQueueStatus.Sent;
                    queueRecord.SentAt = DateTime.UtcNow;
                    await _dbContext.SaveChangesAsync();

                    return Ok(ApiResponse<object>.SuccessResponse(new
                    {
                        queueRecord.Id,
                        queueRecord.RecipientEmail,
                        Status = "Sent",
                        queueRecord.SentAt
                    }, "Diagnostic email dispatched and delivered successfully via Postmark."));
                }
                catch (Exception ex)
                {
                    queueRecord.Status = BcpQueueStatus.Failed;
                    queueRecord.LastError = ex.Message;
                    await _dbContext.SaveChangesAsync();

                    return BadRequest(ApiResponse<object>.FailureResponse($"Postmark dispatch error: {ex.Message}"));
                }
            }
            else
            {
                queueRecord.Status = BcpQueueStatus.Queued;
                await _dbContext.SaveChangesAsync();

                return Ok(ApiResponse<object>.SuccessResponse(new
                {
                    queueRecord.Id,
                    queueRecord.RecipientEmail,
                    Status = "Queued"
                }, "Email queued. Background worker will process delivery."));
            }
        }

        /// <summary>
        /// Permanently deletes an email log record from the database.
        /// </summary>
        /// <param name="id">The unique GUID identifier of the record.</param>
        /// <returns>Confirmation of deletion.</returns>
        [HttpDelete("logs/{id:guid}")]
        public async Task<IActionResult> DeleteEmailLog(Guid id)
        {
            try
            {
                var record = await _dbContext.BcpEmailQueue.FirstOrDefaultAsync(q => q.Id == id);
                if (record == null)
                {
                    return NotFound(ApiResponse<object>.FailureResponse("Email record not found."));
                }

                _dbContext.BcpEmailQueue.Remove(record);
                await _dbContext.SaveChangesAsync();

                return Ok(ApiResponse<object>.SuccessResponse(new { id }, "Email record deleted successfully."));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[MxMailsApiController] Error deleting email log {Id}: {Message}", id, ex.Message);
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to delete email log: {ex.Message}"));
            }
        }
    }

    /// <summary>
    /// Payload request for triggering a live deliverability test email.
    /// </summary>
    public class TestEmailRequest
    {
        /// <summary>
        /// Destination recipient email address.
        /// </summary>
        public string RecipientEmail { get; set; } = string.Empty;

        /// <summary>
        /// Optional friendly recipient name.
        /// </summary>
        public string? RecipientName { get; set; }

        /// <summary>
        /// Optional subject line.
        /// </summary>
        public string? Subject { get; set; }

        /// <summary>
        /// Optional custom HTML body.
        /// </summary>
        public string? HtmlBody { get; set; }
    }
}
