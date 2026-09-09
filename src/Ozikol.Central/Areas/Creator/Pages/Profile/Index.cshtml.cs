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

namespace Ozikol.Central.Areas.Creator.Pages.Profile
{
    /// <summary>
    /// Page model for managing creator studio credentials, public brand name,
    /// portfolio links, and design specializations in the Creator Studio.
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
        /// Gets or sets studio profile input model.
        /// </summary>
        [BindProperty]
        public StudioProfileInput Input { get; set; } = new StudioProfileInput();

        /// <summary>
        /// Gets or sets status notification message.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Form input model for modifying creator studio brand details.
        /// </summary>
        public class StudioProfileInput
        {
            /// <summary>Gets or sets full legal contact name.</summary>
            [Required(ErrorMessage = "Full name is required.")]
            [MaxLength(100)]
            public string FullName { get; set; } = string.Empty;

            /// <summary>Gets or sets studio or brand display name.</summary>
            [MaxLength(120)]
            public string? StudioOrBrandName { get; set; }

            /// <summary>Gets or sets phone number.</summary>
            [MaxLength(30)]
            public string? PhoneNumber { get; set; }

            /// <summary>Gets or sets portfolio, GitHub, or Figma showcase URL.</summary>
            [Required(ErrorMessage = "Portfolio URL is required.")]
            [MaxLength(300)]
            [Url(ErrorMessage = "Please provide a valid URL (https://...).")]
            public string PortfolioUrl { get; set; } = string.Empty;

            /// <summary>Gets or sets primary design specialization.</summary>
            [Required(ErrorMessage = "Specialization is required.")]
            [MaxLength(100)]
            public string Specialization { get; set; } = string.Empty;

            /// <summary>Gets or sets creator bio or proposal pitch.</summary>
            [MaxLength(2000)]
            public string? ProposalPitch { get; set; }
        }

        /// <summary>
        /// Handles HTTP GET request to populate studio profile form.
        /// </summary>
        public async Task<IActionResult> OnGetAsync()
        {
            var creator = await ResolveCreatorAsync();
            if (creator == null)
            {
                return RedirectToPage("/Dashboard/Index");
            }

            Creator = creator;
            Input = new StudioProfileInput
            {
                FullName = creator.FullName,
                StudioOrBrandName = creator.StudioOrBrandName,
                PhoneNumber = creator.PhoneNumber,
                PortfolioUrl = creator.PortfolioUrl,
                Specialization = creator.Specialization,
                ProposalPitch = creator.ProposalPitch
            };

            return Page();
        }

        /// <summary>
        /// Handles HTTP POST request to save studio profile updates.
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

            creator.FullName = Input.FullName.Trim();
            creator.StudioOrBrandName = Input.StudioOrBrandName?.Trim();
            creator.PhoneNumber = Input.PhoneNumber?.Trim();
            creator.PortfolioUrl = Input.PortfolioUrl.Trim();
            creator.Specialization = Input.Specialization.Trim();
            creator.ProposalPitch = Input.ProposalPitch?.Trim() ?? string.Empty;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Creator {CreatorCode} updated studio profile details", creator.CreatorCode);
            StatusMessage = "Studio profile updated successfully.";

            return RedirectToPage();
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
