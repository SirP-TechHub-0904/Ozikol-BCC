using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Api.Controllers
{
    /// <summary>
    /// Administrator controller for inspecting, filtering, previewing, and managing
    /// outbound transactional SMS dispatch logs from the BcpSmsQueue pool.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class MxSmsApiController : ControllerBase
    {
        private readonly DashboardDbContext _dbContext;
        private readonly ILogger<MxSmsApiController> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="MxSmsApiController"/> class.
        /// </summary>
        /// <param name="dbContext">The tenant dashboard database context.</param>
        /// <param name="logger">Logger service.</param>
        public MxSmsApiController(
            DashboardDbContext dbContext,
            ILogger<MxSmsApiController> logger)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Retrieves paginated SMS dispatch queue logs with live aggregate KPI counts.
        /// </summary>
        /// <param name="search">Optional query string matching recipient phone, message text, or user name.</param>
        /// <param name="status">Optional status filter: 'All', 'Queued', 'Sent', 'Failed', 'Processing'.</param>
        /// <param name="page">Current 1-based page number.</param>
        /// <param name="pageSize">Number of records per page (default 25, max 100).</param>
        /// <returns>Paginated SMS log summaries along with queue health statistics.</returns>
        [HttpGet("logs")]
        public async Task<IActionResult> GetSmsLogs(
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
                var totalSms = await _dbContext.BcpSmsQueue.CountAsync();
                var queuedCount = await _dbContext.BcpSmsQueue.CountAsync(q => q.Status == BcpQueueStatus.Queued);
                var sentCount = await _dbContext.BcpSmsQueue.CountAsync(q => q.Status == BcpQueueStatus.Sent);
                var failedCount = await _dbContext.BcpSmsQueue.CountAsync(q => q.Status == BcpQueueStatus.Failed);
                var processingCount = await _dbContext.BcpSmsQueue.CountAsync(q => q.Status == BcpQueueStatus.Processing);

                // 2. Build filtered query
                var query = _dbContext.BcpSmsQueue
                    .Include(q => q.RelatedUser)
                    .AsNoTracking()
                    .AsQueryable();

                if (!string.IsNullOrWhiteSpace(search))
                {
                    var cleanSearch = search.Trim().ToLower();
                    query = query.Where(q =>
                        q.RecipientPhone.ToLower().Contains(cleanSearch) ||
                        q.Message.ToLower().Contains(cleanSearch) ||
                        (q.RelatedUser != null && q.RelatedUser.FullName != null && q.RelatedUser.FullName.ToLower().Contains(cleanSearch)));
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
                        q.RecipientPhone,
                        RecipientName = q.RelatedUser != null ? q.RelatedUser.FullName : null,
                        RecipientEmail = q.RelatedUser != null ? q.RelatedUser.Email : null,
                        q.Message,
                        CharLength = q.Message.Length,
                        Segments = Math.Max(1, (int)Math.Ceiling(q.Message.Length / 160.0)),
                        Category = q.Category.ToString(),
                        Priority = q.Priority.ToString(),
                        EventType = q.EventType.HasValue ? q.EventType.Value.ToString() : null,
                        Status = q.Status.ToString(),
                        q.Retries,
                        q.MaxRetries,
                        q.LastError,
                        ScheduledAt = q.ScheduledAt.HasValue ? DateTime.SpecifyKind(q.ScheduledAt.Value, DateTimeKind.Utc) : (DateTime?)null,
                        SentAt = q.SentAt.HasValue ? DateTime.SpecifyKind(q.SentAt.Value, DateTimeKind.Utc) : (DateTime?)null,
                        CreatedAt = DateTime.SpecifyKind(q.CreatedAt, DateTimeKind.Utc)
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
                        totalSms,
                        queuedCount,
                        sentCount,
                        failedCount,
                        processingCount
                    }
                }, "SMS logs retrieved successfully."));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[MxSmsApiController] Error querying SMS logs: {Message}", ex.Message);
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to fetch SMS logs: {ex.Message}"));
            }
        }

        /// <summary>
        /// Retrieves the complete content and metadata of a single SMS queue record.
        /// </summary>
        /// <param name="id">The unique GUID identifier of the SMS record.</param>
        /// <returns>Detailed SMS log record.</returns>
        [HttpGet("logs/{id:guid}")]
        public async Task<IActionResult> GetSmsDetails(Guid id)
        {
            try
            {
                var record = await _dbContext.BcpSmsQueue
                    .Include(q => q.RelatedUser)
                    .AsNoTracking()
                    .FirstOrDefaultAsync(q => q.Id == id);

                if (record == null)
                {
                    return NotFound(ApiResponse<object>.FailureResponse("SMS log record not found."));
                }

                return Ok(ApiResponse<object>.SuccessResponse(new
                {
                    record.Id,
                    record.RecipientPhone,
                    RecipientName = record.RelatedUser != null ? record.RelatedUser.FullName : null,
                    RecipientEmail = record.RelatedUser != null ? record.RelatedUser.Email : null,
                    record.Message,
                    CharLength = record.Message.Length,
                    Segments = Math.Max(1, (int)Math.Ceiling(record.Message.Length / 160.0)),
                    Category = record.Category.ToString(),
                    Priority = record.Priority.ToString(),
                    EventType = record.EventType.HasValue ? record.EventType.Value.ToString() : null,
                    Status = record.Status.ToString(),
                    record.Retries,
                    record.MaxRetries,
                    record.LastError,
                    record.ScheduledAt,
                    record.SentAt,
                    record.CreatedAt
                }, "SMS details retrieved."));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[MxSmsApiController] Error fetching SMS details for {Id}: {Message}", id, ex.Message);
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to load SMS details: {ex.Message}"));
            }
        }

        /// <summary>
        /// Re-queues a failed or pending SMS message for redelivery.
        /// </summary>
        /// <param name="id">The unique GUID identifier of the SMS record.</param>
        /// <returns>Result of the retry attempt.</returns>
        [HttpPost("logs/{id:guid}/retry")]
        public async Task<IActionResult> RetrySms(Guid id)
        {
            try
            {
                var record = await _dbContext.BcpSmsQueue.FirstOrDefaultAsync(q => q.Id == id);
                if (record == null)
                {
                    return NotFound(ApiResponse<object>.FailureResponse("SMS log record not found."));
                }

                record.Status = BcpQueueStatus.Queued;
                record.Retries = 0;
                record.LastError = null;
                await _dbContext.SaveChangesAsync();

                _logger.LogInformation("[MxSmsApiController] Re-queued SMS {Id} to {Phone}", id, record.RecipientPhone);
                return Ok(ApiResponse<object>.SuccessResponse(new { record.Id, Status = "Queued" }, "SMS re-queued for delivery dispatcher."));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[MxSmsApiController] Error retrying SMS {Id}: {Message}", id, ex.Message);
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to retry SMS: {ex.Message}"));
            }
        }

        /// <summary>
        /// Permanently deletes an SMS log record from the database.
        /// </summary>
        /// <param name="id">The unique GUID identifier of the record.</param>
        /// <returns>Confirmation of deletion.</returns>
        [HttpDelete("logs/{id:guid}")]
        public async Task<IActionResult> DeleteSmsLog(Guid id)
        {
            try
            {
                var record = await _dbContext.BcpSmsQueue.FirstOrDefaultAsync(q => q.Id == id);
                if (record == null)
                {
                    return NotFound(ApiResponse<object>.FailureResponse("SMS record not found."));
                }

                _dbContext.BcpSmsQueue.Remove(record);
                await _dbContext.SaveChangesAsync();

                return Ok(ApiResponse<object>.SuccessResponse(new { id }, "SMS record deleted successfully."));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[MxSmsApiController] Error deleting SMS log {Id}: {Message}", id, ex.Message);
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to delete SMS log: {ex.Message}"));
            }
        }

        /// <summary>
        /// Queues a test SMS to verify outbound SMS dispatch pipeline.
        /// </summary>
        /// <param name="request">Recipient phone number and test message text.</param>
        /// <returns>Confirmation of queued test SMS.</returns>
        [HttpPost("send-test")]
        public async Task<IActionResult> SendTestSms([FromBody] TestSmsRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.RecipientPhone))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Recipient phone number is required."));
            }

            var message = !string.IsNullOrWhiteSpace(request.Message)
                ? request.Message.Trim()
                : $"[Diagnostic Test] Outbound SMS dispatch test from Business Command Center at {DateTime.UtcNow:HH:mm:ss} UTC.";

            var queueRecord = new BcpSmsQueue
            {
                RecipientPhone = request.RecipientPhone.Trim(),
                Message = message,
                Category = BcpMessageCategory.Security,
                Priority = BcpMessagePriority.High,
                Status = BcpQueueStatus.Queued,
                CreatedAt = DateTime.UtcNow
            };

            _dbContext.BcpSmsQueue.Add(queueRecord);
            await _dbContext.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                queueRecord.Id,
                queueRecord.RecipientPhone,
                Status = "Queued",
                queueRecord.CreatedAt
            }, "Diagnostic test SMS enqueued successfully."));
        }
    }

    /// <summary>
    /// Payload request for triggering a live test SMS.
    /// </summary>
    public class TestSmsRequest
    {
        /// <summary>
        /// Destination recipient phone number.
        /// </summary>
        public string RecipientPhone { get; set; } = string.Empty;

        /// <summary>
        /// Optional custom SMS body text.
        /// </summary>
        public string? Message { get; set; }
    }
}
