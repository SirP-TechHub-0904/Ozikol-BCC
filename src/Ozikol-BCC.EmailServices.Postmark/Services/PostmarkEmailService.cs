using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Ozikol_BCC.EmailServices.Postmark.Configuration;
using Ozikol_BCC.EmailServices.Postmark.Interfaces;
using Ozikol_BCC.EmailServices.Postmark.Models;
using PostmarkDotNet;
using PostmarkDotNet.Model;

namespace Ozikol_BCC.EmailServices.Postmark.Services;

/// <summary>
/// Resilient enterprise implementation of outbound transactional and template email delivery via Postmark.
/// Supports single, batch chunking (up to 500/batch), rich HTML, attachments, and structured diagnostic logging.
/// </summary>
public class PostmarkEmailService : IPostmarkEmailService
{
    private readonly PostmarkClient _client;
    private readonly PostmarkOptions _options;
    private readonly ILogger<PostmarkEmailService> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="PostmarkEmailService"/> class.
    /// </summary>
    /// <param name="options">Configured Postmark authentication and sender options.</param>
    /// <param name="logger">Diagnostic logging facility.</param>
    public PostmarkEmailService(IOptions<PostmarkOptions> options, ILogger<PostmarkEmailService> logger)
    {
        _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));

        if (string.IsNullOrWhiteSpace(_options.ServerToken))
        {
            _logger.LogWarning("Postmark ServerToken is unconfigured. Outbound email delivery will fail until configured in .env or appsettings.");
        }

        _client = new PostmarkClient(_options.ServerToken ?? string.Empty);
    }

    /// <inheritdoc />
    public async Task<PostmarkResponse> SendSingleEmailAsync(EmailRequest request)
    {
        if (request == null) throw new ArgumentNullException(nameof(request));

        _logger.LogInformation("Dispatching Postmark email to {ToEmail}. Subject: '{Subject}' [Tag: {Tag}]",
            request.To, request.Subject, request.Tag ?? "None");

        try
        {
            var sender = string.IsNullOrWhiteSpace(request.From) ? _options.SenderEmail : request.From;
            var message = new PostmarkMessage
            {
                To = request.To,
                From = sender,
                Cc = request.Cc,
                Bcc = request.Bcc,
                ReplyTo = request.ReplyTo,
                Subject = request.Subject,
                HtmlBody = request.HtmlBody,
                TextBody = request.TextBody,
                Tag = request.Tag,
                TrackOpens = request.TrackOpens,
                TrackLinks = ParseLinkTracking(request.TrackLinks),
                MessageStream = request.MessageStream ?? "outbound"
            };

            if (request.Metadata != null && request.Metadata.Count > 0)
            {
                message.Metadata = request.Metadata;
            }

            if (request.Attachments != null && request.Attachments.Count > 0)
            {
                foreach (var att in request.Attachments)
                {
                    message.AddAttachment(
                        att.ContentBytes != null ? att.ContentBytes : Convert.FromBase64String(att.ContentBase64 ?? string.Empty),
                        att.ContentType,
                        att.Name,
                        att.ContentId);
                }
            }

            var response = await _client.SendMessageAsync(message);

            if (response.Status == PostmarkStatus.Success)
            {
                _logger.LogInformation("Successfully dispatched email to {ToEmail}. MessageId: {MessageId}", request.To, response.MessageID);
            }
            else
            {
                _logger.LogWarning("Postmark delivery error for {ToEmail}. Code: {ErrorCode}, Message: {ErrorMessage}",
                    request.To, response.ErrorCode, response.Message);
            }

            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected exception during email dispatch to {ToEmail}", request.To);
            return new PostmarkResponse
            {
                Status = PostmarkStatus.UserError,
                Message = $"Failed to dispatch email: {ex.Message}"
            };
        }
    }

    /// <inheritdoc />
    public async Task<IEnumerable<PostmarkResponse>> SendBulkEmailsAsync(IEnumerable<EmailRequest> requests)
    {
        if (requests == null) return Enumerable.Empty<PostmarkResponse>();

        var requestList = requests.ToList();
        _logger.LogInformation("Initiating bulk Postmark email dispatch for {Count} messages.", requestList.Count);

        var responses = new List<PostmarkResponse>();

        try
        {
            // Postmark recommends batch chunks of up to 500 messages per HTTP call
            var chunkedRequests = requestList.Chunk(500);

            foreach (var chunk in chunkedRequests)
            {
                var messages = chunk.Select(req =>
                {
                    var sender = string.IsNullOrWhiteSpace(req.From) ? _options.SenderEmail : req.From;
                    var msg = new PostmarkMessage
                    {
                        To = req.To,
                        From = sender,
                        Cc = req.Cc,
                        Bcc = req.Bcc,
                        ReplyTo = req.ReplyTo,
                        Subject = req.Subject,
                        HtmlBody = req.HtmlBody,
                        TextBody = req.TextBody,
                        Tag = req.Tag,
                        TrackOpens = req.TrackOpens,
                        TrackLinks = ParseLinkTracking(req.TrackLinks),
                        MessageStream = req.MessageStream ?? "outbound"
                    };

                    if (req.Metadata != null && req.Metadata.Count > 0)
                    {
                        msg.Metadata = req.Metadata;
                    }

                    if (req.Attachments != null && req.Attachments.Count > 0)
                    {
                        foreach (var att in req.Attachments)
                        {
                            msg.AddAttachment(
                                att.ContentBytes != null ? att.ContentBytes : Convert.FromBase64String(att.ContentBase64 ?? string.Empty),
                                att.ContentType,
                                att.Name,
                                att.ContentId);
                        }
                    }

                    return msg;
                });

                var batchResponses = await _client.SendMessagesAsync(messages.ToArray());
                responses.AddRange(batchResponses);
            }

            _logger.LogInformation("Bulk email batch completed. Successfully sent {Count} messages.", responses.Count(r => r.Status == PostmarkStatus.Success));
            return responses;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected exception during bulk email delivery.");
            responses.Add(new PostmarkResponse
            {
                Status = PostmarkStatus.UserError,
                Message = $"Bulk send exception: {ex.Message}"
            });
            return responses;
        }
    }

    /// <inheritdoc />
    public async Task<PostmarkResponse> SendTemplateEmailAsync(TemplateEmailRequest request)
    {
        if (request == null) throw new ArgumentNullException(nameof(request));

        _logger.LogInformation("Dispatching template email to {ToEmail}. TemplateAlias: '{Alias}', TemplateId: {Id}",
            request.To, request.TemplateAlias, request.TemplateId);

        try
        {
            var sender = string.IsNullOrWhiteSpace(request.From) ? _options.SenderEmail : request.From;
            var templatedMessage = new TemplatedPostmarkMessage
            {
                To = request.To,
                From = sender,
                Cc = request.Cc,
                Bcc = request.Bcc,
                ReplyTo = request.ReplyTo,
                TemplateId = request.TemplateId ?? 0,
                TemplateAlias = request.TemplateAlias,
                TemplateModel = request.TemplateModel,
                InlineCss = request.InlineCss,
                Tag = request.Tag,
                TrackOpens = request.TrackOpens,
                TrackLinks = ParseLinkTracking(request.TrackLinks),
                MessageStream = request.MessageStream ?? "outbound"
            };

            if (request.Metadata != null && request.Metadata.Count > 0)
            {
                templatedMessage.Metadata = request.Metadata;
            }

            if (request.Attachments != null && request.Attachments.Count > 0)
            {
                foreach (var att in request.Attachments)
                {
                    templatedMessage.AddAttachment(
                        att.ContentBytes != null ? att.ContentBytes : Convert.FromBase64String(att.ContentBase64 ?? string.Empty),
                        att.ContentType,
                        att.Name,
                        att.ContentId);
                }
            }

            var response = await _client.SendMessageAsync(templatedMessage);

            if (response.Status == PostmarkStatus.Success)
            {
                _logger.LogInformation("Successfully sent template email to {ToEmail}. MessageId: {MessageId}", request.To, response.MessageID);
            }
            else
            {
                _logger.LogWarning("Template email delivery error for {ToEmail}. Code: {ErrorCode}, Message: {ErrorMessage}",
                    request.To, response.ErrorCode, response.Message);
            }

            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected exception during template email dispatch to {ToEmail}", request.To);
            return new PostmarkResponse
            {
                Status = PostmarkStatus.UserError,
                Message = $"Failed to dispatch template email: {ex.Message}"
            };
        }
    }

    /// <inheritdoc />
    public async Task<IEnumerable<PostmarkResponse>> SendBulkTemplateEmailsAsync(IEnumerable<TemplateEmailRequest> requests)
    {
        if (requests == null) return Enumerable.Empty<PostmarkResponse>();

        var requestList = requests.ToList();
        _logger.LogInformation("Initiating bulk template email dispatch for {Count} messages.", requestList.Count);

        var responses = new List<PostmarkResponse>();

        try
        {
            var chunkedRequests = requestList.Chunk(500);

            foreach (var chunk in chunkedRequests)
            {
                var messages = chunk.Select(req =>
                {
                    var sender = string.IsNullOrWhiteSpace(req.From) ? _options.SenderEmail : req.From;
                    var msg = new TemplatedPostmarkMessage
                    {
                        To = req.To,
                        From = sender,
                        Cc = req.Cc,
                        Bcc = req.Bcc,
                        ReplyTo = req.ReplyTo,
                        TemplateId = req.TemplateId ?? 0,
                        TemplateAlias = req.TemplateAlias,
                        TemplateModel = req.TemplateModel,
                        InlineCss = req.InlineCss,
                        Tag = req.Tag,
                        TrackOpens = req.TrackOpens,
                        TrackLinks = ParseLinkTracking(req.TrackLinks),
                        MessageStream = req.MessageStream ?? "outbound"
                    };

                    if (req.Metadata != null && req.Metadata.Count > 0)
                    {
                        msg.Metadata = req.Metadata;
                    }

                    if (req.Attachments != null && req.Attachments.Count > 0)
                    {
                        foreach (var att in req.Attachments)
                        {
                            msg.AddAttachment(
                                att.ContentBytes != null ? att.ContentBytes : Convert.FromBase64String(att.ContentBase64 ?? string.Empty),
                                att.ContentType,
                                att.Name,
                                att.ContentId);
                        }
                    }

                    return msg;
                });

                var batchResponses = await _client.SendMessagesAsync(messages.ToArray());
                responses.AddRange(batchResponses);
            }

            return responses;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected exception during bulk template email delivery.");
            responses.Add(new PostmarkResponse
            {
                Status = PostmarkStatus.UserError,
                Message = $"Bulk template send exception: {ex.Message}"
            });
            return responses;
        }
    }

    /// <inheritdoc />
    public async Task<PostmarkResponse> SendHtmlEmailAsync(
        string to,
        string subject,
        string htmlBody,
        string? from = null,
        string? textBody = null,
        List<EmailAttachment>? attachments = null,
        string? tag = null)
    {
        var request = new EmailRequest
        {
            To = to,
            From = from ?? _options.SenderEmail,
            Subject = subject,
            HtmlBody = htmlBody,
            TextBody = textBody,
            Attachments = attachments,
            Tag = tag
        };

        return await SendSingleEmailAsync(request);
    }

    /// <summary>
    /// Safely parses string tracking mode to Postmark LinkTrackingOptions enum.
    /// </summary>
    private static LinkTrackingOptions ParseLinkTracking(string? mode)
    {
        if (string.IsNullOrWhiteSpace(mode)) return LinkTrackingOptions.HtmlAndText;

        if (Enum.TryParse<LinkTrackingOptions>(mode, true, out var result))
        {
            return result;
        }

        return LinkTrackingOptions.HtmlAndText;
    }
}
