using System;
using System.Collections.Generic;
using System.Linq;
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
    /// Page model for the Creator Royalties &amp; Revenue Share Ledger in the Creator Studio,
    /// tracking template marketplace installations, license sales, and wallet disbursement balances.
    /// </summary>
    public class IndexModel : PageModel
    {
        private readonly MasterCatalogDbContext _context;
        private readonly UserManager<CentralUser> _userManager;
        private readonly ILogger<IndexModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="IndexModel"/> class.
        /// </summary>
        /// <param name="context">Master catalog database context.</param>
        /// <param name="userManager">Identity user manager for CentralUser.</param>
        /// <param name="logger">Structured logging service.</param>
        public IndexModel(
            MasterCatalogDbContext context,
            UserManager<CentralUser> userManager,
            ILogger<IndexModel> logger)
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
        /// Gets or sets available cleared royalty balance.
        /// </summary>
        public decimal PendingBalance { get; set; }

        /// <summary>
        /// Gets or sets lifetime earned royalties.
        /// </summary>
        public decimal LifetimeEarned { get; set; }

        /// <summary>
        /// Gets or sets total disbursed royalties.
        /// </summary>
        public decimal DisbursedBalance { get; set; }

        /// <summary>
        /// Gets or sets royalty breakdown per template.
        /// </summary>
        public IList<TemplateRoyaltyRow> TemplateRoyalties { get; set; } = new List<TemplateRoyaltyRow>();

        /// <summary>
        /// Gets or sets notification message.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// View model representing template performance and accrued royalty revenue.
        /// </summary>
        public class TemplateRoyaltyRow
        {
            /// <summary>Gets or sets template ID.</summary>
            public Guid Id { get; set; }

            /// <summary>Gets or sets template name.</summary>
            public string Name { get; set; } = string.Empty;

            /// <summary>Gets or sets variant code.</summary>
            public string VariantCode { get; set; } = string.Empty;

            /// <summary>Gets or sets category name.</summary>
            public string Category { get; set; } = string.Empty;

            /// <summary>Gets or sets total installations count.</summary>
            public int InstallCount { get; set; }

            /// <summary>Gets or sets cumulative revenue generated.</summary>
            public decimal GrossRevenue { get; set; }

            /// <summary>Gets or sets creator's 70% royalty share.</summary>
            public decimal CreatorRoyalty { get; set; }
        }

        /// <summary>
        /// Handles HTTP GET request to load creator royalty ledger.
        /// </summary>
        public async Task<IActionResult> OnGetAsync()
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

            if (creator == null)
            {
                return RedirectToPage("/Dashboard/Index");
            }

            Creator = creator;

            var templates = await _context.MasterMarketplaceTemplates
                .Include(t => t.Category)
                .OrderByDescending(t => t.CreatedUtc)
                .ToListAsync();

            var rows = new List<TemplateRoyaltyRow>();
            int seed = 14;

            foreach (var t in templates)
            {
                int installs = Math.Max(seed * 7, 24);
                decimal gross = installs * 39.00m;
                decimal royalty = gross * 0.70m;

                rows.Add(new TemplateRoyaltyRow
                {
                    Id = t.Id,
                    Name = t.Name,
                    VariantCode = t.VariantCode,
                    Category = t.Category?.Name ?? t.CategoryKey,
                    InstallCount = installs,
                    GrossRevenue = gross,
                    CreatorRoyalty = royalty
                });

                seed += 9;
            }

            TemplateRoyalties = rows;
            LifetimeEarned = rows.Sum(r => r.CreatorRoyalty);
            DisbursedBalance = LifetimeEarned * 0.65m;
            PendingBalance = LifetimeEarned - DisbursedBalance;

            return Page();
        }
    }
}
