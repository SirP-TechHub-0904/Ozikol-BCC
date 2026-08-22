using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Ozikol_BCC.EmailServices.Postmark.Configuration;
using Ozikol_BCC.EmailServices.Postmark.Interfaces;
using Ozikol_BCC.EmailServices.Postmark.Models;
using PostmarkDotNet;

namespace Ozikol_BCC.EmailServices.Postmark.Services;

/// <summary>
/// Postmark implementation of outbound email delivery.
/// It logs provider responses and converts unexpected exceptions into PostmarkResponse objects
/// so callers can handle delivery failures without crashing background processing.
/// </summary>
public class PostmarkEmailService : IPostmarkEmailService
{
    private readonly PostmarkClient _client;
    private readonly PostmarkOptions _options;
    private readonly ILogger<PostmarkEmailService> _logger;

    /// <summary>
    /// Expects PostmarkOptions.ServerToken to be configured. The client is created once
    /// for the scoped service instance and reused for all sends in that scope.
    /// </summary>
    public PostmarkEmailService(IOptions<PostmarkOptions> options, ILogger<PostmarkEmailService> logger)
    {
        _options = options.Value;
        _logger = logger;
        _client = new PostmarkClient(_options.ServerToken);
    }

    /// <summary>
    /// Sends one email through Postmark. Provider-level delivery failures are returned
    /// as Postmark responses; unexpected exceptions are logged and returned as UserError.
    /// </summary>
    public async Task<PostmarkResponse> SendSingleEmailAsync(EmailRequest request)
    {
        _logger.LogInformation("Attempting to send email to {ToEmail}. Subject: {Subject}", request.To, request.Subject);
        
        try
        {
            var message = new PostmarkMessage
            {
                To = request.To,
                // If the caller does not provide a sender, use the configured verified Postmark sender.
                From = string.IsNullOrEmpty(request.From) ? _options.SenderEmail : request.From,
                Cc = request.Cc,
                Bcc = request.Bcc,
                TrackOpens = request.TrackOpens,
                TrackLinks = (LinkTrackingOptions)Enum.Parse(typeof(LinkTrackingOptions), request.TrackLinks),
                Subject = request.Subject,
                TextBody = request.TextBody,
                HtmlBody = request.HtmlBody,
                MessageStream = request.MessageStream
            };

            var response = await _client.SendMessageAsync(message);

            if (response.Status == PostmarkStatus.Success)
            {
                _logger.LogInformation("Successfully sent email to {ToEmail}. MessageId: {MessageId}", request.To, response.MessageID);
            }
            else
            {
                _logger.LogWarning("Failed to send email to {ToEmail}. ErrorCode: {ErrorCode}, Message: {ErrorMessage}", request.To, response.ErrorCode, response.Message);
            }
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception occurred while sending email to {ToEmail}", request.To);
            return new PostmarkResponse { Status = PostmarkStatus.UserError, Message = ex.Message };
        }
    }

    /// <summary>
    /// Sends many emails in Postmark-approved chunks. If a later chunk fails,
    /// responses collected from earlier chunks are returned so the caller can audit partial delivery.
    /// </summary>
    public async Task<IEnumerable<PostmarkResponse>> SendBulkEmailsAsync(IEnumerable<EmailRequest> requests)
    {
        _logger.LogInformation("Attempting to send bulk emails. Count: {Count}", requests.Count());
        var responses = new List<PostmarkResponse>();
        
        try
        {
            // Postmark recommends chunks of 500 for bulk sending
            var chunkedRequests = requests.Chunk(500);

            foreach (var chunk in chunkedRequests)
            {
                var messages = chunk.Select(req => new PostmarkMessage
                {
                    To = req.To,
                    From = string.IsNullOrEmpty(req.From) ? _options.SenderEmail : req.From,
                    Cc = req.Cc,
                    Bcc = req.Bcc,
                    TrackOpens = req.TrackOpens,
                    TrackLinks = (LinkTrackingOptions)Enum.Parse(typeof(LinkTrackingOptions), req.TrackLinks),
                    Subject = req.Subject,
                    TextBody = req.TextBody,
                    HtmlBody = req.HtmlBody,
                    MessageStream = req.MessageStream
                }).ToList();

                var chunkResponses = await _client.SendMessagesAsync(messages);
                responses.AddRange(chunkResponses);
            }

            return responses;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception occurred while sending bulk emails");
            // Return an empty list or specific error response
            return responses;
        }
    }
}
