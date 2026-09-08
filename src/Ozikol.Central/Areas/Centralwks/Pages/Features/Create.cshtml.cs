using System;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Features
{
    /// <summary>
    /// PageModel creating new modular capability definitions in the central master catalog.
    /// </summary>
    public class CreateModel : PageModel
    {
        private readonly MasterCatalogDbContext _dbContext;

        /// <summary>
        /// Initializes a new instance of the <see cref="CreateModel"/> class.
        /// </summary>
        /// <param name="dbContext">Master catalog database context.</param>
        public CreateModel(MasterCatalogDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        /// <summary>
        /// Input model binding user parameters for the new feature.
        /// </summary>
        [BindProperty]
        public FeatureInputModel Input { get; set; } = new();

        /// <summary>
        /// Handles HTTP GET requests to display the capability creation form.
        /// </summary>
        public void OnGet()
        {
        }

        /// <summary>
        /// Handles HTTP POST requests to validate and save the new feature catalog entry.
        /// </summary>
        public async Task<IActionResult> OnPostAsync()
        {
            if (!ModelState.IsValid)
            {
                return Page();
            }

            var cleanCode = Input.FeatureCode.Trim().ToLowerInvariant();
            var exists = await _dbContext.MasterFeatureCatalogs.AnyAsync(f => f.FeatureCode == cleanCode);
            if (exists)
            {
                ModelState.AddModelError("Input.FeatureCode", $"A feature with code '{cleanCode}' already exists.");
                return Page();
            }

            var feature = new MasterFeatureCatalog
            {
                Id = Guid.NewGuid(),
                FeatureCode = cleanCode,
                Name = Input.Name.Trim(),
                Category = Input.Category.Trim(),
                Description = Input.Description?.Trim(),
                Icon = Input.Icon?.Trim(),
                RoutePrefix = Input.RoutePrefix?.Trim(),
                BillingType = (FeatureBillingType)Input.BillingType,
                MonthlyPrice = Input.MonthlyPrice,
                QuarterlyPrice = Input.QuarterlyPrice > 0 ? Input.QuarterlyPrice : Math.Round(Input.MonthlyPrice * 3 * 0.9m, 2),
                YearlyPrice = Input.YearlyPrice > 0 ? Input.YearlyPrice : Math.Round(Input.MonthlyPrice * 12 * 0.8m, 2),
                IsCompulsory = Input.IsCompulsory,
                IsMetered = Input.IsMetered,
                MeterUnitName = Input.IsMetered ? Input.MeterUnitName?.Trim() : null,
                MeterUnitPrice = Input.IsMetered ? Input.MeterUnitPrice : 0m,
                MeterBlockSize = Input.IsMetered && Input.MeterBatchSize > 0 ? Input.MeterBatchSize : 1,
                SortOrder = Input.DisplayOrder,
                IsActive = true,
                CreatedUtc = DateTime.UtcNow
            };

            _dbContext.MasterFeatureCatalogs.Add(feature);

            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.Identity?.Name,
                UserName = User.Identity?.Name,
                Action = "Create",
                EntityType = "Feature",
                EntityId = feature.Id.ToString(),
                Summary = $"Created modular feature capability '{feature.Name}' ({feature.FeatureCode})",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString(),
                CreatedUtc = DateTime.UtcNow
            });

            await _dbContext.SaveChangesAsync();

            TempData["Success"] = $"Capability '{feature.Name}' created successfully.";
            return RedirectToPage("/Features/Details", new { id = feature.Id });
        }

        /// <summary>
        /// Form input binding model.
        /// </summary>
        public class FeatureInputModel
        {
            [Required(ErrorMessage = "Feature code is required.")]
            [RegularExpression("^[a-z0-9-]+$", ErrorMessage = "Feature code may only contain lowercase letters, numbers, and hyphens.")]
            [StringLength(60)]
            [Display(Name = "Feature Code Identifier")]
            public string FeatureCode { get; set; } = string.Empty;

            [Required(ErrorMessage = "Capability name is required.")]
            [StringLength(120)]
            [Display(Name = "Display Name")]
            public string Name { get; set; } = string.Empty;

            [Required(ErrorMessage = "Category is required.")]
            [StringLength(60)]
            [Display(Name = "Category")]
            public string Category { get; set; } = "Operations";

            [StringLength(500)]
            [Display(Name = "Description")]
            public string? Description { get; set; }

            [StringLength(60)]
            [Display(Name = "Icon Identifier")]
            public string? Icon { get; set; }

            [StringLength(100)]
            [Display(Name = "Route Prefix")]
            public string? RoutePrefix { get; set; }

            [Display(Name = "Billing Model")]
            public int BillingType { get; set; } = 1;

            [Range(0, 100000)]
            [Display(Name = "Monthly Price ($)")]
            public decimal MonthlyPrice { get; set; } = 20.00m;

            [Range(0, 300000)]
            [Display(Name = "Quarterly Price ($)")]
            public decimal QuarterlyPrice { get; set; } = 54.00m;

            [Range(0, 1000000)]
            [Display(Name = "Yearly Price ($)")]
            public decimal YearlyPrice { get; set; } = 192.00m;

            [Display(Name = "Compulsory Core Feature")]
            public bool IsCompulsory { get; set; } = false;

            [Display(Name = "Metered Usage Billing")]
            public bool IsMetered { get; set; } = false;

            [StringLength(50)]
            [Display(Name = "Meter Unit Name")]
            public string? MeterUnitName { get; set; }

            [Range(0, 1000)]
            [Display(Name = "Meter Unit Price ($)")]
            public decimal MeterUnitPrice { get; set; } = 0.0000m;

            [Range(1, 100000)]
            [Display(Name = "Meter Batch Size")]
            public int MeterBatchSize { get; set; } = 1;

            [Display(Name = "Sort Display Order")]
            public int DisplayOrder { get; set; } = 10;
        }
    }
}
