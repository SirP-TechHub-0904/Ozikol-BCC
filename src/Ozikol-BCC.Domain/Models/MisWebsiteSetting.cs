using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents the public-facing website brand identity, visual assets, contact information,
    /// public emails, social media links, store/e-commerce settings, and global maintenance mode for a tenant organization.
    /// Injected dynamically into layout templates, navigation bars, footers, and SEO metadata.
    /// </summary>
    [Table("MisWebsiteSettings")]
    public class MisWebsiteSetting
    {
        /// <summary>
        /// Unique primary key identifier for the website settings record.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        // ── Brand & Visual Identity ──

        /// <summary>
        /// Public organization or brand display name (e.g. "Apex Global Logistics", "Acme Corporation").
        /// Injected into templates via {{ BrandName }}.
        /// </summary>
        [Required]
        [MaxLength(200)]
        [Display(Name = "Brand Name")]
        public string BrandName { get; set; } = "Organization";

        /// <summary>
        /// Alias for BrandName / CompanyName.
        /// </summary>
        [MaxLength(200)]
        [Display(Name = "Company Name")]
        public string? CompanyName { get; set; }

        /// <summary>
        /// Abbreviated company identifier (e.g., "AGL", "ACME").
        /// </summary>
        [MaxLength(50)]
        [Display(Name = "Company Name Abbreviation")]
        public string? CompanyNameAbbreviation { get; set; }

        /// <summary>
        /// Global website title or browser tab title (e.g. "Apex Global | Enterprise Freight & Supply Chain").
        /// Injected into templates via {{ SiteTitle }}.
        /// </summary>
        [MaxLength(250)]
        [Display(Name = "Site Title")]
        public string? SiteTitle { get; set; }

        /// <summary>
        /// Alias for SiteTitle / WebsiteTitle.
        /// </summary>
        [MaxLength(250)]
        [Display(Name = "Website Title")]
        public string? WebsiteTitle { get; set; }

        /// <summary>
        /// Dashboard / Admin command center title.
        /// </summary>
        [MaxLength(250)]
        [Display(Name = "Dashboard Title")]
        public string? DashboardTitle { get; set; }

        /// <summary>
        /// Short organizational tagline or slogan (e.g. "Engineering the Future of Scalable Infrastructure").
        /// Injected into templates via {{ Tagline }}.
        /// </summary>
        [MaxLength(300)]
        [Display(Name = "Tagline")]
        public string? Tagline { get; set; }

        /// <summary>
        /// Detailed company description or mission summary.
        /// </summary>
        [MaxLength(2000)]
        [Display(Name = "Company Description")]
        public string? CompanyDescription { get; set; }

        /// <summary>
        /// Company official external website link if applicable.
        /// </summary>
        [MaxLength(500)]
        [Display(Name = "Company Website Link")]
        public string? CompanyWebsiteLink { get; set; }

        /// <summary>
        /// Primary brand logo image URL for standard light headers and navigation bars.
        /// Injected into templates via {{ LogoUrl }}.
        /// </summary>
        [MaxLength(1000)]
        [Display(Name = "Primary Logo URL")]
        public string? LogoUrl { get; set; }

        /// <summary>
        /// Alias for LogoUrl.
        /// </summary>
        [MaxLength(1000)]
        public string? CompanyLogoUrl { get; set; }

        /// <summary>
        /// Cloudinary asset storage key for the primary logo.
        /// </summary>
        [MaxLength(250)]
        public string? LogoKey { get; set; }

        /// <summary>
        /// Alias for LogoKey.
        /// </summary>
        [MaxLength(250)]
        public string? CompanyLogoKey { get; set; }

        /// <summary>
        /// Alternate white/light logo URL for dark backgrounds, hero banners, or transparent headers.
        /// Injected into templates via {{ WhiteLogoUrl }}.
        /// </summary>
        [MaxLength(1000)]
        [Display(Name = "White / Dark-Mode Logo URL")]
        public string? WhiteLogoUrl { get; set; }

        /// <summary>
        /// Alias for WhiteLogoUrl.
        /// </summary>
        [MaxLength(1000)]
        public string? CompanyWhiteLogoUrl { get; set; }

        /// <summary>
        /// Cloudinary asset storage key for the white logo.
        /// </summary>
        [MaxLength(250)]
        public string? WhiteLogoKey { get; set; }

        /// <summary>
        /// Alias for WhiteLogoKey.
        /// </summary>
        [MaxLength(250)]
        public string? CompanyWhiteLogoKey { get; set; }

        /// <summary>
        /// Favicon icon URL (.ico, .png, or .svg) rendered in browser tabs.
        /// Injected into head tags via {{ FaviconUrl }}.
        /// </summary>
        [MaxLength(1000)]
        [Display(Name = "Favicon URL")]
        public string? FaviconUrl { get; set; }

        /// <summary>
        /// Alias for FaviconUrl.
        /// </summary>
        [MaxLength(1000)]
        public string? CompanyIconUrl { get; set; }

        /// <summary>
        /// Cloudinary asset storage key for the favicon.
        /// </summary>
        [MaxLength(250)]
        public string? FaviconKey { get; set; }

        /// <summary>
        /// Alias for FaviconKey.
        /// </summary>
        [MaxLength(250)]
        public string? CompanyIconKey { get; set; }

        /// <summary>
        /// Preloader animation icon URL.
        /// </summary>
        [MaxLength(1000)]
        [Display(Name = "Reloader Icon URL")]
        public string? ReloaderIconUrl { get; set; }

        /// <summary>
        /// Storage key for the preloader animation icon.
        /// </summary>
        [MaxLength(250)]
        public string? ReloaderIconKey { get; set; }

        /// <summary>
        /// Custom copyright text in the footer.
        /// Injected into templates via {{ Copyright }}.
        /// </summary>
        [MaxLength(300)]
        [Display(Name = "Copyright Notice")]
        public string? CopyrightNotice { get; set; }

        // ── Login Page Branding & Experience ──

        /// <summary>
        /// Background image URL for the admin / portal login screen.
        /// </summary>
        [MaxLength(1000)]
        [Display(Name = "Login Background Image URL")]
        public string? LoginBackgroundImageUrl { get; set; }

        /// <summary>
        /// Asset storage key for the login background image.
        /// </summary>
        [MaxLength(250)]
        public string? LoginBackgroundImageKey { get; set; }

        /// <summary>
        /// Whether to display the normal logo on the login card.
        /// </summary>
        public bool UseNormalLogoInLogin { get; set; } = true;

        /// <summary>
        /// Whether to display the white logo on the login card.
        /// </summary>
        public bool UseWhiteLogoInLogin { get; set; } = false;

        /// <summary>
        /// Custom heading text displayed on the login card.
        /// </summary>
        [MaxLength(200)]
        public string? LoginTitle { get; set; }

        /// <summary>
        /// Heading text for informational callout note on login card.
        /// </summary>
        [MaxLength(200)]
        public string? LoginNoteTitle { get; set; }

        /// <summary>
        /// Body text for informational callout note on login card.
        /// </summary>
        [MaxLength(1000)]
        public string? LoginNote { get; set; }

        /// <summary>
        /// Footer disclaimer text on login page.
        /// </summary>
        [MaxLength(500)]
        public string? LoginNoteFooter { get; set; }

        /// <summary>
        /// Master switch enabling login capability.
        /// </summary>
        public bool ActivateLogin { get; set; } = true;

        /// <summary>
        /// Shows the Login / Sign-In link in header navigation bar.
        /// </summary>
        public bool ActivateLoginInMenu { get; set; } = true;

        /// <summary>
        /// Shows the Login / Sign-In link in footer columns.
        /// </summary>
        public bool ActivateLoginInFooter { get; set; } = true;

        /// <summary>
        /// Custom button text for login submit action (e.g. "Sign In", "Access Portal").
        /// </summary>
        [MaxLength(100)]
        public string LoginButtonText { get; set; } = "Sign In";

        // ── Contact Information ──

        /// <summary>
        /// Primary organizational telephone or support line.
        /// Injected into templates via {{ Phone }}.
        /// </summary>
        [MaxLength(50)]
        [Display(Name = "Primary Phone")]
        public string? PrimaryPhone { get; set; }

        /// <summary>
        /// Alias for PrimaryPhone.
        /// </summary>
        [MaxLength(50)]
        public string? PhoneOne { get; set; }

        /// <summary>
        /// Secondary or after-hours telephone line.
        /// </summary>
        [MaxLength(50)]
        [Display(Name = "Secondary Phone")]
        public string? SecondaryPhone { get; set; }

        /// <summary>
        /// Alias for SecondaryPhone.
        /// </summary>
        [MaxLength(50)]
        public string? PhoneTwo { get; set; }

        /// <summary>
        /// Official WhatsApp customer line or direct chat link.
        /// </summary>
        [MaxLength(50)]
        [Display(Name = "WhatsApp Number")]
        public string? WhatsAppNumber { get; set; }

        /// <summary>
        /// Primary physical office address or headquarters location.
        /// Injected into templates via {{ Address }}.
        /// </summary>
        [MaxLength(500)]
        [Display(Name = "Physical Address")]
        public string? Address { get; set; }

        /// <summary>
        /// Alias for Address.
        /// </summary>
        [MaxLength(500)]
        public string? AddressOne { get; set; }

        /// <summary>
        /// Secondary address (e.g., regional branch, annex).
        /// </summary>
        [MaxLength(500)]
        public string? AddressTwo { get; set; }

        /// <summary>
        /// City of primary operation.
        /// </summary>
        [MaxLength(100)]
        public string? City { get; set; }

        /// <summary>
        /// State or province.
        /// </summary>
        [MaxLength(100)]
        public string? State { get; set; }

        /// <summary>
        /// Country of operation.
        /// </summary>
        [MaxLength(100)]
        public string? Country { get; set; }

        /// <summary>
        /// Weekly operational hours (e.g. "Mon - Fri: 8:00 AM - 6:00 PM").
        /// </summary>
        [MaxLength(200)]
        [Display(Name = "Working Hours")]
        public string? WorkingHours { get; set; }

        /// <summary>
        /// Google Maps embed iframe or location URL for contact pages.
        /// </summary>
        [MaxLength(1000)]
        [Display(Name = "Google Maps Embed URL")]
        public string? GoogleMapUrl { get; set; }

        // ── Public Emails ──

        /// <summary>
        /// General inquiries email address.
        /// Injected into templates via {{ Email }}.
        /// </summary>
        [MaxLength(150)]
        [Display(Name = "Contact Email")]
        public string? ContactEmail { get; set; }

        /// <summary>
        /// Alias for ContactEmail.
        /// </summary>
        [MaxLength(150)]
        public string? EmailOne { get; set; }

        /// <summary>
        /// Dedicated customer support email address.
        /// </summary>
        [MaxLength(150)]
        [Display(Name = "Support Email")]
        public string? SupportEmail { get; set; }

        /// <summary>
        /// Alias for SupportEmail.
        /// </summary>
        [MaxLength(150)]
        public string? EmailTwo { get; set; }

        /// <summary>
        /// Dedicated billing and invoicing email address.
        /// </summary>
        [MaxLength(150)]
        [Display(Name = "Billing Email")]
        public string? BillingEmail { get; set; }

        /// <summary>
        /// Dedicated business development and sales email address.
        /// </summary>
        [MaxLength(150)]
        [Display(Name = "Sales Email")]
        public string? SalesEmail { get; set; }

        // ── Social Media Channels ──

        /// <summary>
        /// Facebook profile or page URL.
        /// </summary>
        [MaxLength(500)]
        [Display(Name = "Facebook URL")]
        public string? FacebookUrl { get; set; }

        /// <summary>
        /// Alias for FacebookUrl.
        /// </summary>
        [MaxLength(500)]
        public string? FacebookPage { get; set; }

        /// <summary>
        /// Twitter / X profile URL.
        /// </summary>
        [MaxLength(500)]
        [Display(Name = "Twitter / X URL")]
        public string? TwitterUrl { get; set; }

        /// <summary>
        /// Alias for TwitterUrl.
        /// </summary>
        [MaxLength(500)]
        public string? TwitterPage { get; set; }

        /// <summary>
        /// LinkedIn company or organization profile URL.
        /// </summary>
        [MaxLength(500)]
        [Display(Name = "LinkedIn URL")]
        public string? LinkedInUrl { get; set; }

        /// <summary>
        /// Instagram profile URL.
        /// </summary>
        [MaxLength(500)]
        [Display(Name = "Instagram URL")]
        public string? InstagramUrl { get; set; }

        /// <summary>
        /// Alias for InstagramUrl.
        /// </summary>
        [MaxLength(500)]
        public string? InstagramPage { get; set; }

        /// <summary>
        /// YouTube channel or video URL.
        /// </summary>
        [MaxLength(500)]
        [Display(Name = "YouTube URL")]
        public string? YouTubeUrl { get; set; }

        /// <summary>
        /// Alias for YouTubeUrl.
        /// </summary>
        [MaxLength(500)]
        public string? YoutubeChannel { get; set; }

        /// <summary>
        /// GitHub organization or repository URL.
        /// </summary>
        [MaxLength(500)]
        [Display(Name = "GitHub URL")]
        public string? GitHubUrl { get; set; }

        /// <summary>
        /// TikTok account URL.
        /// </summary>
        [MaxLength(500)]
        [Display(Name = "TikTok URL")]
        public string? TikTokUrl { get; set; }

        /// <summary>
        /// Alias for TikTokUrl.
        /// </summary>
        [MaxLength(500)]
        public string? TiktokPage { get; set; }

        // ── Storefront & E-Commerce Mode ──

        /// <summary>
        /// Active website layout template key ("standard", "ecommerce", "portfolio", etc.).
        /// </summary>
        [MaxLength(100)]
        public string TemplateLayoutKey { get; set; } = "standard";

        /// <summary>
        /// Product / store catalog display title (e.g. "Store", "Shop", "Catalog").
        /// </summary>
        [MaxLength(200)]
        public string ProductTitle { get; set; } = "Online Store";

        /// <summary>
        /// Product catalog section title on homepage.
        /// </summary>
        [MaxLength(200)]
        public string? ProductTitleHome { get; set; }

        /// <summary>
        /// Shows the Products / Store link in navigation menus.
        /// </summary>
        public bool ShowProductsInMenu { get; set; } = true;

        /// <summary>
        /// Shows the Products / Store link in footer.
        /// </summary>
        public bool ShowProductsInFooter { get; set; } = true;

        /// <summary>
        /// Activates product showcase section on the homepage.
        /// </summary>
        public bool ActivateProductsInHome { get; set; } = false;

        /// <summary>
        /// Display exactly 2 featured products on home.
        /// </summary>
        public bool ShowTwoProducts { get; set; } = false;

        /// <summary>
        /// Display exactly 3 featured products on home.
        /// </summary>
        public bool ShowThreeProducts { get; set; } = false;

        /// <summary>
        /// Display 6 featured products on home.
        /// </summary>
        public bool ShowSixProducts { get; set; } = true;

        // ── Global Site Controls, Launch State & Splash ──

        /// <summary>
        /// Global public visibility flag (true = live, false = offline).
        /// </summary>
        public bool IsLive { get; set; } = true;

        /// <summary>
        /// Global launch / maintenance mode switch.
        /// When true, public visitor requests are redirected or gated behind the Coming Soon splash screen.
        /// </summary>
        [Display(Name = "Enable Coming Soon / Maintenance Mode")]
        public bool EnableComingSoon { get; set; } = false;

        /// <summary>
        /// Heading message displayed on the Coming Soon splash screen.
        /// </summary>
        [MaxLength(200)]
        [Display(Name = "Coming Soon Title")]
        public string? ComingSoonTitle { get; set; }

        /// <summary>
        /// Descriptive message displayed on the Coming Soon splash screen.
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

        // ── Timestamps ──

        /// <summary>
        /// Timestamp in UTC when the website settings record was created.
        /// </summary>
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Timestamp in UTC when the website settings record was last modified.
        /// </summary>
        public DateTime? UpdatedAtUtc { get; set; }
    }
}
