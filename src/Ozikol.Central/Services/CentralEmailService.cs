using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

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
    Task<bool> SendWelcomeWorkspaceEmailAsync(string toEmail, string organizationName, string domainUrl, CancellationToken cancellationToken = default);
    Task SendSupportInquiryDualAsync(MasterSupportInquiry inquiry, CancellationToken cancellationToken = default);
    Task SendTicketReplyDualAsync(MasterSupportInquiry inquiry, MasterTicketReply reply, CancellationToken cancellationToken = default);
    Task SendPartnerApplicationDualAsync(MasterAffiliatePartner partner, CancellationToken cancellationToken = default);
    Task SendCreatorApplicationDualAsync(MasterCreatorApplication application, CancellationToken cancellationToken = default);
    Task SendJobApplicationDualAsync(MasterJobApplication application, string openingTitle, CancellationToken cancellationToken = default);
    Task SendExamBookingDualAsync(string candidateName, string candidateEmail, string examTitle, string bookingRef, CancellationToken cancellationToken = default);
    Task SendNewsletterSubscriptionAsync(string email, CancellationToken cancellationToken = default);
}

public class CentralEmailService : ICentralEmailService
{
    private readonly MasterCatalogDbContext _masterCatalogDbContext;
    private readonly ILogger<CentralEmailService> _logger;
    private readonly IConfiguration _configuration;

    public CentralEmailService(
        MasterCatalogDbContext masterCatalogDbContext,
        ILogger<CentralEmailService> logger,
        IConfiguration configuration)
    {
        _masterCatalogDbContext = masterCatalogDbContext;
        _logger = logger;
        _configuration = configuration;
    }

    public async Task<bool> SendEmailAsync(string toEmail, string subject, string htmlBody, string? provider = null, CancellationToken cancellationToken = default)
    {
        var log = new MasterEmailLog
        {
            RecipientEmail = toEmail,
            Subject = subject,
            BodyHtml = htmlBody,
            Provider = provider,
            SentAtUtc = DateTime.UtcNow,
            Status = "NotSent"
        };

        try
        {
            _logger.LogInformation("📧 [CentralEmailService] Queued email '{Subject}' to [{Recipient}] with status 'NotSent'", subject, toEmail);
            
            // Record in Master DB pool with Status 'NotSent'
            _masterCatalogDbContext.MasterEmailLogs.Add(log);
            await _masterCatalogDbContext.SaveChangesAsync(cancellationToken);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to record email to pool for {Recipient}", toEmail);
            return false;
        }
    }

    public async Task<bool> SendTwoFactorCodeEmailAsync(string toEmail, string code, CancellationToken cancellationToken = default)
    {
        var subject = $"Your Ozikol Console 2FA Verification Code: {code}";
        var body = $@"
            <div style='font-family: -apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #ffffff; color: #0f172a; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px;'>
                <div style='text-align: center; margin-bottom: 24px;'>
                    <h2 style='color: #0f172a; margin: 0; font-size: 22px; font-weight: 800;'>Ozikol Console Security</h2>
                    <p style='color: #64748b; font-size: 13.5px; margin: 4px 0 0;'>Platform Operator 2-Factor Authentication</p>
                </div>
                <div style='background: #f8fafc; border: 1px solid #e2e8f0; padding: 24px; border-radius: 10px; text-align: center;'>
                    <p style='margin: 0 0 12px; color: #334155; font-size: 14px;'>Enter the following 6-digit verification code to complete your sign-in:</p>
                    <div style='font-size: 34px; font-weight: 800; color: #e11d48; letter-spacing: 8px; font-family: monospace; padding: 8px 0;'>{code}</div>
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
        var subject = $"Your Ozikol Console Password Reset Code: {code}";
        var body = $@"
            <div style='font-family: -apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #ffffff; color: #0f172a; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px;'>
                <div style='text-align: center; margin-bottom: 24px;'>
                    <h2 style='color: #0f172a; margin: 0; font-size: 22px; font-weight: 800;'>Ozikol Console Security</h2>
                    <p style='color: #64748b; font-size: 13.5px; margin: 4px 0 0;'>Operator Password Recovery</p>
                </div>
                <div style='background: #f8fafc; border: 1px solid #e2e8f0; padding: 24px; border-radius: 10px; text-align: center;'>
                    <p style='margin: 0 0 12px; color: #334155; font-size: 14px;'>Use the following 6-digit code to reset your platform operator password:</p>
                    <div style='font-size: 34px; font-weight: 800; color: #e11d48; letter-spacing: 8px; font-family: monospace; padding: 8px 0;'>{code}</div>
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
    /// Dispatches an official setup confirmation email to the administrator containing dedicated sovereign workspace details.
    /// </summary>
    /// <param name="toEmail">The administrator email address.</param>
    /// <param name="organizationName">The display name of the organization.</param>
    /// <param name="domainUrl">The primary workspace domain.</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>True if delivered; false otherwise.</returns>
    public async Task<bool> SendWelcomeWorkspaceEmailAsync(string toEmail, string organizationName, string domainUrl, CancellationToken cancellationToken = default)
    {
        var subject = $"Welcome to Ozikol: Sovereign Workspace for {organizationName} is Ready!";
        var loginUrl = $"https://{domainUrl}/auth/login";
        var body = $@"
            <div style='font-family: -apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; color: #0f172a; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px;'>
                <div style='text-align: center; margin-bottom: 24px;'>
                    <h2 style='color: #0f172a; margin: 0; font-size: 24px; font-weight: 800;'>Your Sovereign Workspace is Ready!</h2>
                    <p style='color: #64748b; font-size: 14px; margin-top: 6px;'>Enterprise Cloud Environment Setup Confirmation</p>
                </div>
                <p style='color: #334155; font-size: 15px; line-height: 1.6;'>
                    Congratulations! Your sovereign cloud environment for <strong>{organizationName}</strong> has been provisioned and initialized with your executive business suite.
                </p>
                <div style='background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin: 24px 0;'>
                    <div style='margin-bottom: 14px;'>
                        <div style='font-size: 11.5px; font-weight: 700; color: #64748b; text-transform: uppercase;'>Dedicated Website URL:</div>
                        <div style='font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 2px;'><a href='https://{domainUrl}' style='color: #0284c7; text-decoration: none;'>https://{domainUrl}</a></div>
                    </div>
                    <div style='margin-bottom: 14px;'>
                        <div style='font-size: 11.5px; font-weight: 700; color: #64748b; text-transform: uppercase;'>Administrator Login Portal:</div>
                        <div style='font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 2px;'><a href='{loginUrl}' style='color: #0284c7; text-decoration: none;'>{loginUrl}</a></div>
                    </div>
                    <div>
                        <div style='font-size: 11.5px; font-weight: 700; color: #64748b; text-transform: uppercase;'>Administrator Account:</div>
                        <div style='font-size: 14px; color: #0f172a; margin-top: 2px; font-family: monospace;'>{toEmail}</div>
                    </div>
                </div>
                <div style='background: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px 16px; border-radius: 6px; font-size: 13px; color: #1e40af; margin-bottom: 24px; line-height: 1.5;'>
                    <strong>Important Security Note:</strong> For maximum security and independence, client organizations log in directly through their dedicated website link. Bookmark your portal URL for all future team access.
                </div>
                <div style='text-align: center;'>
                    <a href='{loginUrl}' style='display: inline-block; background: #0f172a; color: #ffffff; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 700; text-decoration: none;'>Launch Command Center &rarr;</a>
                </div>
                <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 30px 0 20px 0;' />
                <p style='color: #94a3b8; font-size: 12px; text-align: center; margin: 0;'>
                    Ozikol Cloud Security &bull; Sovereign Business Operating Systems
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
            var adminEmails = ParseEmailPool(settings.SupportAdminEmails);
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
                var adminEmails = ParseEmailPool(settings.SupportAdminEmails);
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
            var adminEmails = ParseEmailPool(settings.PartnerAdminEmails);
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
            var adminEmails = ParseEmailPool(settings.CreatorAdminEmails);
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
            var adminEmails = ParseEmailPool(settings.CareersAdminEmails);
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
            var adminEmails = ParseEmailPool(settings.CertificationAdminEmails);
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

    private async Task SendToAdminPoolAsync(List<string> adminEmails, string subject, string body, CancellationToken cancellationToken)
    {
        foreach (var email in adminEmails)
        {
            await SendEmailAsync(email, subject, body, null, cancellationToken);
        }
    }
}
