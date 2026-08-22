using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// System Globals, Server Configs, and Core Limitations.
    /// Hardcoded global infrastructure (like CSS/JS injection) lives here.
    /// </summary>
    public class ManagementSetting
    {
        /// <summary>
        /// Required database identifier.
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// Determines which storage bucket this tenant's files go to.
        /// </summary>
        public string? BucketName { get; set; }

        /// <summary>
        /// Hard limit on how many staff accounts the tenant can create.
        /// </summary>
        public int MaximumUsers { get; set; }

        /// <summary>
        /// Restricts login to known/approved IP addresses and devices.
        /// </summary>
        public bool ActivateOnlyAuthorizedDevice { get; set; }

        /// <summary>
        /// Master switch to kill all outgoing SMS across the platform.
        /// </summary>
        public bool ActivateSMS { get; set; }

        /// <summary>
        /// Custom CSS string appended only on the login page.
        /// </summary>
        public string? LoginCSS { get; set; }

        /// <summary>
        /// Custom CSS string appended globally to the frontend.
        /// </summary>
        public string? LayoutCSS { get; set; }

        /// <summary>
        /// Custom JS string appended globally to the frontend.
        /// </summary>
        public string? LayoutJavaScript { get; set; }

        /// <summary>
        /// Custom CSS string appended to the admin portal.
        /// </summary>
        public string? DashboardCSS { get; set; }

        /// <summary>
        /// Custom CSS appended to the BCP dashboard specifically.
        /// </summary>
        public string? BcpDashboardCSS { get; set; }

        /// <summary>
        /// Custom CSS appended to the Careers/Job Board specifically.
        /// </summary>
        public string? BcpJobBoardCSS { get; set; }

        /// <summary>
        /// Custom CSS appended to the voting portal.
        /// </summary>
        public string? ElectionCustomCss { get; set; }

        /// <summary>
        /// Custom JS appended to the BCP portal.
        /// </summary>
        public string? BcpLayoutJavaScript { get; set; }

        /// <summary>
        /// Forces traffic to 'https://www...'.
        /// </summary>
        public bool RedirectTohttpswww { get; set; }

        /// <summary>
        /// Forces traffic to 'https://...' (without www).
        /// </summary>
        public bool RedirectTohttps { get; set; }

        /// <summary>
        /// Abstract string for storing JSON feature flags.
        /// </summary>
        public string? Configuration { get; set; }

        /// <summary>
        /// Production-only JSON feature flags.
        /// </summary>
        public string? LiveConfiguration { get; set; }

        /// <summary>
        /// Primary bank name for offline tenant payments.
        /// </summary>
        public string? BankName { get; set; }

        /// <summary>
        /// Primary account number for offline payments.
        /// </summary>
        public string? AccountNumber { get; set; }

        /// <summary>
        /// Official account name.
        /// </summary>
        public string? AccountName { get; set; }

        /// <summary>
        /// Name of the person auto-signing generated documents.
        /// </summary>
        public string? SignatureName { get; set; }

        /// <summary>
        /// Title of the person auto-signing (e.g., 'Managing Director').
        /// </summary>
        public string? SignatureTitle { get; set; }

        /// <summary>
        /// Image of the signature stamped onto PDFs.
        /// </summary>
        public string? SignatureUrl { get; set; }

        /// <summary>
        /// Cloudinary ID for the signature image.
        /// </summary>
        public string? SignatureKey { get; set; }

        /// <summary>
        /// Root Cloudinary folder name for this business tenant.
        /// All group subfolders are created inside: /{FileFolderName}/groups/{group-slug}/
        /// </summary>
        [StringLength(255)]
        [Display(Name = "File Folder Name")]
        public string? FileFolderName { get; set; }
    }
}


