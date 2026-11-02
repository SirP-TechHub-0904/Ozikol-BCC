using System.Collections.Generic;
using System.Threading.Tasks;
using Ozikol_BCC.EmailServices.Postmark.Models;
using PostmarkDotNet;

namespace Ozikol_BCC.EmailServices.Postmark.Interfaces;

/// <summary>
/// Universal high-performance contract for Postmark transactional and broadcast email delivery.
/// Provides resilient single, bulk, HTML, template-based sending, and attachment dispatching.
/// </summary>
public interface IPostmarkEmailService
{
    /// <summary>
    /// Sends a single standard or HTML email message with optional attachments and tagging.
    /// </summary>
    /// <param name="request">The email parameters.</param>
    /// <returns>Postmark provider response status.</returns>
    Task<PostmarkResponse> SendSingleEmailAsync(EmailRequest request);

    /// <summary>
    /// Dispatches a collection of distinct email requests in Postmark-optimized batch chunks (up to 500/batch).
    /// </summary>
    /// <param name="requests">Collection of email requests.</param>
    /// <returns>Collection of individual delivery responses.</returns>
    Task<IEnumerable<PostmarkResponse>> SendBulkEmailsAsync(IEnumerable<EmailRequest> requests);

    /// <summary>
    /// Renders and delivers a single email utilizing a pre-configured server-side Postmark template.
    /// </summary>
    /// <param name="request">The template email request details and dynamic model data.</param>
    /// <returns>Postmark provider response status.</returns>
    Task<PostmarkResponse> SendTemplateEmailAsync(TemplateEmailRequest request);

    /// <summary>
    /// Dispatches bulk template-based emails in optimized batches.
    /// </summary>
    /// <param name="requests">Collection of template email requests.</param>
    /// <returns>Collection of delivery responses.</returns>
    Task<IEnumerable<PostmarkResponse>> SendBulkTemplateEmailsAsync(IEnumerable<TemplateEmailRequest> requests);

    /// <summary>
    /// Convenience helper for dispatching a clean HTML email with optional attachments.
    /// </summary>
    /// <param name="to">Recipient email address.</param>
    /// <param name="subject">Email subject line.</param>
    /// <param name="htmlBody">Rich HTML message content.</param>
    /// <param name="from">Optional custom sender address.</param>
    /// <param name="textBody">Optional plain-text fallback content.</param>
    /// <param name="attachments">Optional list of file attachments.</param>
    /// <param name="tag">Optional organizational tag.</param>
    /// <returns>Postmark provider response status.</returns>
    Task<PostmarkResponse> SendHtmlEmailAsync(
        string to,
        string subject,
        string htmlBody,
        string? from = null,
        string? textBody = null,
        List<EmailAttachment>? attachments = null,
        string? tag = null);
}
