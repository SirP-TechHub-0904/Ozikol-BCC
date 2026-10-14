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

        /// <summary>
        /// Dedicated footer note or brand bio displayed in the website footer under the logo.
        /// More comprehensive than the standard company description or short tagline.
        /// Injected into templates via {{ FooterDescription }} and {{ Description }}.
        /// </summary>
        [MaxLength(2000)]
        [Display(Name = "Footer Note / Brand Bio")]
        public string? FooterDescription { get; set; }

        /// <summary>
        /// Alias for FooterDescription.
        /// </summary>
        [MaxLength(2000)]
        public string? FooterNote { get; set; }

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

        // NOTE: All contact channels (emails, phone lines, physical addresses, operating hours, 
        // WhatsApp, and social media profiles) are managed dynamically in the dedicated 
        // MisWebsiteContactChannels table, which supports multiple entries, sorting, icons, and default markers.


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

        /// <summary>
        /// Indicates whether the initial workspace onboarding choice (defaults vs. blank canvas) has been completed.
        /// </summary>
        [Display(Name = "Workspace Initialized")]
        public bool IsWorkspaceInitialized { get; set; } = false;

        /// <summary>
        /// Exact timestamp in UTC when the workspace was initialized (or when setup was skipped).
        /// </summary>
        [Display(Name = "Workspace Initialized At (UTC)")]
        public DateTime? WorkspaceInitializedUtc { get; set; }

        /// <summary>
        /// Initialization mode chosen during workspace setup ("default_suite" or "blank_canvas").
        /// </summary>
        [MaxLength(50)]
        [Display(Name = "Workspace Initialization Mode")]
        public string? WorkspaceInitializationMode { get; set; }

        // ── Breaking News Ribbon Ticker ──

        /// <summary>
        /// Master toggle enabling or disabling the Breaking News Ribbon Ticker on the public website.
        /// </summary>
        [Display(Name = "Enable Ribbon Ticker")]
        public bool EnableBreakingNewsRibon { get; set; } = false;

        /// <summary>
        /// Static lead badge label displayed on the ribbon ticker (e.g. "BREAKING NEWS", "ANNOUNCEMENTS").
        /// </summary>
        [MaxLength(100)]
        [Display(Name = "Ribbon Ticker Badge Title")]
        public string BreakingNewsRibonTitle { get; set; } = "BREAKING NEWS";

        /// <summary>
        /// Display placement position of the ticker on the public website:
        /// "top", "after_menu", "after_hero", "before_footer", "after_footer".
        /// </summary>
        [MaxLength(50)]
        [Display(Name = "Ribbon Ticker Position")]
        public string BreakingNewsRibonPosition { get; set; } = "after_menu";

        // ── Cookie Consent Popup ──

        /// <summary>
        /// Master toggle enabling or disabling the bottom Cookie Consent Popup on the public website.
        /// </summary>
        [Display(Name = "Enable Cookie Consent")]
        public bool EnableCookieConsent { get; set; } = true;

        /// <summary>
        /// Heading title displayed on the Cookie Consent banner.
        /// </summary>
        [MaxLength(150)]
        [Display(Name = "Cookie Consent Title")]
        public string CookieConsentTitle { get; set; } = "Cookie Preferences & Privacy";

        /// <summary>
        /// Informational message text explaining cookie usage to visitors.
        /// </summary>
        [MaxLength(1000)]
        [Display(Name = "Cookie Consent Message")]
        public string CookieConsentMessage { get; set; } = "We use cookies to optimize site performance, analyze traffic, and ensure you get the best browsing experience on our website.";

        /// <summary>
        /// Label text for the primary accept button.
        /// </summary>
        [MaxLength(50)]
        [Display(Name = "Cookie Accept Button Text")]
        public string CookieConsentAcceptText { get; set; } = "Accept All";

        /// <summary>
        /// Label text for the secondary decline or essential-only button.
        /// </summary>
        [MaxLength(50)]
        [Display(Name = "Cookie Decline Button Text")]
        public string CookieConsentDeclineText { get; set; } = "Decline";

        /// <summary>
        /// Destination URL for the full Privacy or Cookie Policy page.
        /// </summary>
        [MaxLength(500)]
        [Display(Name = "Cookie Policy URL")]
        public string CookieConsentPolicyUrl { get; set; } = "/privacy-policy";

        // ── WhatsApp Floating Live Chat ──

        /// <summary>
        /// Master toggle enabling or disabling the floating WhatsApp Live Chat button on the public website.
        /// </summary>
        [Display(Name = "Enable WhatsApp Chat")]
        public bool EnableWhatsAppChat { get; set; } = false;

        /// <summary>
        /// WhatsApp phone number with international country code (e.g. "+15550192834").
        /// </summary>
        [MaxLength(50)]
        [Display(Name = "WhatsApp Phone Number")]
        public string? WhatsAppNumber { get; set; }

        /// <summary>
        /// Pre-filled welcome/prompt message loaded into WhatsApp when the visitor initiates a chat.
        /// </summary>
        [MaxLength(500)]
        [Display(Name = "WhatsApp Prompt Message")]
        public string? WhatsAppPromptMessage { get; set; } = "Hello! I have an inquiry regarding your services.";

        /// <summary>
        /// Header title displayed on the floating WhatsApp chat popup window (e.g. "Chat with Us").
        /// </summary>
        [MaxLength(100)]
        [Display(Name = "WhatsApp Widget Title")]
        public string WhatsAppWidgetTitle { get; set; } = "Chat with Us";

        /// <summary>
        /// Status subtitle displayed under the agent name (e.g. "Typically replies within minutes").
        /// </summary>
        [MaxLength(150)]
        [Display(Name = "WhatsApp Widget Subtitle")]
        public string WhatsAppWidgetSubtitle { get; set; } = "Typically replies within minutes";

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
