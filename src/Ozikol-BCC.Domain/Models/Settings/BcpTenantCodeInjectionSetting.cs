using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models.Settings
{
    /// <summary>
    /// Dedicated settings model for custom CSS, custom JS, and marketing/analytics tracking scripts
    /// (Google Analytics, Meta/Facebook Pixel, Tag Manager).
    /// Authority: Tenant Admin / Tenant SuperAdmin.
    /// </summary>
    public class BcpTenantCodeInjectionSetting
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// Custom HTML/JS injected into the &lt;head&gt; tag across public & tenant screens.
        /// Used for Google Analytics, Facebook Pixel, and Tag Manager.
        /// </summary>
        [Display(Name = "Header Scripts")]
        public string? HeaderScripts { get; set; }

        /// <summary>
        /// Custom HTML/JS injected before the closing &lt;/body&gt; tag.
        /// Used for live chat widgets, feedback tools, and footer tracking scripts.
        /// </summary>
        [Display(Name = "Footer Scripts")]
        public string? FooterScripts { get; set; }

        /// <summary>
        /// Custom CSS rules injected globally across the entire site.
        /// </summary>
        [Display(Name = "Global Custom CSS")]
        public string? GlobalCustomCss { get; set; }

        /// <summary>
        /// Custom JS script executed globally across the site.
        /// </summary>
        [Display(Name = "Global Custom JS")]
        public string? GlobalCustomJavaScript { get; set; }

        /// <summary>
        /// Custom CSS applied exclusively to authentication/login screens.
        /// </summary>
        [Display(Name = "Login Page CSS")]
        public string? LoginCustomCss { get; set; }

        /// <summary>
        /// Custom CSS applied to the staff admin console portal.
        /// </summary>
        [Display(Name = "Dashboard Portal CSS")]
        public string? DashboardCustomCss { get; set; }

        /// <summary>
        /// Custom CSS applied specifically to the BCP workspace dashboard.
        /// </summary>
        [Display(Name = "BCP Workspace CSS")]
        public string? BcpDashboardCustomCss { get; set; }

        /// <summary>
        /// Custom CSS applied to Careers/Job Board screens.
        /// </summary>
        [Display(Name = "Job Board CSS")]
        public string? BcpJobBoardCustomCss { get; set; }

        /// <summary>
        /// Custom CSS applied to E-Voting & Election screens.
        /// </summary>
        [Display(Name = "Election Portal CSS")]
        public string? ElectionCustomCss { get; set; }

        /// <summary>
        /// Custom JS executed inside BCP workspace screens.
        /// </summary>
        [Display(Name = "BCP Layout JS")]
        public string? BcpLayoutJavaScript { get; set; }
    }
}
