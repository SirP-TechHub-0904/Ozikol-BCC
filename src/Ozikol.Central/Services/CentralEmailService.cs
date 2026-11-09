using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Infrastructure.Services.Email;

namespace Ozikol.Central.Services;

public interface ICentralEmailService
{
    Task<bool> SendEmailAsync(string toEmail, string subject, string htmlBody, string? provider = null, CancellationToken cancellationToken = default);
    Task<bool> SendTwoFactorCodeEmailAsync(string toEmail, string code, CancellationToken cancellationToken = default);
    /// <summary>
    /// Dispatches a secure 6-digit one-time passcode (OTP) email for administrator password recovery.
    /// </summary>
    /// <param name="toEmail">The recipient administrator work email.</param>
    /// <param name="code">The 6-digit numeric verification OTP.</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>True if queued/sent successfully; false otherwise.</returns>
    Task<bool> SendPasswordResetOtpEmailAsync(string toEmail, string code, CancellationToken cancellationToken = default);
    /// <summary>
    /// Dispatches a welcoming email to the newly registered organization using the customizable WelcomeEmailTemplate.
    /// </summary>
    /// <param name="toEmail">The recipient administrator email address.</param>
    /// <param name="organizationName">The display name of the tenant business organization.</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>True if queued or sent successfully; false otherwise.</returns>
    Task<bool> SendWelcomeEmailAsync(string toEmail, string organizationName, CancellationToken cancellationToken = default);

    /// <summary>
    /// Dispatches an official setup confirmation email to the administrator containing dedicated workspace details.
    /// </summary>
    /// <param name="toEmail">The administrator email address.</param>
    /// <param name="organizationName">The display name of the organization.</param>
    /// <param name="domainUrl">The primary workspace domain.</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>True if delivered; false otherwise.</returns>
    Task<bool> SendWelcomeWorkspaceEmailAsync(string toEmail, string organizationName, string domainUrl, CancellationToken cancellationToken = default);
    Task SendSupportInquiryDualAsync(MasterSupportInquiry inquiry, CancellationToken cancellationToken = default);
    Task SendTicketReplyDualAsync(MasterSupportInquiry inquiry, MasterTicketReply reply, CancellationToken cancellationToken = default);
    Task SendPartnerApplicationDualAsync(MasterAffiliatePartner partner, CancellationToken cancellationToken = default);
    Task SendCreatorApplicationDualAsync(MasterCreatorApplication application, CancellationToken cancellationToken = default);
    Task SendJobApplicationDualAsync(MasterJobApplication application, string openingTitle, CancellationToken cancellationToken = default);
    Task SendExamBookingDualAsync(string candidateName, string candidateEmail, string examTitle, string bookingRef, CancellationToken cancellationToken = default);
    Task SendNewsletterSubscriptionAsync(string email, CancellationToken cancellationToken = default);
    Task SendVoucherApplicationDualAsync(MasterVoucherApplication app, CancellationToken cancellationToken = default);
    Task<bool> SendVoucherApprovedEmailAsync(MasterVoucherApplication app, string couponCode, int durationDays, string? featuresSummary, decimal discountPercentage = 100.00m, CancellationToken cancellationToken = default);
    /// <summary>
    /// Dispatches an official platform operator invitation email containing account details, assigned roles, and secure password activation link.
    /// </summary>
    Task<bool> SendOperatorInvitationEmailAsync(string toEmail, string fullName, string userName, string department, IList<string> roles, string setupUrl, CancellationToken cancellationToken = default);
}

public class CentralEmailService : ICentralEmailService
{
    private readonly MasterCatalogDbContext _masterCatalogDbContext;
    private readonly ILogger<CentralEmailService> _logger;
    private readonly IConfiguration _configuration;
    private readonly Ozikol.Central.Services.Validation.IEmailValidationService _emailValidationService;
    private readonly ISmtpEmailDispatcher _smtpEmailDispatcher;
    private readonly Ozikol_BCC.EmailServices.Postmark.Interfaces.IPostmarkEmailService? _postmarkEmailService;

    public CentralEmailService(
        MasterCatalogDbContext masterCatalogDbContext,
        ILogger<CentralEmailService> logger,
        IConfiguration configuration,
        Ozikol.Central.Services.Validation.IEmailValidationService emailValidationService,
        ISmtpEmailDispatcher smtpEmailDispatcher,
        Ozikol_BCC.EmailServices.Postmark.Interfaces.IPostmarkEmailService? postmarkEmailService = null)
    {
        _masterCatalogDbContext = masterCatalogDbContext;
        _logger = logger;
        _configuration = configuration;
        _emailValidationService = emailValidationService;
        _smtpEmailDispatcher = smtpEmailDispatcher;
        _postmarkEmailService = postmarkEmailService;
    }

    public async Task<bool> SendEmailAsync(string toEmail, string subject, string htmlBody, string? provider = null, CancellationToken cancellationToken = default)
    {
        // Safety Gate: Reject malformed emails, single-letter TLDs (e.g. .j), and disposable test emails from queueing into database audit logs
        if (!_emailValidationService.IsValidEmail(toEmail, out var validationError))
        {
            _logger.LogWarning("⚠️ [CentralEmailService] Dropped email dispatch to invalid/test address '{Recipient}': {Error}", toEmail, validationError);
            return false;
        }

        var effectiveProvider = provider;
        try
        {
            var platformSetting = await _masterCatalogDbContext.MasterPlatformSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Id == 1, cancellationToken);
            if (effectiveProvider == null && platformSetting != null && !string.IsNullOrWhiteSpace(platformSetting.EmailProvider))
            {
                effectiveProvider = platformSetting.EmailProvider;
            }
        }
        catch
        {
            // Graceful fallback if MasterPlatformSettings is transiently unreachable
        }

        // If no provider explicitly set in MasterPlatformSettings, detect whether Postmark token exists; otherwise default to Mailcow
        if (string.IsNullOrWhiteSpace(effectiveProvider))
        {
            var postmarkToken = _configuration["PostmarkSettings:ServerToken"]
                ?? _configuration["EmailSettings:ApiKey"]
                ?? Environment.GetEnvironmentVariable("POSTMARK_SERVER_TOKEN");

            effectiveProvider = !string.IsNullOrWhiteSpace(postmarkToken) ? "Postmark" : "Mailcow";
        }

        var log = new MasterEmailLog
        {
            Id = Guid.NewGuid(),
            RecipientEmail = toEmail,
            Subject = subject,
            BodyHtml = htmlBody,
            Provider = effectiveProvider,
            SentAtUtc = DateTime.UtcNow,
            Status = "NotSent"
        };

        try
        {
            if (string.Equals(effectiveProvider, "Postmark", StringComparison.OrdinalIgnoreCase) && _postmarkEmailService != null)
            {
                _logger.LogInformation("📧 [CentralEmailService] Dispatching email '{Subject}' to [{Recipient}] via Postmark...", subject, toEmail);

                var response = await _postmarkEmailService.SendHtmlEmailAsync(
                    to: toEmail,
                    subject: subject,
                    htmlBody: htmlBody,
                    tag: "central-transactional");

                if (response.Status == PostmarkDotNet.PostmarkStatus.Success)
                {
                    log.Status = "Sent";
                    log.ErrorMessage = null;
                    _logger.LogInformation("✅ [CentralEmailService] Postmark successfully delivered email to [{Recipient}] (MessageID: {MessageId})", toEmail, response.MessageID);
                }
                else
                {
                    _logger.LogWarning("⚠️ [CentralEmailService] Postmark delivery unsuccessful for [{Recipient}]: {Message}. Engaging automated Mailcow SMTP failover...", toEmail, response.Message);

                    // Automated Failover: Fall back to Mailcow SMTP when Postmark returns non-success
                    var failoverDelivered = await _smtpEmailDispatcher.SendEmailAsync(
                        toEmail: toEmail,
                        subject: subject,
                        htmlBody: htmlBody,
                        fromEmail: "noreply@ozikol.cloud",
                        fromName: "Ozikol Business Command Center",
                        isCentralPlatformEmail: true,
                        cancellationToken: cancellationToken);

                    if (failoverDelivered)
                    {
                        log.Provider = "Mailcow (Failover)";
                        log.Status = "Sent";
                        log.ErrorMessage = null;
                        _logger.LogInformation("✅ [CentralEmailService] Mailcow failover successfully delivered '{Subject}' to [{Recipient}].", subject, toEmail);
                    }
                    else
                    {
                        log.Status = "Failed";
                        log.ErrorMessage = $"Postmark failed ({response.Message}) and Mailcow SMTP failover also returned failure. Verify Mailcow credentials.";
                        _logger.LogWarning("⚠️ [CentralEmailService] Mailcow failover also failed for [{Recipient}].", toEmail);
                    }
                }
            }
            else
            {
                _logger.LogInformation("📧 [CentralEmailService] Dispatching email '{Subject}' to [{Recipient}] via Mailcow SMTP...", subject, toEmail);

                var delivered = await _smtpEmailDispatcher.SendEmailAsync(
                    toEmail: toEmail,
                    subject: subject,
                    htmlBody: htmlBody,
                    fromEmail: "noreply@ozikol.cloud",
                    fromName: "Ozikol Business Command Center",
                    isCentralPlatformEmail: true,
                    cancellationToken: cancellationToken);

                if (delivered)
                {
                    log.Status = "Sent";
                    log.ErrorMessage = null;
                    log.Provider = "Mailcow";
                    _logger.LogInformation("✅ [CentralEmailService] Mailcow successfully delivered '{Subject}' to [{Recipient}].", subject, toEmail);
                }
                else
                {
                    log.Status = "Failed";
                    log.ErrorMessage = "Mailcow SMTP delivery returned failure. Check Mailcow and network telemetry.";
                    _logger.LogWarning("⚠️ [CentralEmailService] Mailcow delivery failed for [{Recipient}].", toEmail);
                }
            }
        }
        catch (Exception ex)
        {
            log.Status = "Failed";
            log.ErrorMessage = ex.Message;
            _logger.LogError(ex, "❌ [CentralEmailService] Exception during email delivery for {Recipient}", toEmail);
        }
        finally
        {
            try
            {
                _masterCatalogDbContext.MasterEmailLogs.Add(log);
                await _masterCatalogDbContext.SaveChangesAsync(cancellationToken);
            }
            catch (Exception dbEx)
            {
                _logger.LogError(dbEx, "Failed to persist MasterEmailLog for {Recipient}", toEmail);
            }
        }

        return log.Status == "Sent";
    }

    public async Task<bool> SendTwoFactorCodeEmailAsync(string toEmail, string code, CancellationToken cancellationToken = default)
    {
        var subject = $"Your Ozikol 2FA Verification Code: {code}";
        var body = $@"
            <div style='font-family: -apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #ffffff; color: #0f172a; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px;'>
                <div style='text-align: center; margin-bottom: 24px;'>
                    <h2 style='color: #0f172a; margin: 0; font-size: 22px; font-weight: 800;'>Ozikol Security</h2>
                    <p style='color: #64748b; font-size: 13.5px; margin: 4px 0 0;'>Platform Operator 2-Factor Authentication</p>
                </div>
                <div style='background: #f8fafc; border: 1px solid #e2e8f0; padding: 24px; border-radius: 10px; text-align: center;'>
                    <p style='margin: 0 0 12px; color: #334155; font-size: 14px;'>Enter the following 6-digit verification code to complete your sign-in:</p>
                    <div style='font-size: 34px; font-weight: 800; color: #0050e5; letter-spacing: 8px; font-family: monospace; padding: 8px 0;'>{code}</div>
                    <p style='color: #94a3b8; font-size: 12px; margin: 12px 0 0;'>This code expires in 10 minutes. Never share this code with anyone.</p>
                </div>
                <div style='margin-top: 24px; text-align: center; font-size: 11.5px; color: #94a3b8;'>
                    If you did not initiate this sign-in attempt, please contact your security administrator immediately.
                </div>
            </div>
        ";

        return await SendEmailAsync(toEmail, subject, body, null, cancellationToken);
    }

    /// <summary>
    /// Dispatches a secure 6-digit one-time passcode (OTP) email for administrator password recovery.
    /// </summary>
    /// <param name="toEmail">The recipient administrator work email.</param>
    /// <param name="code">The 6-digit numeric verification OTP.</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>True if queued/sent successfully; false otherwise.</returns>
    public async Task<bool> SendPasswordResetOtpEmailAsync(string toEmail, string code, CancellationToken cancellationToken = default)
    {
        var subject = $"Your Ozikol Password Reset Code: {code}";
        var body = $@"
            <div style='font-family: -apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #ffffff; color: #0f172a; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px;'>
                <div style='text-align: center; margin-bottom: 24px;'>
                    <h2 style='color: #0f172a; margin: 0; font-size: 22px; font-weight: 800;'>Ozikol Security</h2>
                    <p style='color: #64748b; font-size: 13.5px; margin: 4px 0 0;'>Operator Password Recovery</p>
                </div>
                <div style='background: #f8fafc; border: 1px solid #e2e8f0; padding: 24px; border-radius: 10px; text-align: center;'>
                    <p style='margin: 0 0 12px; color: #334155; font-size: 14px;'>Use the following 6-digit code to reset your platform operator password:</p>
                    <div style='font-size: 34px; font-weight: 800; color: #0050e5; letter-spacing: 8px; font-family: monospace; padding: 8px 0;'>{code}</div>
                    <p style='color: #94a3b8; font-size: 12px; margin: 12px 0 0;'>This one-time code expires in 15 minutes.</p>
                </div>
                <div style='margin-top: 24px; text-align: center; font-size: 11.5px; color: #94a3b8;'>
                    If you did not request a password reset, you can safely disregard this email. Your password will remain unchanged.
                </div>
            </div>
        ";

        return await SendEmailAsync(toEmail, subject, body, null, cancellationToken);
    }

    /// <summary>
    /// Dispatches a welcoming email to the newly registered organization using the customizable WelcomeEmailTemplate.
    /// </summary>
    /// <param name="toEmail">The recipient administrator email address.</param>
    /// <param name="organizationName">The display name of the tenant business organization.</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>True if queued or sent successfully; false otherwise.</returns>
    public async Task<bool> SendWelcomeEmailAsync(string toEmail, string organizationName, CancellationToken cancellationToken = default)
    {
        string subject;
        string body;

        try
        {
            var template = await _masterCatalogDbContext.MasterEmailTemplates
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.TemplateType == Ozikol.MasterDomain.Enums.MasterEmailTemplateType.WelcomeEmailTemplate && t.IsActive, cancellationToken);

            if (template != null)
            {
                subject = template.Subject
                    .Replace("{{businessname}}", organizationName, StringComparison.OrdinalIgnoreCase)
                    .Replace("{{organizationname}}", organizationName, StringComparison.OrdinalIgnoreCase);

                body = template.BodyHtml
                    .Replace("{{businessname}}", organizationName, StringComparison.OrdinalIgnoreCase)
                    .Replace("{{organizationname}}", organizationName, StringComparison.OrdinalIgnoreCase);
            }
            else
            {
                subject = $"Welcome to Ozikol Business Command Center — {organizationName}";
                body = $@"<div style=""font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; color: #0f172a; padding: 36px; border: 1px solid #e2e8f0; border-radius: 12px;"">
    <div style=""text-align: center; margin-bottom: 28px;"">
        <img src=""https://ozikol.cloud/assets/images/ozikol.png"" alt=""Ozikol Business Command Center"" style=""height: 40px; margin-bottom: 16px;"" />
        <h1 style=""color: #0f172a; font-size: 24px; font-weight: 800; margin: 0 0 8px;"">Welcome to Ozikol, {organizationName}!</h1>
        <p style=""color: #64748b; font-size: 14.5px; margin: 0;"">We are thrilled to welcome you to the Ozikol Business Command Center.</p>
    </div>
    <div style=""background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 24px; margin-bottom: 24px; line-height: 1.6; font-size: 14.5px; color: #334155;"">
        <p style=""margin-top: 0;"">Dear <strong>{organizationName}</strong>,</p>
        <p>Thank you for choosing <strong>Ozikol Business Command Center</strong> to power your enterprise operations. Your workspace is configured to help your organization manage operations, team collaboration, finances, and multi-channel customer communications from one unified center.</p>
        <p>You will shortly receive your workspace setup details with direct credentials and dedicated portal links to access your workspace anytime.</p>
        <p style=""margin-bottom: 0;"">If you ever need guidance or have questions, our specialist support engineering team is always here to assist you.</p>
    </div>
    <div style=""text-align: center; margin-bottom: 28px;"">
        <a href=""https://ozikol.cloud"" style=""display: inline-block; background: #0050e5; color: #ffffff; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 700; text-decoration: none;"">Explore Ozikol &rarr;</a>
    </div>
    <hr style=""border: none; border-top: 1px solid #e2e8f0; margin: 28px 0 20px;"" />
    <p style=""color: #94a3b8; font-size: 12px; text-align: center; margin: 0;"">
        Ozikol Business Command Center &bull; Enterprise Operations Suite
    </p>
</div>";
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to load WelcomeEmailTemplate from database; falling back to default welcome email.");
            subject = $"Welcome to Ozikol Business Command Center — {organizationName}";
            body = $@"<div style=""font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; color: #0f172a; padding: 36px; border: 1px solid #e2e8f0; border-radius: 12px;"">
    <div style=""text-align: center; margin-bottom: 28px;"">
        <img src=""https://ozikol.cloud/assets/images/ozikol.png"" alt=""Ozikol Business Command Center"" style=""height: 40px; margin-bottom: 16px;"" />
        <h1 style=""color: #0f172a; font-size: 24px; font-weight: 800; margin: 0 0 8px;"">Welcome to Ozikol, {organizationName}!</h1>
    </div>
    <div style=""background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 24px; margin-bottom: 24px; line-height: 1.6; font-size: 14.5px; color: #334155;"">
        <p style=""margin-top: 0;"">Dear <strong>{organizationName}</strong>,</p>
        <p>Thank you for choosing <strong>Ozikol Business Command Center</strong> to power your enterprise operations.</p>
    </div>
</div>";
        }

        return await SendEmailAsync(toEmail, subject, body, null, cancellationToken);
    }

    /// <summary>
    /// Dispatches an official setup confirmation email to the administrator containing dedicated workspace details.
    /// </summary>
    /// <param name="toEmail">The administrator email address.</param>
    /// <param name="organizationName">The display name of the organization.</param>
    /// <param name="domainUrl">The primary workspace domain.</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>True if delivered; false otherwise.</returns>
    public async Task<bool> SendWelcomeWorkspaceEmailAsync(string toEmail, string organizationName, string domainUrl, CancellationToken cancellationToken = default)
    {
        var subject = $"Welcome to Ozikol: Workspace for {organizationName} is Ready!";
        var loginUrl = $"https://{domainUrl}/auth/login";

        var body = $@"
            <div style='font-family: -apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; color: #0f172a; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px;'>
                <div style='text-align: center; margin-bottom: 24px;'>
                    <img src='https://ozikol.cloud/assets/images/ozikol.png' alt='Ozikol Business Command Center' style='height: 38px; margin-bottom: 16px;' />
                    <h2 style='color: #0f172a; margin: 0; font-size: 24px; font-weight: 800;'>Your Workspace is Ready!</h2>
                    <p style='color: #64748b; font-size: 14px; margin-top: 6px;'>Enterprise Cloud Environment Setup Confirmation</p>
                </div>
                <p style='color: #334155; font-size: 15px; line-height: 1.6;'>
                    Congratulations! Your cloud environment for <strong>{organizationName}</strong> has been set up and is ready to use with your executive business suite.
                </p>
                <div style='background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin: 24px 0;'>
                    <div style='margin-bottom: 14px;'>
                        <div style='font-size: 11.5px; font-weight: 700; color: #64748b; text-transform: uppercase;'>Dedicated Website URL:</div>
                        <div style='font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 2px;'><a href='https://{domainUrl}' style='color: #0050e5; text-decoration: none;'>https://{domainUrl}</a></div>
                    </div>
                    <div style='margin-bottom: 14px;'>
                        <div style='font-size: 11.5px; font-weight: 700; color: #64748b; text-transform: uppercase;'>Administrator Login Portal:</div>
                        <div style='font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 2px;'><a href='{loginUrl}' style='color: #0050e5; text-decoration: none;'>{loginUrl}</a></div>
                    </div>
                    <div>
                        <div style='font-size: 11.5px; font-weight: 700; color: #64748b; text-transform: uppercase;'>Administrator Account:</div>
                        <div style='font-size: 14px; color: #0f172a; margin-top: 2px; font-family: monospace;'>{toEmail}</div>
                    </div>
                </div>

                <div style='text-align: center; margin-top: 24px;'>
                    <a href='{loginUrl}' style='display: inline-block; background: #0050e5; color: #ffffff; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 700; text-decoration: none;'>Launch Command Center &rarr;</a>
                </div>
                <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 30px 0 20px 0;' />
                <p style='color: #94a3b8; font-size: 12px; text-align: center; margin: 0;'>
                    Ozikol Business Command Center
                </p>
            </div>
        ";

        return await SendEmailAsync(toEmail, subject, body, null, cancellationToken);
    }

    /// <summary>
    /// Dispatches dual confirmation emails for new support inquiries: a tracking receipt to the client,
    /// and notifications to the configured support administrator pool.
    /// </summary>
    public async Task SendSupportInquiryDualAsync(MasterSupportInquiry inquiry, CancellationToken cancellationToken = default)
    {
        // 1. Client Confirmation Receipt
        var clientSubject = $"[Support Ticket #{inquiry.ReferenceNumber}] We have received your inquiry: {inquiry.Subject}";
        var baseUrl = _configuration["App:BaseUrl"] ?? _configuration["Hosting:BaseUrl"] ?? "https://ozikol.cloud";
        var trackingUrl = $"{baseUrl.TrimEnd('/')}/support/ticket/{inquiry.ReferenceNumber}";
        var clientBody = $@"
            <div style='font-family: -apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; color: #0f172a; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px;'>
                <div style='margin-bottom: 24px;'>
                    <span style='background: #e0f2fe; color: #0284c7; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;'>TICKET #{inquiry.ReferenceNumber}</span>
                    <h2 style='color: #0f172a; margin: 12px 0 6px 0; font-size: 22px; font-weight: 800;'>Support Inquiry Received</h2>
                    <p style='color: #64748b; font-size: 14px; margin: 0;'>Hello {inquiry.FullName}, our enterprise engineering specialists are on it.</p>
                </div>
                <div style='background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; margin-bottom: 20px;'>
                    <div style='margin-bottom: 10px;'><strong style='color: #475569; font-size: 12px; text-transform: uppercase;'>Subject:</strong> <div style='color: #0f172a; font-size: 15px; font-weight: 600;'>{inquiry.Subject}</div></div>
                    <div style='margin-bottom: 10px;'><strong style='color: #475569; font-size: 12px; text-transform: uppercase;'>Category:</strong> <div style='color: #0f172a; font-size: 14px;'>{inquiry.InquiryType}</div></div>
                    <div><strong style='color: #475569; font-size: 12px; text-transform: uppercase;'>Inquiry Summary:</strong> <div style='color: #334155; font-size: 14px; margin-top: 4px; white-space: pre-wrap;'>{inquiry.Message}</div></div>
                </div>
                <p style='color: #475569; font-size: 14px; line-height: 1.5;'>
                    You can view the full discussion, review specialist responses, and submit follow-up replies directly in the Support Ticket Portal.
                </p>
                <div style='margin: 24px 0; text-align: center;'>
                    <a href='{trackingUrl}' style='display: inline-block; background: #0284c7; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 14px; text-decoration: none;'>View Ticket Thread &rarr;</a>
                </div>
                <p style='color: #94a3b8; font-size: 12px; margin: 0; text-align: center;'>Keep ticket code #{inquiry.ReferenceNumber} handy for any future inquiries.</p>
            </div>
        ";
        await SendEmailAsync(inquiry.Email, clientSubject, clientBody, null, cancellationToken);

        // 2. Administrator Notification Pool
        var settings = await GetPlatformSettingAsync(cancellationToken);
        if (settings.EnableAdminNotifications)
        {
            var adminEmails = ResolveAdminEmails(settings.SupportAdminEmails);
            if (adminEmails.Count > 0)
            {
                var adminSubject = $"[Staff Alert] New Ticket #{inquiry.ReferenceNumber} - {inquiry.Subject} ({inquiry.Organization})";
                var adminBody = $@"
                    <div style='font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #0f172a; color: #ffffff; padding: 24px; border-radius: 12px;'>
                        <h3 style='color: #38bdf8; margin-top: 0;'>New Client Ticket: #{inquiry.ReferenceNumber}</h3>
                        <p style='color: #94a3b8; font-size: 13px;'>Category: <strong>{inquiry.InquiryType}</strong> | Locale: {inquiry.Culture}</p>
                        <hr style='border: none; border-top: 1px solid #334155; margin: 16px 0;' />
                        <p><strong>From:</strong> {inquiry.FullName} ({inquiry.Email})</p>
                        <p><strong>Organization:</strong> {inquiry.Organization} ({(string.IsNullOrWhiteSpace(inquiry.JobTitle) ? "Not specified" : inquiry.JobTitle)})</p>
                        <p><strong>Subject:</strong> {inquiry.Subject}</p>
                        <div style='background: #1e293b; padding: 14px; border-radius: 6px; font-size: 14px; color: #e2e8f0; white-space: pre-wrap;'>{inquiry.Message}</div>
                    </div>
                ";
                await SendToAdminPoolAsync(adminEmails, adminSubject, adminBody, cancellationToken);
            }
        }
    }

    /// <summary>
    /// Dispatches thread reply notifications: alerts the client if staff responded,
    /// or alerts the support administrator pool if the client submitted a reply.
    /// </summary>
    public async Task SendTicketReplyDualAsync(MasterSupportInquiry inquiry, MasterTicketReply reply, CancellationToken cancellationToken = default)
    {
        var baseUrl = _configuration["App:BaseUrl"] ?? _configuration["Hosting:BaseUrl"] ?? "https://ozikol.cloud";
        var trackingUrl = $"{baseUrl.TrimEnd('/')}/support/ticket/{inquiry.ReferenceNumber}";

        if (reply.IsStaffReply)
        {
            // Alert the customer of specialist reply
            var subject = $"[Ticket #{inquiry.ReferenceNumber}] New Response from Support Specialist";
            var body = $@"
                <div style='font-family: -apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; color: #0f172a; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px;'>
                    <span style='background: #e0f2fe; color: #0284c7; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700;'>TICKET #{inquiry.ReferenceNumber}</span>
                    <h3 style='color: #0f172a; margin: 12px 0;'>New Response from Support</h3>
                    <p style='color: #475569; font-size: 14px;'><strong>{reply.SenderName}</strong> has posted an update to your inquiry:</p>
                    <div style='background: #f8fafc; border-left: 4px solid #0284c7; padding: 16px; border-radius: 6px; font-size: 14px; color: #1e293b; margin: 16px 0; white-space: pre-wrap;'>{reply.Message}</div>
                    <div style='text-align: center; margin: 24px 0;'>
                        <a href='{trackingUrl}' style='display: inline-block; background: #0284c7; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 14px; text-decoration: none;'>Open Ticket Thread &rarr;</a>
                    </div>
                </div>
            ";
            await SendEmailAsync(inquiry.Email, subject, body, null, cancellationToken);
        }
        else
        {
            // Customer replied; alert administrator pool
            var settings = await GetPlatformSettingAsync(cancellationToken);
            if (settings.EnableAdminNotifications)
            {
                var adminEmails = ResolveAdminEmails(settings.SupportAdminEmails);
                if (adminEmails.Count > 0)
                {
                    var subject = $"[Customer Reply] Ticket #{inquiry.ReferenceNumber} - {reply.SenderName}";
                    var body = $@"
                        <div style='font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #0f172a; color: #ffffff; padding: 24px; border-radius: 12px;'>
                            <h3 style='color: #38bdf8; margin-top: 0;'>Customer Reply on Ticket #{inquiry.ReferenceNumber}</h3>
                            <p><strong>Sender:</strong> {reply.SenderName} ({reply.SenderEmail})</p>
                            <p><strong>Original Subject:</strong> {inquiry.Subject}</p>
                            <div style='background: #1e293b; padding: 14px; border-radius: 6px; font-size: 14px; color: #e2e8f0; white-space: pre-wrap;'>{reply.Message}</div>
                        </div>
                    ";
                    await SendToAdminPoolAsync(adminEmails, subject, body, cancellationToken);
                }
            }
        }
    }

    /// <summary>
    /// Dispatches dual confirmation emails for affiliate partner registrations.
    /// </summary>
    public async Task SendPartnerApplicationDualAsync(MasterAffiliatePartner partner, CancellationToken cancellationToken = default)
    {
        // 1. Partner Receipt
        var partnerSubject = $"Welcome to the Ozikol Partner Network - Ref #{partner.PartnerCode}";
        var partnerBody = $@"
            <div style='font-family: -apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; color: #0f172a; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px;'>
                <h2 style='color: #0f172a; margin-top: 0;'>Partner Registration Received</h2>
                <p style='color: #475569; font-size: 15px;'>Hello {partner.FullName}, thank you for applying to the Ozikol Global Partner Network.</p>
                <div style='background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; margin: 20px 0;'>
                    <div><strong style='color: #64748b; font-size: 12px; text-transform: uppercase;'>Partner Reference Code:</strong> <div style='font-size: 16px; font-weight: 700; color: #0284c7; font-family: monospace;'>{partner.PartnerCode}</div></div>
                    <div style='margin-top: 10px;'><strong style='color: #64748b; font-size: 12px; text-transform: uppercase;'>Website or Channel:</strong> <div style='font-size: 14px; color: #0f172a;'>{(string.IsNullOrWhiteSpace(partner.WebsiteOrChannel) ? "Direct Network" : partner.WebsiteOrChannel)}</div></div>
                    <div style='margin-top: 10px;'><strong style='color: #64748b; font-size: 12px; text-transform: uppercase;'>Commission Rate:</strong> <div style='font-size: 14px; color: #10b981; font-weight: 700;'>{partner.CommissionRatePercentage}% Recurring</div></div>
                </div>
                <p style='color: #475569; font-size: 14px;'>Our Strategic Partnerships team is reviewing your profile and will be in touch shortly.</p>
            </div>
        ";
        await SendEmailAsync(partner.Email, partnerSubject, partnerBody, null, cancellationToken);

        // 2. Partner Admin Notification Pool
        var settings = await GetPlatformSettingAsync(cancellationToken);
        if (settings.EnableAdminNotifications)
        {
            var adminEmails = ResolveAdminEmails(settings.PartnerAdminEmails);
            if (adminEmails.Count > 0)
            {
                var adminSubject = $"[Partner Alert] New Partner Application: {partner.FullName} (#{partner.PartnerCode})";
                var adminBody = $@"
                    <div style='font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #0f172a; color: #ffffff; padding: 24px; border-radius: 12px;'>
                        <h3 style='color: #38bdf8; margin-top: 0;'>New Partner Application: #{partner.PartnerCode}</h3>
                        <p><strong>Partner:</strong> {partner.FullName} ({partner.Email})</p>
                        <p><strong>Phone:</strong> {(string.IsNullOrWhiteSpace(partner.PhoneNumber) ? "Not provided" : partner.PhoneNumber)}</p>
                        <p><strong>Website / Channel:</strong> {(string.IsNullOrWhiteSpace(partner.WebsiteOrChannel) ? "Direct Network" : partner.WebsiteOrChannel)}</p>
                        <p><strong>Initial Commission:</strong> {partner.CommissionRatePercentage}%</p>
                    </div>
                ";
                await SendToAdminPoolAsync(adminEmails, adminSubject, adminBody, cancellationToken);
            }
        }
    }

    /// <summary>
    /// Dispatches dual confirmation emails for creator program applications.
    /// </summary>
    public async Task SendCreatorApplicationDualAsync(MasterCreatorApplication application, CancellationToken cancellationToken = default)
    {
        // 1. Creator Receipt
        var creatorSubject = $"Ozikol Creator Program: Application #{application.CreatorCode} Acknowledged";
        var creatorBody = $@"
            <div style='font-family: -apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; color: #0f172a; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px;'>
                <h2 style='color: #0f172a; margin-top: 0;'>Creator Application Received</h2>
                <p style='color: #475569; font-size: 15px;'>Hello {application.FullName}, thank you for applying to the Ozikol Creator Studio.</p>
                <div style='background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; margin: 20px 0;'>
                    <div><strong style='color: #64748b; font-size: 12px; text-transform: uppercase;'>Creator Application Code:</strong> <div style='font-size: 16px; font-weight: 700; color: #8b5cf6; font-family: monospace;'>{application.CreatorCode}</div></div>
                    <div style='margin-top: 10px;'><strong style='color: #64748b; font-size: 12px; text-transform: uppercase;'>Design Specialty:</strong> <div style='font-size: 14px; color: #0f172a;'>{application.Specialization}</div></div>
                    <div style='margin-top: 10px;'><strong style='color: #64748b; font-size: 12px; text-transform: uppercase;'>Portfolio:</strong> <div style='font-size: 14px; color: #0284c7;'><a href='{application.PortfolioUrl}'>{application.PortfolioUrl}</a></div></div>
                </div>
                <p style='color: #475569; font-size: 14px;'>Our Marketplace Design Curation Committee is reviewing your submission.</p>
            </div>
        ";
        await SendEmailAsync(application.Email, creatorSubject, creatorBody, null, cancellationToken);

        // 2. Creator Admin Notification Pool
        var settings = await GetPlatformSettingAsync(cancellationToken);
        if (settings.EnableAdminNotifications)
        {
            var adminEmails = ResolveAdminEmails(settings.CreatorAdminEmails);
            if (adminEmails.Count > 0)
            {
                var adminSubject = $"[Creator Alert] New Creator Application: {application.FullName} ({application.Specialization})";
                var adminBody = $@"
                    <div style='font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #0f172a; color: #ffffff; padding: 24px; border-radius: 12px;'>
                        <h3 style='color: #a78bfa; margin-top: 0;'>New Creator Studio Application: #{application.CreatorCode}</h3>
                        <p><strong>Creator:</strong> {application.FullName} ({application.Email})</p>
                        <p><strong>Specialty:</strong> {application.Specialization}</p>
                        <p><strong>Studio / Brand:</strong> {(string.IsNullOrWhiteSpace(application.StudioOrBrandName) ? "Independent" : application.StudioOrBrandName)}</p>
                        <p><strong>Portfolio:</strong> <a href='{application.PortfolioUrl}' style='color: #38bdf8;'>{application.PortfolioUrl}</a></p>
                        <p><strong>Proposal Pitch:</strong> {application.ProposalPitch}</p>
                    </div>
                ";
                await SendToAdminPoolAsync(adminEmails, adminSubject, adminBody, cancellationToken);
            }
        }
    }

    /// <summary>
    /// Dispatches dual confirmation emails for job candidate applications.
    /// </summary>
    public async Task SendJobApplicationDualAsync(MasterJobApplication application, string openingTitle, CancellationToken cancellationToken = default)
    {
        // 1. Candidate Receipt
        var candidateSubject = $"Application Received: {openingTitle} at Ozikol - Ref #{application.ApplicationReference}";
        var candidateBody = $@"
            <div style='font-family: -apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; color: #0f172a; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px;'>
                <h2 style='color: #0f172a; margin-top: 0;'>Application Acknowledged</h2>
                <p style='color: #475569; font-size: 15px;'>Hello {application.FullName}, thank you for your interest in joining the Ozikol engineering and platform team.</p>
                <div style='background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; margin: 20px 0;'>
                    <div><strong style='color: #64748b; font-size: 12px; text-transform: uppercase;'>Role Applied For:</strong> <div style='font-size: 16px; font-weight: 700; color: #0f172a;'>{openingTitle}</div></div>
                    <div style='margin-top: 10px;'><strong style='color: #64748b; font-size: 12px; text-transform: uppercase;'>Application Reference:</strong> <div style='font-size: 14px; color: #0284c7; font-family: monospace;'>#{application.ApplicationReference}</div></div>
                </div>
                <p style='color: #475569; font-size: 14px;'>Our Talent Acquisition team will carefully review your qualifications and reach out regarding next steps.</p>
            </div>
        ";
        await SendEmailAsync(application.Email, candidateSubject, candidateBody, null, cancellationToken);

        // 2. Careers Admin Notification Pool
        var settings = await GetPlatformSettingAsync(cancellationToken);
        if (settings.EnableAdminNotifications)
        {
            var adminEmails = ResolveAdminEmails(settings.CareersAdminEmails);
            if (adminEmails.Count > 0)
            {
                var adminSubject = $"[Talent Alert] New Candidate for {openingTitle}: {application.FullName}";
                var adminBody = $@"
                    <div style='font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #0f172a; color: #ffffff; padding: 24px; border-radius: 12px;'>
                        <h3 style='color: #38bdf8; margin-top: 0;'>New Application: {openingTitle}</h3>
                        <p><strong>Candidate:</strong> {application.FullName} ({application.Email})</p>
                        <p><strong>Phone:</strong> {(string.IsNullOrWhiteSpace(application.PhoneNumber) ? "Not provided" : application.PhoneNumber)}</p>
                        <p><strong>Location:</strong> {application.City}, {application.Country}</p>
                        <p><strong>LinkedIn / Portfolio:</strong> {(string.IsNullOrWhiteSpace(application.LinkedInOrPortfolioUrl) ? "Not provided" : application.LinkedInOrPortfolioUrl)}</p>
                        <p><strong>Reference:</strong> #{application.ApplicationReference}</p>
                    </div>
                ";
                await SendToAdminPoolAsync(adminEmails, adminSubject, adminBody, cancellationToken);
            }
        }
    }

    /// <summary>
    /// Dispatches dual confirmation emails for certification exam bookings.
    /// </summary>
    public async Task SendExamBookingDualAsync(string candidateName, string candidateEmail, string examTitle, string bookingRef, CancellationToken cancellationToken = default)
    {
        // 1. Candidate Voucher
        var voucherSubject = $"Ozikol Academy: Certification Exam Registration Confirmation - Ref #{bookingRef}";
        var voucherBody = $@"
            <div style='font-family: -apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; color: #0f172a; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px;'>
                <div style='text-align: center; margin-bottom: 24px;'>
                    <span style='background: #fef3c7; color: #b45309; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700;'>EXAM BOOKING CONFIRMATION</span>
                    <h2 style='color: #0f172a; margin: 12px 0 6px 0; font-size: 22px; font-weight: 800;'>{examTitle}</h2>
                    <p style='color: #64748b; font-size: 14px; margin: 0;'>Candidate: {candidateName}</p>
                </div>
                <div style='background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin: 20px 0;'>
                    <div style='font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;'>Booking Voucher Reference:</div>
                    <div style='font-size: 20px; font-weight: 800; color: #0284c7; font-family: monospace; letter-spacing: 1px; margin-top: 4px;'>{bookingRef}</div>
                    <div style='margin-top: 14px; font-size: 13px; color: #475569;'>
                        Your proctored online testing voucher has been registered. You will receive an invitation to select your proctored timeslot within 24 hours.
                    </div>
                </div>
                <p style='color: #475569; font-size: 14px; line-height: 1.5;'>
                    Please ensure your government-issued identification matches the candidate name provided above.
                </p>
            </div>
        ";
        await SendEmailAsync(candidateEmail, voucherSubject, voucherBody, null, cancellationToken);

        // 2. Academy Admin Notification Pool
        var settings = await GetPlatformSettingAsync(cancellationToken);
        if (settings.EnableAdminNotifications)
        {
            var adminEmails = ResolveAdminEmails(settings.CertificationAdminEmails);
            if (adminEmails.Count > 0)
            {
                var adminSubject = $"[Academy Alert] New Exam Booking: {candidateName} ({examTitle})";
                var adminBody = $@"
                    <div style='font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #0f172a; color: #ffffff; padding: 24px; border-radius: 12px;'>
                        <h3 style='color: #f59e0b; margin-top: 0;'>New Certification Booking</h3>
                        <p><strong>Candidate:</strong> {candidateName} ({candidateEmail})</p>
                        <p><strong>Exam Track:</strong> {examTitle}</p>
                        <p><strong>Booking Voucher:</strong> #{bookingRef}</p>
                    </div>
                ";
                await SendToAdminPoolAsync(adminEmails, adminSubject, adminBody, cancellationToken);
            }
        }
    }

    /// <summary>
    /// Dispatches subscription confirmation to a new newsletter digest subscriber.
    /// </summary>
    public async Task SendNewsletterSubscriptionAsync(string email, CancellationToken cancellationToken = default)
    {
        var subject = "Welcome to Ozikol Insights: Subscription Confirmed";
        var body = $@"
            <div style='font-family: -apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; color: #0f172a; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px;'>
                <h2 style='color: #0f172a; margin-top: 0;'>Welcome to Ozikol Insights</h2>
                <p style='color: #475569; font-size: 15px;'>Thank you for subscribing to our executive engineering and business technology digest.</p>
                <p style='color: #475569; font-size: 14px;'>You will receive bi-weekly architectural dispatches, enterprise case studies, and platform updates directly to <strong>{email}</strong>.</p>
            </div>
        ";
        await SendEmailAsync(email, subject, body, null, cancellationToken);
    }

    /// <summary>
    /// Dispatches dual confirmation emails when a promotional voucher application is submitted:
    /// a branded receipt to the applicant and notifications to the central partner/support administrator pool.
    /// </summary>
    /// <param name="app">The submitted voucher application entity.</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    public async Task SendVoucherApplicationDualAsync(MasterVoucherApplication app, CancellationToken cancellationToken = default)
    {
        var settings = await GetPlatformSettingAsync(cancellationToken);
        var baseUrl = _configuration["App:BaseUrl"] ?? _configuration["Hosting:BaseUrl"] ?? "https://ozikol.cloud";

        // 1. Applicant Confirmation Receipt
        var applicantSubject = $"[Voucher Application #{app.ReferenceNumber}] We have received your request for {app.OrganizationName}";
        var applicantBody = $@"
            <div style='font-family: -apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; color: #0f172a; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px;'>
                <div style='margin-bottom: 24px;'>
                    <span style='background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;'>APPLICATION #{app.ReferenceNumber}</span>
                    <h2 style='color: #0f172a; margin: 12px 0 6px 0; font-size: 22px; font-weight: 800;'>Promotional Voucher Request Received</h2>
                    <p style='color: #64748b; font-size: 14px; margin: 0;'>Hello {app.FullName}, thank you for completing our community engagement eligibility steps.</p>
                </div>
                <div style='background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 20px;'>
                    <div style='margin-bottom: 10px;'><strong style='color: #475569; font-size: 12px; text-transform: uppercase;'>Organization:</strong> <div style='color: #0f172a; font-size: 15px; font-weight: 700;'>{app.OrganizationName}</div></div>
                    <div style='margin-bottom: 10px;'><strong style='color: #475569; font-size: 12px; text-transform: uppercase;'>Target Workspace:</strong> <div style='color: #0284c7; font-size: 14px; font-weight: 600;'>{app.WorkspaceSlug}.ozikol.cloud</div></div>
                    <div style='margin-bottom: 10px;'><strong style='color: #475569; font-size: 12px; text-transform: uppercase;'>Status:</strong> <div style='color: #d97706; font-size: 14px; font-weight: 700;'>Under Verification Review</div></div>
                </div>
                <p style='color: #334155; font-size: 14px; line-height: 1.6;'>
                    Our partnership team is verifying your submitted social media handles. Once approved, you will receive an official email containing your unique 100% discount promotional voucher code.
                </p>
                <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 28px 0 20px 0;' />
                <p style='color: #94a3b8; font-size: 12px; text-align: center; margin: 0;'>
                    Ozikol Business Command Center
                </p>
            </div>
        ";

        await SendEmailAsync(app.WorkEmail, applicantSubject, applicantBody, null, cancellationToken);

        // 2. Admin Pool Notification
        if (settings.EnableAdminNotifications)
        {
            var adminPool = ResolveAdminEmails(settings.PartnerAdminEmails ?? settings.SupportAdminEmails);
            if (adminPool.Any())
            {
                var adminSubject = $"[New Voucher Application] #{app.ReferenceNumber} - {app.OrganizationName}";
                var adminUrl = $"{baseUrl.TrimEnd('/')}/centralwks/voucher-applications";
                var adminBody = $@"
                    <div style='font-family: -apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; color: #0f172a; padding: 28px; border: 1px solid #e2e8f0; border-radius: 12px;'>
                        <h3 style='margin: 0 0 16px 0; font-size: 18px; color: #0f172a;'>New 1-Year Voucher Application</h3>
                        <p style='font-size: 14px; color: #334155; margin: 0 0 16px 0;'>A new organization has submitted proof of social engagement for voucher eligibility.</p>
                        <div style='background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; font-size: 13.5px; line-height: 1.6;'>
                            <div><strong>Reference:</strong> {app.ReferenceNumber}</div>
                            <div><strong>Applicant:</strong> {app.FullName} ({app.WorkEmail})</div>
                            <div><strong>Organization:</strong> {app.OrganizationName}</div>
                            <div><strong>X / Twitter:</strong> {app.TwitterHandle ?? "N/A"}</div>
                            <div><strong>LinkedIn:</strong> {app.LinkedInProfile ?? "N/A"}</div>
                            <div><strong>YouTube:</strong> {app.YouTubeHandle ?? "N/A"}</div>
                            <div><strong>Snapchat:</strong> {app.SnapchatHandle ?? "N/A"}</div>
                        </div>
                        <div style='margin-top: 20px; text-align: center;'>
                            <a href='{adminUrl}' style='display: inline-block; background: #0f172a; color: #ffffff; padding: 10px 22px; border-radius: 6px; font-size: 13.5px; font-weight: 700; text-decoration: none;'>Review & Issue Voucher &rarr;</a>
                        </div>
                    </div>
                ";

                await SendToAdminPoolAsync(adminPool, adminSubject, adminBody, cancellationToken);
            }
        }
    }

    /// <summary>
    /// Dispatches the official voucher approval email containing the unique coupon code, duration, granted feature scope, discount percentage, and 1-click activation link.
    /// </summary>
    /// <param name="app">The approved voucher application.</param>
    /// <param name="couponCode">The generated promo coupon code.</param>
    /// <param name="durationDays">Number of access days granted (e.g. 365).</param>
    /// <param name="featuresSummary">Human-readable summary of features included.</param>
    /// <param name="discountPercentage">The percentage discount granted (e.g. 100.00%, 50.00%, 30.00%).</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>True if delivered; false otherwise.</returns>
    public async Task<bool> SendVoucherApprovedEmailAsync(MasterVoucherApplication app, string couponCode, int durationDays, string? featuresSummary, decimal discountPercentage = 100.00m, CancellationToken cancellationToken = default)
    {
        var settings = await GetPlatformSettingAsync(cancellationToken);
        var baseUrl = _configuration["App:BaseUrl"] ?? _configuration["Hosting:BaseUrl"] ?? "https://ozikol.cloud";
        var activationUrl = $"{baseUrl.TrimEnd('/')}/auth/get-started?coupon={Uri.EscapeDataString(couponCode)}";

        var durationLabel = durationDays >= 365 ? "1 Full Year (365 Days)" : $"{durationDays} Days";
        var featuresLabel = string.IsNullOrWhiteSpace(featuresSummary) ? "All Platform Capabilities (Full Suite)" : featuresSummary;
        var discountLabel = discountPercentage >= 100.00m ? "100% Free" : $"{discountPercentage:G29}% OFF";

        var subject = $"Congratulations! Your Ozikol Promotional Voucher [{couponCode}] ({discountLabel}) is Ready!";
        var body = $@"
            <div style='font-family: -apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; color: #0f172a; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px;'>
                <div style='text-align: center; margin-bottom: 24px;'>
                    <span style='background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 4px 14px; border-radius: 9999px; font-size: 12px; font-weight: 800; letter-spacing: 0.5px;'>VOUCHER APPROVED &bull; {discountLabel}</span>
                    <h2 style='color: #0f172a; margin: 12px 0 6px 0; font-size: 24px; font-weight: 800;'>Your Promotional Voucher is Ready!</h2>
                    <p style='color: #64748b; font-size: 14px; margin: 0;'>Congratulations {app.FullName}! Your community verification has been approved for <strong>{app.OrganizationName}</strong>.</p>
                </div>

                <div style='background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 2px solid #10b981; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;'>
                    <div style='font-size: 12px; font-weight: 700; color: #065f46; text-transform: uppercase; letter-spacing: 1px;'>Your {discountLabel} Voucher Code:</div>
                    <div style='font-size: 32px; font-weight: 900; color: #047857; letter-spacing: 4px; font-family: monospace; padding: 10px 0;'>{couponCode}</div>
                    <div style='display: flex; justify-content: center; gap: 16px; margin-top: 10px; font-size: 13px; color: #065f46; font-weight: 600; flex-wrap: wrap;'>
                        <span>🏷 <strong>Discount:</strong> {discountLabel}</span>
                        <span>⏱ <strong>Duration:</strong> {durationLabel}</span>
                        <span>✨ <strong>Scope:</strong> {featuresLabel}</span>
                    </div>
                </div>

                <div style='text-align: center; margin-bottom: 28px;'>
                    <a href='{activationUrl}' style='display: inline-block; background: #10b981; color: #ffffff; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 800; text-decoration: none; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);'>
                        Activate Workspace with Voucher &rarr;
                    </a>
                    <div style='font-size: 12px; color: #64748b; margin-top: 8px;'>Clicking will open setup with voucher code pre-applied.</div>
                </div>

                <div style='background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; font-size: 13px; color: #475569; line-height: 1.5;'>
                    <strong>How to Redeem:</strong> If you are setting up manually, enter code <code>{couponCode}</code> at Step 2 (Features & Promo) of the Get Started onboarding flow.
                </div>

                <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 28px 0 20px 0;' />
                <p style='color: #94a3b8; font-size: 12px; text-align: center; margin: 0;'>
                    Ozikol Business Command Center
                </p>
            </div>
        ";

        return await SendEmailAsync(app.WorkEmail, subject, body, null, cancellationToken);
    }



    private async Task<MasterPlatformSetting> GetPlatformSettingAsync(CancellationToken cancellationToken)
    {
        try
        {
            var setting = await _masterCatalogDbContext.MasterPlatformSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == 1, cancellationToken);

            if (setting != null)
            {
                return setting;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Unable to query MasterPlatformSettings: {Message}", ex.Message);
        }

        return new MasterPlatformSetting
        {
            Id = 1,
            PlatformName = "Ozikol",
            EnableAdminNotifications = true,
            SupportAdminEmails = null,
            PartnerAdminEmails = null,
            CreatorAdminEmails = null,
            CareersAdminEmails = null,
            CertificationAdminEmails = null
        };
    }

    private static List<string> ParseEmailPool(string? rawPool)
    {
        var list = new List<string>();
        if (string.IsNullOrWhiteSpace(rawPool))
        {
            return list;
        }

        var separators = new[] { ',', ';', '\r', '\n', '\t', ' ' };
        var parts = rawPool.Split(separators, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        foreach (var p in parts)
        {
            if (p.Contains('@') && p.Contains('.'))
            {
                if (!list.Contains(p, StringComparer.OrdinalIgnoreCase))
                {
                    list.Add(p);
                }
            }
        }

        return list;
    }

    private List<string> ResolveAdminEmails(string? specificPool)
    {
        var emails = ParseEmailPool(specificPool);
        if (emails.Count == 0)
        {
            var fallback = _configuration["POSTMARK_ADMIN_EMAIL"]
                        ?? _configuration["Postmark:AdminEmail"]
                        ?? _configuration["ErrorAlertSettings:RecipientEmails"]
                        ?? _configuration["EmailSettings:AdminEmail"];

            emails = ParseEmailPool(fallback);
        }
        return emails;
    }

    private async Task SendToAdminPoolAsync(List<string> adminEmails, string subject, string htmlBody, CancellationToken cancellationToken)
    {
        if (adminEmails == null || adminEmails.Count == 0) return;
        foreach (var adminEmail in adminEmails)
        {
            try
            {
                await SendEmailAsync(adminEmail, subject, htmlBody, provider: null, cancellationToken: cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to deliver administrative notification to {Email}", adminEmail);
            }
        }
    }

    /// <inheritdoc />
    public async Task<bool> SendOperatorInvitationEmailAsync(
        string toEmail,
        string fullName,
        string userName,
        string department,
        IList<string> roles,
        string setupUrl,
        CancellationToken cancellationToken = default)
    {
        var subject = "Welcome to Ozikol Central — Activate Your Operator Account";
        var rolesHtml = string.Join(" ", roles.Select(r => 
            $"<span style='display:inline-block; padding:3px 10px; margin:2px; background:#ede9fe; color:#6d28d9; border-radius:4px; font-size:12px; font-weight:bold;'>{r}</span>"));

        var htmlBody = $@"
            <div style='font-family: Arial, -apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b;'>
                <div style='text-align: center; margin-bottom: 24px;'>
                    <h1 style='color: #4f46e5; font-size: 24px; margin: 0;'>Ozikol Central Command</h1>
                    <p style='color: #64748b; font-size: 14px; margin: 4px 0 0 0;'>Administrative Operator Onboarding</p>
                </div>

                <div style='background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);'>
                    <h2 style='font-size: 18px; color: #0f172a; margin-top: 0;'>Hello {fullName},</h2>
                    <p style='font-size: 14px; color: #475569; line-height: 1.6;'>
                        An administrative operator account has been created for you on <strong>Ozikol Central</strong>. To activate your account and establish your secret login password, please use the secure link below:
                    </p>

                    <div style='background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;'>
                        <div style='margin-bottom: 8px;'><strong style='color: #334155; font-size: 13px;'>Username:</strong> <code style='color: #4f46e5; background: #e0e7ff; padding: 2px 6px; border-radius: 4px;'>{userName}</code></div>
                        <div style='margin-bottom: 8px;'><strong style='color: #334155; font-size: 13px;'>Work Email:</strong> <span style='color: #334155;'>{toEmail}</span></div>
                        <div style='margin-bottom: 8px;'><strong style='color: #334155; font-size: 13px;'>Department:</strong> <span style='color: #334155;'>{department}</span></div>
                        <div><strong style='color: #334155; font-size: 13px;'>Assigned Roles:</strong><div style='margin-top: 4px;'>{rolesHtml}</div></div>
                    </div>

                    <div style='text-align: center; margin: 28px 0;'>
                        <a href='{setupUrl}' style='display: inline-block; padding: 14px 28px; background: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);'>
                            Set Up Password &amp; Activate Account &rarr;
                        </a>
                    </div>

                    <p style='font-size: 12px; color: #94a3b8; line-height: 1.5; margin-bottom: 6px;'>
                        If the button above does not work, copy and paste this link into your browser:
                    </p>
                    <div style='background: #f1f5f9; padding: 10px; border-radius: 6px; word-break: break-all; font-family: monospace; font-size: 11.5px; color: #475569;'>
                        {setupUrl}
                    </div>
                </div>

                <div style='text-align: center; margin-top: 24px; color: #94a3b8; font-size: 12px;'>
                    <p style='margin: 0;'>This activation link is unique to your account and valid for 24 hours.</p>
                    <p style='margin: 4px 0 0 0;'>&copy; {DateTime.UtcNow.Year} Ozikol Central Management Suite. All rights reserved.</p>
                </div>
            </div>";

        return await SendEmailAsync(toEmail, subject, htmlBody, provider: null, cancellationToken: cancellationToken);
    }
}
