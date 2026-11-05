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
    /// PageModel presenting comprehensive tenant subscription posture, feature-level expiration breakdown,
    /// pricing overrides, active contract specifications, and linked billing invoices.
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
        /// Tenant organization identifier.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public Guid? TenantId { get; set; }

        /// <summary>
        /// Optional specific subscription identifier (for backwards-compatibility).
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public Guid? Id { get; set; }

        /// <summary>
        /// Feature filter for the modular capabilities table (all, expiring_30d, expiring_60d, beyond_60d, suspended, paid_only, core_only).
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? FeatureFilter { get; set; }

        /// <summary>
        /// Search term to filter features by name or code.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? FeatureSearch { get; set; }

        /// <summary>
        /// Loaded master tenant organization catalog entry.
        /// </summary>
        public MasterTenantCatalog Tenant { get; set; } = null!;

        /// <summary>
        /// Total contracted recurring monthly rate across active subscriptions.
        /// </summary>
        public decimal TotalMonthlyRate { get; set; }

        /// <summary>
        /// Earliest upcoming billing renewal date among paid subscriptions.
        /// </summary>
        public DateTime? NextBillingDateUtc { get; set; }

        /// <summary>
        /// Days remaining until earliest renewal date.
        /// </summary>
        public int DaysRemaining { get; set; }

        public int TotalFeaturesCount { get; set; }
        public int ActiveFeaturesCount { get; set; }
        public int SuspendedFeaturesCount { get; set; }
        public int PaidFeaturesCount { get; set; }
        public int CoreFeaturesCount { get; set; }

        public int Expiring30DaysCount { get; set; }
        public int Expiring60DaysCount { get; set; }
        public int Beyond60DaysCount { get; set; }
        public int OverdueFeaturesCount { get; set; }

        public int NotificationCount { get; set; }
        public string NotificationStatus { get; set; } = "Not Sent";

        /// <summary>
        /// All feature subscriptions enriched for display.
        /// </summary>
        public List<TenantFeatureDetailViewModel> Features { get; set; } = new();

        /// <summary>
        /// Filtered feature subscriptions displayed in the table.
        /// </summary>
        public List<TenantFeatureDetailViewModel> DisplayedFeatures { get; set; } = new();

        /// <summary>
        /// Billing transactions and invoices linked to this tenant organization.
        /// </summary>
        public List<MasterBillingTransaction> Transactions { get; set; } = new();

        /// <summary>
        /// Handles HTTP GET requests to retrieve complete tenant subscription breakdown.
        /// </summary>
        public async Task<IActionResult> OnGetAsync()
        {
            var now = DateTime.UtcNow;

            // Resolve target tenant ID either from TenantId or from specific subscription Id
            Guid resolvedTenantId = Guid.Empty;
            if (TenantId.HasValue && TenantId.Value != Guid.Empty)
            {
                resolvedTenantId = TenantId.Value;
            }
            else if (Id.HasValue && Id.Value != Guid.Empty)
            {
                var subLookup = await _dbContext.MasterTenantFeatureSubscriptions
                    .AsNoTracking()
                    .Where(s => s.Id == Id.Value)
                    .Select(s => s.MasterTenantCatalogId)
                    .FirstOrDefaultAsync();

                if (subLookup != Guid.Empty)
                {
                    resolvedTenantId = subLookup;
                }
            }

            if (resolvedTenantId == Guid.Empty)
            {
                TempData["Error"] = "Please specify a valid tenant organization to view subscription details.";
                return RedirectToPage("/Subscriptions/Index");
            }

            var tenant = await _dbContext.MasterTenantCatalogs
                .Include(t => t.FeatureSubscriptions)
                    .ThenInclude(s => s.MasterFeatureCatalog)
                .FirstOrDefaultAsync(t => t.Id == resolvedTenantId && !t.IsDeleted);

            if (tenant == null)
            {
                TempData["Error"] = "Tenant organization not found.";
                return RedirectToPage("/Subscriptions/Index");
            }

            Tenant = tenant;

            // Load recent renewal notification logs for this tenant's admin email
            if (!string.IsNullOrWhiteSpace(tenant.AdminEmail))
            {
                var emailLog = await _dbContext.MasterEmailLogs
                    .Where(e => e.RecipientEmail.ToLower() == tenant.AdminEmail.ToLower()
                             && (e.Subject.Contains("Renewal") || e.Subject.Contains("Subscription") || e.Subject.Contains("Billing"))
                             && e.Status == "Sent")
                    .OrderByDescending(e => e.SentAtUtc)
                    .FirstOrDefaultAsync();

                if (emailLog != null)
                {
                    var count = await _dbContext.MasterEmailLogs
                        .CountAsync(e => e.RecipientEmail.ToLower() == tenant.AdminEmail.ToLower()
                                      && (e.Subject.Contains("Renewal") || e.Subject.Contains("Subscription") || e.Subject.Contains("Billing"))
                                      && e.Status == "Sent");

                    NotificationCount = count;
                    NotificationStatus = $"{count} sent (Last: {emailLog.SentAtUtc:MMM dd, yyyy})";
                }
                else
                {
                    NotificationStatus = "Not Sent";
                }
            }

            // Calculate Metrics
            var activeSubs = tenant.FeatureSubscriptions.Where(s => s.IsActive).ToList();
            TotalFeaturesCount = tenant.FeatureSubscriptions.Count;
            ActiveFeaturesCount = activeSubs.Count;
            SuspendedFeaturesCount = tenant.FeatureSubscriptions.Count(s => !s.IsActive);

            TotalMonthlyRate = activeSubs.Sum(s => s.CustomPriceOverride ?? s.RecurringPrice);

            var paidActiveSubs = activeSubs.Where(s =>
            {
                var price = s.CustomPriceOverride ?? s.RecurringPrice;
                var isCompulsory = s.MasterFeatureCatalog?.IsCompulsory ?? false;
                return price > 0 || !isCompulsory;
            }).ToList();

            PaidFeaturesCount = paidActiveSubs.Count;

            NextBillingDateUtc = paidActiveSubs.Any()
                ? paidActiveSubs.Min(s => s.ExpiresAtUtc)
                : (activeSubs.Any() ? activeSubs.Min(s => s.ExpiresAtUtc) : null);

            if (NextBillingDateUtc.HasValue)
            {
                DaysRemaining = (int)Math.Ceiling((NextBillingDateUtc.Value - now).TotalDays);
            }

            // Transform all features
            Features = tenant.FeatureSubscriptions
                .OrderBy(s => s.IsActive ? 0 : 1)
                .ThenBy(s => (s.CustomPriceOverride ?? s.RecurringPrice) > 0 ? 0 : 1)
                .ThenBy(s => s.ExpiresAtUtc)
                .Select(s =>
                {
                    var price = s.CustomPriceOverride ?? s.RecurringPrice;
                    var isCore = (s.MasterFeatureCatalog?.IsCompulsory == true || price == 0) && (s.CustomPriceOverride == null || s.CustomPriceOverride == 0);
                    var remainingDays = (int)Math.Ceiling((s.ExpiresAtUtc - now).TotalDays);

                    return new TenantFeatureDetailViewModel
                    {
                        SubscriptionId = s.Id,
                        FeatureCatalogId = s.MasterFeatureCatalogId,
                        FeatureName = s.MasterFeatureCatalog?.Name ?? "Modular Capability",
                        FeatureCode = s.MasterFeatureCatalog?.FeatureCode ?? "unknown",
                        Category = s.MasterFeatureCatalog?.Category ?? "Platform Core",
                        Description = s.MasterFeatureCatalog?.Description ?? "Platform modular capability.",
                        StandardMonthlyPrice = s.MasterFeatureCatalog?.MonthlyPrice ?? s.RecurringPrice,
                        RecurringPrice = s.RecurringPrice,
                        CustomPriceOverride = s.CustomPriceOverride,
                        DurationType = s.DurationType.ToString(),
                        StartsAtUtc = s.StartsAtUtc,
                        ExpiresAtUtc = s.ExpiresAtUtc,
                        DaysRemaining = remainingDays,
                        AutoRenew = s.AutoRenew,
                        IsActive = s.IsActive,
                        IsCorePerpetual = isCore,
                        IsCompulsory = s.MasterFeatureCatalog?.IsCompulsory ?? false,
                        Status = s.Status
                    };
                }).ToList();

            // Calculate Expiration Breakdown counts across all active features
            foreach (var f in Features.Where(f => f.IsActive))
            {
                if (f.IsCorePerpetual)
                {
                    CoreFeaturesCount++;
                    Beyond60DaysCount++;
                }
                else
                {
                    if (f.DaysRemaining < 0)
                    {
                        OverdueFeaturesCount++;
                    }
                    else if (f.DaysRemaining <= 30)
                    {
                        Expiring30DaysCount++;
                    }
                    else if (f.DaysRemaining <= 60)
                    {
                        Expiring60DaysCount++;
                    }
                    else
                    {
                        Beyond60DaysCount++;
                    }
                }
            }

            // Filter features for display
            var filtered = Features.AsEnumerable();

            if (!string.IsNullOrWhiteSpace(FeatureSearch))
            {
                var term = FeatureSearch.Trim().ToLower();
                filtered = filtered.Where(f => f.FeatureName.ToLower().Contains(term)
                                            || f.FeatureCode.ToLower().Contains(term)
                                            || f.Category.ToLower().Contains(term));
            }

            if (!string.IsNullOrWhiteSpace(FeatureFilter))
            {
                switch (FeatureFilter.ToLowerInvariant())
                {
                    case "expiring_30d":
                        filtered = filtered.Where(f => f.IsActive && !f.IsCorePerpetual && f.DaysRemaining >= 0 && f.DaysRemaining <= 30);
                        break;
                    case "expiring_60d":
                        filtered = filtered.Where(f => f.IsActive && !f.IsCorePerpetual && f.DaysRemaining > 30 && f.DaysRemaining <= 60);
                        break;
                    case "beyond_60d":
                        filtered = filtered.Where(f => f.IsActive && (f.IsCorePerpetual || f.DaysRemaining > 60));
                        break;
                    case "overdue":
                        filtered = filtered.Where(f => f.IsActive && !f.IsCorePerpetual && f.DaysRemaining < 0);
                        break;
                    case "suspended":
                        filtered = filtered.Where(f => !f.IsActive);
                        break;
                    case "paid_only":
                        filtered = filtered.Where(f => f.EffectivePrice > 0);
                        break;
                    case "core_only":
                        filtered = filtered.Where(f => f.IsCorePerpetual);
                        break;
                }
            }

            DisplayedFeatures = filtered.ToList();

            // Load linked billing invoices & payments for this tenant
            var subIds = tenant.FeatureSubscriptions.Select(s => s.Id).ToList();
            Transactions = await _dbContext.MasterBillingTransactions
                .Where(b => b.MasterTenantCatalogId == resolvedTenantId || (b.MasterTenantFeatureSubscriptionId.HasValue && subIds.Contains(b.MasterTenantFeatureSubscriptionId.Value)))
                .OrderByDescending(b => b.CreatedUtc)
                .Take(20)
                .ToListAsync();

            return Page();
        }

        /// <summary>
        /// Handles HTTP POST requests to toggle feature subscription status (Active / Suspended).
        /// </summary>
        public async Task<IActionResult> OnPostToggleFeatureStatusAsync(Guid subscriptionId, Guid tenantId)
        {
            var sub = await _dbContext.MasterTenantFeatureSubscriptions
                .Include(s => s.MasterTenantCatalog)
                .Include(s => s.MasterFeatureCatalog)
                .FirstOrDefaultAsync(s => s.Id == subscriptionId);

            if (sub == null)
            {
                TempData["Error"] = "Subscription not found.";
                return RedirectToPage(new { tenantId });
            }

            sub.IsActive = !sub.IsActive;
            sub.Status = sub.IsActive ? "Active" : "Suspended";

            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.Identity?.Name,
                UserName = User.Identity?.Name,
                Action = sub.IsActive ? "ActivateFeatureSubscription" : "SuspendFeatureSubscription",
                EntityType = "FeatureSubscription",
                EntityId = sub.Id.ToString(),
                Summary = $"Feature subscription for '{sub.MasterFeatureCatalog?.Name}' on tenant '{sub.MasterTenantCatalog?.OrganizationName}' was {(sub.IsActive ? "activated" : "suspended")}.",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString(),
                CreatedUtc = DateTime.UtcNow
            });

            await _dbContext.SaveChangesAsync();
            TempData["Success"] = $"Feature '{sub.MasterFeatureCatalog?.Name}' status updated to {sub.Status}.";

            return RedirectToPage(new { tenantId });
        }

        /// <summary>
        /// Handles HTTP POST requests to toggle auto-renewal for a specific feature subscription.
        /// </summary>
        public async Task<IActionResult> OnPostToggleAutoRenewAsync(Guid subscriptionId, Guid tenantId)
        {
            var sub = await _dbContext.MasterTenantFeatureSubscriptions
                .Include(s => s.MasterFeatureCatalog)
                .FirstOrDefaultAsync(s => s.Id == subscriptionId);

            if (sub == null)
            {
                TempData["Error"] = "Subscription not found.";
                return RedirectToPage(new { tenantId });
            }

            sub.AutoRenew = !sub.AutoRenew;
            await _dbContext.SaveChangesAsync();

            TempData["Success"] = $"Auto-renew for '{sub.MasterFeatureCatalog?.Name}' set to {(sub.AutoRenew ? "Enabled" : "Disabled")}.";
            return RedirectToPage(new { tenantId });
        }

        /// <summary>
        /// Handles HTTP POST requests to dispatch a renewal notice email to this tenant.
        /// </summary>
        public async Task<IActionResult> OnPostSendRenewalNoticeAsync(Guid tenantId)
        {
            var tenant = await _dbContext.MasterTenantCatalogs
                .Include(t => t.FeatureSubscriptions)
                    .ThenInclude(s => s.MasterFeatureCatalog)
                .FirstOrDefaultAsync(t => t.Id == tenantId);

            if (tenant == null)
            {
                TempData["Error"] = "Tenant organization not found.";
                return RedirectToPage(new { tenantId });
            }

            if (string.IsNullOrWhiteSpace(tenant.AdminEmail))
            {
                TempData["Error"] = $"Cannot send notification: Tenant '{tenant.OrganizationName}' does not have a primary admin email.";
                return RedirectToPage(new { tenantId });
            }

            var activeSubs = tenant.FeatureSubscriptions.Where(s => s.IsActive).ToList();
            var paidSubs = activeSubs.Where(s => (s.CustomPriceOverride ?? s.RecurringPrice) > 0).ToList();
            var totalAmount = activeSubs.Sum(s => s.CustomPriceOverride ?? s.RecurringPrice);
            var earliestExpiry = paidSubs.Any()
                ? paidSubs.Min(s => s.ExpiresAtUtc).ToString("MMMM dd, yyyy")
                : (activeSubs.Any() ? activeSubs.Min(s => s.ExpiresAtUtc).ToString("MMMM dd, yyyy") : "N/A");

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
            return RedirectToPage(new { tenantId });
        }

        /// <summary>
        /// Handles HTTP POST requests to set expiration for a specific modular capability to a defined number of days from now.
        /// Allows testing renewal triggers (e.g. 2 days for imminent warning, 30 days for monthly cycle, 365 days for annual, -1 day for overdue).
        /// </summary>
        /// <param name="subscriptionId">Feature subscription unique identifier.</param>
        /// <param name="tenantId">Master tenant catalog identifier.</param>
        /// <param name="days">Number of days from now.</param>
        /// <returns>Redirect back to tenant subscription details.</returns>
        public async Task<IActionResult> OnPostSetFeatureExpiryDaysAsync(Guid subscriptionId, Guid tenantId, int days)
        {
            var sub = await _dbContext.MasterTenantFeatureSubscriptions
                .Include(s => s.MasterTenantCatalog)
                .Include(s => s.MasterFeatureCatalog)
                .FirstOrDefaultAsync(s => s.Id == subscriptionId);

            if (sub == null)
            {
                TempData["Error"] = "Subscription not found.";
                return RedirectToPage(new { tenantId });
            }

            var newExpiry = DateTime.UtcNow.AddDays(days);
            sub.ExpiresAtUtc = newExpiry;
            if (days < 0)
            {
                sub.Status = "Expired";
            }
            else if (sub.Status == "Expired")
            {
                sub.Status = "Active";
                sub.IsActive = true;
            }

            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.Identity?.Name,
                UserName = User.Identity?.Name,
                Action = "SetFeatureExpiryDays",
                EntityType = "FeatureSubscription",
                EntityId = sub.Id.ToString(),
                Summary = $"Feature subscription '{sub.MasterFeatureCatalog?.Name}' expiration set to {days} days from now ({newExpiry:yyyy-MM-dd HH:mm:ss} UTC) for tenant '{sub.MasterTenantCatalog?.OrganizationName}'.",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString(),
                CreatedUtc = DateTime.UtcNow
            });

            await _dbContext.SaveChangesAsync();

            TempData["Success"] = $"Feature '{sub.MasterFeatureCatalog?.Name}' expiration set to {days} day(s) from now ({newExpiry:MMM dd, yyyy HH:mm} UTC).";
            return RedirectToPage(new { tenantId });
        }

        /// <summary>
        /// Handles HTTP POST requests to bulk set expiration for all active modular features of this tenant to a defined number of days from now.
        /// Useful for end-to-end testing of whole-workspace renewal notices, overdue banners, or reset to standard 30/365 day periods.
        /// </summary>
        /// <param name="tenantId">Master tenant catalog identifier.</param>
        /// <param name="days">Number of days from now.</param>
        /// <returns>Redirect back to tenant subscription details.</returns>
        public async Task<IActionResult> OnPostSetAllFeaturesExpiryDaysAsync(Guid tenantId, int days)
        {
            var tenant = await _dbContext.MasterTenantCatalogs
                .Include(t => t.FeatureSubscriptions)
                .FirstOrDefaultAsync(t => t.Id == tenantId);

            if (tenant == null)
            {
                TempData["Error"] = "Tenant organization not found.";
                return RedirectToPage(new { tenantId });
            }

            var newExpiry = DateTime.UtcNow.AddDays(days);
            int count = 0;
            foreach (var sub in tenant.FeatureSubscriptions)
            {
                sub.ExpiresAtUtc = newExpiry;
                if (days < 0)
                {
                    sub.Status = "Expired";
                }
                else if (sub.Status == "Expired")
                {
                    sub.Status = "Active";
                    sub.IsActive = true;
                }
                count++;
            }

            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.Identity?.Name,
                UserName = User.Identity?.Name,
                Action = "BulkSetFeaturesExpiryDays",
                EntityType = "TenantSubscriptions",
                EntityId = tenant.Id.ToString(),
                Summary = $"Bulk updated {count} feature subscription(s) expiration to {days} days from now ({newExpiry:yyyy-MM-dd HH:mm:ss} UTC) for tenant '{tenant.OrganizationName}'.",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString(),
                CreatedUtc = DateTime.UtcNow
            });

            await _dbContext.SaveChangesAsync();

            TempData["Success"] = $"Successfully updated all {count} feature subscription(s) to expire in {days} day(s) ({newExpiry:MMM dd, yyyy HH:mm} UTC).";
            return RedirectToPage(new { tenantId });
        }

        /// <summary>
        /// Rich view model representing a single feature subscription for the tenant details breakdown.
        /// </summary>
        public class TenantFeatureDetailViewModel
        {
            public Guid SubscriptionId { get; set; }
            public Guid FeatureCatalogId { get; set; }
            public string FeatureName { get; set; } = string.Empty;
            public string FeatureCode { get; set; } = string.Empty;
            public string Category { get; set; } = string.Empty;
            public string Description { get; set; } = string.Empty;
            public decimal StandardMonthlyPrice { get; set; }
            public decimal RecurringPrice { get; set; }
            public decimal? CustomPriceOverride { get; set; }
            public decimal EffectivePrice => CustomPriceOverride ?? RecurringPrice;
            public string DurationType { get; set; } = "Monthly";
            public DateTime StartsAtUtc { get; set; }
            public DateTime ExpiresAtUtc { get; set; }
            public int DaysRemaining { get; set; }
            public bool AutoRenew { get; set; }
            public bool IsActive { get; set; }
            public bool IsCorePerpetual { get; set; }
            public bool IsCompulsory { get; set; }
            public string Status { get; set; } = "Active";
        }
    }
}
