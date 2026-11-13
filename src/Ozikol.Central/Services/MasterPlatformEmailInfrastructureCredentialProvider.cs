using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Ozikol.MasterDomain.Security;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Infrastructure.Services.Email;

namespace Ozikol.Central.Services;

/// <summary>
/// Dynamically resolves encrypted Mailcow API and Cloudflare DNS automation credentials
/// from Central <see cref="MasterCatalogDbContext.MasterPlatformSettings"/>.
/// </summary>
public sealed class MasterPlatformEmailInfrastructureCredentialProvider : IMailInfrastructureCredentialProvider
{
    private readonly IServiceProvider _serviceProvider;

    /// <summary>
    /// Initializes a new instance of the <see cref="MasterPlatformEmailInfrastructureCredentialProvider"/> class.
    /// </summary>
    /// <param name="serviceProvider">Application service provider for resolving scoped MasterCatalogDbContext on demand.</param>
    public MasterPlatformEmailInfrastructureCredentialProvider(IServiceProvider serviceProvider)
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
                DecryptSafe(settings.CloudflareDnsApiToken));
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

