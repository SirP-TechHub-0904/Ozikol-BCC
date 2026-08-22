using Ozikol_BCC.EmailServices.Postmark.Models;
using PostmarkDotNet;

namespace Ozikol_BCC.EmailServices.Postmark.Interfaces;

/// <summary>
/// Contract for Postmark email delivery. Implementations return Postmark responses
/// instead of throwing for normal delivery failures, allowing background workers to log and continue.
/// </summary>
public interface IPostmarkEmailService
{
    Task<PostmarkResponse> SendSingleEmailAsync(EmailRequest request);
    Task<IEnumerable<PostmarkResponse>> SendBulkEmailsAsync(IEnumerable<EmailRequest> requests);
}
