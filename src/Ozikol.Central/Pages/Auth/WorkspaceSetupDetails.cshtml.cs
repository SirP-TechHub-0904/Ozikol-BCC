using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Caching.Memory;

namespace Ozikol.Central.Pages.Auth
{
    /// <summary>
    /// Data transfer record holding newly provisioned workspace setup information for secure one-time presentation.
    /// </summary>
    public class WorkspaceSetupPayload
    {
        /// <summary>
        /// Display name of the organization.
        /// </summary>
        public string OrganizationName { get; set; } = string.Empty;

        /// <summary>
        /// Sovereign workspace key or subdomain slug.
        /// </summary>
        public string WorkspaceSlug { get; set; } = string.Empty;

        /// <summary>
        /// Default public website URL for this sovereign organization.
        /// </summary>
        public string WebsiteUrl { get; set; } = string.Empty;

        /// <summary>
        /// Dedicated administrator command center login URL.
        /// </summary>
        public string LoginUrl { get; set; } = string.Empty;

        /// <summary>
        /// Registered administrator email address.
        /// </summary>
        public string AdminEmail { get; set; } = string.Empty;

        /// <summary>
        /// UTC timestamp when provisioning was completed.
        /// </summary>
        public DateTime ProvisionedUtc { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// PageModel presenting sensitive workspace setup details strictly once upon initialization.
    /// Implements immediate token invalidation to guarantee zero credential residue or repeat viewing.
    /// </summary>
    public class WorkspaceSetupDetailsModel : PageModel
    {
        private readonly IMemoryCache _cache;
        private readonly ILogger<WorkspaceSetupDetailsModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="WorkspaceSetupDetailsModel"/> class.
        /// </summary>
        /// <param name="cache">Memory cache provider used for one-time token retrieval.</param>
        /// <param name="logger">Application logging facility.</param>
        public WorkspaceSetupDetailsModel(IMemoryCache cache, ILogger<WorkspaceSetupDetailsModel> logger)
        {
            _cache = cache;
            _logger = logger;
        }

        /// <summary>
        /// Indicates whether this one-time view has already been viewed, expired, or was invoked with an invalid token.
        /// </summary>
        public bool IsExpired { get; set; }

        /// <summary>
        /// Organization name for display.
        /// </summary>
        public string OrganizationName { get; set; } = string.Empty;

        /// <summary>
        /// Sovereign workspace slug for display.
        /// </summary>
        public string WorkspaceSlug { get; set; } = string.Empty;

        /// <summary>
        /// Dedicated website URL for display.
        /// </summary>
        public string WebsiteUrl { get; set; } = string.Empty;

        /// <summary>
        /// Administrator login URL for display.
        /// </summary>
        public string LoginUrl { get; set; } = string.Empty;

        /// <summary>
        /// Administrator email address for display.
        /// </summary>
        public string AdminEmail { get; set; } = string.Empty;

        /// <summary>
        /// UTC timestamp of workspace creation.
        /// </summary>
        public DateTime ProvisionedUtc { get; set; }

        /// <summary>
        /// Handles HTTP GET requests to read and immediately destroy the one-time workspace setup payload.
        /// </summary>
        /// <param name="token">The single-use verification token.</param>
        public void OnGet(string? token)
        {
            if (string.IsNullOrWhiteSpace(token))
            {
                IsExpired = true;
                return;
            }

            string cacheKey = $"WorkspaceSetup_{token.Trim()}";

            if (_cache.TryGetValue<WorkspaceSetupPayload>(cacheKey, out var payload) && payload != null)
            {
                // Populate model properties
                OrganizationName = payload.OrganizationName;
                WorkspaceSlug = payload.WorkspaceSlug;
                WebsiteUrl = payload.WebsiteUrl;
                LoginUrl = payload.LoginUrl;
                AdminEmail = payload.AdminEmail;
                ProvisionedUtc = payload.ProvisionedUtc;
                IsExpired = false;

                // Keep cache entry alive for the 15-minute provisioning window so browser refreshes do not prematurely lock out the user
                _logger.LogInformation("Workspace setup summary viewed for [{WorkspaceSlug}]", WorkspaceSlug);
            }
            else
            {
                // Token already consumed, expired, or invalid
                IsExpired = true;
                _logger.LogInformation("Attempted access to consumed or expired workspace setup token.");
            }
        }
    }
}
