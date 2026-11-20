using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Ozikol.MasterDomain.Security;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Infrastructure.Services.Email;
using Ozikol_BCC.Infrastructure.TenantSupport;

namespace Ozikol_BCC.Worker.Services;

/// <summary>
/// Resolves Mailcow SMTP/API and Cloudflare DNS credentials from <see cref="MasterCatalogDbContext"/>
/// for background worker email and DNS health operations.
/// </summary>
public sealed class WorkerMailInfrastructureCredentialProvider : IMailInfrastructureCredentialProvider
{
    private readonly IServiceProvider _serviceProvider;

    /// <summary>
    /// Initializes a new instance of the <see cref="WorkerMailInfrastructureCredentialProvider"/> class.
    /// </summary>
    /// <param name="serviceProvider">Root service provider used to open scoped database contexts.</param>
    public WorkerMailInfrastructureCredentialProvider(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider ?? throw new ArgumentNullException(nameof(serviceProvider));
    }

    /// <inheritdoc />
    public MailInfrastructureCredentials GetCredentials()
    {
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetService<MasterCatalogDbContext>();
            var settings = db?.MasterPlatformSettings.AsNoTracking().FirstOrDefault(s => s.Id == 1);
            if (settings == null)
            {
                return new MailInfrastructureCredentials(null, null, null, null, null);
            }

            return new MailInfrastructureCredentials(
                settings.MailcowApiUrl?.Trim(),
                DecryptSafe(settings.MailcowApiKey),
                settings.MailcowSmtpHost?.Trim(),
                settings.CloudflareZoneId?.Trim(),
                DecryptSafe(settings.CloudflareDnsApiToken),
                settings.MailcowSmtpUser?.Trim(),
                DecryptSafe(settings.MailcowSmtpPassword),
                settings.MailcowSmtpPort > 0 ? settings.MailcowSmtpPort : 465);
        }
        catch
        {
            return new MailInfrastructureCredentials(null, null, null, null, null);
        }
    }

    private static string? DecryptSafe(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        var val = OzikolDataCipher.DecryptIfNeeded(raw)?.Trim();
        if (string.IsNullOrWhiteSpace(val) || val.StartsWith(OzikolDataCipher.CipherPrefix, StringComparison.Ordinal))
        {
            return null;
        }

        return val;
    }
}
