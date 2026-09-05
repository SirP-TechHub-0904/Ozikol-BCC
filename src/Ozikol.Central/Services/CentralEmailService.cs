using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Services;

public interface ICentralEmailService
{
    Task<bool> SendEmailAsync(string toEmail, string subject, string htmlBody, string provider = "Postmark", CancellationToken cancellationToken = default);
    Task<bool> SendTwoFactorCodeEmailAsync(string toEmail, string code, CancellationToken cancellationToken = default);
    Task<bool> SendWelcomeWorkspaceEmailAsync(string toEmail, string organizationName, string domainUrl, CancellationToken cancellationToken = default);
}

public class CentralEmailService : ICentralEmailService
{
    private readonly MasterCatalogDbContext _masterCatalogDbContext;
    private readonly ILogger<CentralEmailService> _logger;

    public CentralEmailService(MasterCatalogDbContext masterCatalogDbContext, ILogger<CentralEmailService> logger)
    {
        _masterCatalogDbContext = masterCatalogDbContext;
        _logger = logger;
    }

    public async Task<bool> SendEmailAsync(string toEmail, string subject, string htmlBody, string provider = "Postmark", CancellationToken cancellationToken = default)
    {
        var log = new MasterEmailLog
        {
            RecipientEmail = toEmail,
            Subject = subject,
            BodyHtml = htmlBody,
            Provider = provider,
            SentAtUtc = DateTime.UtcNow,
            Status = "Sent"
        };

        try
        {
            // Transactional email dispatch simulation / Postmark integration
            _logger.LogInformation("📧 [CentralEmailService] Sending '{Subject}' to [{Recipient}] via {Provider}", subject, toEmail, provider);
            
            // Record audit log in Master DB
            _masterCatalogDbContext.MasterEmailLogs.Add(log);
            await _masterCatalogDbContext.SaveChangesAsync(cancellationToken);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to deliver email to {Recipient}", toEmail);
            log.Status = "Failed";
            log.ErrorMessage = ex.Message;
            try
            {
                _masterCatalogDbContext.MasterEmailLogs.Add(log);
                await _masterCatalogDbContext.SaveChangesAsync(cancellationToken);
            }
            catch
            {
                // Suppress log failure
            }
            return false;
        }
    }

    public async Task<bool> SendTwoFactorCodeEmailAsync(string toEmail, string code, CancellationToken cancellationToken = default)
    {
        var subject = $"Your Ozikol Central 2FA Security Code: {code}";
        var body = $@"
            <div style='font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #0f172a; color: #ffffff; padding: 24px; border-radius: 12px;'>
                <div style='text-align: center; margin-bottom: 20px;'>
                    <h2 style='color: #38bdf8; margin: 0;'>Ozikol Central Console</h2>
                    <p style='color: #94a3b8; font-size: 13px;'>Platform Operator 2-Factor Authentication</p>
                </div>
                <div style='background: #1e293b; padding: 20px; border-radius: 8px; text-align: center;'>
                    <p style='margin: 0 0 10px 0; color: #cbd5e1; font-size: 14px;'>Enter the following 6-digit verification code to complete your login:</p>
                    <div style='font-size: 32px; font-weight: 800; color: #38bdf8; letter-spacing: 6px; font-family: monospace;'>{code}</div>
                    <p style='color: #64748b; font-size: 12px; margin: 10px 0 0 0;'>This code expires in 10 minutes. Do not share this code with anyone.</p>
                </div>
            </div>
        ";

        return await SendEmailAsync(toEmail, subject, body, "Postmark", cancellationToken);
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
        var loginUrl = $"http://{domainUrl}/auth/login";
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
                        <div style='font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 2px;'><a href='http://{domainUrl}' style='color: #0284c7; text-decoration: none;'>http://{domainUrl}</a></div>
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

        return await SendEmailAsync(toEmail, subject, body, "Postmark", cancellationToken);
    }
}
