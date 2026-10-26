using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Tenants
{
    /// <summary>
    /// PageModel displaying and governing the Tenant Suite across the platform.
    /// Provides search, multi-status filtering, server-side pagination, mini-dashboard metrics,
    /// and lifecycle actions (Suspend, Reactivate, Soft Delete) with strict user attribution and audit logging.
    /// </summary>
    public class IndexModel : PageModel
    {
        private readonly MasterCatalogDbContext _dbContext;

        /// <summary>
        /// Formats a UTC timestamp into a clean relative time string (e.g. "5 mins ago", "2 hours ago", "Yesterday").
        /// </summary>
        /// <param name="dateUtc">The UTC date to evaluate.</param>
        /// <returns>Formatted human-readable relative time string.</returns>
        public string GetRelativeTime(DateTime? dateUtc)
        {
            if (!dateUtc.HasValue) return "No visits recorded";

            var span = DateTime.UtcNow - dateUtc.Value;
            if (span.TotalSeconds < 60) return "Just now";
            if (span.TotalMinutes < 60) return $"{(int)span.TotalMinutes}m ago";
            if (span.TotalHours < 24) return $"{(int)span.TotalHours}h ago";
            if (span.TotalDays < 2) return "Yesterday";
            if (span.TotalDays < 30) return $"{(int)span.TotalDays}d ago";
            if (span.TotalDays < 365) return $"{(int)(span.TotalDays / 30)}mo ago";
            return $"{(int)(span.TotalDays / 365)}y ago";
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="IndexModel"/> class.
        /// </summary>
        /// <param name="dbContext">Master catalog database context.</param>
        public IndexModel(MasterCatalogDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        /// <summary>
        /// Query filter for organization name, tenant key, or domain.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Search { get; set; }

        /// <summary>
        /// Filter by lifecycle status: "all", "active", "suspended", "deleted".
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Status { get; set; } = "all";

        /// <summary>
        /// Current pagination page number (1-based).
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public int PageNumber { get; set; } = 1;

        /// <summary>
        /// Configurable page size (10, 25, 50, 100).
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public int PageSize { get; set; } = 10;

        /// <summary>
        /// Total pages available based on filtered count and page size.
        /// </summary>
        public int TotalPages { get; set; }

        /// <summary>
        /// Total matching tenant count for current filter.
        /// </summary>
        public int TotalFilteredCount { get; set; }

        /// <summary>
        /// Mini-Dashboard: Total registered organizations in the suite.
        /// </summary>
        public int TotalSuiteCount { get; set; }

        /// <summary>
        /// Mini-Dashboard: Total active organizations accepting requests.
        /// </summary>
        public int ActiveCount { get; set; }

        /// <summary>
        /// Mini-Dashboard: Total suspended/paused organizations.
        /// </summary>
        public int SuspendedCount { get; set; }

        /// <summary>
        /// Mini-Dashboard: Organizations provisioned in the last 7 days.
        /// </summary>
        public int NewThisWeekCount { get; set; }

        /// <summary>
        /// List of tenant catalog records for the current page.
        /// </summary>
        public List<MasterTenantCatalog> Tenants { get; set; } = new();

        /// <summary>
        /// Handles HTTP GET requests to retrieve paginated tenant records and suite metrics.
        /// </summary>
        public async Task OnGetAsync()
        {
            // Normalize page size
            if (PageSize <= 0) PageSize = 10;
            if (PageNumber <= 0) PageNumber = 1;

            var oneWeekAgo = DateTime.UtcNow.AddDays(-7);

            // Compute Mini-Dashboard Suite Metrics
            TotalSuiteCount = await _dbContext.MasterTenantCatalogs.CountAsync(t => !t.IsDeleted);
            ActiveCount = await _dbContext.MasterTenantCatalogs.CountAsync(t => t.IsActive && !t.IsSuspended && !t.IsDeleted);
            SuspendedCount = await _dbContext.MasterTenantCatalogs.CountAsync(t => (t.IsSuspended || !t.IsActive) && !t.IsDeleted);
            NewThisWeekCount = await _dbContext.MasterTenantCatalogs.CountAsync(t => t.CreatedUtc >= oneWeekAgo && !t.IsDeleted);

            // Base query with eager-loaded feature subscriptions
            var query = _dbContext.MasterTenantCatalogs
                .Include(t => t.FeatureSubscriptions)
                .AsQueryable();

            // Search filter
            if (!string.IsNullOrWhiteSpace(Search))
            {
                var term = Search.Trim().ToLower();
                query = query.Where(t => t.OrganizationName.ToLower().Contains(term)
                                      || t.TenantKey.ToLower().Contains(term)
                                      || t.PrimaryDomain.ToLower().Contains(term)
                                      || (t.CustomDomain != null && t.CustomDomain.ToLower().Contains(term))
                                      || (t.AdminEmail != null && t.AdminEmail.ToLower().Contains(term)));
            }

            // Lifecycle status filter
            if (!string.IsNullOrWhiteSpace(Status) && !Status.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                if (Status.Equals("active", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(t => t.IsActive && !t.IsSuspended && !t.IsDeleted);
                }
                else if (Status.Equals("suspended", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(t => (t.IsSuspended || !t.IsActive) && !t.IsDeleted);
                }
                else if (Status.Equals("deleted", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(t => t.IsDeleted);
                }
            }
            else
            {
                // Default "all" view excludes soft-deleted records unless explicitly filtered
                query = query.Where(t => !t.IsDeleted);
            }

            // Pagination calculation
            TotalFilteredCount = await query.CountAsync();
            TotalPages = (int)Math.Ceiling(TotalFilteredCount / (double)PageSize);
            if (TotalPages == 0) TotalPages = 1;
            if (PageNumber > TotalPages) PageNumber = TotalPages;

            Tenants = await query
                .OrderByDescending(t => t.CreatedUtc)
                .Skip((PageNumber - 1) * PageSize)
                .Take(PageSize)
                .ToListAsync();
        }

        /// <summary>
        /// Handles HTTP POST requests to suspend a tenant organization with explicit reason and user attribution.
        /// </summary>
        /// <param name="id">Tenant catalog ID.</param>
        /// <param name="reason">Reason for suspending the tenant.</param>
        public async Task<IActionResult> OnPostSuspendAsync(Guid id, string? reason)
        {
            var tenant = await _dbContext.MasterTenantCatalogs.FindAsync(id);
            if (tenant == null)
            {
                TempData["Error"] = "Tenant organization not found.";
                return RedirectToPage();
            }

            var adminUser = User.Identity?.Name ?? "SuperAdmin";
            var now = DateTime.UtcNow;

            var oldSnapshot = JsonSerializer.Serialize(new
            {
                tenant.IsActive,
                tenant.IsSuspended,
                tenant.SuspendedUtc,
                tenant.SuspendedBy,
                tenant.SuspensionReason
            });

            tenant.IsActive = false;
            tenant.IsSuspended = true;
            tenant.SuspendedUtc = now;
            tenant.SuspendedBy = adminUser;
            tenant.SuspensionReason = string.IsNullOrWhiteSpace(reason) ? "Suspended by Super-Admin" : reason.Trim();
            tenant.UpdatedUtc = now;
            tenant.LastUpdatedBy = adminUser;

            var newSnapshot = JsonSerializer.Serialize(new
            {
                tenant.IsActive,
                tenant.IsSuspended,
                tenant.SuspendedUtc,
                tenant.SuspendedBy,
                tenant.SuspensionReason
            });

            // Write immutable audit log entry
            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value,
                UserName = adminUser,
                Action = "Tenant.Suspended",
                EntityType = "Tenant",
                EntityId = tenant.Id.ToString(),
                Summary = $"Admin {adminUser} suspended tenant '{tenant.OrganizationName}' ({tenant.TenantKey}). Reason: {tenant.SuspensionReason}",
                OldValues = oldSnapshot,
                NewValues = newSnapshot,
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers.UserAgent.ToString(),
                CreatedUtc = now
            });

            await _dbContext.SaveChangesAsync();

            TempData["Warning"] = $"Tenant '{tenant.OrganizationName}' has been suspended.";
            return RedirectToPage(new { Search, Status, PageNumber, PageSize });
        }

        /// <summary>
        /// Handles HTTP POST requests to reactivate a suspended tenant organization.
        /// </summary>
        /// <param name="id">Tenant catalog ID.</param>
        public async Task<IActionResult> OnPostReactivateAsync(Guid id)
        {
            var tenant = await _dbContext.MasterTenantCatalogs.FindAsync(id);
            if (tenant == null)
            {
                TempData["Error"] = "Tenant organization not found.";
                return RedirectToPage();
            }

            var adminUser = User.Identity?.Name ?? "SuperAdmin";
            var now = DateTime.UtcNow;

            var oldSnapshot = JsonSerializer.Serialize(new
            {
                tenant.IsActive,
                tenant.IsSuspended,
                tenant.SuspendedUtc,
                tenant.SuspendedBy,
                tenant.SuspensionReason
            });

            tenant.IsActive = true;
            tenant.IsSuspended = false;
            tenant.SuspendedUtc = null;
            tenant.SuspendedBy = null;
            tenant.SuspensionReason = null;
            tenant.UpdatedUtc = now;
            tenant.LastUpdatedBy = adminUser;

            var newSnapshot = JsonSerializer.Serialize(new
            {
                tenant.IsActive,
                tenant.IsSuspended,
                tenant.UpdatedUtc,
                tenant.LastUpdatedBy
            });

            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value,
                UserName = adminUser,
                Action = "Tenant.Reactivated",
                EntityType = "Tenant",
                EntityId = tenant.Id.ToString(),
                Summary = $"Admin {adminUser} reactivated tenant '{tenant.OrganizationName}' ({tenant.TenantKey}).",
                OldValues = oldSnapshot,
                NewValues = newSnapshot,
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers.UserAgent.ToString(),
                CreatedUtc = now
            });

            await _dbContext.SaveChangesAsync();

            TempData["Success"] = $"Tenant '{tenant.OrganizationName}' has been successfully reactivated.";
            return RedirectToPage(new { Search, Status, PageNumber, PageSize });
        }

        /// <summary>
        /// Handles HTTP POST requests to soft-delete (deactivate) a tenant organization.
        /// </summary>
        /// <param name="id">Tenant catalog ID.</param>
        /// <param name="reason">Reason for deactivating/soft-deleting the tenant.</param>
        public async Task<IActionResult> OnPostSoftDeleteAsync(Guid id, string? reason)
        {
            var tenant = await _dbContext.MasterTenantCatalogs.FindAsync(id);
            if (tenant == null)
            {
                TempData["Error"] = "Tenant organization not found.";
                return RedirectToPage();
            }

            var adminUser = User.Identity?.Name ?? "SuperAdmin";
            var now = DateTime.UtcNow;

            var oldSnapshot = JsonSerializer.Serialize(new
            {
                tenant.IsActive,
                tenant.IsDeleted,
                tenant.DeletedUtc,
                tenant.DeletedBy,
                tenant.DeletionReason
            });

            tenant.IsActive = false;
            tenant.IsDeleted = true;
            tenant.DeletedUtc = now;
            tenant.DeletedBy = adminUser;
            tenant.DeletionReason = string.IsNullOrWhiteSpace(reason) ? "Soft deleted by Super-Admin" : reason.Trim();
            tenant.UpdatedUtc = now;
            tenant.LastUpdatedBy = adminUser;

            var newSnapshot = JsonSerializer.Serialize(new
            {
                tenant.IsActive,
                tenant.IsDeleted,
                tenant.DeletedUtc,
                tenant.DeletedBy,
                tenant.DeletionReason
            });

            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value,
                UserName = adminUser,
                Action = "Tenant.SoftDeleted",
                EntityType = "Tenant",
                EntityId = tenant.Id.ToString(),
                Summary = $"Admin {adminUser} soft-deleted tenant '{tenant.OrganizationName}' ({tenant.TenantKey}). Reason: {tenant.DeletionReason}",
                OldValues = oldSnapshot,
                NewValues = newSnapshot,
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers.UserAgent.ToString(),
                CreatedUtc = now
            });

            await _dbContext.SaveChangesAsync();

            TempData["Warning"] = $"Tenant '{tenant.OrganizationName}' has been soft-deleted (deactivated).";
            return RedirectToPage(new { Search, Status, PageNumber, PageSize });
        }
    }
}
