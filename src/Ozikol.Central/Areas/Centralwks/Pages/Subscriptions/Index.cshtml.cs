using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Subscriptions
{
    /// <summary>
    /// PageModel displaying and managing the platform-wide tenant subscriptions command center.
    /// Aggregates active modular capability subscriptions by tenant organization, computing next billing amounts,
    /// granular feature expiration breakdown (30d, 60d, >60d / Perpetual), notification dispatch telemetry, and direct link to full Details page.
    /// </summary>
    public class IndexModel : PageModel
    {
        private readonly MasterCatalogDbContext _dbContext;

        /// <summary>
        /// Initializes a new instance of the <see cref="IndexModel"/> class.
        /// </summary>
        /// <param name="dbContext">Master catalog database context.</param>
        public IndexModel(MasterCatalogDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        /// <summary>
        /// Keyword search matching tenant name, tenant key, primary domain, or subscribed feature names.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Search { get; set; }

        /// <summary>
        /// Filter by subscription lifecycle / countdown posture (all, active, expiring_30d, expiring_60d, healthy_60d, overdue, no_subscriptions).
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Filter { get; set; }

        /// <summary>
        /// 1-based page index.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public int PageNumber { get; set; } = 1;

        /// <summary>
        /// Total count of matching tenant organizations.
        /// </summary>
        public int TotalCount { get; set; }

        /// <summary>
        /// Total calculated pagination pages.
        /// </summary>
        public int TotalPages { get; set; }

        /// <summary>
        /// Page size for server-side pagination.
        /// </summary>
        public int PageSize { get; set; } = 15;

        /// <summary>
        /// Total active contracted recurring revenue per month across all tenants.
        /// </summary>
        public decimal TotalPlatformMRR { get; set; }

        /// <summary>
        /// Total count of tenant organizations with at least one active modular subscription.
        /// </summary>
        public int ActiveSubscribedTenantsCount { get; set; }

        /// <summary>
        /// Total count of tenant organizations with active features expiring within 30 days.
        /// </summary>
        public int DueWithin30DaysCount { get; set; }

        /// <summary>
        /// Total count of tenant organizations with active features expiring between 31 and 60 days.
        /// </summary>
        public int DueWithin60DaysCount { get; set; }

        /// <summary>
        /// Total count of tenant organizations with all features healthy (>60 days or perpetual).
        /// </summary>
        public int HealthyTenantsCount { get; set; }

        /// <summary>
        /// Total count of tenant organizations with overdue/expired subscriptions.
        /// </summary>
        public int OverdueTenantsCount { get; set; }

        /// <summary>
        /// List of aggregated tenant subscription view models for the current page.
        /// </summary>
        public List<TenantSubscriptionSummaryViewModel> Tenants { get; set; } = new();

        /// <summary>
        /// Handles HTTP GET requests to calculate metrics and populate tenant subscription summaries.
        /// </summary>
        public async Task OnGetAsync()
        {
            var now = DateTime.UtcNow;

            // Compute global MRR from all active tenant feature subscriptions
            var allActiveSubs = await _dbContext.MasterTenantFeatureSubscriptions
                .AsNoTracking()
                .Where(s => s.IsActive && !s.MasterTenantCatalog.IsDeleted)
                .Select(s => new
                {
                    s.MasterTenantCatalogId,
                    s.DurationType,
                    s.RecurringPrice,
                    s.CustomPriceOverride,
                    s.ExpiresAtUtc,
                    IsCompulsory = s.MasterFeatureCatalog != null && s.MasterFeatureCatalog.IsCompulsory
                })
                .ToListAsync();

            TotalPlatformMRR = allActiveSubs.Sum(s =>
            {
                var price = s.CustomPriceOverride ?? s.RecurringPrice;
                return s.DurationType switch
                {
                    SubscriptionBillingDuration.Yearly => price / 12m,
                    SubscriptionBillingDuration.Quarterly => price / 3m,
                    _ => price
                };
            });

            ActiveSubscribedTenantsCount = allActiveSubs
                .Select(s => s.MasterTenantCatalogId)
                .Distinct()
                .Count();

            // Load tenant catalogs with their feature subscriptions and catalog definitions
            var query = _dbContext.MasterTenantCatalogs
                .Where(t => !t.IsDeleted)
                .Include(t => t.FeatureSubscriptions)
                    .ThenInclude(s => s.MasterFeatureCatalog)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(Search))
            {
                var term = Search.Trim().ToLower();
                query = query.Where(t => t.OrganizationName.ToLower().Contains(term)
                                      || t.TenantKey.ToLower().Contains(term)
                                      || t.PrimaryDomain.ToLower().Contains(term)
                                      || t.FeatureSubscriptions.Any(s => s.MasterFeatureCatalog.Name.ToLower().Contains(term)
                                                                      || s.MasterFeatureCatalog.FeatureCode.ToLower().Contains(term)));
            }

            var allTenantsList = await query.ToListAsync();

            // Preload recent renewal/billing email notification logs for tenant admin emails
            var adminEmails = allTenantsList
                .Where(t => !string.IsNullOrWhiteSpace(t.AdminEmail))
                .Select(t => t.AdminEmail!.Trim().ToLower())
                .Distinct()
                .ToList();

            var emailLogs = await _dbContext.MasterEmailLogs
                .Where(e => adminEmails.Contains(e.RecipientEmail.ToLower())
                         && (e.Subject.Contains("Renewal") || e.Subject.Contains("Subscription") || e.Subject.Contains("Billing"))
                         && e.Status == "Sent")
                .GroupBy(e => e.RecipientEmail.ToLower())
                .Select(g => new
                {
                    Email = g.Key,
                    Count = g.Count(),
                    LastSent = g.Max(e => e.SentAtUtc)
                })
                .ToDictionaryAsync(k => k.Email, v => v);

            // Transform into rich tenant summary view models
            var transformedList = new List<TenantSubscriptionSummaryViewModel>();

            foreach (var tenant in allTenantsList)
            {
                var activeSubs = tenant.FeatureSubscriptions.Where(s => s.IsActive).ToList();
                var allSubs = tenant.FeatureSubscriptions.OrderBy(s => s.ExpiresAtUtc).ToList();

                // Separate paid add-ons from free/compulsory core features
                var paidActiveSubs = activeSubs.Where(s =>
                {
                    var price = s.CustomPriceOverride ?? s.RecurringPrice;
                    var isCompulsory = s.MasterFeatureCatalog?.IsCompulsory ?? false;
                    return price > 0 || !isCompulsory;
                }).ToList();

                var nextBillingAmount = activeSubs.Sum(s => s.CustomPriceOverride ?? s.RecurringPrice);

                DateTime? nextBillingDate = paidActiveSubs.Any()
                    ? paidActiveSubs.Min(s => s.ExpiresAtUtc)
                    : (activeSubs.Any() ? activeSubs.Min(s => s.ExpiresAtUtc) : null);

                int daysRemaining = 0;
                if (nextBillingDate.HasValue)
                {
                    daysRemaining = (int)Math.Ceiling((nextBillingDate.Value - now).TotalDays);
                }

                // Calculate feature-level expiration breakdown counts
                int expiring30Count = 0;
                int expiring60Count = 0;
                int beyond60Count = 0;
                int overdueCount = 0;
                int corePerpetualCount = 0;

                foreach (var sub in activeSubs)
                {
                    var price = sub.CustomPriceOverride ?? sub.RecurringPrice;
                    var isCore = (sub.MasterFeatureCatalog?.IsCompulsory == true || price == 0) && (sub.CustomPriceOverride == null || sub.CustomPriceOverride == 0);

                    if (isCore)
                    {
                        corePerpetualCount++;
                        beyond60Count++;
                    }
                    else
                    {
                        var diffDays = (int)Math.Ceiling((sub.ExpiresAtUtc - now).TotalDays);
                        if (diffDays < 0)
                        {
                            overdueCount++;
                        }
                        else if (diffDays <= 30)
                        {
                            expiring30Count++;
                        }
                        else if (diffDays <= 60)
                        {
                            expiring60Count++;
                        }
                        else
                        {
                            beyond60Count++;
                        }
                    }
                }

                // Match renewal email notification count
                int notificationCount = 0;
                string notificationStatus = activeSubs.Any() ? "Not Sent" : "None";
                if (!string.IsNullOrWhiteSpace(tenant.AdminEmail) && emailLogs.TryGetValue(tenant.AdminEmail.Trim().ToLower(), out var emailInfo))
                {
                    notificationCount = emailInfo.Count;
                    notificationStatus = $"{emailInfo.Count} sent (Last: {emailInfo.LastSent:MMM dd})";
                }

                var features = allSubs.Select(s =>
                {
                    var price = s.CustomPriceOverride ?? s.RecurringPrice;
                    var isCore = (s.MasterFeatureCatalog?.IsCompulsory == true || price == 0) && (s.CustomPriceOverride == null || s.CustomPriceOverride == 0);

                    return new TenantFeatureItemViewModel
                    {
                        SubscriptionId = s.Id,
                        FeatureName = s.MasterFeatureCatalog?.Name ?? "Modular Capability",
                        FeatureCode = s.MasterFeatureCatalog?.FeatureCode ?? "unknown",
                        Category = s.MasterFeatureCatalog?.Category ?? "Platform",
                        DurationType = s.DurationType.ToString(),
                        RecurringPrice = s.RecurringPrice,
                        CustomPriceOverride = s.CustomPriceOverride,
                        StartsAtUtc = s.StartsAtUtc,
                        ExpiresAtUtc = s.ExpiresAtUtc,
                        FeatureDaysRemaining = (int)Math.Ceiling((s.ExpiresAtUtc - now).TotalDays),
                        AutoRenew = s.AutoRenew,
                        IsActive = s.IsActive,
                        IsCorePerpetual = isCore,
                        Status = s.Status
                    };
                }).ToList();

                transformedList.Add(new TenantSubscriptionSummaryViewModel
                {
                    TenantId = tenant.Id,
                    OrganizationName = tenant.OrganizationName,
                    TenantKey = tenant.TenantKey,
                    PrimaryDomain = tenant.PrimaryDomain,
                    AdminEmail = tenant.AdminEmail,
                    IsTenantSuspended = tenant.IsSuspended,
                    NextBillingAmount = nextBillingAmount,
                    NextBillingDateUtc = nextBillingDate,
                    DaysRemaining = daysRemaining,
                    ActiveFeaturesCount = activeSubs.Count,
                    TotalFeaturesCount = allSubs.Count,
                    PaidFeaturesCount = paidActiveSubs.Count,
                    Expiring30DaysCount = expiring30Count,
                    Expiring60DaysCount = expiring60Count,
                    Beyond60DaysCount = beyond60Count,
                    CorePerpetualCount = corePerpetualCount,
                    OverdueCount = overdueCount,
                    NotificationCount = notificationCount,
                    NotificationStatus = notificationStatus,
                    Features = features
                });
            }

            // Global aggregate counts for filter tabs
            DueWithin30DaysCount = transformedList.Count(t => t.Expiring30DaysCount > 0);
            DueWithin60DaysCount = transformedList.Count(t => t.Expiring60DaysCount > 0);
            HealthyTenantsCount = transformedList.Count(t => t.ActiveFeaturesCount > 0 && t.Expiring30DaysCount == 0 && t.OverdueCount == 0);
            OverdueTenantsCount = transformedList.Count(t => t.OverdueCount > 0);

            // Apply filter tab
            if (!string.IsNullOrWhiteSpace(Filter))
            {
                switch (Filter.ToLowerInvariant())
                {
                    case "active":
                        transformedList = transformedList.Where(t => t.ActiveFeaturesCount > 0).ToList();
                        break;
                    case "expiring_30d":
                    case "expiring_soon":
                        transformedList = transformedList.Where(t => t.Expiring30DaysCount > 0).ToList();
                        break;
                    case "expiring_60d":
                        transformedList = transformedList.Where(t => t.Expiring60DaysCount > 0).ToList();
                        break;
                    case "healthy":
                    case "healthy_60d":
                        transformedList = transformedList.Where(t => t.ActiveFeaturesCount > 0 && t.Expiring30DaysCount == 0 && t.OverdueCount == 0).ToList();
                        break;
                    case "overdue":
                        transformedList = transformedList.Where(t => t.OverdueCount > 0).ToList();
                        break;
                    case "no_subscriptions":
                        transformedList = transformedList.Where(t => t.ActiveFeaturesCount == 0).ToList();
                        break;
                }
            }

            // Sort: prioritize upcoming/overdue billing dates, then organization name
            transformedList = transformedList
                .OrderBy(t => t.ActiveFeaturesCount == 0 ? 1 : 0)
                .ThenBy(t => t.OverdueCount > 0 ? 0 : 1)
                .ThenBy(t => t.Expiring30DaysCount > 0 ? 0 : 1)
                .ThenBy(t => t.DaysRemaining)
                .ThenBy(t => t.OrganizationName)
                .ToList();

            TotalCount = transformedList.Count;
            TotalPages = (int)Math.Ceiling(TotalCount / (double)PageSize);
            if (TotalPages < 1) TotalPages = 1;
            if (PageNumber < 1) PageNumber = 1;
            if (PageNumber > TotalPages) PageNumber = TotalPages;

            Tenants = transformedList
                .Skip((PageNumber - 1) * PageSize)
                .Take(PageSize)
                .ToList();
        }

        /// <summary>
        /// Handles HTTP POST requests to immediately dispatch a renewal reminder notification to the tenant admin email.
        /// </summary>
        /// <param name="tenantId">Identifier of the target tenant organization.</param>
        /// <returns>Redirects back with a status message toast.</returns>
        public async Task<IActionResult> OnPostSendRenewalNoticeAsync(int tenantId)
        {
            var tenant = await _dbContext.MasterTenantCatalogs
                .Include(t => t.FeatureSubscriptions)
                    .ThenInclude(s => s.MasterFeatureCatalog)
                .FirstOrDefaultAsync(t => t.Id == tenantId);

            if (tenant == null)
            {
                TempData["Error"] = "Tenant organization not found.";
                return RedirectToPage();
            }

            if (string.IsNullOrWhiteSpace(tenant.AdminEmail))
            {
                TempData["Error"] = $"Cannot send notification: Tenant '{tenant.OrganizationName}' does not have a registered primary admin email address.";
                return RedirectToPage();
            }

            var activeSubs = tenant.FeatureSubscriptions.Where(s => s.IsActive).ToList();
            var paidSubs = activeSubs.Where(s => (s.CustomPriceOverride ?? s.RecurringPrice) > 0).ToList();
            var totalAmount = activeSubs.Sum(s => s.CustomPriceOverride ?? s.RecurringPrice);
            var earliestExpiry = paidSubs.Any()
                ? paidSubs.Min(s => s.ExpiresAtUtc).ToString("MMMM dd, yyyy")
                : (activeSubs.Any() ? activeSubs.Min(s => s.ExpiresAtUtc).ToString("MMMM dd, yyyy") : "N/A");

            // Log transactional renewal notice into MasterEmailLogs
            var emailLog = new MasterEmailLog
            {
                Id = Guid.NewGuid(),
                RecipientEmail = tenant.AdminEmail.Trim(),
                Subject = $"[Action Required] Upcoming Feature Subscription Renewal Notice — {tenant.OrganizationName}",
                BodyHtml = $@"
                    <p>Dear Administrator,</p>
                    <p>This is an automated notice regarding the upcoming renewal of your active modular feature capabilities on the <strong>{tenant.OrganizationName}</strong> platform.</p>
                    <p><strong>Next Billing Date:</strong> {earliestExpiry}<br />
                    <strong>Total Amount Due:</strong> ${totalAmount:N2}<br />
                    <strong>Active Subscribed Capabilities:</strong> {activeSubs.Count}</p>
                    <p>Please review your subscription details or settle payment before the expiration date to ensure uninterrupted platform operation.</p>",
                Provider = "Postmark",
                Status = "Sent",
                SentAtUtc = DateTime.UtcNow
            };

            _dbContext.MasterEmailLogs.Add(emailLog);

            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.Identity?.Name,
                UserName = User.Identity?.Name,
                Action = "SendRenewalNotice",
                EntityType = "SubscriptionNotification",
                EntityId = tenant.Id.ToString(),
                Summary = $"Manual renewal notice dispatched to '{tenant.AdminEmail}' for tenant '{tenant.OrganizationName}' (${totalAmount:N2} due).",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString(),
                CreatedUtc = DateTime.UtcNow
            });

            await _dbContext.SaveChangesAsync();

            TempData["Success"] = $"Renewal reminder notification successfully sent to {tenant.AdminEmail}.";
            return RedirectToPage();
        }

        /// <summary>
        /// Aggregated tenant subscription posture view model.
        /// </summary>
        public class TenantSubscriptionSummaryViewModel
        {
            public int TenantId { get; set; }
            public string OrganizationName { get; set; } = string.Empty;
            public string TenantKey { get; set; } = string.Empty;
            public string PrimaryDomain { get; set; } = string.Empty;
            public string? AdminEmail { get; set; }
            public bool IsTenantSuspended { get; set; }

            /// <summary>
            /// Total accumulated recurring rate across all active subscriptions for this tenant.
            /// </summary>
            public decimal NextBillingAmount { get; set; }

            /// <summary>
            /// Earliest expiration / renewal date among active paid subscriptions.
            /// </summary>
            public DateTime? NextBillingDateUtc { get; set; }

            /// <summary>
            /// Days remaining until earliest renewal date. Negative indicates overdue.
            /// </summary>
            public int DaysRemaining { get; set; }

            public int ActiveFeaturesCount { get; set; }
            public int TotalFeaturesCount { get; set; }
            public int PaidFeaturesCount { get; set; }

            /// <summary>
            /// Count of active features expiring in 30 days or less.
            /// </summary>
            public int Expiring30DaysCount { get; set; }

            /// <summary>
            /// Count of active features expiring between 31 and 60 days.
            /// </summary>
            public int Expiring60DaysCount { get; set; }

            /// <summary>
            /// Count of active features expiring after 60 days or perpetual core platform.
            /// </summary>
            public int Beyond60DaysCount { get; set; }

            /// <summary>
            /// Count of free/compulsory core perpetual platform features.
            /// </summary>
            public int CorePerpetualCount { get; set; }

            /// <summary>
            /// Count of overdue features.
            /// </summary>
            public int OverdueCount { get; set; }

            public int NotificationCount { get; set; }
            public string NotificationStatus { get; set; } = "Not Sent";

            /// <summary>
            /// Itemized capability subscriptions for this tenant.
            /// </summary>
            public List<TenantFeatureItemViewModel> Features { get; set; } = new();
        }

        /// <summary>
        /// Itemized modular feature subscription view model.
        /// </summary>
        public class TenantFeatureItemViewModel
        {
            public Guid SubscriptionId { get; set; }
            public string FeatureName { get; set; } = string.Empty;
            public string FeatureCode { get; set; } = string.Empty;
            public string Category { get; set; } = string.Empty;
            public string DurationType { get; set; } = "Monthly";
            public decimal RecurringPrice { get; set; }
            public decimal? CustomPriceOverride { get; set; }

            public decimal EffectivePrice => CustomPriceOverride ?? RecurringPrice;

            public DateTime StartsAtUtc { get; set; }
            public DateTime ExpiresAtUtc { get; set; }
            public int FeatureDaysRemaining { get; set; }
            public bool AutoRenew { get; set; }
            public bool IsActive { get; set; }
            public bool IsCorePerpetual { get; set; }
            public string Status { get; set; } = "Active";
        }
    }
}
