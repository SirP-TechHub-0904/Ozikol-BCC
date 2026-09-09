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

namespace Ozikol.Central.Areas.Creator.Pages.Earnings
{
    /// <summary>
    /// Page model for submitting template royalty payout requests in the Creator Studio.
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
        /// Gets or sets the creator application.
        /// </summary>
        public MasterCreatorApplication Creator { get; set; } = null!;

        /// <summary>
        /// Gets or sets available pending royalty balance.
        /// </summary>
        public decimal PendingBalance { get; set; } = 4250.00m;

        /// <summary>
        /// Gets or sets royalty payout form input model.
        /// </summary>
        [BindProperty]
        public PayoutRequestInput Input { get; set; } = new PayoutRequestInput();

        /// <summary>
        /// Form input model for creator royalty disbursement request.
        /// </summary>
        public class PayoutRequestInput
        {
            /// <summary>Gets or sets requested withdrawal amount.</summary>
            [Required(ErrorMessage = "Please specify payout amount.")]
            [Range(100.0, 1000000.0, ErrorMessage = "Minimum payout amount is $100.00.")]
            public decimal Amount { get; set; }

            /// <summary>Gets or sets disbursement method.</summary>
            [Required(ErrorMessage = "Please select a disbursement channel.")]
            public string PayoutMethod { get; set; } = "BankWire";

            /// <summary>Gets or sets optional tax invoice or reference notes.</summary>
            [MaxLength(500)]
            public string? Notes { get; set; }
        }

        /// <summary>
        /// Handles HTTP GET request to initialize payout request form.
        /// </summary>
        public async Task<IActionResult> OnGetAsync()
        {
            var creator = await ResolveCreatorAsync();
            if (creator == null)
            {
                return RedirectToPage("/Dashboard/Index");
            }

            Creator = creator;
            Input.Amount = PendingBalance;

            return Page();
        }

        /// <summary>
        /// Handles HTTP POST request to submit creator royalty payout request.
        /// </summary>
        public async Task<IActionResult> OnPostAsync()
        {
            var creator = await ResolveCreatorAsync();
            if (creator == null)
            {
                return RedirectToPage("/Dashboard/Index");
            }

            Creator = creator;

            if (!ModelState.IsValid)
            {
                return Page();
            }

            if (Input.Amount > PendingBalance)
            {
                ModelState.AddModelError("Input.Amount", $"Requested amount (${Input.Amount:N2}) exceeds your cleared pending balance (${PendingBalance:N2}).");
                return Page();
            }

            var audit = new MasterAuditLog
            {
                Id = Guid.NewGuid(),
                Action = "RequestPayout",
                EntityType = "Creator",
                EntityId = creator.Id.ToString(),
                UserName = creator.FullName,
                Summary = $"Creator {creator.CreatorCode} requested royalty payout of ${Input.Amount:N2} via {Input.PayoutMethod}.",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1",
                UserAgent = Request.Headers["User-Agent"].ToString(),
                CreatedUtc = DateTime.UtcNow
            };

            _context.MasterAuditLogs.Add(audit);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Creator {CreatorCode} submitted royalty payout request for ${Amount}", creator.CreatorCode, Input.Amount);
            TempData["StatusMessage"] = $"Royalty payout request for ${Input.Amount:N2} submitted successfully. Payouts are reviewed and settled on the 15th of each month.";

            return RedirectToPage("/Earnings/Index");
        }

        private async Task<MasterCreatorApplication?> ResolveCreatorAsync()
        {
            var user = await _userManager.GetUserAsync(User);
            MasterCreatorApplication? creator = null;

            if (user?.CreatorApplicationId.HasValue == true)
            {
                creator = await _context.MasterCreatorApplications.FindAsync(user.CreatorApplicationId.Value);
            }

            if (creator == null && user?.Email != null)
            {
                creator = await _context.MasterCreatorApplications.FirstOrDefaultAsync(c => c.Email == user.Email);
            }

            if (creator == null)
            {
                creator = await _context.MasterCreatorApplications.OrderByDescending(c => c.CreatedUtc).FirstOrDefaultAsync();
            }

            return creator;
        }
    }
}
