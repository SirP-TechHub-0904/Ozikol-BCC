using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Templates
{
    /// <summary>
    /// PageModel displaying the deep inspection of a UI Marketplace template blueprint, its code tabs,
    /// live markup preview simulation, and placeholder metadata.
    /// </summary>
    public class DetailsModel : PageModel
    {
        private readonly MasterCatalogDbContext _dbContext;

        /// <summary>
        /// Initializes a new instance of the <see cref="DetailsModel"/> class.
        /// </summary>
        /// <param name="dbContext">Master catalog database context.</param>
        public DetailsModel(MasterCatalogDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        /// <summary>
        /// The loaded marketplace template entity.
        /// </summary>
        public MasterMarketplaceTemplate Template { get; set; } = default!;

        /// <summary>
        /// Simulated rendered HTML snippet with mock placeholder substitutions.
        /// </summary>
        public string RenderedPreviewHtml { get; set; } = string.Empty;

        /// <summary>
        /// Feedback status message.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Handles HTTP GET requests to load the template and prepare the simulated preview.
        /// </summary>
        /// <param name="id">Template unique identifier.</param>
        public async Task<IActionResult> OnGetAsync(Guid id)
        {
            var template = await _dbContext.MasterMarketplaceTemplates
                .Include(t => t.Category)
                .Include(t => t.Placeholders)
                .Include(t => t.Sections)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (template == null)
            {
                return NotFound($"Template with ID {id} was not found.");
            }

            Template = template;

            // Generate basic simulated markup replacing mustache placeholders
            var mockHtml = template.HtmlTemplate ?? string.Empty;
            mockHtml = mockHtml.Replace("{{ Title }}", template.PreviewTitle ?? template.Name);
            mockHtml = mockHtml.Replace("{{ Subtitle }}", template.PreviewSubtitle ?? template.Description ?? "Experience effortless enterprise cloud management.");
            mockHtml = mockHtml.Replace("{{ ImageUrl }}", template.PreviewImageUrl ?? "/assets/brand/hero-preview.webp");
            mockHtml = mockHtml.Replace("{{ ButtonText }}", "Explore Platform");
            mockHtml = mockHtml.Replace("{{ ButtonUrl }}", "#");

            RenderedPreviewHtml = mockHtml;

            return Page();
        }

        /// <summary>
        /// Toggles template active/hidden state.
        /// </summary>
        /// <param name="id">Template identifier.</param>
        public async Task<IActionResult> OnPostToggleActiveAsync(Guid id)
        {
            var template = await _dbContext.MasterMarketplaceTemplates.FindAsync(id);
            if (template == null)
            {
                return NotFound();
            }

            template.IsActive = !template.IsActive;
            template.UpdatedUtc = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();

            StatusMessage = $"Template '{template.Name}' status updated to {(template.IsActive ? "Active" : "Hidden")}.";
            return RedirectToPage(new { id });
        }
    }
}
