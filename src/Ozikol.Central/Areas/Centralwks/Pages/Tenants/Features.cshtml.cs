using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Tenants
{
    /// <summary>
    /// PageModel enabling super-administrators to govern per-tenant capability activations (Active / Not Active),
    /// General vs. Custom Pricing overrides, and General vs. Custom Availability (Available for Tenant vs. Not Available)
    /// for a specific tenant workspace in real time.
    /// </summary>
    public class FeaturesModel : PageModel
    {
        private readonly MasterCatalogDbContext _dbContext;

        /// <summary>
        /// Canonical ordering of the 10 platform suites matching the Master Feature Catalog (/centralwks/features).
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
            "Life Events & Publications"
        };

        /// <summary>
        /// Default available feature codes matching the tenant workspace baseline when MasterFeatureCatalog.IsAvailableForUse is uninitialized.
        /// </summary>
        private static readonly HashSet<string> DefaultAvailableCodes = new(StringComparer.OrdinalIgnoreCase)
        {
            "bcp-community-messenger",
            "bcp-committees",
            "bcp-alumni-directory",
            "bcp-form-builder",
            "bcp-store-ecommerce",
            "bcp-ai-smart-assist",
            "bcp-mass-communication"
        };

        /// <summary>
        /// Initializes a new instance of the <see cref="FeaturesModel"/> class.
        /// </summary>
        /// <param name="dbContext">Master catalog database context.</param>
        public FeaturesModel(MasterCatalogDbContext dbContext)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
        }

        /// <summary>
        /// Tenant ID whose subscriptions, pricing, and availability are being managed.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public Guid Id { get; set; }

        /// <summary>
        /// Alias tenant ID parameter for navigation links from /centralwks/features/analytics.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public Guid? TenantId { get; set; }

        /// <summary>
        /// Search keyword filter.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Search { get; set; }

        /// <summary>
        /// Suite / Category filter.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Category { get; set; }

        /// <summary>
        /// Status filter ("active", "inactive", "available", "coming_soon", "custom_price").
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Status { get; set; }

        /// <summary>
        /// Active Availability Tab ("available", "not_available", or "all").
        /// When Custom Availability is enabled on the tenant, defaults to "available" so only attached features show first.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Tab { get; set; }

        /// <summary>
        /// Display layout mode ("cards" or "table"). Defaults to "cards".
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string ViewMode { get; set; } = "cards";

        /// <summary>
        /// The loaded tenant entity.
        /// </summary>
        public MasterTenantCatalog Tenant { get; set; } = null!;

        /// <summary>
        /// Distinct suites in canonical order.
        /// </summary>
        public List<string> Categories { get; set; } = new();

        /// <summary>
        /// Filtered and sorted capability items for the active tab/filter.
        /// </summary>
        public List<FeatureItemDto> AvailableFeatures { get; set; } = new();

        /// <summary>
        /// Active currencies from MasterCurrencyRates for selecting the tenant's default currency.
        /// </summary>
        public List<MasterCurrencyRate> AvailableCurrencies { get; set; } = new();

        /// <summary>
        /// Effective currency code for this tenant (defaults to USD).
        /// </summary>
        public string TenantCurrencyCode { get; set; } = "USD";

        /// <summary>
        /// Symbol for the tenant's default currency (e.g. $, ₦, £, €).
        /// </summary>
        public string TenantCurrencySymbol { get; set; } = "$";

        /// <summary>
        /// Exchange rate of the tenant's default currency per 1.00 USD.
        /// </summary>
        public decimal TenantCurrencyRateFromUsd { get; set; } = 1.0m;

        // ── Tenant KPI Counters ──
        public int SuitesCount { get; set; }
        public int TotalCount { get; set; }
        public int ActiveCount { get; set; }
        public int SubscribedAddonCount { get; set; }
        public int CompulsoryActiveCount { get; set; }
        public int InactiveCount { get; set; }
        public int AvailableForUseCount { get; set; }
        public int ComingSoonCount { get; set; }
        public int CustomAvailableFeaturesCount { get; set; }
        public int GeneralAvailableFeaturesCount { get; set; }
        public int CustomPricingFeaturesCount { get; set; }
        public int GeneralPricingFeaturesCount { get; set; }
        public decimal TotalMonthlyMrr { get; set; }

        /// <summary>
        /// Resolved active tab ("available", "not_available", or "all").
        /// </summary>
        public string ActiveTab { get; set; } = "available";

        /// <summary>
        /// Resolves the canonical 0-based suite index for a given category name.
        /// </summary>
        public static int GetSuiteOrder(string? category)
        {
            if (string.IsNullOrWhiteSpace(category)) return 999;
            var idx = Array.FindIndex(CanonicalSuites, s => s.Equals(category.Trim(), StringComparison.OrdinalIgnoreCase));
            return idx >= 0 ? idx : 500;
        }

        /// <summary>
        /// Handles HTTP GET requests to build the tenant's feature, pricing, and availability console.
        /// </summary>
        public async Task<IActionResult> OnGetAsync()
        {
            var targetId = Id != Guid.Empty ? Id : (TenantId ?? Guid.Empty);
            if (targetId == Guid.Empty)
            {
                var firstTenant = await _dbContext.MasterTenantCatalogs.AsNoTracking().FirstOrDefaultAsync();
                if (firstTenant != null) targetId = firstTenant.Id;
            }

            MasterTenantCatalog? tenant = null;
            try
            {
                tenant = await _dbContext.MasterTenantCatalogs
                    .Include(t => t.FeatureSubscriptions)
                    .FirstOrDefaultAsync(t => t.Id == targetId);
            }
            catch
            {
                tenant = await _dbContext.MasterTenantCatalogs
                    .AsNoTracking()
                    .Select(t => new MasterTenantCatalog
                    {
                        Id = t.Id,
                        TenantKey = t.TenantKey,
                        OrganizationName = t.OrganizationName,
                        PrimaryDomain = t.PrimaryDomain,
                        CustomDomain = t.CustomDomain,
                        IsActive = t.IsActive
                    })
                    .FirstOrDefaultAsync(t => t.Id == targetId);
            }

            if (tenant == null)
            {
                TempData["Error"] = "Tenant organization not found.";
                return RedirectToPage("/Features/Analytics");
            }

            Id = tenant.Id;
            TenantId = tenant.Id;
            Tenant = tenant;

            // Tab filtering only applies when UseCustomAvailability is enabled
            if (!tenant.UseCustomAvailability)
            {
                ActiveTab = "all";
            }
            else if (string.IsNullOrWhiteSpace(Tab))
            {
                ActiveTab = "available";
            }
            else
            {
                ActiveTab = Tab.Trim().ToLowerInvariant();
            }

            // Load active platform currencies for tenant default currency governance
            try
            {
                AvailableCurrencies = await _dbContext.MasterCurrencyRates
                    .AsNoTracking()
                    .Where(c => c.IsActive)
                    .OrderByDescending(c => c.IsBaseCurrency)
                    .ThenBy(c => c.SortOrder)
                    .ThenBy(c => c.CurrencyCode)
                    .ToListAsync();
            }
            catch
            {
                AvailableCurrencies = new List<MasterCurrencyRate>();
            }

            if (AvailableCurrencies.Count == 0)
            {
                AvailableCurrencies = new List<MasterCurrencyRate>
                {
                    new() { CurrencyCode = "USD", CurrencySymbol = "$", DisplayName = "US Dollar", RateFromUsd = 1.0000m, IsBaseCurrency = true, IsActive = true },
                    new() { CurrencyCode = "NGN", CurrencySymbol = "₦", DisplayName = "Nigerian Naira", RateFromUsd = 1600.0000m, IsBaseCurrency = false, IsActive = true },
                    new() { CurrencyCode = "GBP", CurrencySymbol = "£", DisplayName = "British Pound", RateFromUsd = 0.7900m, IsBaseCurrency = false, IsActive = true },
                    new() { CurrencyCode = "EUR", CurrencySymbol = "€", DisplayName = "Euro", RateFromUsd = 0.9200m, IsBaseCurrency = false, IsActive = true }
                };
            }

            TenantCurrencyCode = string.IsNullOrWhiteSpace(tenant.DefaultCurrencyCode) ? "USD" : tenant.DefaultCurrencyCode.Trim().ToUpperInvariant();
            var matchedCurr = AvailableCurrencies.FirstOrDefault(c => c.CurrencyCode.Equals(TenantCurrencyCode, StringComparison.OrdinalIgnoreCase));
            if (matchedCurr != null)
            {
                TenantCurrencySymbol = matchedCurr.CurrencySymbol;
                TenantCurrencyRateFromUsd = matchedCurr.RateFromUsd > 0 ? matchedCurr.RateFromUsd : 1.0m;
            }
            else
            {
                TenantCurrencyCode = "USD";
                TenantCurrencySymbol = "$";
                TenantCurrencyRateFromUsd = 1.0m;
            }

            List<MasterFeatureCatalog> allFeatures;
            try
            {
                allFeatures = await _dbContext.MasterFeatureCatalogs
                    .AsNoTracking()
                    .Where(f => f.IsActive && f.IsPublished)
                    .ToListAsync();
            }
            catch
            {
                allFeatures = await _dbContext.MasterFeatureCatalogs
                    .AsNoTracking()
                    .Where(f => f.IsActive)
                    .Select(f => new MasterFeatureCatalog
                    {
                        Id = f.Id,
                        FeatureCode = f.FeatureCode,
                        Name = f.Name,
                        Category = f.Category,
                        Description = f.Description,
                        Icon = f.Icon,
                        IsCompulsory = f.IsCompulsory,
                        BillingType = f.BillingType,
                        MonthlyPrice = f.MonthlyPrice,
                        QuarterlyPrice = f.QuarterlyPrice,
                        YearlyPrice = f.YearlyPrice,
                        IsActive = f.IsActive,
                        IsPublished = true,
                        SortOrder = f.SortOrder
                    })
                    .ToListAsync();
            }

            // Harmonize with BillingSnapshotService: if no MasterFeatureCatalog row has IsAvailableForUse == true yet, fall back to DefaultAvailableCodes
            bool anyMasterAvail = allFeatures.Any(f => f.IsAvailableForUse);

            var orderedFeatures = allFeatures
                .OrderBy(f => GetSuiteOrder(f.Category))
                .ThenBy(f => f.SortOrder)
                .ThenBy(f => f.Name)
                .ToList();

            var subsByFeature = (tenant.FeatureSubscriptions ?? new List<MasterTenantFeatureSubscription>())
                .GroupBy(s => s.MasterFeatureCatalogId)
                .ToDictionary(g => g.Key, g => g.OrderByDescending(s => s.ExpiresAtUtc).First());

            var now = DateTime.UtcNow;
            var allItems = new List<FeatureItemDto>();

            foreach (var f in orderedFeatures)
            {
                subsByFeature.TryGetValue(f.Id, out var sub);

                bool generalAvailable = anyMasterAvail
                    ? f.IsAvailableForUse
                    : DefaultAvailableCodes.Contains(f.FeatureCode);

                // Determine effective Monthly Price for this tenant
                bool hasCustomPriceOverride = sub?.CustomPriceOverride != null;
                decimal effectiveMonthlyPrice = (tenant.UseCustomPricing && hasCustomPriceOverride)
                    ? sub!.CustomPriceOverride!.Value
                    : f.MonthlyPrice;

                // Determine effective First-Time Free Trial Days before payment (General Mode vs Custom Mode)
                bool hasCustomFreeTrialOverride = sub?.CustomFreeTrialDaysOverride != null;
                int generalFreeTrialDays = f.FreeTrialDays > 0 ? f.FreeTrialDays : 0;
                int effectiveFreeTrialDays = ((tenant.UseCustomPricing || tenant.UseCustomAvailability) && hasCustomFreeTrialOverride)
                    ? Math.Max(0, sub!.CustomFreeTrialDaysOverride!.Value)
                    : generalFreeTrialDays;
                bool hasUsedFreeTrial = sub?.HasUsedFreeTrial ?? false;
                bool isTrialPeriod = (sub?.IsTrialPeriod ?? false) && (sub?.ExpiresAtUtc > now);

                // Determine effective Availability for this tenant (Synced with Custom Price & Active overrides)
                bool hasCustomAvailOverride = sub?.IsAvailableForUseOverride != null;
                bool effectiveAvailableForUse;
                if (tenant.UseCustomAvailability)
                {
                    if (hasCustomAvailOverride)
                    {
                        effectiveAvailableForUse = sub!.IsAvailableForUseOverride!.Value;
                    }
                    else if (hasCustomPriceOverride || (sub != null && sub.IsActive && !f.IsCompulsory))
                    {
                        // Sync: any feature given a custom price or explicitly subscribed for this tenant is automatically Available
                        effectiveAvailableForUse = true;
                    }
                    else
                    {
                        effectiveAvailableForUse = generalAvailable;
                    }
                }
                else
                {
                    effectiveAvailableForUse = generalAvailable;
                }

                // Determine whether capability is Active (Installed) or Not Active for this specific tenant
                bool isActiveForTenant;
                if (!effectiveAvailableForUse)
                {
                    isActiveForTenant = false;
                }
                else if (sub != null)
                {
                    bool notExpired = sub.ExpiresAtUtc > now;
                    bool notSuspended = !string.Equals(sub.Status, "Suspended", StringComparison.OrdinalIgnoreCase) &&
                                        !string.Equals(sub.Status, "Cancelled", StringComparison.OrdinalIgnoreCase) &&
                                        !string.Equals(sub.Status, "Inactive", StringComparison.OrdinalIgnoreCase);
                    isActiveForTenant = sub.IsActive && notSuspended && (f.IsCompulsory || notExpired);
                }
                else
                {
                    isActiveForTenant = false;
                }

                bool isPaidSubscribed = isActiveForTenant && (!f.IsCompulsory || effectiveMonthlyPrice > 0);

                allItems.Add(new FeatureItemDto
                {
                    Feature = f,
                    Subscription = sub,
                    IsSubscribed = isActiveForTenant,
                    IsPaidSubscribed = isPaidSubscribed,
                    EffectiveAvailableForUse = effectiveAvailableForUse,
                    HasCustomAvailabilityOverride = hasCustomAvailOverride,
                    EffectiveMonthlyPrice = effectiveMonthlyPrice,
                    EffectiveTenantCurrencyPrice = Math.Round(effectiveMonthlyPrice * TenantCurrencyRateFromUsd, 2),
                    MasterTenantCurrencyPrice = Math.Round(f.MonthlyPrice * TenantCurrencyRateFromUsd, 2),
                    HasCustomPriceOverride = hasCustomPriceOverride,
                    EffectiveFreeTrialDays = effectiveFreeTrialDays,
                    HasCustomFreeTrialOverride = hasCustomFreeTrialOverride,
                    HasUsedFreeTrial = hasUsedFreeTrial,
                    IsTrialPeriod = isTrialPeriod
                });
            }

            // Compute Tenant KPI Counters
            TotalCount = allItems.Count;
            ActiveCount = allItems.Count(x => x.IsSubscribed);
            SubscribedAddonCount = allItems.Count(x => x.IsPaidSubscribed);
            CompulsoryActiveCount = allItems.Count(x => x.IsSubscribed && x.Feature.IsCompulsory);
            InactiveCount = allItems.Count(x => !x.IsSubscribed);
            AvailableForUseCount = allItems.Count(x => x.EffectiveAvailableForUse);
            ComingSoonCount = allItems.Count(x => !x.EffectiveAvailableForUse);
            CustomAvailableFeaturesCount = allItems.Count(x => x.HasCustomAvailabilityOverride);
            GeneralAvailableFeaturesCount = TotalCount - CustomAvailableFeaturesCount;
            CustomPricingFeaturesCount = allItems.Count(x => x.HasCustomPriceOverride);
            GeneralPricingFeaturesCount = TotalCount - CustomPricingFeaturesCount;
            TotalMonthlyMrr = allItems
                .Where(x => x.IsSubscribed && x.EffectiveMonthlyPrice > 0)
                .Sum(x => x.EffectiveMonthlyPrice);

            var distinctCats = allItems
                .Select(x => x.Feature.Category)
                .Where(c => !string.IsNullOrWhiteSpace(c))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            Categories = CanonicalSuites
                .Where(s => distinctCats.Contains(s, StringComparer.OrdinalIgnoreCase))
                .Concat(distinctCats.Where(c => !CanonicalSuites.Contains(c, StringComparer.OrdinalIgnoreCase)).OrderBy(c => c))
                .ToList();

            SuitesCount = Categories.Count;

            // Apply Search, Suite, Tab, and Status filters
            var filtered = allItems.AsEnumerable();

            // Filter by Active Tab ("available" vs "not_available" vs "all") ONLY when UseCustomAvailability is true
            if (tenant.UseCustomAvailability)
            {
                if (ActiveTab == "available")
                {
                    filtered = filtered.Where(x => x.EffectiveAvailableForUse);
                }
                else if (ActiveTab == "not_available")
                {
                    filtered = filtered.Where(x => !x.EffectiveAvailableForUse);
                }
            }

            if (!string.IsNullOrWhiteSpace(Search))
            {
                var term = Search.Trim().ToLowerInvariant();
                filtered = filtered.Where(x =>
                    (x.Feature.Name != null && x.Feature.Name.ToLowerInvariant().Contains(term)) ||
                    (x.Feature.FeatureCode != null && x.Feature.FeatureCode.ToLowerInvariant().Contains(term)) ||
                    (x.Feature.Category != null && x.Feature.Category.ToLowerInvariant().Contains(term)) ||
                    (x.Feature.Description != null && x.Feature.Description.ToLowerInvariant().Contains(term)));
            }

            if (!string.IsNullOrWhiteSpace(Category))
            {
                filtered = filtered.Where(x => x.Feature.Category.Equals(Category, StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrWhiteSpace(Status))
            {
                var st = Status.Trim().ToLowerInvariant();
                if (st == "active")
                    filtered = filtered.Where(x => x.IsSubscribed);
                else if (st == "subscribed")
                    filtered = filtered.Where(x => x.IsPaidSubscribed);
                else if (st == "inactive")
                    filtered = filtered.Where(x => !x.IsSubscribed);
                else if (st == "available")
                    filtered = filtered.Where(x => x.EffectiveAvailableForUse);
                else if (st == "coming_soon")
                    filtered = filtered.Where(x => !x.EffectiveAvailableForUse);
                else if (st == "custom_avail")
                    filtered = filtered.Where(x => x.HasCustomAvailabilityOverride);
                else if (st == "general_avail")
                    filtered = filtered.Where(x => !x.HasCustomAvailabilityOverride);
                else if (st == "custom_price")
                    filtered = filtered.Where(x => x.HasCustomPriceOverride);
                else if (st == "general_price")
                    filtered = filtered.Where(x => !x.HasCustomPriceOverride);
            }

            AvailableFeatures = filtered.ToList();
            return Page();
        }

        /// <summary>
        /// Toggles whether this tenant uses General Master Pricing or Custom Tenant Pricing.
        /// </summary>
        public async Task<IActionResult> OnPostTogglePricingPolicyAsync(Guid tenantId)
        {
            var targetId = tenantId != Guid.Empty ? tenantId : (Id != Guid.Empty ? Id : (TenantId ?? Guid.Empty));
            var tenant = await _dbContext.MasterTenantCatalogs.FindAsync(targetId);
            if (tenant == null)
            {
                TempData["Error"] = "Tenant not found.";
                return RedirectToPage("/Features/Analytics");
            }

            tenant.UseCustomPricing = !tenant.UseCustomPricing;
            tenant.UpdatedUtc = DateTime.UtcNow;

            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.Identity?.Name,
                UserName = User.Identity?.Name,
                Action = "TogglePricingPolicy",
                EntityType = "Tenant",
                EntityId = tenant.Id.ToString(),
                Summary = $"Switched tenant '{tenant.OrganizationName}' pricing policy to {(tenant.UseCustomPricing ? "Custom Tenant Pricing" : "General Master Pricing")}",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString(),
                CreatedUtc = DateTime.UtcNow
            });

            await _dbContext.SaveChangesAsync();
            TempData["Success"] = $"Pricing mode for {tenant.OrganizationName} set to {(tenant.UseCustomPricing ? "Custom Tenant Pricing" : "General Master Pricing")}.";

            return RedirectToPage(new { tenantId = tenant.Id, tab = Tab, search = Search, category = Category, status = Status, viewMode = ViewMode });
        }

        /// <summary>
        /// Toggles whether this tenant uses General Master Availability or Custom Tenant Availability.
        /// When enabling Custom Tenant Availability, automatically switches to the "Available for Tenant" tab.
        /// </summary>
        public async Task<IActionResult> OnPostToggleAvailabilityPolicyAsync(Guid tenantId)
        {
            var targetId = tenantId != Guid.Empty ? tenantId : (Id != Guid.Empty ? Id : (TenantId ?? Guid.Empty));
            var tenant = await _dbContext.MasterTenantCatalogs
                .Include(t => t.FeatureSubscriptions)
                .FirstOrDefaultAsync(t => t.Id == targetId);

            if (tenant == null)
            {
                TempData["Error"] = "Tenant not found.";
                return RedirectToPage("/Features/Analytics");
            }

            tenant.UseCustomAvailability = !tenant.UseCustomAvailability;
            tenant.UpdatedUtc = DateTime.UtcNow;

            // If turning ON Custom Availability and no overrides exist yet, seed the baseline available features as Available (but Not Active until activated) for this tenant
            if (tenant.UseCustomAvailability && !tenant.FeatureSubscriptions.Any(s => s.IsAvailableForUseOverride != null))
            {
                var allFeatures = await _dbContext.MasterFeatureCatalogs.Where(f => f.IsActive && f.IsPublished).ToListAsync();
                bool anyMasterAvail = allFeatures.Any(f => f.IsAvailableForUse);

                foreach (var f in allFeatures)
                {
                    bool defaultAvail = anyMasterAvail ? f.IsAvailableForUse : DefaultAvailableCodes.Contains(f.FeatureCode);
                    var sub = tenant.FeatureSubscriptions.FirstOrDefault(s => s.MasterFeatureCatalogId == f.Id);
                    if (sub != null)
                    {
                        sub.IsAvailableForUseOverride = defaultAvail || sub.CustomPriceOverride != null;
                    }
                    else if (defaultAvail)
                    {
                        _dbContext.MasterTenantFeatureSubscriptions.Add(new MasterTenantFeatureSubscription
                        {
                            Id = Guid.NewGuid(),
                            MasterTenantCatalogId = tenant.Id,
                            MasterFeatureCatalogId = f.Id,
                            DurationType = SubscriptionBillingDuration.Monthly,
                            RecurringPrice = f.MonthlyPrice,
                            StartsAtUtc = DateTime.UtcNow,
                            ExpiresAtUtc = DateTime.UtcNow.AddYears(1),
                            AutoRenew = true,
                            IsActive = false,
                            Status = "Inactive",
                            IsAvailableForUseOverride = true,
                            CreatedUtc = DateTime.UtcNow
                        });
                    }
                }
            }

            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.Identity?.Name,
                UserName = User.Identity?.Name,
                Action = "ToggleAvailabilityPolicy",
                EntityType = "Tenant",
                EntityId = tenant.Id.ToString(),
                Summary = $"Switched tenant '{tenant.OrganizationName}' availability policy to {(tenant.UseCustomAvailability ? "Custom Tenant Availability" : "General Master Availability")}",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString(),
                CreatedUtc = DateTime.UtcNow
            });

            await _dbContext.SaveChangesAsync();
            TempData["Success"] = $"Availability mode for {tenant.OrganizationName} set to {(tenant.UseCustomAvailability ? "Custom Tenant Availability (showing Available for Tenant tab)" : "General Master Availability")}.";

            var nextTab = tenant.UseCustomAvailability ? "available" : "all";
            return RedirectToPage(new { tenantId = tenant.Id, tab = nextTab, search = Search, category = Category, status = Status, viewMode = ViewMode });
        }

        /// <summary>
        /// Sets the default billing/display currency for this specific tenant organization.
        /// </summary>
        public async Task<IActionResult> OnPostSetTenantCurrencyAsync(Guid tenantId, string currencyCode)
        {
            var targetId = tenantId != Guid.Empty ? tenantId : (Id != Guid.Empty ? Id : (TenantId ?? Guid.Empty));
            var tenant = await _dbContext.MasterTenantCatalogs.FindAsync(targetId);
            if (tenant == null)
            {
                TempData["Error"] = "Tenant not found.";
                return RedirectToPage("/Features/Analytics");
            }

            var normalizedCode = string.IsNullOrWhiteSpace(currencyCode) ? "USD" : currencyCode.Trim().ToUpperInvariant();
            tenant.DefaultCurrencyCode = normalizedCode;
            tenant.UpdatedUtc = DateTime.UtcNow;

            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.Identity?.Name,
                UserName = User.Identity?.Name,
                Action = "SetTenantDefaultCurrency",
                EntityType = "Tenant",
                EntityId = tenant.Id.ToString(),
                Summary = $"Updated default currency for tenant '{tenant.OrganizationName}' to {normalizedCode}",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString(),
                CreatedUtc = DateTime.UtcNow
            });

            await _dbContext.SaveChangesAsync();
            TempData["Success"] = $"Default currency for {tenant.OrganizationName} set to {normalizedCode}.";

            return RedirectToPage(new { tenantId = tenant.Id, tab = Tab, search = Search, category = Category, status = Status, viewMode = ViewMode });
        }

        /// <summary>
        /// Toggles whether a specific capability is Active (Subscribed) or Not Active for this tenant.
        /// When activating a feature, also marks it Available for this tenant so Custom Availability stays synced.
        /// </summary>
        public async Task<IActionResult> OnPostToggleTenantActiveAsync(Guid tenantId, Guid featureId, int durationType = 1)
        {
            var targetId = tenantId != Guid.Empty ? tenantId : (Id != Guid.Empty ? Id : (TenantId ?? Guid.Empty));
            var tenant = await _dbContext.MasterTenantCatalogs
                .Include(t => t.FeatureSubscriptions)
                .FirstOrDefaultAsync(t => t.Id == targetId);

            if (tenant == null)
            {
                TempData["Error"] = "Tenant not found.";
                return RedirectToPage("/Features/Analytics");
            }

            var feature = await _dbContext.MasterFeatureCatalogs.FindAsync(featureId);
            if (feature == null)
            {
                TempData["Error"] = "Capability not found.";
                return RedirectToPage(new { tenantId = tenant.Id });
            }

            var existing = tenant.FeatureSubscriptions.FirstOrDefault(s => s.MasterFeatureCatalogId == featureId);
            var duration = (SubscriptionBillingDuration)durationType;
            bool nowActive;

            if (existing != null)
            {
                bool currentlyActive = existing.IsActive && !string.Equals(existing.Status, "Suspended", StringComparison.OrdinalIgnoreCase);
                nowActive = !currentlyActive;
                existing.IsActive = nowActive;
                existing.Status = nowActive ? "Active" : "Suspended";
                if (nowActive)
                {
                    existing.IsAvailableForUseOverride = true;
                    if (existing.ExpiresAtUtc <= DateTime.UtcNow)
                    {
                        existing.ExpiresAtUtc = duration switch
                        {
                            SubscriptionBillingDuration.Yearly => DateTime.UtcNow.AddYears(1),
                            SubscriptionBillingDuration.Quarterly => DateTime.UtcNow.AddMonths(3),
                            _ => DateTime.UtcNow.AddMonths(1)
                        };
                    }
                }
            }
            else
            {
                nowActive = true;
                var newSub = new MasterTenantFeatureSubscription
                {
                    Id = Guid.NewGuid(),
                    MasterTenantCatalogId = tenant.Id,
                    MasterFeatureCatalogId = feature.Id,
                    DurationType = duration,
                    RecurringPrice = feature.MonthlyPrice,
                    StartsAtUtc = DateTime.UtcNow,
                    ExpiresAtUtc = DateTime.UtcNow.AddYears(1),
                    AutoRenew = true,
                    IsActive = nowActive,
                    Status = "Active",
                    IsAvailableForUseOverride = true,
                    CreatedUtc = DateTime.UtcNow
                };
                _dbContext.MasterTenantFeatureSubscriptions.Add(newSub);
            }

            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.Identity?.Name,
                UserName = User.Identity?.Name,
                Action = nowActive ? "ActivateTenantFeature" : "DeactivateTenantFeature",
                EntityType = "FeatureSubscription",
                EntityId = feature.Id.ToString(),
                Summary = $"{(nowActive ? "Activated" : "Deactivated")} '{feature.Name}' for tenant '{tenant.OrganizationName}'",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString(),
                CreatedUtc = DateTime.UtcNow
            });

            await _dbContext.SaveChangesAsync();
            TempData["Success"] = $"'{feature.Name}' is now {(nowActive ? "Active (Subscribed)" : "Not Active")} for {tenant.OrganizationName}.";

            return RedirectToPage(new { tenantId = tenant.Id, tab = Tab, search = Search, category = Category, status = Status, viewMode = ViewMode });
        }

        /// <summary>
        /// Toggles whether a specific capability is Available for Tenant or Not Available (Coming Soon) specifically for this tenant.
        /// </summary>
        public async Task<IActionResult> OnPostToggleTenantAvailabilityAsync(Guid tenantId, Guid featureId)
        {
            var targetId = tenantId != Guid.Empty ? tenantId : (Id != Guid.Empty ? Id : (TenantId ?? Guid.Empty));
            var tenant = await _dbContext.MasterTenantCatalogs
                .Include(t => t.FeatureSubscriptions)
                .FirstOrDefaultAsync(t => t.Id == targetId);

            if (tenant == null)
            {
                TempData["Error"] = "Tenant not found.";
                return RedirectToPage("/Features/Analytics");
            }

            var feature = await _dbContext.MasterFeatureCatalogs.FindAsync(featureId);
            if (feature == null)
            {
                TempData["Error"] = "Capability not found.";
                return RedirectToPage(new { tenantId = tenant.Id });
            }

            // Ensure Custom Tenant Availability mode is enabled when setting a tenant-level availability override
            tenant.UseCustomAvailability = true;

            bool defaultAvail = feature.IsAvailableForUse || DefaultAvailableCodes.Contains(feature.FeatureCode);
            var existing = tenant.FeatureSubscriptions.FirstOrDefault(s => s.MasterFeatureCatalogId == featureId);
            bool newAvailability;

            if (existing != null)
            {
                bool current = existing.IsAvailableForUseOverride ?? defaultAvail;
                newAvailability = !current;
                existing.IsAvailableForUseOverride = newAvailability;
            }
            else
            {
                newAvailability = !defaultAvail;
                var newSub = new MasterTenantFeatureSubscription
                {
                    Id = Guid.NewGuid(),
                    MasterTenantCatalogId = tenant.Id,
                    MasterFeatureCatalogId = feature.Id,
                    DurationType = SubscriptionBillingDuration.Monthly,
                    RecurringPrice = feature.MonthlyPrice,
                    StartsAtUtc = DateTime.UtcNow,
                    ExpiresAtUtc = DateTime.UtcNow.AddMonths(1),
                    AutoRenew = true,
                    IsActive = false,
                    Status = "Inactive",
                    IsAvailableForUseOverride = newAvailability,
                    CreatedUtc = DateTime.UtcNow
                };
                _dbContext.MasterTenantFeatureSubscriptions.Add(newSub);
            }

            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.Identity?.Name,
                UserName = User.Identity?.Name,
                Action = "ToggleTenantFeatureAvailability",
                EntityType = "FeatureSubscription",
                EntityId = feature.Id.ToString(),
                Summary = $"Set '{feature.Name}' availability to {(newAvailability ? "Available for Tenant" : "Not Available for Tenant")} for '{tenant.OrganizationName}'",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString(),
                CreatedUtc = DateTime.UtcNow
            });

            await _dbContext.SaveChangesAsync();
            TempData["Success"] = $"'{feature.Name}' is now {(newAvailability ? "Available for " + tenant.OrganizationName : "Not Available (Moved to Not Available Tab)")}.";

            return RedirectToPage(new { tenantId = tenant.Id, tab = Tab, search = Search, category = Category, status = Status, viewMode = ViewMode });
        }

        /// <summary>
        /// Sets or resets a custom monthly price override and custom first-time free trial days override for a specific capability on this tenant.
        /// Syncs with Custom Availability by automatically marking the capability Available for this tenant when a custom price or trial is set.
        /// </summary>
        public async Task<IActionResult> OnPostSetCustomPriceAsync(
            Guid tenantId,
            Guid featureId,
            decimal? customPrice,
            int? customFreeTrialDays = null,
            bool resetFreeTrialUsed = false,
            bool resetToGeneral = false)
        {
            var targetId = tenantId != Guid.Empty ? tenantId : (Id != Guid.Empty ? Id : (TenantId ?? Guid.Empty));
            var tenant = await _dbContext.MasterTenantCatalogs
                .Include(t => t.FeatureSubscriptions)
                .FirstOrDefaultAsync(t => t.Id == targetId);

            if (tenant == null)
            {
                TempData["Error"] = "Tenant not found.";
                return RedirectToPage("/Features/Analytics");
            }

            var feature = await _dbContext.MasterFeatureCatalogs.FindAsync(featureId);
            if (feature == null)
            {
                TempData["Error"] = "Capability not found.";
                return RedirectToPage(new { tenantId = tenant.Id });
            }

            if (!resetToGeneral)
            {
                tenant.UseCustomPricing = true;
            }

            var existing = tenant.FeatureSubscriptions.FirstOrDefault(s => s.MasterFeatureCatalogId == featureId);
            decimal? effectiveOverride = resetToGeneral ? null : Math.Max(0m, customPrice ?? 0m);
            int? effectiveTrialOverride = resetToGeneral
                ? null
                : (customFreeTrialDays.HasValue ? Math.Clamp(customFreeTrialDays.Value, 0, 365) : null);

            if (existing != null)
            {
                existing.CustomPriceOverride = effectiveOverride;
                existing.CustomFreeTrialDaysOverride = effectiveTrialOverride;
                if (resetFreeTrialUsed)
                {
                    existing.HasUsedFreeTrial = false;
                }
                if (!resetToGeneral)
                {
                    existing.IsAvailableForUseOverride = true;
                }
            }
            else if (!resetToGeneral)
            {
                var newSub = new MasterTenantFeatureSubscription
                {
                    Id = Guid.NewGuid(),
                    MasterTenantCatalogId = tenant.Id,
                    MasterFeatureCatalogId = feature.Id,
                    DurationType = SubscriptionBillingDuration.Monthly,
                    RecurringPrice = feature.MonthlyPrice,
                    CustomPriceOverride = effectiveOverride,
                    CustomFreeTrialDaysOverride = effectiveTrialOverride,
                    HasUsedFreeTrial = false,
                    IsAvailableForUseOverride = true,
                    StartsAtUtc = DateTime.UtcNow,
                    ExpiresAtUtc = DateTime.UtcNow.AddMonths(1),
                    AutoRenew = true,
                    IsActive = false,
                    Status = "Inactive",
                    CreatedUtc = DateTime.UtcNow
                };
                _dbContext.MasterTenantFeatureSubscriptions.Add(newSub);
            }

            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.Identity?.Name,
                UserName = User.Identity?.Name,
                Action = resetToGeneral ? "ResetTenantCustomPrice" : "SetTenantCustomPrice",
                EntityType = "FeatureSubscription",
                EntityId = feature.Id.ToString(),
                Summary = resetToGeneral
                    ? $"Reset '{feature.Name}' to General Master Price (${feature.MonthlyPrice:F2}/mo, {feature.FreeTrialDays}d Free Trial) for tenant '{tenant.OrganizationName}'"
                    : $"Set custom price ${effectiveOverride:F2}/mo and free trial {(effectiveTrialOverride ?? feature.FreeTrialDays)}d on '{feature.Name}' for tenant '{tenant.OrganizationName}'",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString(),
                CreatedUtc = DateTime.UtcNow
            });

            await _dbContext.SaveChangesAsync();
            TempData["Success"] = resetToGeneral
                ? $"'{feature.Name}' reset to General Master Price (${feature.MonthlyPrice:F2}/mo, {feature.FreeTrialDays}d Free Trial) for {tenant.OrganizationName}."
                : $"Custom price (${effectiveOverride:F2}/mo) and Free Trial ({(effectiveTrialOverride ?? feature.FreeTrialDays)} days before payment) saved for {tenant.OrganizationName}.";

            return RedirectToPage(new { tenantId = tenant.Id, tab = Tab, search = Search, category = Category, status = Status, viewMode = ViewMode });
        }

        /// <summary>
        /// View transfer representation of a capability with per-tenant active, availability, pricing, and free-trial posture.
        /// </summary>
        public class FeatureItemDto
        {
            public MasterFeatureCatalog Feature { get; set; } = null!;
            public MasterTenantFeatureSubscription? Subscription { get; set; }
            public bool IsSubscribed { get; set; }
            public bool IsPaidSubscribed { get; set; }
            public bool EffectiveAvailableForUse { get; set; }
            public bool HasCustomAvailabilityOverride { get; set; }
            public decimal EffectiveMonthlyPrice { get; set; }
            public decimal EffectiveTenantCurrencyPrice { get; set; }
            public decimal MasterTenantCurrencyPrice { get; set; }
            public bool HasCustomPriceOverride { get; set; }
            public int EffectiveFreeTrialDays { get; set; }
            public bool HasCustomFreeTrialOverride { get; set; }
            public bool HasUsedFreeTrial { get; set; }
            public bool IsTrialPeriod { get; set; }
        }
    }
}
