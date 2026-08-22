using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;

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

    public async Task<bool> SendWelcomeWorkspaceEmailAsync(string toEmail, string organizationName, string domainUrl, CancellationToken cancellationToken = default)
    {
        var subject = $"Welcome to Ozikol Cloud: Workspace for {organizationName} is Live!";
        var body = $@"
            <div style='font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto; background: #0f172a; color: #ffffff; padding: 28px; border-radius: 12px;'>
                <h2 style='color: #38bdf8; margin-top: 0;'>Your Workspace is Ready! 🚀</h2>
                <p style='color: #cbd5e1; font-size: 14px;'>Congratulations! Your dedicated multi-tenant MIS workspace for <strong>{organizationName}</strong> has been provisioned with its isolated SQL database.</p>
                <div style='background: #1e293b; padding: 18px; border-radius: 8px; margin: 20px 0;'>
                    <p style='margin: 0; color: #94a3b8; font-size: 13px;'>Executive Dashboard URL:</p>
                    <p style='margin: 6px 0 0 0;'><a href='http://{domainUrl}' style='color: #38bdf8; font-weight: bold; text-decoration: none; font-size: 16px;'>http://{domainUrl}</a></p>
                </div>
                <p style='color: #64748b; font-size: 12px;'>Thank you for choosing Ozikol BCC Cloud.</p>
            </div>
        ";

        return await SendEmailAsync(toEmail, subject, body, "Postmark", cancellationToken);
    }
}
