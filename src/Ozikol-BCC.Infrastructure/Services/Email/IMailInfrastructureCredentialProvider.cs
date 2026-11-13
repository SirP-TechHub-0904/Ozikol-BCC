namespace Ozikol_BCC.Infrastructure.Services.Email;

/// <summary>
/// Immutable credential bundle for Mailcow REST API provisioning and Cloudflare DNS automation,
/// resolved from encrypted Central MasterPlatformSettings.
/// </summary>
/// <param name="MailcowApiUrl">Base URL of the Mailcow server (e.g. https://mail.ozikol.cloud).</param>
/// <param name="MailcowApiKey">Decrypted Mailcow read/write API key.</param>
/// <param name="MailcowSmtpHost">SMTP hostname for MX/SPF records (e.g. mail.ozikol.cloud).</param>
/// <param name="CloudflareZoneId">Cloudflare Zone ID for the primary platform domain.</param>
/// <param name="CloudflareDnsApiToken">Decrypted Cloudflare API token with Zone:DNS:Edit permission.</param>
public sealed record MailInfrastructureCredentials(
    string? MailcowApiUrl,
    string? MailcowApiKey,
    string? MailcowSmtpHost,
    string? CloudflareZoneId,
    string? CloudflareDnsApiToken);

/// <summary>
/// Service contract for resolving Mailcow and Cloudflare DNS credentials from Central Master DB.
/// </summary>
public interface IMailInfrastructureCredentialProvider
{
    /// <summary>
    /// Reads and decrypts Mailcow and Cloudflare DNS settings from Central MasterPlatformSettings.
    /// </summary>
    /// <returns>The decrypted <see cref="MailInfrastructureCredentials"/> bundle.</returns>
    MailInfrastructureCredentials GetCredentials();
}

