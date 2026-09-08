using System;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Admin.Pages.Creators
{
    /// <summary>
    /// PageModel for modifying creator profile attributes, contact channels, design specialization,
    /// and internal evaluation notes.
    /// </summary>
    public class EditModel : PageModel
    {
        private readonly MasterCatalogDbContext _dbContext;

        /// <summary>
        /// Initializes a new instance of the <see cref="EditModel"/> class.
        /// </summary>
        /// <param name="dbContext">Master catalog database context.</param>
        public EditModel(MasterCatalogDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        /// <summary>
        /// Primary key identifier of the creator application being edited.
        /// </summary>
        [FromRoute]
        public Guid Id { get; set; }

        /// <summary>
        /// Input model carrying edited values.
        /// </summary>
        [BindProperty]
        public CreatorEditInputModel Input { get; set; } = new();

        /// <summary>
        /// Handles HTTP GET requests to load creator profile for editing.
        /// </summary>
        public async Task<IActionResult> OnGetAsync(Guid id)
        {
            var app = await _dbContext.MasterCreatorApplications.FindAsync(id);
            if (app == null)
            {
                return NotFound($"Creator with ID {id} was not found.");
            }

            Id = app.Id;
            Input = new CreatorEditInputModel
            {
                CreatorCode = app.CreatorCode,
                FullName = app.FullName,
                StudioOrBrandName = app.StudioOrBrandName,
                Email = app.Email,
                PhoneNumber = app.PhoneNumber,
                Specialization = app.Specialization,
                PortfolioUrl = app.PortfolioUrl,
                Status = app.Status,
                ReviewNotes = app.ReviewNotes
            };

            return Page();
        }

        /// <summary>
        /// Handles HTTP POST requests to save creator profile modifications.
        /// </summary>
        public async Task<IActionResult> OnPostAsync(Guid id)
        {
            if (!ModelState.IsValid)
            {
                return Page();
            }

            var app = await _dbContext.MasterCreatorApplications.FindAsync(id);
            if (app == null)
            {
                return NotFound();
            }

            app.FullName = Input.FullName.Trim();
            app.StudioOrBrandName = Input.StudioOrBrandName?.Trim();
            app.Email = Input.Email.Trim().ToLowerInvariant();
            app.PhoneNumber = Input.PhoneNumber?.Trim();
            app.Specialization = Input.Specialization.Trim();
            app.PortfolioUrl = Input.PortfolioUrl.Trim();
            app.Status = Input.Status;
            app.ReviewNotes = Input.ReviewNotes?.Trim();

            await _dbContext.SaveChangesAsync();

            TempData["StatusMessage"] = $"Creator '{app.FullName}' was updated successfully.";
            return RedirectToPage("./Details", new { id = app.Id });
        }

        /// <summary>
        /// Input model carrying creator profile edits.
        /// </summary>
        public class CreatorEditInputModel
        {
            /// <summary>
            /// Creator tracking code.
            /// </summary>
            [Display(Name = "Creator Code")]
            public string CreatorCode { get; set; } = string.Empty;

            /// <summary>
            /// Full legal name.
            /// </summary>
            [Required(ErrorMessage = "Full name is required.")]
            [MaxLength(100)]
            [Display(Name = "Full Name")]
            public string FullName { get; set; } = string.Empty;

            /// <summary>
            /// Studio or agency name.
            /// </summary>
            [MaxLength(120)]
            [Display(Name = "Studio / Brand Name")]
            public string? StudioOrBrandName { get; set; }

            /// <summary>
            /// Contact email address.
            /// </summary>
            [Required(ErrorMessage = "Email is required.")]
            [EmailAddress]
            [MaxLength(150)]
            [Display(Name = "Contact Email")]
            public string Email { get; set; } = string.Empty;

            /// <summary>
            /// Contact phone number.
            /// </summary>
            [MaxLength(30)]
            [Display(Name = "Phone Number")]
            public string? PhoneNumber { get; set; }

            /// <summary>
            /// Design domain specialization.
            /// </summary>
            [Required(ErrorMessage = "Specialization is required.")]
            [MaxLength(100)]
            [Display(Name = "Design Specialization")]
            public string Specialization { get; set; } = string.Empty;

            /// <summary>
            /// Portfolio or Figma link.
            /// </summary>
            [Required(ErrorMessage = "Portfolio URL is required.")]
            [MaxLength(300)]
            [Display(Name = "Portfolio URL")]
            public string PortfolioUrl { get; set; } = string.Empty;

            /// <summary>
            /// Certification status.
            /// </summary>
            [Required]
            [MaxLength(30)]
            [Display(Name = "Program Status")]
            public string Status { get; set; } = "UnderReview";

            /// <summary>
            /// Internal evaluation notes.
            /// </summary>
            [MaxLength(1000)]
            [Display(Name = "Internal Review Notes")]
            public string? ReviewNotes { get; set; }
        }
    }
}
