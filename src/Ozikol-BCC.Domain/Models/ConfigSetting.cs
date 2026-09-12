using System;
using System.ComponentModel.DataAnnotations;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// UI, Styles, Branding, and Visibility Toggles.
    /// If it affects how the website looks, text displayed, or layout visibility, it lives here.
    /// </summary>
    public class ConfigSetting
    {
        /// <summary>
        /// Required database identifier.
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// Determines the main HTML structure of the tenant's site.
        /// </summary>
        public string? TemplateLayoutKey { get; set; }

        /// <summary>
        /// Determines how the authentication screens look.
        /// </summary>
        public string? LoginTemplateKey { get; set; }

        /// <summary>
        /// Applies the primary/secondary color scheme to the UI.
        /// </summary>
        public string? ColorTemplateKey { get; set; }

        /// <summary>
        /// Determines how homepage banners are styled.
        /// </summary>
        public string? SliderTemplateKey { get; set; }

        /// <summary>
        /// Determines how the services/products are laid out.
        /// </summary>
        public string? ProductTemplateKey { get; set; }

        /// <summary>
        /// Determines the news/articles layout structure.
        /// </summary>
        public string? BlogTemplateKey { get; set; }

        /// <summary>
        /// Determines the animation shown before the page loads.
        /// </summary>
        public string? ReloaderTemplateKey { get; set; }

        /// <summary>
        /// Determines the navigation bar style.
        /// </summary>
        public string? PageHeaderTemplateKey { get; set; }

        /// <summary>
        /// Determines the footer style.
        /// </summary>
        public string? FooterTemplateKey { get; set; }

        /// <summary>
        /// Used for SEO and the browser tab name.
        /// </summary>
        public string? WebsiteTitle { get; set; }

        /// <summary>
        /// Used for SEO and footer 'About Us' text.
        /// </summary>
        public string? CompanyDescription { get; set; }

        /// <summary>
        /// Displayed in copyrights and text fallbacks.
        /// </summary>
        public string? CompanyName { get; set; }

        /// <summary>
        /// Used in mobile menus where space is tight.
        /// </summary>
        public string? CompanyNameAbbreviation { get; set; }

        /// <summary>
        /// Used to hyperlink logos back to home.
        /// </summary>
        public string? CompanyWebsiteLink { get; set; }

        /// <summary>
        /// Shown in the header when logged into the BCP.
        /// </summary>
        public string? DashboardTitle { get; set; }

        /// <summary>
        /// Displayed in the header navigation.
        /// </summary>
        public string? CompanyLogoUrl { get; set; }

        /// <summary>
        /// Needed to delete/replace the logo via API.
        /// </summary>
        public string? CompanyLogoKey { get; set; }

        /// <summary>
        /// Used on dark backgrounds or transparent headers.
        /// </summary>
        public string? CompanyWhiteLogoUrl { get; set; }

        /// <summary>
        /// Needed to delete/replace the white logo.
        /// </summary>
        public string? CompanyWhiteLogoKey { get; set; }

        /// <summary>
        /// Shown in the browser tab.
        /// </summary>
        public string? CompanyIconUrl { get; set; }

        /// <summary>
        /// Needed to delete/replace the favicon.
        /// </summary>
        public string? CompanyIconKey { get; set; }

        /// <summary>
        /// Shown bouncing/spinning during page load.
        /// </summary>
        public string? ReloaderIconUrl { get; set; }

        /// <summary>
        /// Needed to delete/replace the loader image.
        /// </summary>
        public string? ReloaderIconKey { get; set; }

        /// <summary>
        /// Disables BCP features if the tenant only bought a website.
        /// </summary>
        public bool JustWebsite { get; set; }

        /// <summary>
        /// Shows/hides the 'Login' button globally.
        /// </summary>
        public bool ActivateLogin { get; set; }

        /// <summary>
        /// Shows/hides the 'Login' button specifically in the nav.
        /// </summary>
        public bool ActivateLoginInMenu { get; set; }

        /// <summary>
        /// Locks the whole site behind a 'Coming Soon' screen.
        /// </summary>
        public bool ActivateComingSoon { get; set; }

        /// <summary>
        /// Makes the login portal look branded.
        /// </summary>
        public string? LoginBackgroundImageUrl { get; set; }

        /// <summary>
        /// Needed to delete/replace the login background.
        /// </summary>
        public string? LoginBackgroundImageKey { get; set; }

        /// <summary>
        /// Forces the standard logo on the login screen.
        /// </summary>
        public bool UseNormalLogoInLogin { get; set; }

        /// <summary>
        /// Forces the white logo on the login screen.
        /// </summary>
        public bool UseWhiteLogoInLogin { get; set; }

        /// <summary>
        /// Auth screen heading (E.g., 'Welcome Back').
        /// </summary>
        public string? LoginTitle { get; set; }

        /// <summary>
        /// Auth screen sub-heading (E.g., 'Important Notice').
        /// </summary>
        public string? LoginNoteTitle { get; set; }

        /// <summary>
        /// Auth screen text (E.g., 'Use your staff ID to log in.').
        /// </summary>
        public string? LoginNote { get; set; }

        /// <summary>
        /// Auth screen footer text (E.g., 'Need help? Contact IT.').
        /// </summary>
        public string? LoginNoteFooter { get; set; }

        /// <summary>
        /// HTML Email wrapper to brand system emails.
        /// </summary>
        public string? EmailTemplate { get; set; }

        /// <summary>
        /// Text prefix/suffix to brand SMS messages.
        /// </summary>
        public string? SMSTemplate { get; set; }

        /// <summary>
        /// Renames 'Products' to 'Properties', 'Plans', etc.
        /// </summary>
        public string? ProductTitle { get; set; }

        /// <summary>
        /// Renames the products section on the home page.
        /// </summary>
        public string? ProductTitleHome { get; set; }

        /// <summary>
        /// Disables the 'Powered By' watermark in the footer if the tenant pays for it.
        /// </summary>
        public bool RemoveWatermark { get; set; }

        /// <summary>
        /// Creates a CTA in the menu (e.g., 'Donate Now').
        /// </summary>
        public string? SpecialMenuButtonText { get; set; }

        /// <summary>
        /// Where the CTA points to.
        /// </summary>
        public string? SpecialMenuButtonLink { get; set; }

        /// <summary>
        /// Turns the CTA on or off.
        /// </summary>
        public bool SpecialMenuButtonActivate { get; set; }

        /// <summary>
        /// Shows a CTA in the footer.
        /// </summary>
        public bool ActivateWorkWithUsFooter { get; set; }

        /// <summary>
        /// Footer section text (E.g., 'Ready to start a project?').
        /// </summary>
        public string? TitleWorkWithUsFooter { get; set; }

        /// <summary>
        /// Shows the email capture form in the footer.
        /// </summary>
        public bool ActivateSubscribeFormOnFooter { get; set; }

        /// <summary>
        /// E.g., '₦' or '$' for UI pricing.
        /// </summary>
        public string? CurrencySymbol { get; set; }

        /// <summary>
        /// E.g., 'NGN' or 'USD' for UI pricing.
        /// </summary>
        public string? CurrencyCode { get; set; }

        /// <summary>
        /// Name displayed on receipts.
        /// </summary>
        public string? OrganizationDisplayName { get; set; }

        /// <summary>
        /// Custom notes at the bottom of receipts.
        /// </summary>
        public string? OrganizationPaymentNote { get; set; }

        /// <summary>
        /// Displayed under the logo or in headers.
        /// </summary>
        public string? Qoute { get; set; }

        /// <summary>
        /// Top-bar alert text (E.g., 'Free shipping!').
        /// </summary>
        public string? TopNote { get; set; }

        /// <summary>
        /// Renders a map on the Contact page.
        /// </summary>
        public string? GoogleMap { get; set; }

        /// <summary>
        /// Shows address in the very top mini-header.
        /// </summary>
        public bool ShowAddressOneInTop { get; set; }

        /// <summary>
        /// Primary physical address.
        /// </summary>
        public string? AddressOne { get; set; }

        /// <summary>
        /// Secondary physical address.
        /// </summary>
        public string? AddressTwo { get; set; }

        /// <summary>
        /// Renders the Facebook icon.
        /// </summary>
        public string? FacebookPage { get; set; }

        /// <summary>
        /// Renders the Instagram icon.
        /// </summary>
        public string? InstagramPage { get; set; }

        /// <summary>
        /// Renders the Twitter icon.
        /// </summary>
        public string? TwitterPage { get; set; }

        /// <summary>
        /// Renders the TikTok icon.
        /// </summary>
        public string? TiktokPage { get; set; }

        /// <summary>
        /// Renders the YouTube icon.
        /// </summary>
        public string? YoutubeChannel { get; set; }

        /// <summary>
        /// Primary contact email.
        /// </summary>
        public string? EmailOne { get; set; }

        /// <summary>
        /// Shows EmailOne in the top bar.
        /// </summary>
        public bool ShowEmailOneInTop { get; set; }

        /// <summary>
        /// Shows EmailOne in the footer.
        /// </summary>
        public bool ShowEmailOneInFooter { get; set; }

        /// <summary>
        /// Secondary contact email.
        /// </summary>
        public string? EmailTwo { get; set; }

        /// <summary>
        /// Shows EmailTwo in the top bar.
        /// </summary>
        public bool ShowEmailTwoInTop { get; set; }

        /// <summary>
        /// Shows EmailTwo in the footer.
        /// </summary>
        public bool ShowEmailTwoInFooter { get; set; }

        /// <summary>
        /// Tertiary contact email.
        /// </summary>
        public string? EmailThree { get; set; }

        /// <summary>
        /// Shows EmailThree in the top bar.
        /// </summary>
        public bool ShowEmailThreeInTop { get; set; }

        /// <summary>
        /// Shows EmailThree in the footer.
        /// </summary>
        public bool ShowEmailThreeInFooter { get; set; }

        /// <summary>
        /// Primary phone number.
        /// </summary>
        public string? PhoneOne { get; set; }

        /// <summary>
        /// Shows PhoneOne in the top bar.
        /// </summary>
        public bool ShowPhoneOneInTop { get; set; }

        /// <summary>
        /// Shows PhoneOne in the footer.
        /// </summary>
        public bool ShowPhoneOneInFooter { get; set; }

        /// <summary>
        /// Secondary phone number.
        /// </summary>
        public string? PhoneTwo { get; set; }

        /// <summary>
        /// Shows PhoneTwo in the top bar.
        /// </summary>
        public bool ShowPhoneTwoInTop { get; set; }

        /// <summary>
        /// Shows PhoneTwo in the footer.
        /// </summary>
        public bool ShowPhoneTwoInFooter { get; set; }

        /// <summary>
        /// Tertiary phone number.
        /// </summary>
        public string? PhoneThree { get; set; }

        /// <summary>
        /// Shows PhoneThree in the top bar.
        /// </summary>
        public bool ShowPhoneThreeInTop { get; set; }

        /// <summary>
        /// Shows PhoneThree in the footer.
        /// </summary>
        public bool ShowPhoneThreeInFooter { get; set; }

        /// <summary>
        /// Availability text (E.g., 'Mon-Fri, 9AM-5PM').
        /// </summary>
        public string? WorkingHour { get; set; }

        /// <summary>
        /// Shows the FAQ block on the homepage.
        /// </summary>
        public bool AddFaqToHome { get; set; }

        /// <summary>
        /// Shows the FAQ block in the footer.
        /// </summary>
        public bool AddFaqToFooter { get; set; }

        /// <summary>
        /// Shows Testimonials on the homepage.
        /// </summary>
        public bool AddTestimonyToHome { get; set; }

        /// <summary>
        /// Shows Testimonials in the footer.
        /// </summary>
        public bool AddTestimonyToFooter { get; set; }

        /// <summary>
        /// Shows Client/Partner logos on the homepage.
        /// </summary>
        public bool AddPartnerToHome { get; set; }

        /// <summary>
        /// Hides the primary navigation bar.
        /// </summary>
        public bool DisableMainTopMenu { get; set; }

        /// <summary>
        /// Allows injecting a custom HTML menu.
        /// </summary>
        public string? CustomMenuTop { get; set; }

        /// <summary>
        /// Activates the custom HTML menu instead of the default.
        /// </summary>
        public bool UseCustomMenuTop { get; set; }

        /// <summary>
        /// Adds a dynamic 'Products' dropdown to the menu.
        /// </summary>
        public bool ShowProductsInMenu { get; set; }

        /// <summary>
        /// Adds a list of products to the footer links.
        /// </summary>
        public bool ShowProductsInFooter { get; set; }

        /// <summary>
        /// Shows the Products block on the homepage.
        /// </summary>
        public bool ActivateProductsInHome { get; set; }

        /// <summary>
        /// Forces exactly 3 products to display.
        /// </summary>
        public bool ShowThreeProducts { get; set; }

        /// <summary>
        /// Forces exactly 6 products to display.
        /// </summary>
        public bool ShowSixProducts { get; set; }

        /// <summary>
        /// Forces exactly 2 products to display.
        /// </summary>
        public bool ShowTwoProducts { get; set; }

        /// <summary>
        /// Adds a 'Contact Us' link to the menu.
        /// </summary>
        public bool ShowContactUsMenu { get; set; }

        /// <summary>
        /// Adds a 'Contact Us' link to the footer.
        /// </summary>
        public bool ShowContactUsFooter { get; set; }

        /// <summary>
        /// Used as a header image if a WebPage doesn't have one.
        /// </summary>
        public string? DefaultTitleBackgroundUrl { get; set; }

        /// <summary>
        /// Needed to replace the default background.
        /// </summary>
        public string? DefaultTitleBackgroundKey { get; set; }

        /// <summary>
        /// Shows latest news on the homepage.
        /// </summary>
        public bool AddBlogToHome { get; set; }

        /// <summary>
        /// Adds 'Blog' to the menu.
        /// </summary>
        public bool AddBlogToMenu { get; set; }

        /// <summary>
        /// Adds latest news links to the footer.
        /// </summary>
        public bool AddBlogToFooter { get; set; }

        /// <summary>
        /// Renames 'Blog' to 'News', 'Updates', etc.
        /// </summary>
        public string? BlogDisplayTitle { get; set; }

        /// <summary>
        /// Adds 'Careers' to the menu.
        /// </summary>
        public bool AddCareerToMenu { get; set; }

        /// <summary>
        /// Adds 'Careers' link to the footer.
        /// </summary>
        public bool AddCareerToFooter { get; set; }

        /// <summary>
        /// Renames 'Careers' to 'Jobs', 'Vacancies', etc.
        /// </summary>
        public string? CareerDisplayTitle { get; set; }

        /// <summary>
        /// Forces the blog page to group posts by category visually.
        /// </summary>
        public bool UseCategoryBlog { get; set; }

        /// <summary>
        /// Activates the scrolling news ticker at the top.
        /// </summary>
        public bool EnableBreakingNewsRibon { get; set; }

        /// <summary>
        /// Ticker text override (E.g., 'LATEST ALERTS:').
        /// </summary>
        public string? BreakingNewsRibonTitle { get; set; }

        /// <summary>
        /// Sets the ticker to the top or bottom of the screen.
        /// </summary>
        public RibonPosition RibonPosition { get; set; }

        /// <summary>
        /// Indicates whether this tenant uses their own custom Cloudinary account instead of the platform default.
        /// </summary>
        public bool UseCustomStorage { get; set; } = false;

        /// <summary>
        /// Custom Cloudinary Cloud Name for this tenant's Bring-Your-Own-Storage (BYOS).
        /// </summary>
        public string? CustomCloudinaryCloudName { get; set; }

        /// <summary>
        /// Custom Cloudinary API Key for this tenant's Bring-Your-Own-Storage (BYOS).
        /// </summary>
        public string? CustomCloudinaryApiKey { get; set; }

        /// <summary>
        /// Custom Cloudinary API Secret for this tenant's Bring-Your-Own-Storage (BYOS).
        /// </summary>
        public string? CustomCloudinaryApiSecret { get; set; }
    }
}


