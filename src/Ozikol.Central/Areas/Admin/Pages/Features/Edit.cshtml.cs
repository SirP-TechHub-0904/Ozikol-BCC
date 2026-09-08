using System;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Admin.Pages.Features
{
    /// <summary>
    /// PageModel modifying modular capability configurations, pricing tiers, and metering models.
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
        /// Feature ID to edit.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public Guid Id { get; set; }

        /// <summary>
        /// The loaded feature entity.
        /// </summary>
        public MasterFeatureCatalog Feature { get; set; } = null!;

        /// <summary>
        /// Input model for editing feature parameters.
        /// </summary>
        [BindProperty]
        public FeatureEditInputModel Input { get; set; } = new();

        /// <summary>
        /// Handles HTTP GET requests to populate the edit form.
        /// </summary>
        public async Task<IActionResult> OnGetAsync()
        {
            var feature = await _dbContext.MasterFeatureCatalogs.FindAsync(Id);
            if (feature == null)
            {
                TempData["Error"] = "Capability not found in catalog.";
                return RedirectToPage("/Features/Index");
            }

            Feature = feature;

            Input = new FeatureEditInputModel
            {
                Name = feature.Name,
                Category = feature.Category,
                Description = feature.Description,
                Icon = feature.Icon,
                RoutePrefix = feature.RoutePrefix,
                BillingType = (int)feature.BillingType,
                MonthlyPrice = feature.MonthlyPrice,
                QuarterlyPrice = feature.QuarterlyPrice,
                YearlyPrice = feature.YearlyPrice,
                IsCompulsory = feature.IsCompulsory,
                IsMetered = feature.IsMetered,
                MeterUnitName = feature.MeterUnitName,
                MeterUnitPrice = feature.MeterUnitPrice,
                MeterBatchSize = feature.MeterBlockSize,
                DisplayOrder = feature.SortOrder,
                IsActive = feature.IsActive
            };

            return Page();
        }

        /// <summary>
        /// Handles HTTP POST requests to persist updated capability configurations.
        /// </summary>
        public async Task<IActionResult> OnPostAsync()
        {
            var feature = await _dbContext.MasterFeatureCatalogs.FindAsync(Id);
            if (feature == null)
            {
                TempData["Error"] = "Capability not found.";
                return RedirectToPage("/Features/Index");
            }

            Feature = feature;

            if (!ModelState.IsValid)
            {
                return Page();
            }

            feature.Name = Input.Name.Trim();
            feature.Category = Input.Category.Trim();
            feature.Description = Input.Description?.Trim();
            feature.Icon = Input.Icon?.Trim();
            feature.RoutePrefix = Input.RoutePrefix?.Trim();
            feature.BillingType = (FeatureBillingType)Input.BillingType;
            feature.MonthlyPrice = Input.MonthlyPrice;
            feature.QuarterlyPrice = Input.QuarterlyPrice;
            feature.YearlyPrice = Input.YearlyPrice;
            feature.IsCompulsory = Input.IsCompulsory;
            feature.IsMetered = Input.IsMetered;
            feature.MeterUnitName = Input.IsMetered ? Input.MeterUnitName?.Trim() : null;
            feature.MeterUnitPrice = Input.IsMetered ? Input.MeterUnitPrice : 0m;
            feature.MeterBlockSize = Input.IsMetered && Input.MeterBatchSize > 0 ? Input.MeterBatchSize : 1;
            feature.SortOrder = Input.DisplayOrder;
            feature.IsActive = Input.IsActive;

            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.Identity?.Name,
                UserName = User.Identity?.Name,
                Action = "Update",
                EntityType = "Feature",
                EntityId = feature.Id.ToString(),
                Summary = $"Updated capability '{feature.Name}' ({feature.FeatureCode}) specifications",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString(),
                CreatedUtc = DateTime.UtcNow
            });

            await _dbContext.SaveChangesAsync();

            TempData["Success"] = $"Capability '{feature.Name}' updated successfully.";
            return RedirectToPage("/Features/Details", new { id = feature.Id });
        }

        /// <summary>
        /// Form input binding model.
        /// </summary>
        public class FeatureEditInputModel
        {
            [Required(ErrorMessage = "Capability name is required.")]
            [StringLength(120)]
            public string Name { get; set; } = string.Empty;

            [Required(ErrorMessage = "Category is required.")]
            [StringLength(60)]
            public string Category { get; set; } = string.Empty;

            [StringLength(500)]
            public string? Description { get; set; }

            [StringLength(60)]
            public string? Icon { get; set; }

            [StringLength(100)]
            public string? RoutePrefix { get; set; }

            public int BillingType { get; set; }

            [Range(0, 100000)]
            public decimal MonthlyPrice { get; set; }

            [Range(0, 300000)]
            public decimal QuarterlyPrice { get; set; }

            [Range(0, 1000000)]
            public decimal YearlyPrice { get; set; }

            public bool IsCompulsory { get; set; }

            public bool IsMetered { get; set; }

            [StringLength(50)]
            public string? MeterUnitName { get; set; }

            public decimal MeterUnitPrice { get; set; }

            public int MeterBatchSize { get; set; }

            public int DisplayOrder { get; set; }

            public bool IsActive { get; set; }
        }
    }
}
