using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents the core visitor-facing website brand identity and global UI display settings for a tenant.
    /// Delivers brand names, logos, favicons, and global maintenance/coming soon status without exposing sensitive MIS configurations.
    /// </summary>
    [Table("UiSettings")]
    public class UiSetting
    {
        /// <summary>
        /// Unique primary key identifier for the tenant's UI settings record.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// The public organization or brand display name (e.g., "Apex Global Logistics", "Acme Corporation").
        /// Injected dynamically into navigation bars, page titles, and schema metadata via {{ BrandName }}.
        /// </summary>
        [Required]
        [MaxLength(200)]
        [Display(Name = "Brand Name")]
        public string BrandName { get; set; } = "Organization";

        /// <summary>
        /// Global website title or SEO default browser title (e.g., "Apex Global | Enterprise Freight & Supply Chain").
        /// </summary>
        [MaxLength(250)]
        [Display(Name = "Site Title")]
        public string? SiteTitle { get; set; }

        /// <summary>
        /// Short organizational tagline or slogan (e.g., "Engineering the Future of Scalable Infrastructure").
        /// </summary>
        [MaxLength(300)]
        [Display(Name = "Tagline")]
        public string? Tagline { get; set; }

        /// <summary>
        /// Primary brand logo image URL for standard light headers and navigation bars.
        /// Injected dynamically via {{ LogoUrl }}.
        /// </summary>
        [MaxLength(1000)]
        [Display(Name = "Primary Logo URL")]
        public string? LogoUrl { get; set; }

        /// <summary>
        /// Cloudinary asset public key or storage reference for the primary logo.
        /// </summary>
        [MaxLength(250)]
        public string? LogoKey { get; set; }

        /// <summary>
        /// Alternate white/light logo URL for dark backgrounds, hero banners, or transparent headers.
        /// Injected dynamically via {{ WhiteLogoUrl }}.
        /// </summary>
        [MaxLength(1000)]
        [Display(Name = "White / Dark-Mode Logo URL")]
        public string? WhiteLogoUrl { get; set; }

        /// <summary>
        /// Cloudinary asset public key or storage reference for the white logo.
        /// </summary>
        [MaxLength(250)]
        public string? WhiteLogoKey { get; set; }

        /// <summary>
        /// Favicon icon URL (.ico, .png, or .svg) rendered in browser tabs.
        /// Injected dynamically into head tags via {{ FaviconUrl }}.
        /// </summary>
        [MaxLength(1000)]
        [Display(Name = "Favicon URL")]
        public string? FaviconUrl { get; set; }

        /// <summary>
        /// Cloudinary asset public key or storage reference for the favicon.
        /// </summary>
        [MaxLength(250)]
        public string? FaviconKey { get; set; }

        /// <summary>
        /// Global launch / maintenance mode switch.
        /// When true, public visitor requests are redirected or gated behind the Coming Soon splash screen.
        /// </summary>
        [Display(Name = "Enable Coming Soon / Maintenance Mode")]
        public bool EnableComingSoon { get; set; } = false;

        /// <summary>
        /// Optional heading message displayed on the Coming Soon splash screen.
        /// </summary>
        [MaxLength(200)]
        [Display(Name = "Coming Soon Title")]
        public string? ComingSoonTitle { get; set; }

        /// <summary>
        /// Optional descriptive message or announcement displayed on the Coming Soon splash screen.
        /// </summary>
        [MaxLength(1000)]
        [Display(Name = "Coming Soon Message")]
        public string? ComingSoonMessage { get; set; }

        /// <summary>
        /// Controls whether the platform's "Powered by Ozikol" badge/watermark in the website footer is suppressed.
        /// Available for premium tier tenants.
        /// </summary>
        [Display(Name = "Remove Platform Watermark")]
        public bool RemovePlatformWatermark { get; set; } = false;

        /// <summary>
        /// Timestamp in UTC when the UI settings record was created.
        /// </summary>
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Timestamp in UTC when the UI settings record was last modified.
        /// </summary>
        public DateTime? UpdatedAtUtc { get; set; }
    }
}
