using System;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Affiliate.Pages.Referrals
{
    /// <summary>
    /// Page model for the interactive campaign referral link builder in the Affiliate Portal,
    /// generating tagged tracking URLs with UTM parameters for targeted marketing campaigns.
    /// </summary>
    public class CreateLinkModel : PageModel
    {
        private readonly MasterCatalogDbContext _context;
        private readonly UserManager<CentralUser> _userManager;
        private readonly ILogger<CreateLinkModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="CreateLinkModel"/> class.
        /// </summary>
        /// <param name="context">Master catalog database context.</param>
        /// <param name="userManager">Identity user manager for CentralUser.</param>
        /// <param name="logger">Structured logging service.</param>
        public CreateLinkModel(
            MasterCatalogDbContext context,
            UserManager<CentralUser> userManager,
            ILogger<CreateLinkModel> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _userManager = userManager ?? throw new ArgumentNullException(nameof(userManager));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Gets or sets the affiliate partner code.
        /// </summary>
        public string PartnerCode { get; set; } = "PARTNER";

        /// <summary>
        /// Gets or sets the base hostname of the platform.
        /// </summary>
        public string BaseHost { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets campaign link parameters.
        /// </summary>
        [BindProperty]
        public CampaignLinkInput Input { get; set; } = new CampaignLinkInput();

        /// <summary>
        /// Gets or sets the computed full tracking URL.
        /// </summary>
        public string GeneratedUrl { get; set; } = string.Empty;

        /// <summary>
        /// Input model for configuring UTM campaign tracking parameters.
        /// </summary>
        public class CampaignLinkInput
        {
            /// <summary>Gets or sets destination landing page path.</summary>
            [Required]
            public string DestinationPath { get; set; } = "/";

            /// <summary>Gets or sets campaign source (e.g., newsletter, youtube, blog).</summary>
            [MaxLength(50)]
            public string? Source { get; set; } = "newsletter";

            /// <summary>Gets or sets campaign medium (e.g., email, cpc, social).</summary>
            [MaxLength(50)]
            public string? Medium { get; set; } = "email";

            /// <summary>Gets or sets campaign name (e.g., launch2026, q3promo).</summary>
            [MaxLength(50)]
            public string? Campaign { get; set; } = "welcome";
        }

        /// <summary>
        /// Handles HTTP GET request to initialize campaign link builder.
        /// </summary>
        public async Task<IActionResult> OnGetAsync()
        {
            await ResolvePartnerCodeAsync();
            BuildUrl();
            return Page();
        }

        /// <summary>
        /// Handles HTTP POST request to recompute URL based on updated form inputs.
        /// </summary>
        public async Task<IActionResult> OnPostAsync()
        {
            await ResolvePartnerCodeAsync();
            BuildUrl();
            return Page();
        }

        private async Task ResolvePartnerCodeAsync()
        {
            BaseHost = $"{Request.Scheme}://{Request.Host}";
            var user = await _userManager.GetUserAsync(User);
            MasterAffiliatePartner? partner = null;

            if (user?.AffiliatePartnerId.HasValue == true)
            {
                partner = await _context.MasterAffiliatePartners.FindAsync(user.AffiliatePartnerId.Value);
            }

            if (partner == null && user?.Email != null)
            {
                partner = await _context.MasterAffiliatePartners.FirstOrDefaultAsync(p => p.Email == user.Email);
            }

            if (partner == null)
            {
                partner = await _context.MasterAffiliatePartners.FirstOrDefaultAsync();
            }

            PartnerCode = partner?.PartnerCode ?? "OZIKOL-VIP";
        }

        private void BuildUrl()
        {
            var path = string.IsNullOrWhiteSpace(Input.DestinationPath) ? "/" : Input.DestinationPath.Trim();
            if (!path.StartsWith("/"))
            {
                path = "/" + path;
            }

            var queryParams = new System.Collections.Specialized.NameValueCollection
            {
                ["ref"] = PartnerCode
            };

            if (!string.IsNullOrWhiteSpace(Input.Source))
            {
                queryParams["utm_source"] = Input.Source.Trim();
            }
            if (!string.IsNullOrWhiteSpace(Input.Medium))
            {
                queryParams["utm_medium"] = Input.Medium.Trim();
            }
            if (!string.IsNullOrWhiteSpace(Input.Campaign))
            {
                queryParams["utm_campaign"] = Input.Campaign.Trim();
            }

            var queryString = string.Join("&", queryParams.AllKeys.Select(k => $"{k}={Uri.EscapeDataString(queryParams[k] ?? string.Empty)}"));
            GeneratedUrl = $"{BaseHost}{path}?{queryString}";
        }
    }
}
