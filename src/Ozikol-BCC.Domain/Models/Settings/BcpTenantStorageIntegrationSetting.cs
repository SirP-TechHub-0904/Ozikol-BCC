using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models.Settings
{
    public enum TenantStorageProvider
    {
        PlatformDefault = 0,
        CustomCloudinary = 1,
        CustomAwsS3 = 2
    }

    /// <summary>
    /// Configures custom Cloudinary or AWS S3 storage buckets if the tenant prefers to use their own account.
    /// Authority: Tenant Admin / Tenant SuperAdmin.
    /// </summary>
    public class BcpTenantStorageIntegrationSetting
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// Selected storage backend type (PlatformDefault, CustomCloudinary, CustomAwsS3).
        /// </summary>
        public TenantStorageProvider StorageProvider { get; set; } = TenantStorageProvider.PlatformDefault;

        // ── Custom Cloudinary Settings ──
        [StringLength(255)]
        public string? CloudinaryCloudName { get; set; }

        [StringLength(255)]
        public string? CloudinaryApiKey { get; set; }

        [StringLength(255)]
        public string? CloudinaryApiSecret { get; set; }

        // ── Custom AWS S3 Settings ──
        [StringLength(255)]
        public string? AwsS3BucketName { get; set; }

        [StringLength(100)]
        public string? AwsS3Region { get; set; }

        [StringLength(255)]
        public string? AwsS3AccessKey { get; set; }

        [StringLength(255)]
        public string? AwsS3SecretKey { get; set; }

        /// <summary>
        /// Root folder path name for organizing tenant uploads.
        /// </summary>
        [StringLength(255)]
        public string? FileFolderName { get; set; }
    }
}
