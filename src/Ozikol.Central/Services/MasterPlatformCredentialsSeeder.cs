using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterDomain.Security;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Services;

/// <summary>
/// Provides high-reliability C# synchronization and repair for Central platform credentials
/// stored in <see cref="MasterPlatformSetting"/>. Transparently repairs ciphertext mismatches
/// using AES-256-GCM via <see cref="OzikolDataCipher"/> so administrators can always authenticate.
/// </summary>
public static class MasterPlatformCredentialsSeeder
{
    /// <summary>
    /// Inspects the centralized platform settings record (Id = 1) and automatically repairs
    /// any missing or un-decryptable secrets using the configured environment variables.
    /// </summary>
    /// <param name="dbContext">Master catalog database context.</param>
    /// <param name="configuration">Application configuration provider (.env / environment variables).</param>
    /// <param name="logger">Optional diagnostic logger.</param>
    public static async Task<bool> SeedOrRepairPlatformSecretsAsync(
        MasterCatalogDbContext dbContext,
        IConfiguration configuration,
        ILogger? logger = null)
    {
        if (dbContext == null || configuration == null)
        {
            return false;
        }

        try
        {
            var settings = await dbContext.MasterPlatformSettings.FirstOrDefaultAsync(s => s.Id == 1);
            if (settings == null)
            {
                logger?.LogWarning("MasterPlatformSettings record Id=1 not found; skipping credentials repair.");
                return false;
            }

            bool modified = false;

            // 1. Google reCAPTCHA v2 Checkbox ("I'm not a robot")
            var envSiteKey = configuration["GoogleReCaptcha:SiteKey"]
                ?? configuration["GoogleRecaptcha:SiteKey"]
                ?? configuration["GoogleReCaptcha__SiteKey"]
                ?? configuration["RECAPTCHA_SITE_KEY"]
                ?? Environment.GetEnvironmentVariable("GoogleReCaptcha__SiteKey")
                ?? Environment.GetEnvironmentVariable("RECAPTCHA_SITE_KEY");

            var envSecretKey = configuration["GoogleReCaptcha:SecretKey"]
                ?? configuration["GoogleRecaptcha:SecretKey"]
                ?? configuration["GoogleReCaptcha__SecretKey"]
                ?? configuration["RECAPTCHA_SECRET_KEY"]
                ?? Environment.GetEnvironmentVariable("GoogleReCaptcha__SecretKey")
                ?? Environment.GetEnvironmentVariable("RECAPTCHA_SECRET_KEY");

            if (!string.IsNullOrWhiteSpace(envSiteKey) && string.IsNullOrWhiteSpace(settings.GoogleReCaptchaSiteKey))
            {
                settings.GoogleReCaptchaSiteKey = envSiteKey.Trim();
                modified = true;
                logger?.LogInformation("Synchronized GoogleReCaptchaSiteKey from environment configuration.");
            }

            // Verify if existing database secret can be decrypted cleanly
            bool recaptchaNeedsRepair = false;
            if (string.IsNullOrWhiteSpace(settings.GoogleReCaptchaSecretKey))
            {
                recaptchaNeedsRepair = true;
            }
            else
            {
                var decrypted = OzikolDataCipher.DecryptIfNeeded(settings.GoogleReCaptchaSecretKey);
                if (string.IsNullOrWhiteSpace(decrypted) || decrypted.StartsWith(OzikolDataCipher.CipherPrefix, StringComparison.Ordinal))
                {
                    recaptchaNeedsRepair = true;
                }
            }

            if (recaptchaNeedsRepair && !string.IsNullOrWhiteSpace(envSecretKey))
            {
                // Encrypt cleanly using C# AES-256-GCM
                settings.GoogleReCaptchaSecretKey = envSecretKey.Trim();
                modified = true;
                logger?.LogInformation("Repaired and encrypted GoogleReCaptchaSecretKey from environment configuration.");
            }

            // 2. Postmark Transactional Email Server Token
            var envPostmarkToken = configuration["Postmark:ServerToken"]
                ?? configuration["POSTMARK_SERVER_TOKEN"]
                ?? Environment.GetEnvironmentVariable("POSTMARK_SERVER_TOKEN");

            bool postmarkNeedsRepair = false;
            if (string.IsNullOrWhiteSpace(settings.PostmarkServerToken))
            {
                postmarkNeedsRepair = true;
            }
            else
            {
                var decrypted = OzikolDataCipher.DecryptIfNeeded(settings.PostmarkServerToken);
                if (string.IsNullOrWhiteSpace(decrypted) || decrypted.StartsWith(OzikolDataCipher.CipherPrefix, StringComparison.Ordinal))
                {
                    postmarkNeedsRepair = true;
                }
            }

            if (postmarkNeedsRepair && !string.IsNullOrWhiteSpace(envPostmarkToken))
            {
                settings.PostmarkServerToken = envPostmarkToken.Trim();
                modified = true;
                logger?.LogInformation("Repaired and encrypted PostmarkServerToken from environment configuration.");
            }

            // 3. Cloudinary API Secret
            var envCloudinarySecret = configuration["Cloudinary:ApiSecret"]
                ?? configuration["CLOUDINARY_API_SECRET"]
                ?? Environment.GetEnvironmentVariable("CLOUDINARY_API_SECRET");

            bool cloudinaryNeedsRepair = false;
            if (string.IsNullOrWhiteSpace(settings.CloudinaryApiSecret))
            {
                cloudinaryNeedsRepair = true;
            }
            else
            {
                var decrypted = OzikolDataCipher.DecryptIfNeeded(settings.CloudinaryApiSecret);
                if (string.IsNullOrWhiteSpace(decrypted) || decrypted.StartsWith(OzikolDataCipher.CipherPrefix, StringComparison.Ordinal))
                {
                    cloudinaryNeedsRepair = true;
                }
            }

            if (cloudinaryNeedsRepair && !string.IsNullOrWhiteSpace(envCloudinarySecret))
            {
                settings.CloudinaryApiSecret = envCloudinarySecret.Trim();
                modified = true;
                logger?.LogInformation("Repaired and encrypted CloudinaryApiSecret from environment configuration.");
            }

            // 4. MongoDB Logs Connection String
            var envMongoUri = configuration["MongoDB:Uri"]
                ?? configuration["MONGODB_URI"]
                ?? configuration["MONGODB_LOGS_CONNECTION_STRING"]
                ?? Environment.GetEnvironmentVariable("MONGODB_URI")
                ?? Environment.GetEnvironmentVariable("MONGODB_LOGS_CONNECTION_STRING");

            bool mongoNeedsRepair = false;
            if (string.IsNullOrWhiteSpace(settings.MongoLogsConnectionString))
            {
                mongoNeedsRepair = true;
            }
            else
            {
                var decrypted = OzikolDataCipher.DecryptIfNeeded(settings.MongoLogsConnectionString);
                if (string.IsNullOrWhiteSpace(decrypted) || decrypted.StartsWith(OzikolDataCipher.CipherPrefix, StringComparison.Ordinal))
                {
                    mongoNeedsRepair = true;
                }
            }

            if (mongoNeedsRepair && !string.IsNullOrWhiteSpace(envMongoUri))
            {
                settings.MongoLogsConnectionString = envMongoUri.Trim();
                modified = true;
                logger?.LogInformation("Repaired and encrypted MongoLogsConnectionString from environment configuration.");
            }

            if (modified)
            {
                settings.UpdatedUtc = DateTime.UtcNow;
                await dbContext.SaveChangesAsync();
                logger?.LogInformation("Successfully saved repaired centralized platform credentials to MasterPlatformSettings.");
            }

            return true;
        }
        catch (Exception ex)
        {
            logger?.LogError(ex, "Failed to repair MasterPlatformSettings credentials.");
            return false;
        }
    }

    /// <summary>
    /// Directly updates and securely encrypts platform credentials into MasterPlatformSettings (Id = 1).
    /// </summary>
    /// <param name="dbContext">Master catalog database context.</param>
    /// <param name="recaptchaSiteKey">Public reCAPTCHA site key.</param>
    /// <param name="recaptchaSecretKey">Private reCAPTCHA secret key (will be encrypted with AES-256-GCM).</param>
    /// <param name="postmarkToken">Optional Postmark server token.</param>
    /// <param name="cloudinarySecret">Optional Cloudinary API secret.</param>
    /// <param name="mongoConnectionString">Optional MongoDB connection string.</param>
    /// <returns>True if successfully updated; otherwise false.</returns>
    public static async Task<bool> DirectUpdateSecretsAsync(
        MasterCatalogDbContext dbContext,
        string? recaptchaSiteKey,
        string? recaptchaSecretKey,
        string? postmarkToken = null,
        string? cloudinarySecret = null,
        string? mongoConnectionString = null)
    {
        if (dbContext == null)
        {
            throw new ArgumentNullException(nameof(dbContext));
        }

        var settings = await dbContext.MasterPlatformSettings.FirstOrDefaultAsync(s => s.Id == 1);
        if (settings == null)
        {
            return false;
        }

        if (!string.IsNullOrWhiteSpace(recaptchaSiteKey))
        {
            settings.GoogleReCaptchaSiteKey = recaptchaSiteKey.Trim();
        }

        if (!string.IsNullOrWhiteSpace(recaptchaSecretKey))
        {
            settings.GoogleReCaptchaSecretKey = recaptchaSecretKey.Trim();
        }

        if (!string.IsNullOrWhiteSpace(postmarkToken))
        {
            settings.PostmarkServerToken = postmarkToken.Trim();
        }

        if (!string.IsNullOrWhiteSpace(cloudinarySecret))
        {
            settings.CloudinaryApiSecret = cloudinarySecret.Trim();
        }

        if (!string.IsNullOrWhiteSpace(mongoConnectionString))
        {
            settings.MongoLogsConnectionString = mongoConnectionString.Trim();
        }

        settings.UpdatedUtc = DateTime.UtcNow;
        await dbContext.SaveChangesAsync();
        return true;
    }
}
