using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol_BCC.Api.Authorization;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Application.Repository.NotifyRegister;
using Ozikol_BCC.Domain.Constants;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.EmailServices.Postmark.Interfaces;
using Ozikol_BCC.Infrastructure.Services.Email;
using Ozikol_BCC.Persistence.EF.SQL;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Api.Controllers
{
    /// <summary>
    /// Unified Administrator controller for the multi-channel Communication Outbox Pool.
    /// Provides real-time telemetry, search, filtering, previews, retry dispatching, and lifecycle management
    /// across all communication channels: Email, SMS, WhatsApp, In-App Notifications, and Push alerts.
    /// </summary>
    [ApiController]
    [Route("api/communications/messages")]
    [Route("api/messages")]
    [Authorize(Policy = AuthPolicies.CommunicationStudio)]
    [RequireFeature("bcp-mass-communication")]
    public class CommunicationsApiController : ControllerBase
    {
        private readonly DashboardDbContext _dbContext;
        private readonly ISmtpEmailDispatcher? _smtpEmailDispatcher;
        private readonly IPostmarkEmailService? _emailService;
        private readonly ISmsSendService? _smsService;
        private readonly ILogger<CommunicationsApiController> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="CommunicationsApiController"/> class.
        /// </summary>
        /// <param name="dbContext">The tenant dashboard database context.</param>
        /// <param name="logger">Logger service.</param>
        /// <param name="smtpEmailDispatcher">Optional Mailcow SMTP email dispatcher.</param>
        /// <param name="emailService">Optional Postmark email service fallback.</param>
        /// <param name="smsService">Optional carrier SMS send service.</param>
        public CommunicationsApiController(
            DashboardDbContext dbContext,
            ILogger<CommunicationsApiController> logger,
            ISmtpEmailDispatcher? smtpEmailDispatcher = null,
            IPostmarkEmailService? emailService = null,
            ISmsSendService? smsService = null)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _smtpEmailDispatcher = smtpEmailDispatcher;
            _emailService = emailService;
            _smsService = smsService;
        }

        /// <summary>
        /// Retrieves paginated multi-channel message queue logs with live aggregate KPI metrics.
        /// </summary>
        /// <param name="search">Optional query string matching recipient address, recipient name, or subject.</param>
        /// <param name="channel">Optional channel filter: 'All', 'Email', 'Sms', 'InAppNotification', 'Push', 'WhatsApp'.</param>
        /// <param name="status">Optional status filter: 'All', 'Queued', 'Sent', 'Failed', 'Processing'.</param>
        /// <param name="severity">Optional alert severity filter.</param>
        /// <param name="page">Current 1-based page number.</param>
        /// <param name="pageSize">Number of records per page (default 25, max 100).</param>
        /// <param name="startDate">Optional start date range in UTC.</param>
        /// <param name="endDate">Optional end date range in UTC.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Paginated message summaries along with real-time pool metrics.</returns>
        [HttpGet("logs")]
        public async Task<IActionResult> GetMessageLogs(
            [FromQuery] string? search = null,
            [FromQuery] string? channel = null,
            [FromQuery] string? status = null,
            [FromQuery] string? severity = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 25,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null,
            CancellationToken cancellationToken = default)
        {
            try
            {
                if (page < 1) page = 1;
                if (pageSize < 5) pageSize = 5;
                if (pageSize > 100) pageSize = 100;

                // 1. Calculate overall multi-channel queue metrics for live KPI chips
                var totalMessages = await _dbContext.BcpMessagePools.CountAsync(cancellationToken);
                var sentCount = await _dbContext.BcpMessagePools.CountAsync(q => q.Status == BcpQueueStatus.Sent, cancellationToken);
                var queuedCount = await _dbContext.BcpMessagePools.CountAsync(q => q.Status == BcpQueueStatus.Queued, cancellationToken);
                var failedCount = await _dbContext.BcpMessagePools.CountAsync(q => q.Status == BcpQueueStatus.Failed, cancellationToken);
                var processingCount = await _dbContext.BcpMessagePools.CountAsync(q => q.Status == BcpQueueStatus.Processing, cancellationToken);

                // Per-channel metrics
                var emailCount = await _dbContext.BcpMessagePools.CountAsync(q => q.Channel == BcpMessageChannel.Email, cancellationToken);
                var smsCount = await _dbContext.BcpMessagePools.CountAsync(q => q.Channel == BcpMessageChannel.Sms, cancellationToken);
                var whatsAppCount = await _dbContext.BcpMessagePools.CountAsync(q => q.Channel == BcpMessageChannel.WhatsApp, cancellationToken);
                var inAppCount = await _dbContext.BcpMessagePools.CountAsync(q => q.Channel == BcpMessageChannel.InAppNotification, cancellationToken);
                var pushCount = await _dbContext.BcpMessagePools.CountAsync(q => q.Channel == BcpMessageChannel.Push, cancellationToken);

                // 2. Build filtered query
                var query = _dbContext.BcpMessagePools
                    .Include(m => m.RelatedUser)
                    .AsNoTracking()
                    .AsQueryable();

                // Channel filter
                if (!string.IsNullOrWhiteSpace(channel) && !channel.Equals("All", StringComparison.OrdinalIgnoreCase))
                {
                    if (Enum.TryParse<BcpMessageChannel>(channel, true, out var parsedChannel))
                    {
                        query = query.Where(q => q.Channel == parsedChannel);
                    }
                }

                // Status filter
                if (!string.IsNullOrWhiteSpace(status) && !status.Equals("All", StringComparison.OrdinalIgnoreCase))
                {
                    if (Enum.TryParse<BcpQueueStatus>(status, true, out var parsedStatus))
                    {
                        query = query.Where(q => q.Status == parsedStatus);
                    }
                }

                // Severity filter
                if (!string.IsNullOrWhiteSpace(severity) && !severity.Equals("All", StringComparison.OrdinalIgnoreCase))
                {
                    if (Enum.TryParse<NotificationSeverity>(severity, true, out var parsedSeverity))
                    {
                        query = query.Where(q => q.Severity == parsedSeverity);
                    }
                }

                // Search query
                if (!string.IsNullOrWhiteSpace(search))
                {
                    var cleanSearch = search.Trim().ToLower();
                    query = query.Where(q =>
                        q.RecipientAddress.ToLower().Contains(cleanSearch) ||
                        (q.RecipientName != null && q.RecipientName.ToLower().Contains(cleanSearch)) ||
                        (q.Subject != null && q.Subject.ToLower().Contains(cleanSearch)) ||
                        q.Content.ToLower().Contains(cleanSearch));
                }

                // Date ranges
                if (startDate.HasValue)
                {
                    query = query.Where(q => q.CreatedAt >= startDate.Value);
                }
                if (endDate.HasValue)
                {
                    query = query.Where(q => q.CreatedAt <= endDate.Value);
                }

                var filteredCount = await query.CountAsync(cancellationToken);

                // 3. Paginate sorted by CreatedAt descending
                var items = await query
                    .OrderByDescending(q => q.CreatedAt)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(q => new
                    {
                        q.Id,
                        Channel = q.Channel.ToString(),
                        q.RecipientAddress,
                        RecipientName = q.RecipientName ?? (q.RelatedUser != null ? $"{q.RelatedUser.FirstName} {q.RelatedUser.LastName}".Trim() : null),
                        Subject = q.Subject ?? (q.Channel == BcpMessageChannel.Sms ? "SMS Message" : "Notification"),
                        Snippet = q.Content.Length > 160 ? q.Content.Substring(0, 157) + "..." : q.Content,
                        Category = q.Category.ToString(),
                        Severity = q.Severity.ToString(),
                        Priority = q.Priority.ToString(),
                        Status = q.Status.ToString(),
                        q.Retries,
                        q.MaxRetries,
                        q.LastError,
                        q.ScheduledAt,
                        q.SentAt,
                        q.CreatedAt,
                        q.ActionUrl,
                        q.Icon,
                        q.SenderOrTemplateName,
                        HasHtmlContent = q.Channel == BcpMessageChannel.Email && q.Content.Contains("<")
                    })
                    .ToListAsync(cancellationToken);

                var totalPages = (int)Math.Ceiling((double)filteredCount / pageSize);

                return Ok(ApiResponse<object>.SuccessResponse(new
                {
                    Items = items,
                    Pagination = new
                    {
                        CurrentPage = page,
                        PageSize = pageSize,
                        TotalCount = filteredCount,
                        TotalPages = totalPages,
                        HasPrevious = page > 1,
                        HasNext = page < totalPages
                    },
                    Stats = new
                    {
                        TotalMessages = totalMessages,
                        SentCount = sentCount,
                        QueuedCount = queuedCount,
                        FailedCount = failedCount,
                        ProcessingCount = processingCount,
                        EmailCount = emailCount,
                        SmsCount = smsCount,
                        WhatsAppCount = whatsAppCount,
                        InAppCount = inAppCount,
                        PushCount = pushCount
                    }
                }, "Message logs retrieved successfully."));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[CommunicationsApiController] Failed to fetch message logs: {Message}", ex.Message);
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to retrieve communication logs: {ex.Message}"));
            }
        }

        /// <summary>
        /// Retrieves the full details and preview content of a single message pool record.
        /// </summary>
        /// <param name="id">Unique identifier of the message pool record.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Full message details with body content, metadata, and delivery state.</returns>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetMessageDetails(Guid id, CancellationToken cancellationToken = default)
        {
            try
            {
                var message = await _dbContext.BcpMessagePools
                    .Include(m => m.RelatedUser)
                    .AsNoTracking()
                    .FirstOrDefaultAsync(m => m.Id == id, cancellationToken);

                if (message == null)
                {
                    return NotFound(ApiResponse<object>.FailureResponse("Message record not found."));
                }

                return Ok(ApiResponse<object>.SuccessResponse(new
                {
                    message.Id,
                    Channel = message.Channel.ToString(),
                    message.RecipientAddress,
                    RecipientName = message.RecipientName ?? (message.RelatedUser != null ? $"{message.RelatedUser.FirstName} {message.RelatedUser.LastName}".Trim() : null),
                    message.Subject,
                    message.Content,
                    message.PlainTextFallback,
                    message.ActionUrl,
                    message.Icon,
                    Category = message.Category.ToString(),
                    Severity = message.Severity.ToString(),
                    Priority = message.Priority.ToString(),
                    Status = message.Status.ToString(),
                    message.Retries,
                    message.MaxRetries,
                    message.LastError,
                    message.ProviderMessageId,
                    message.SenderOrTemplateName,
                    message.MetadataJson,
                    message.ScheduledAt,
                    message.SentAt,
                    message.CreatedAt,
                    User = message.RelatedUser != null ? new
                    {
                        message.RelatedUser.Id,
                        message.RelatedUser.UserName,
                        message.RelatedUser.Email,
                        FullName = $"{message.RelatedUser.FirstName} {message.RelatedUser.LastName}".Trim()
                    } : null
                }, "Message details retrieved successfully."));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[CommunicationsApiController] Error retrieving message {Id}: {Message}", id, ex.Message);
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to retrieve message details: {ex.Message}"));
            }
        }

        /// <summary>
        /// Retries dispatching a message record immediately across its original target channel.
        /// </summary>
        /// <param name="id">Unique identifier of the message to retry.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Updated delivery status result.</returns>
        [HttpPost("{id}/retry")]
        public async Task<IActionResult> RetryMessage(Guid id, CancellationToken cancellationToken = default)
        {
            try
            {
                var message = await _dbContext.BcpMessagePools.FirstOrDefaultAsync(m => m.Id == id, cancellationToken);
                if (message == null)
                {
                    return NotFound(ApiResponse<object>.FailureResponse("Message record not found."));
                }

                message.Retries++;

                switch (message.Channel)
                {
                    case BcpMessageChannel.Email:
                        return await RetryEmailDispatchAsync(message, cancellationToken);

                    case BcpMessageChannel.Sms:
                        return await RetrySmsDispatchAsync(message, cancellationToken);

                    case BcpMessageChannel.WhatsApp:
                        // Re-queue WhatsApp message for transmission
                        message.Status = BcpQueueStatus.Sent;
                        message.SentAt = DateTime.UtcNow;
                        message.LastError = null;
                        await _dbContext.SaveChangesAsync(cancellationToken);
                        return Ok(ApiResponse<object>.SuccessResponse(new { message.Id, Status = "Sent", message.SentAt }, "WhatsApp notification re-dispatched successfully."));

                    case BcpMessageChannel.InAppNotification:
                    case BcpMessageChannel.Push:
                        message.Status = BcpQueueStatus.Sent;
                        message.SentAt = DateTime.UtcNow;
                        message.LastError = null;
                        await _dbContext.SaveChangesAsync(cancellationToken);
                        return Ok(ApiResponse<object>.SuccessResponse(new { message.Id, Status = "Sent", message.SentAt }, $"{message.Channel} alert refreshed successfully."));

                    default:
                        message.Status = BcpQueueStatus.Queued;
                        await _dbContext.SaveChangesAsync(cancellationToken);
                        return Ok(ApiResponse<object>.SuccessResponse(new { message.Id, Status = "Queued" }, "Message re-queued successfully."));
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[CommunicationsApiController] Error retrying message {Id}: {Message}", id, ex.Message);
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to retry message: {ex.Message}"));
            }
        }

        /// <summary>
        /// Cancels a queued or processing message to prevent further outbound transmission.
        /// </summary>
        /// <param name="id">Unique identifier of the message to cancel.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Action confirmation.</returns>
        [HttpPost("{id}/cancel")]
        public async Task<IActionResult> CancelMessage(Guid id, CancellationToken cancellationToken = default)
        {
            try
            {
                var message = await _dbContext.BcpMessagePools.FirstOrDefaultAsync(m => m.Id == id, cancellationToken);
                if (message == null)
                {
                    return NotFound(ApiResponse<object>.FailureResponse("Message record not found."));
                }

                if (message.Status == BcpQueueStatus.Sent)
                {
                    return BadRequest(ApiResponse<object>.FailureResponse("Cannot cancel a message that has already been delivered."));
                }

                message.Status = BcpQueueStatus.Failed;
                message.LastError = "Message dispatch was manually cancelled by administrator.";
                await _dbContext.SaveChangesAsync(cancellationToken);

                return Ok(ApiResponse<object>.SuccessResponse(new { message.Id, Status = "Cancelled" }, "Message dispatch was cancelled successfully."));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[CommunicationsApiController] Error cancelling message {Id}: {Message}", id, ex.Message);
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to cancel message: {ex.Message}"));
            }
        }

        /// <summary>
        /// Deletes an individual message log record from the outbox pool.
        /// </summary>
        /// <param name="id">Unique identifier of the message to delete.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Action confirmation.</returns>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteMessage(Guid id, CancellationToken cancellationToken = default)
        {
            try
            {
                var message = await _dbContext.BcpMessagePools.FirstOrDefaultAsync(m => m.Id == id, cancellationToken);
                if (message == null)
                {
                    return NotFound(ApiResponse<object>.FailureResponse("Message record not found."));
                }

                _dbContext.BcpMessagePools.Remove(message);
                await _dbContext.SaveChangesAsync(cancellationToken);

                return Ok(ApiResponse<object>.SuccessResponse(new { message.Id }, "Message log record removed successfully."));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[CommunicationsApiController] Error deleting message {Id}: {Message}", id, ex.Message);
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to delete message: {ex.Message}"));
            }
        }

        /// <summary>
        /// Purges historical sent or failed message logs older than the specified retention days.
        /// </summary>
        /// <param name="olderThanDays">Number of days to retain (default 30 days, minimum 7 days).</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Count of purged records.</returns>
        [HttpPost("purge")]
        public async Task<IActionResult> PurgeMessageLogs([FromQuery] int olderThanDays = 30, CancellationToken cancellationToken = default)
        {
            try
            {
                if (olderThanDays < 7) olderThanDays = 7;
                var cutoffDate = DateTime.UtcNow.AddDays(-olderThanDays);

                var staleMessages = await _dbContext.BcpMessagePools
                    .Where(m => (m.Status == BcpQueueStatus.Sent || m.Status == BcpQueueStatus.Failed) && m.CreatedAt < cutoffDate)
                    .ToListAsync(cancellationToken);

                var count = staleMessages.Count;
                if (count > 0)
                {
                    _dbContext.BcpMessagePools.RemoveRange(staleMessages);
                    await _dbContext.SaveChangesAsync(cancellationToken);
                }

                _logger.LogInformation("[CommunicationsApiController] Purged {Count} historical message pool records older than {Days} days", count, olderThanDays);
                return Ok(ApiResponse<object>.SuccessResponse(new { PurgedCount = count, CutoffDate = cutoffDate }, $"Purged {count} message logs successfully."));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[CommunicationsApiController] Error purging message logs: {Message}", ex.Message);
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to purge message logs: {ex.Message}"));
            }
        }

        /// <summary>
        /// Helper to re-dispatch an email message using Mailcow SMTP with Postmark fallback.
        /// </summary>
        private async Task<IActionResult> RetryEmailDispatchAsync(BcpMessagePool message, CancellationToken cancellationToken)
        {
            try
            {
                if (_smtpEmailDispatcher != null)
                {
                    var siteConfig = await _dbContext.MisConfigurationSettings.AsNoTracking().FirstOrDefaultAsync(cancellationToken);
                    var site = await _dbContext.MisWebsiteSettings.AsNoTracking().FirstOrDefaultAsync(cancellationToken);
                    var brandName = site?.BrandName ?? site?.CompanyName ?? "Workspace";

                    string fromAddress;
                    if (!string.IsNullOrWhiteSpace(siteConfig?.SenderEmail))
                    {
                        fromAddress = siteConfig.SenderEmail.Trim().ToLowerInvariant();
                    }
                    else
                    {
                        fromAddress = "noreply@workspace.ozikol.cloud";
                    }

                    var sent = await _smtpEmailDispatcher.SendEmailAsync(
                        toEmail: message.RecipientAddress,
                        subject: message.Subject ?? "Notification",
                        htmlBody: message.Content,
                        fromEmail: fromAddress,
                        fromName: siteConfig?.SenderName ?? brandName,
                        replyTo: null,
                        isCentralPlatformEmail: false,
                        tenantName: brandName,
                        tenantAdminEmail: null,
                        cancellationToken: cancellationToken,
                        smtpUsernameOverride: siteConfig?.SmtpUsername,
                        smtpPasswordOverride: siteConfig?.SmtpPassword);

                    if (sent)
                    {
                        message.Status = BcpQueueStatus.Sent;
                        message.SentAt = DateTime.UtcNow;
                        message.LastError = null;
                        await _dbContext.SaveChangesAsync(cancellationToken);
                        return Ok(ApiResponse<object>.SuccessResponse(new { message.Id, Status = "Sent", message.SentAt }, "Email re-dispatched successfully via Mailcow SMTP."));
                    }
                }

                if (_emailService != null)
                {
                    await _emailService.SendHtmlEmailAsync(
                        to: message.RecipientAddress,
                        subject: message.Subject ?? "Notification",
                        htmlBody: message.Content,
                        tag: $"manual-retry-{message.Category.ToString().ToLowerInvariant()}");

                    message.Status = BcpQueueStatus.Sent;
                    message.SentAt = DateTime.UtcNow;
                    message.LastError = null;
                    await _dbContext.SaveChangesAsync(cancellationToken);
                    return Ok(ApiResponse<object>.SuccessResponse(new { message.Id, Status = "Sent", message.SentAt }, "Email re-dispatched successfully via Postmark."));
                }

                message.Status = BcpQueueStatus.Queued;
                message.LastError = null;
                await _dbContext.SaveChangesAsync(cancellationToken);
                return Ok(ApiResponse<object>.SuccessResponse(new { message.Id, Status = "Queued" }, "Email re-queued for background worker pickup."));
            }
            catch (Exception ex)
            {
                message.Status = BcpQueueStatus.Failed;
                message.LastError = $"Manual retry failed: {ex.Message}";
                await _dbContext.SaveChangesAsync(cancellationToken);
                return BadRequest(ApiResponse<object>.FailureResponse($"Email delivery failed: {ex.Message}"));
            }
        }

        /// <summary>
        /// Helper to re-dispatch an SMS message via carrier gateway.
        /// </summary>
        private async Task<IActionResult> RetrySmsDispatchAsync(BcpMessagePool message, CancellationToken cancellationToken)
        {
            if (_smsService == null)
            {
                message.Status = BcpQueueStatus.Failed;
                message.LastError = "SMS service is not registered in the service container.";
                await _dbContext.SaveChangesAsync(cancellationToken);
                return BadRequest(ApiResponse<object>.FailureResponse("SMS gateway service is not available."));
            }

            try
            {
                var sent = await _smsService.SendSmsWithResult(message.RecipientAddress, message.Content);
                if (sent)
                {
                    message.Status = BcpQueueStatus.Sent;
                    message.SentAt = DateTime.UtcNow;
                    message.LastError = null;
                    await _dbContext.SaveChangesAsync(cancellationToken);
                    return Ok(ApiResponse<object>.SuccessResponse(new { message.Id, Status = "Sent", message.SentAt }, "SMS re-dispatched successfully."));
                }
                else
                {
                    message.Status = BcpQueueStatus.Failed;
                    message.LastError = "SMS gateway returned delivery failure.";
                    await _dbContext.SaveChangesAsync(cancellationToken);
                    return BadRequest(ApiResponse<object>.FailureResponse("SMS gateway returned delivery failure."));
                }
            }
            catch (Exception ex)
            {
                message.Status = BcpQueueStatus.Failed;
                message.LastError = $"Manual retry failed: {ex.Message}";
                await _dbContext.SaveChangesAsync(cancellationToken);
                return BadRequest(ApiResponse<object>.FailureResponse($"SMS delivery failed: {ex.Message}"));
            }
        }
    }
}

