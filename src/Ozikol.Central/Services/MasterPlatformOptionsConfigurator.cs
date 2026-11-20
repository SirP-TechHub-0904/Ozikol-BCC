using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterDomain.Security;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Application.Configuration;

namespace Ozikol.Central.Services
{
    /// <summary>
    /// Dynamically enriches Cloudinary configuration with credentials stored in <see cref="MasterPlatformSetting"/>.
    /// </summary>
    public sealed class MasterPlatformCloudinaryPostConfigure : IPostConfigureOptions<CloudinarySettings>
    {
        private readonly IServiceProvider _serviceProvider;

        /// <summary>
        /// Initializes a new instance of the <see cref="MasterPlatformCloudinaryPostConfigure"/> class.
        /// </summary>
        /// <param name="serviceProvider">Application service provider for resolving scoped DbContext on demand.</param>
        public MasterPlatformCloudinaryPostConfigure(IServiceProvider serviceProvider)
        {
            _serviceProvider = serviceProvider ?? throw new ArgumentNullException(nameof(serviceProvider));
        }

        /// <summary>
        /// Applies central Master database credentials to the resolved Cloudinary options.
        /// </summary>
        /// <param name="name">Options instance name.</param>
        /// <param name="options">Options instance to configure.</param>
        public void PostConfigure(string? name, CloudinarySettings options)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var db = scope.ServiceProvider.GetService<MasterCatalogDbContext>();
                if (db != null)
                {
                    var settings = db.MasterPlatformSettings.AsNoTracking().FirstOrDefault(s => s.Id == 1);
                    if (settings != null)
                    {
                        if (!string.IsNullOrWhiteSpace(settings.CloudinaryCloudName))
                        {
                            var val = OzikolDataCipher.DecryptIfNeeded(settings.CloudinaryCloudName)?.Trim() ?? string.Empty;
                            if (!val.StartsWith(OzikolDataCipher.CipherPrefix, StringComparison.Ordinal))
                            {
                                options.CloudName = val;
                            }
                        }
                        if (!string.IsNullOrWhiteSpace(settings.CloudinaryApiKey))
                        {
                            var val = OzikolDataCipher.DecryptIfNeeded(settings.CloudinaryApiKey)?.Trim() ?? string.Empty;
                            if (!val.StartsWith(OzikolDataCipher.CipherPrefix, StringComparison.Ordinal))
                            {
                                options.ApiKey = val;
                            }
                        }
                        if (!string.IsNullOrWhiteSpace(settings.CloudinaryApiSecret))
                        {
                            var val = OzikolDataCipher.DecryptIfNeeded(settings.CloudinaryApiSecret)?.Trim() ?? string.Empty;
                            if (!val.StartsWith(OzikolDataCipher.CipherPrefix, StringComparison.Ordinal))
                            {
                                options.ApiSecret = val;
                            }
                        }
                    }
                }
            }
            catch
            {
                // Graceful fallback during DB initialization or migrations
            }
        }
    }

    /// <summary>
    /// Dynamically resolves Sentry DSN stored in <see cref="MasterPlatformSetting"/> if not present in environment variables.
    /// </summary>
    public sealed class MasterPlatformSentryPostConfigure : IPostConfigureOptions<Sentry.AspNetCore.SentryAspNetCoreOptions>
    {
        private readonly IServiceProvider _serviceProvider;

        public MasterPlatformSentryPostConfigure(IServiceProvider serviceProvider)
        {
            _serviceProvider = serviceProvider ?? throw new ArgumentNullException(nameof(serviceProvider));
        }

        public void PostConfigure(string? name, Sentry.AspNetCore.SentryAspNetCoreOptions options)
        {
            if (!string.IsNullOrWhiteSpace(options.Dsn))
            {
                return;
            }

            try
            {
                using var scope = _serviceProvider.CreateScope();
                var db = scope.ServiceProvider.GetService<MasterCatalogDbContext>();
                var settings = db?.MasterPlatformSettings.AsNoTracking().FirstOrDefault(s => s.Id == 1);
                if (settings != null && !string.IsNullOrWhiteSpace(settings.SentryDsn))
                {
                    var dsn = settings.SentryDsn.Trim();
                    if (dsn.StartsWith("http", StringComparison.OrdinalIgnoreCase))
                    {
                        options.Dsn = dsn;
                    }
                }
            }
            catch
            {
                // Graceful fallback during DB initialization
            }
        }
    }
}
