using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterDomain.Security;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Application.Configuration;
using Ozikol_BCC.EmailServices.Postmark.Configuration;

namespace Ozikol_BCC.Api.Services
{
    /// <summary>
    /// Dynamically enriches platform Postmark email configuration with credentials stored
    /// centrally in the Master Catalog Database (<see cref="MasterPlatformSetting"/>) when configured.
    /// </summary>
    public sealed class MasterPlatformPostmarkPostConfigure : IPostConfigureOptions<PostmarkOptions>
    {
        private readonly IServiceProvider _serviceProvider;

        /// <summary>
        /// Initializes a new instance of the <see cref="MasterPlatformPostmarkPostConfigure"/> class.
        /// </summary>
        /// <param name="serviceProvider">Application service provider for resolving scoped DbContext on demand.</param>
        public MasterPlatformPostmarkPostConfigure(IServiceProvider serviceProvider)
        {
            _serviceProvider = serviceProvider ?? throw new ArgumentNullException(nameof(serviceProvider));
        }

        /// <summary>
        /// Applies central Master database credentials to the resolved Postmark options.
        /// </summary>
        /// <param name="name">Options instance name.</param>
        /// <param name="options">Options instance to configure.</param>
        public void PostConfigure(string? name, PostmarkOptions options)
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
                        if (!string.IsNullOrWhiteSpace(settings.PostmarkServerToken))
                        {
                            var val = OzikolDataCipher.DecryptIfNeeded(settings.PostmarkServerToken)?.Trim() ?? string.Empty;
                            if (!val.StartsWith(OzikolDataCipher.CipherPrefix, StringComparison.Ordinal))
                            {
                                options.ServerToken = val;
                            }
                        }
                        if (!string.IsNullOrWhiteSpace(settings.PostmarkDefaultFrom))
                        {
                            var val = OzikolDataCipher.DecryptIfNeeded(settings.PostmarkDefaultFrom)?.Trim() ?? string.Empty;
                            if (!val.StartsWith(OzikolDataCipher.CipherPrefix, StringComparison.Ordinal))
                            {
                                options.SenderEmail = val;
                            }
                        }
                    }
                }
            }
            catch
            {
                // Graceful fallback during DB initialization, startup healthchecks, or migrations
            }
        }
    }

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
    /// Dynamically enriches Cloudflare R2 and Edge CDN configuration with credentials stored in <see cref="MasterPlatformSetting"/>.
    /// </summary>
    public sealed class MasterPlatformCloudflareR2PostConfigure : IPostConfigureOptions<Ozikol_BCC.Application.Configuration.CloudflareR2Settings>
    {
        private readonly IServiceProvider _serviceProvider;

        /// <summary>
        /// Initializes a new instance of the <see cref="MasterPlatformCloudflareR2PostConfigure"/> class.
        /// </summary>
        /// <param name="serviceProvider">Application service provider for resolving scoped DbContext on demand.</param>
        public MasterPlatformCloudflareR2PostConfigure(IServiceProvider serviceProvider)
        {
            _serviceProvider = serviceProvider ?? throw new ArgumentNullException(nameof(serviceProvider));
        }

        /// <summary>
        /// Applies central Master database credentials to the resolved Cloudflare R2 options.
        /// </summary>
        /// <param name="name">Options instance name.</param>
        /// <param name="options">Options instance to configure.</param>
        public void PostConfigure(string? name, Ozikol_BCC.Application.Configuration.CloudflareR2Settings options)
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
                        if (!string.IsNullOrWhiteSpace(settings.CloudflareR2AccountId))
                        {
                            options.AccountId = settings.CloudflareR2AccountId.Trim();
                        }
                        if (!string.IsNullOrWhiteSpace(settings.CloudflareR2AccessKeyId))
                        {
                            options.AccessKeyId = settings.CloudflareR2AccessKeyId.Trim();
                        }
                        if (!string.IsNullOrWhiteSpace(settings.CloudflareR2SecretAccessKey))
                        {
                            var val = OzikolDataCipher.DecryptIfNeeded(settings.CloudflareR2SecretAccessKey)?.Trim() ?? string.Empty;
                            if (!val.StartsWith(OzikolDataCipher.CipherPrefix, StringComparison.Ordinal))
                            {
                                options.SecretAccessKey = val;
                            }
                        }
                        if (!string.IsNullOrWhiteSpace(settings.CloudflareR2BucketName))
                        {
                            options.BucketName = settings.CloudflareR2BucketName.Trim();
                        }
                        if (!string.IsNullOrWhiteSpace(settings.CloudflareR2PublicCdnUrl))
                        {
                            options.PublicCdnUrl = settings.CloudflareR2PublicCdnUrl.Trim();
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
}
