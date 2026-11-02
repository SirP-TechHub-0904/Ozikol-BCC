using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol.Central.Services;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Features
{
    /// <summary>
    /// PageModel modifying modular capability configurations, Full Title, Sidebar Menu Title, Suite assignment,
    /// pricing tiers in USD base currency, and metering models.
    /// </summary>
    public class EditModel : PageModel
    {
        private readonly MasterCatalogDbContext _dbContext;
        private readonly ICurrencyService _currencyService;

        /// <summary>
        /// The 11 canonical official Feature Suites of the Ozikol platform.
        /// </summary>
        public static readonly string[] CanonicalSuites = new[]
        {
            "People, Community & Collaboration",
            "Workforce, Rota & Scheduling",
            "Reports, Forms & Analytics",
            "Events & Training Management",
            "Finance & Commercial Revenue",
            "Operations & Workflows",
            "Communication, AI & Support",
            "Compliance, Learning & Certification",
            "Demographics & Civic Census",
            "Life Events & Publications",
            "Workspace"
        };

        /// <summary>
        /// Initializes a new instance of the <see cref="EditModel"/> class.
        /// </summary>
        /// <param name="dbContext">Master catalog database context.</param>
        /// <param name="currencyService">Central platform currency engine service.</param>
        public EditModel(MasterCatalogDbContext dbContext, ICurrencyService currencyService)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _currencyService = currencyService ?? throw new ArgumentNullException(nameof(currencyService));
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
        /// Available suites loaded from <see cref="MasterFeatureSuites"/>.
        /// </summary>
        public List<MasterFeatureSuite> Suites { get; set; } = new();

        /// <summary>
        /// Exchange rate multipliers for live client-side currency conversion.
        /// </summary>
        public decimal NgnRate => _currencyService.GetExchangeRate("NGN");
        public decimal GbpRate => _currencyService.GetExchangeRate("GBP");
        public decimal EurRate => _currencyService.GetExchangeRate("EUR");

        /// <summary>
        /// Form input binding model.
        /// </summary>
        [BindProperty]
        public FeatureEditInputModel Input { get; set; } = new();

        /// <summary>
        /// Loads all suites from MasterFeatureSuites with fallback to canonical defaults.
        /// </summary>
        private async Task LoadSuitesAsync()
        {
            try
            {
                Suites = await _dbContext.MasterFeatureSuites
                    .AsNoTracking()
                    .OrderBy(s => s.SortOrder)
                    .ToListAsync();
                if (Suites.Count == 0)
                {
                    Suites = MasterFeatureSuiteDefaults.GetDefaultSuites();
                }
            }
            catch
            {
                Suites = MasterFeatureSuiteDefaults.GetDefaultSuites();
            }
        }

        /// <summary>
        /// Converts a USD amount to formatted regional currency for preview.
        /// </summary>
        public string FormatPreview(decimal usdAmount, string currencyCode) => _currencyService.FormatUsdConverted(usdAmount, currencyCode);

        /// <summary>
        /// Handles HTTP GET requests to populate the edit form.
        /// </summary>
        public async Task<IActionResult> OnGetAsync()
        {
            await LoadSuitesAsync();
            var feature = await _dbContext.MasterFeatureCatalogs.FindAsync(Id);
            if (feature == null)
            {
                TempData["Error"] = "Capability not found in catalog.";
                return RedirectToPage("/Features/Index");
            }

            Feature = feature;

            var isYearlyOnly = feature.MonthlyPrice <= 0 && feature.YearlyPrice > 0;
            var qDiscount = 10;
            var yDiscount = 20;

            if (feature.MonthlyPrice > 0)
            {
                if (feature.YearlyPrice > 0 && feature.YearlyPrice < (feature.MonthlyPrice * 12m))
                {
                    yDiscount = (int)Math.Round((1.0m - (feature.YearlyPrice / (feature.MonthlyPrice * 12m))) * 100m);
                }
                if (feature.QuarterlyPrice > 0 && feature.QuarterlyPrice < (feature.MonthlyPrice * 3m))
                {
                    qDiscount = (int)Math.Round((1.0m - (feature.QuarterlyPrice / (feature.MonthlyPrice * 3m))) * 100m);
                }
            }

            Input = new FeatureEditInputModel
            {
                Name = feature.Name,
                MenuTitle = MasterFeatureSuiteDefaults.ResolveFeatureMenuTitle(feature.FeatureCode, feature.MenuTitle, feature.Name),
                Category = feature.Category,
                MasterFeatureSuiteId = feature.MasterFeatureSuiteId ?? MasterFeatureSuiteDefaults.ResolveSuiteId(feature.Category),
                Description = feature.Description,
                Icon = feature.Icon,
                BillingType = (int)feature.BillingType,
                BillingCadence = isYearlyOnly ? "Yearly" : "Monthly",
                MonthlyPrice = feature.MonthlyPrice,
                QuarterlyDiscountPercent = qDiscount,
                YearlyDiscountPercent = yDiscount,
                QuarterlyPrice = feature.QuarterlyPrice,
                YearlyPrice = feature.YearlyPrice,
                IsCompulsory = feature.IsCompulsory,
                IsMetered = feature.IsMetered,
                MeterUnitName = feature.MeterUnitName,
                MeterUnitPrice = feature.MeterUnitPrice,
                MeterBatchSize = feature.MeterBlockSize,
                FreeTrialDays = feature.FreeTrialDays,
                DisplayOrder = feature.SortOrder,
                IsActive = feature.IsActive,
                IsPublished = feature.IsActive,
                IsAvailableForUse = feature.IsAvailableForUse,
                IsInBeta = feature.IsInBeta
            };

            return Page();
        }

        /// <summary>
        /// Handles HTTP POST requests to persist updated capability configurations.
        /// </summary>
        public async Task<IActionResult> OnPostAsync()
        {
            await LoadSuitesAsync();
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
            feature.MenuTitle = !string.IsNullOrWhiteSpace(Input.MenuTitle)
                ? Input.MenuTitle.Trim()
                : MasterFeatureSuiteDefaults.ResolveFeatureMenuTitle(feature.FeatureCode, null, feature.Name);

            var matchedSuite = Suites.FirstOrDefault(s =>
                (Input.MasterFeatureSuiteId.HasValue && s.Id == Input.MasterFeatureSuiteId.Value) ||
                string.Equals(s.Name, Input.Category?.Trim(), StringComparison.OrdinalIgnoreCase));

            if (matchedSuite != null)
            {
                feature.MasterFeatureSuiteId = matchedSuite.Id;
                feature.Category = matchedSuite.Name;
            }
            else
            {
                feature.Category = Input.Category.Trim();
                feature.MasterFeatureSuiteId = MasterFeatureSuiteDefaults.ResolveSuiteId(feature.Category);
            }

            feature.Description = Input.Description?.Trim();
            feature.Icon = Input.Icon?.Trim();
            feature.BillingType = (FeatureBillingType)Input.BillingType;

            // Apply automated pricing logic based on cadence
            if (string.Equals(Input.BillingCadence, "Yearly", StringComparison.OrdinalIgnoreCase))
            {
                feature.MonthlyPrice = 0m;
                feature.QuarterlyPrice = 0m;
                feature.YearlyPrice = Math.Max(0m, Input.YearlyPrice);
            }
            else
            {
                var monthly = Math.Max(0m, Input.MonthlyPrice);
                var qDisc = Math.Clamp(Input.QuarterlyDiscountPercent, 0, 100);
                var yDisc = Math.Clamp(Input.YearlyDiscountPercent, 0, 100);

                feature.MonthlyPrice = monthly;
                feature.QuarterlyPrice = Math.Round((monthly * 3m) * (1.0m - (qDisc / 100m)), 2);
                feature.YearlyPrice = Math.Round((monthly * 12m) * (1.0m - (yDisc / 100m)), 2);
            }

            feature.IsCompulsory = Input.IsCompulsory;
            feature.IsMetered = Input.IsMetered;
            feature.MeterUnitName = Input.IsMetered ? Input.MeterUnitName?.Trim() : null;
            feature.MeterUnitPrice = Input.IsMetered ? Input.MeterUnitPrice : 0m;
            feature.MeterBlockSize = Input.IsMetered && Input.MeterBatchSize > 0 ? Input.MeterBatchSize : 1;
            feature.FreeTrialDays = Math.Clamp(Input.FreeTrialDays, 0, 365);
            var previousOrder = feature.SortOrder;
            feature.SortOrder = Input.DisplayOrder;
            feature.IsActive = Input.IsPublished;
            feature.IsPublished = Input.IsPublished;
            feature.IsAvailableForUse = Input.IsAvailableForUse;

            // If SortOrder changed, rearrange all features sequentially (1..N) without duplicates
            if (Input.DisplayOrder > 0 && Input.DisplayOrder != previousOrder)
            {
                var suiteOrderLookup = Suites.ToDictionary(s => s.Id, s => s.SortOrder);
                var suiteNameLookup = Suites
                    .GroupBy(s => s.Name.Trim(), StringComparer.OrdinalIgnoreCase)
                    .ToDictionary(g => g.Key, g => g.First().SortOrder, StringComparer.OrdinalIgnoreCase);

                int ResolveSuiteSort(MasterFeatureCatalog f)
                {
                    if (f.MasterFeatureSuiteId.HasValue && suiteOrderLookup.TryGetValue(f.MasterFeatureSuiteId.Value, out var byId))
                        return byId;
                    if (!string.IsNullOrWhiteSpace(f.Category) && suiteNameLookup.TryGetValue(f.Category.Trim(), out var byName))
                        return byName;
                    return 999;
                }

                var allOthers = await _dbContext.MasterFeatureCatalogs
                    .Where(f => f.Id != feature.Id)
                    .ToListAsync();

                var orderedList = allOthers
                    .OrderBy(f => ResolveSuiteSort(f))
                    .ThenBy(f => f.SortOrder)
                    .ThenBy(f => f.Name)
                    .ToList();

                int targetIdx = Math.Clamp(Input.DisplayOrder - 1, 0, orderedList.Count);
                orderedList.Insert(targetIdx, feature);

                var finalOrdered = orderedList
                    .Select((f, idx) => new { Feature = f, RequestedIdx = idx })
                    .OrderBy(x => ResolveSuiteSort(x.Feature))
                    .ThenBy(x => x.RequestedIdx)
                    .Select(x => x.Feature)
                    .ToList();

                for (int i = 0; i < finalOrdered.Count; i++)
                {
                    finalOrdered[i].SortOrder = i + 1;
                }
            }

            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.Identity?.Name,
                UserName = User.Identity?.Name,
                Action = "Update",
                EntityType = "Feature",
                EntityId = feature.Id.ToString(),
                Summary = $"Updated capability '{feature.Name}' (Menu: '{feature.MenuTitle}', Code: {feature.FeatureCode})",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString(),
                CreatedUtc = DateTime.UtcNow
            });

            await _dbContext.SaveChangesAsync();
            _currencyService.InvalidatePricingCache();

            TempData["Success"] = $"Capability '{feature.Name}' (Menu Title: '{feature.MenuTitle}') updated successfully.";
            return RedirectToPage("/Features/Details", new { id = feature.Id });
        }

        /// <summary>
        /// Form input binding model.
        /// </summary>
        public class FeatureEditInputModel
        {
            [Required(ErrorMessage = "Capability full title is required.")]
            [StringLength(120)]
            public string Name { get; set; } = string.Empty;

            [Required(ErrorMessage = "Sidebar Menu Title is required.")]
            [StringLength(60)]
            public string MenuTitle { get; set; } = string.Empty;

            public Guid? MasterFeatureSuiteId { get; set; }

            [Required(ErrorMessage = "Category is required.")]
            [StringLength(60)]
            public string Category { get; set; } = string.Empty;

            [StringLength(500)]
            public string? Description { get; set; }

            [StringLength(60)]
            public string? Icon { get; set; }

            public int BillingType { get; set; } = 1;

            public string BillingCadence { get; set; } = "Yearly";

            [Range(0, 100000)]
            public decimal MonthlyPrice { get; set; }

            [Range(0, 100)]
            public int QuarterlyDiscountPercent { get; set; } = 10;

            [Range(0, 100)]
            public int YearlyDiscountPercent { get; set; } = 20;

            [Range(0, 300000)]
            public decimal QuarterlyPrice { get; set; }

            [Range(0, 1000000)]
            public decimal YearlyPrice { get; set; }

            public bool IsCompulsory { get; set; }

            public bool IsMetered { get; set; }

            [StringLength(50)]
            public string? MeterUnitName { get; set; }

            public decimal MeterUnitPrice { get; set; }

            public int MeterBatchSize { get; set; } = 1;

            /// <summary>
            /// Number of free trial days granted to a tenant the first time they activate and test this capability before payment (General Mode).
            /// </summary>
            [Range(0, 365)]
            public int FreeTrialDays { get; set; } = 14;

            public int DisplayOrder { get; set; }

            public bool IsActive { get; set; } = true;

            public bool IsPublished { get; set; } = true;

            public bool IsAvailableForUse { get; set; } = false;

            public bool IsInBeta { get; set; } = false;
        }
    }
}
