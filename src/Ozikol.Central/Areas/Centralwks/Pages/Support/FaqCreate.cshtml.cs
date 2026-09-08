using System;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Support
{
    /// <summary>
    /// Page model for creating and updating frequently asked questions in the Master catalog.
    /// </summary>
    public class FaqCreateModel : PageModel
    {
        private readonly MasterCatalogDbContext _context;
        private readonly ILogger<FaqCreateModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="FaqCreateModel"/> class.
        /// </summary>
        /// <param name="context">Master catalog database context.</param>
        /// <param name="logger">Structured logging service.</param>
        public FaqCreateModel(MasterCatalogDbContext context, ILogger<FaqCreateModel> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Gets or sets the FAQ form input model.
        /// </summary>
        [BindProperty]
        public FaqInputModel Input { get; set; } = new FaqInputModel();

        /// <summary>
        /// Gets or sets a value indicating whether this form is updating an existing entry.
        /// </summary>
        public bool IsEditMode => Input.Id.HasValue;

        /// <summary>
        /// Input model representing FAQ fields.
        /// </summary>
        public class FaqInputModel
        {
            /// <summary>Gets or sets the optional FAQ primary key if editing.</summary>
            public Guid? Id { get; set; }

            /// <summary>Gets or sets the question text.</summary>
            [Required(ErrorMessage = "Question text is required.")]
            [MaxLength(300, ErrorMessage = "Question cannot exceed 300 characters.")]
            public string Question { get; set; } = string.Empty;

            /// <summary>Gets or sets the answer text.</summary>
            [Required(ErrorMessage = "Answer content is required.")]
            [MaxLength(2000, ErrorMessage = "Answer cannot exceed 2000 characters.")]
            public string Answer { get; set; } = string.Empty;

            /// <summary>Gets or sets the categorization grouping.</summary>
            [Required(ErrorMessage = "Category is required.")]
            [MaxLength(60)]
            public string Category { get; set; } = "General";

            /// <summary>Gets or sets the optional suite association code.</summary>
            [MaxLength(80)]
            public string? SuiteCode { get; set; }

            /// <summary>Gets or sets the 2-letter ISO culture code.</summary>
            [Required(ErrorMessage = "Culture code is required.")]
            [MaxLength(10)]
            public string Culture { get; set; } = "en";

            /// <summary>Gets or sets the sort order index.</summary>
            public int SortOrder { get; set; } = 0;

            /// <summary>Gets or sets whether the FAQ is published.</summary>
            public bool IsPublished { get; set; } = true;
        }

        /// <summary>
        /// Handles HTTP GET requests to present an empty form or populate an existing FAQ entry.
        /// </summary>
        /// <param name="id">Optional FAQ ID for editing.</param>
        /// <returns>Page result or NotFound.</returns>
        public async Task<IActionResult> OnGetAsync(Guid? id)
        {
            if (id.HasValue)
            {
                var faq = await _context.MasterSupportFaqs.FirstOrDefaultAsync(f => f.Id == id.Value);
                if (faq == null)
                {
                    return NotFound();
                }

                Input = new FaqInputModel
                {
                    Id = faq.Id,
                    Question = faq.Question,
                    Answer = faq.Answer,
                    Category = faq.Category ?? "General",
                    SuiteCode = faq.SuiteCode,
                    Culture = faq.Culture,
                    SortOrder = faq.SortOrder,
                    IsPublished = faq.IsPublished
                };
            }

            return Page();
        }

        /// <summary>
        /// Handles submitting the FAQ form for insertion or update.
        /// </summary>
        /// <returns>Redirects to the FAQs listing on success.</returns>
        public async Task<IActionResult> OnPostAsync()
        {
            if (!ModelState.IsValid)
            {
                return Page();
            }

            if (Input.Id.HasValue)
            {
                var faq = await _context.MasterSupportFaqs.FirstOrDefaultAsync(f => f.Id == Input.Id.Value);
                if (faq == null)
                {
                    return NotFound();
                }

                faq.Question = Input.Question.Trim();
                faq.Answer = Input.Answer.Trim();
                faq.Category = Input.Category.Trim();
                faq.SuiteCode = string.IsNullOrWhiteSpace(Input.SuiteCode) ? null : Input.SuiteCode.Trim();
                faq.Culture = Input.Culture.Trim().ToLower();
                faq.SortOrder = Input.SortOrder;
                faq.IsPublished = Input.IsPublished;
                faq.UpdatedUtc = DateTime.UtcNow;

                _logger.LogInformation("FAQ {Id} updated by operator.", faq.Id);
                TempData["StatusMessage"] = "FAQ article updated successfully.";
            }
            else
            {
                var faq = new MasterSupportFaq
                {
                    Id = Guid.NewGuid(),
                    Question = Input.Question.Trim(),
                    Answer = Input.Answer.Trim(),
                    Category = Input.Category.Trim(),
                    SuiteCode = string.IsNullOrWhiteSpace(Input.SuiteCode) ? null : Input.SuiteCode.Trim(),
                    Culture = Input.Culture.Trim().ToLower(),
                    SortOrder = Input.SortOrder,
                    IsPublished = Input.IsPublished,
                    CreatedUtc = DateTime.UtcNow,
                    UpdatedUtc = DateTime.UtcNow
                };

                _context.MasterSupportFaqs.Add(faq);
                _logger.LogInformation("FAQ {Id} created by operator.", faq.Id);
                TempData["StatusMessage"] = "New FAQ article published successfully.";
            }

            await _context.SaveChangesAsync();
            return RedirectToPage("Faqs");
        }
    }
}
