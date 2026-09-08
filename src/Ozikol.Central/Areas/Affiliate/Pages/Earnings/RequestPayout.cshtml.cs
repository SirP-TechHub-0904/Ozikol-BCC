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

namespace Ozikol.Central.Areas.Affiliate.Pages.Earnings
{
    /// <summary>
    /// Page model for submitting partner commission disbursement requests in the Affiliate Portal.
    /// </summary>
    public class RequestPayoutModel : PageModel
    {
        private readonly MasterCatalogDbContext _context;
        private readonly UserManager<CentralUser> _userManager;
        private readonly ILogger<RequestPayoutModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="RequestPayoutModel"/> class.
        /// </summary>
        /// <param name="context">Master catalog database context.</param>
        /// <param name="userManager">Identity user manager for CentralUser.</param>
        /// <param name="logger">Structured logging service.</param>
        public RequestPayoutModel(
            MasterCatalogDbContext context,
            UserManager<CentralUser> userManager,
            ILogger<RequestPayoutModel> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _userManager = userManager ?? throw new ArgumentNullException(nameof(userManager));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Gets or sets the affiliate partner.
        /// </summary>
        public MasterAffiliatePartner Partner { get; set; } = null!;

        /// <summary>
        /// Gets or sets the payout request form input model.
        /// </summary>
        [BindProperty]
        public PayoutRequestInput Input { get; set; } = new PayoutRequestInput();

        /// <summary>
        /// Form input model for requesting a commission disbursement.
        /// </summary>
        public class PayoutRequestInput
        {
            /// <summary>Gets or sets disbursement amount requested.</summary>
            [Required(ErrorMessage = "Please specify payout amount.")]
            [Range(50.0, 1000000.0, ErrorMessage = "Minimum payout amount is $50.00.")]
            public decimal Amount { get; set; }

            /// <summary>Gets or sets chosen payout method.</summary>
            [Required(ErrorMessage = "Please choose a payout method.")]
            public string PayoutMethod { get; set; } = "BankWire";

            /// <summary>Gets or sets optional disbursement instructions or invoice reference.</summary>
            [MaxLength(500)]
            public string? Notes { get; set; }
        }

        /// <summary>
        /// Handles HTTP GET request to initialize payout request form.
        /// </summary>
        public async Task<IActionResult> OnGetAsync()
        {
            var partner = await ResolvePartnerAsync();
            if (partner == null)
            {
                return RedirectToPage("/Dashboard/Index");
            }

            Partner = partner;
            Input.Amount = partner.PendingBalance;

            return Page();
        }

        /// <summary>
        /// Handles HTTP POST request to submit commission disbursement request.
        /// </summary>
        public async Task<IActionResult> OnPostAsync()
        {
            var partner = await ResolvePartnerAsync();
            if (partner == null)
            {
                return RedirectToPage("/Dashboard/Index");
            }

            Partner = partner;

            if (!ModelState.IsValid)
            {
                return Page();
            }

            if (Input.Amount > partner.PendingBalance)
            {
                ModelState.AddModelError("Input.Amount", $"Requested amount (${Input.Amount:N2}) exceeds your available pending balance (${partner.PendingBalance:N2}).");
                return Page();
            }

            // Record audit event for compliance
            var audit = new MasterAuditLog
            {
                Id = Guid.NewGuid(),
                Action = "RequestPayout",
                EntityType = "Affiliate",
                EntityId = partner.Id.ToString(),
                UserName = partner.FullName,
                Summary = $"Affiliate {partner.PartnerCode} requested payout of ${Input.Amount:N2} via {Input.PayoutMethod}.",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1",
                UserAgent = Request.Headers["User-Agent"].ToString(),
                CreatedUtc = DateTime.UtcNow
            };

            _context.MasterAuditLogs.Add(audit);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Partner {PartnerCode} submitted payout request for ${Amount}", partner.PartnerCode, Input.Amount);
            TempData["StatusMessage"] = $"Payout request for ${Input.Amount:N2} submitted successfully. Payouts are reviewed and settled every Friday.";

            return RedirectToPage("/Earnings/Index");
        }

        private async Task<MasterAffiliatePartner?> ResolvePartnerAsync()
        {
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
                partner = await _context.MasterAffiliatePartners.OrderByDescending(p => p.CreatedUtc).FirstOrDefaultAsync();
            }

            return partner;
        }
    }
}
