using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Ozikol.Central.Services;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Tenants
{
    /// <summary>
    /// Feature activation item combining master feature catalog definition with tenant subscription state.
    /// </summary>
    public class TenantFeatureMatrixItem
    {
        public MasterFeatureCatalog Feature { get; set; } = null!;
        public MasterTenantFeatureSubscription? Subscription { get; set; }
        public bool IsActive => Subscription != null && Subscription.IsActive;
    }

    /// <summary>
    /// PageModel presenting the comprehensive Tenant Details Center.
    /// Provides 360-degree governance: profile inspection, lifecycle management (Edit, Suspend, Soft Delete, Hard Scrub),
    /// modular capability toggles, billing ledger, tenant-scoped audit and error logs, and physical database resource consumption.
    /// </summary>
    public class DetailsModel : PageModel
    {
        private readonly MasterCatalogDbContext _dbContext;
        private readonly ICentralMigrationService _migrationService;
        private readonly ILogger<DetailsModel> _logger;
        private readonly Ozikol_BCC.Infrastructure.Services.Email.IMailcowProvisioningService? _mailcowProvisioning;
        private readonly Ozikol_BCC.Infrastructure.Services.Email.ICloudflareDnsService? _cloudflareDns;
        private readonly Ozikol_BCC.Infrastructure.TenantSupport.ITenantProvider? _tenantProvider;

        /// <summary>
        /// Initializes a new instance of the <see cref="DetailsModel"/> class.
        /// </summary>
        public DetailsModel(
            MasterCatalogDbContext dbContext,
            ICentralMigrationService migrationService,
            ILogger<DetailsModel> logger,
            Ozikol_BCC.Infrastructure.Services.Email.IMailcowProvisioningService? mailcowProvisioning = null,
            Ozikol_BCC.Infrastructure.TenantSupport.ITenantProvider? tenantProvider = null,
            Ozikol_BCC.Infrastructure.Services.Email.ICloudflareDnsService? cloudflareDns = null)
        {
            _dbContext = dbContext;
            _migrationService = migrationService;
            _logger = logger;
            _mailcowProvisioning = mailcowProvisioning;
            _tenantProvider = tenantProvider;
            _cloudflareDns = cloudflareDns;
        }

        /// <summary>
        /// Indicates whether the tenant's Mailcow transactional sender mailbox is configured in its database.
        /// </summary>
        public bool TenantEmailConfigured { get; set; }

        /// <summary>
        /// Resolved transactional sender email address for this tenant (e.g. noreply@tenant.ozikol.cloud).
        /// </summary>
        public string TenantSenderEmail { get; set; } = string.Empty;

        /// <summary>
        /// Tenant identifier from query string.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public Guid Id { get; set; }

        /// <summary>
        /// The loaded tenant catalog entity.
        /// </summary>
        public MasterTenantCatalog Tenant { get; set; } = null!;

        /// <summary>
        /// All platform capabilities with active/inactive subscription states for this tenant.
        /// </summary>
        public List<TenantFeatureMatrixItem> FeatureMatrix { get; set; } = new();

        /// <summary>
        /// Billing and payment transaction ledger records for this tenant.
        /// </summary>
        public List<MasterBillingTransaction> BillingTransactions { get; set; } = new();

        /// <summary>
        /// Immutable audit log history tracking who performed actions on this tenant.
        /// </summary>
        public List<MasterAuditLog> AuditLogs { get; set; } = new();

        /// <summary>
        /// Tenant-isolated API error logs capturing CustomError, RealError, and ErrorCode ("ERR-XXXX").
        /// </summary>
        public List<MasterApiErrorLog> ApiErrorLogs { get; set; } = new();

        /// <summary>
        /// Physical database resource consumption and table metrics.
        /// </summary>
        public TenantDatabaseDeepDive? DatabaseDeepDive { get; set; }

        /// <summary>
        /// Handles HTTP GET requests to load full tenant diagnostics, subscriptions, billing, logs, and database metrics.
        /// </summary>
        public async Task<IActionResult> OnGetAsync()
        {
            var tenant = await _dbContext.MasterTenantCatalogs
                .Include(t => t.FeatureSubscriptions)
                    .ThenInclude(s => s.MasterFeatureCatalog)
                .FirstOrDefaultAsync(t => t.Id == Id);

            if (tenant == null)
            {
                TempData["Error"] = "Tenant organization not found.";
                return RedirectToPage("/Tenants/Index");
            }

            Tenant = tenant;
            TenantSenderEmail = $"noreply@{tenant.TenantKey.Trim().ToLowerInvariant()}.ozikol.cloud";

            // Check tenant's Mailcow email configuration status in its dedicated database
            try
            {
                var connStr = Ozikol.MasterDomain.Security.OzikolDataCipher.DecryptIfNeeded(tenant.ConnectionString) ?? tenant.ConnectionString;
                if (!string.IsNullOrWhiteSpace(connStr) && _tenantProvider != null)
                {
                    var optBuilder = new DbContextOptionsBuilder<Ozikol_BCC.Persistence.EF.SQL.DashboardDbContext>();
                    optBuilder.UseSqlServer(connStr);
                    using (_tenantProvider.BeginScope(connStr))
                    using (var tenantDb = new Ozikol_BCC.Persistence.EF.SQL.DashboardDbContext(optBuilder.Options, _tenantProvider, null))
                    {
                        var cfg = await tenantDb.MisConfigurationSettings.AsNoTracking().FirstOrDefaultAsync();
                        if (cfg != null && !string.IsNullOrWhiteSpace(cfg.SenderEmail))
                        {
                            TenantSenderEmail = cfg.SenderEmail.Trim();
                            TenantEmailConfigured = !string.IsNullOrWhiteSpace(cfg.SmtpPassword) ||
                                                    string.Equals(cfg.EmailProvider, "Mailcow", StringComparison.OrdinalIgnoreCase);
                        }
                    }
                }
            }
            catch
            {
                // Non-blocking inspection
            }

            // 1. Build Feature Subscriptions Matrix
            var allFeatures = await _dbContext.MasterFeatureCatalogs
                .Where(f => f.IsActive && f.IsPublished)
                .OrderBy(f => f.Category)
                .ThenBy(f => f.Name)
                .ToListAsync();

            var tenantSubs = tenant.FeatureSubscriptions.ToDictionary(s => s.MasterFeatureCatalogId);

            FeatureMatrix = allFeatures.Select(f =>
            {
                tenantSubs.TryGetValue(f.Id, out var sub);
                return new TenantFeatureMatrixItem
                {
                    Feature = f,
                    Subscription = sub
                };
            }).ToList();

            // 2. Load Billing Transactions
            BillingTransactions = await _dbContext.MasterBillingTransactions
                .Where(b => b.MasterTenantCatalogId == Id)
                .OrderByDescending(b => b.CreatedUtc)
                .Take(25)
                .ToListAsync();

            // 3. Load Tenant-Scoped Audit Logs (capturing edits, suspensions, and user attribution)
            var tenantIdStr = Id.ToString();
            AuditLogs = await _dbContext.MasterAuditLogs
                .Where(a => a.EntityType == "Tenant" && (a.EntityId == tenantIdStr || (a.Summary != null && a.Summary.Contains(tenant.TenantKey))))
                .OrderByDescending(a => a.CreatedUtc)
                .Take(30)
                .ToListAsync();

            // 3b. Load Tenant-Isolated API Error Logs (CustomError + RealError + ErrorCode)
            try
            {
                ApiErrorLogs = await _dbContext.MasterApiErrorLogs
                    .AsNoTracking()
                    .Where(e => e.MasterTenantCatalogId == Id || e.TenantKey == tenant.TenantKey)
                    .OrderByDescending(e => e.CreatedUtc)
                    .Take(50)
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "MasterApiErrorLogs table may be pending migration.");
            }

            // 4. Load Real-Time Database Metrics & Table Breakdown
            try
            {
                DatabaseDeepDive = await _migrationService.GetTenantDeepDiveAsync(tenant.TenantKey);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to retrieve deep dive database metrics for tenant key '{TenantKey}'", tenant.TenantKey);
            }

            return Page();
        }

        /// <summary>
        /// Handles HTTP POST requests to update tenant organization metadata with JSON diff audit logging.
        /// </summary>
        public async Task<IActionResult> OnPostUpdateMetadataAsync(
            string organizationName,
            string? customDomain,
            string? adminEmail,
            string? websiteUrl)
        {
            var tenant = await _dbContext.MasterTenantCatalogs.FindAsync(Id);
            if (tenant == null)
            {
                TempData["Error"] = "Tenant organization not found.";
                return RedirectToPage("/Tenants/Index");
            }

            var adminUser = User.Identity?.Name ?? "SuperAdmin";
            var now = DateTime.UtcNow;

            var oldSnapshot = JsonSerializer.Serialize(new
            {
                tenant.OrganizationName,
                tenant.CustomDomain,
                tenant.AdminEmail,
                tenant.WebsiteUrl
            });

            tenant.OrganizationName = string.IsNullOrWhiteSpace(organizationName) ? tenant.OrganizationName : organizationName.Trim();
            tenant.CustomDomain = string.IsNullOrWhiteSpace(customDomain) ? null : customDomain.Trim().ToLowerInvariant();
            tenant.AdminEmail = string.IsNullOrWhiteSpace(adminEmail) ? null : adminEmail.Trim().ToLowerInvariant();
            tenant.WebsiteUrl = string.IsNullOrWhiteSpace(websiteUrl) ? null : websiteUrl.Trim();
            tenant.UpdatedUtc = now;
            tenant.LastUpdatedBy = adminUser;

            var newSnapshot = JsonSerializer.Serialize(new
            {
                tenant.OrganizationName,
                tenant.CustomDomain,
                tenant.AdminEmail,
                tenant.WebsiteUrl
            });

            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value,
                UserName = adminUser,
                Action = "Tenant.Updated",
                EntityType = "Tenant",
                EntityId = tenant.Id.ToString(),
                Summary = $"Admin {adminUser} updated metadata for tenant '{tenant.OrganizationName}' ({tenant.TenantKey}).",
                OldValues = oldSnapshot,
                NewValues = newSnapshot,
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers.UserAgent.ToString(),
                CreatedUtc = now
            });

            await _dbContext.SaveChangesAsync();

            TempData["Success"] = "Tenant organization details updated successfully.";
            return RedirectToPage(new { id = Id });
        }

        /// <summary>
        /// Handles HTTP POST requests to toggle tenant operational status (Suspend vs Reactivate).
        /// </summary>
        public async Task<IActionResult> OnPostToggleStatusAsync(string? reason)
        {
            var tenant = await _dbContext.MasterTenantCatalogs.FindAsync(Id);
            if (tenant == null)
            {
                TempData["Error"] = "Tenant organization not found.";
                return RedirectToPage("/Tenants/Index");
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

            if (tenant.IsActive && !tenant.IsSuspended)
            {
                // Suspend
                tenant.IsActive = false;
                tenant.IsSuspended = true;
                tenant.SuspendedUtc = now;
                tenant.SuspendedBy = adminUser;
                tenant.SuspensionReason = string.IsNullOrWhiteSpace(reason) ? "Suspended by Super-Admin" : reason.Trim();
                tenant.UpdatedUtc = now;
                tenant.LastUpdatedBy = adminUser;

                _dbContext.MasterAuditLogs.Add(new MasterAuditLog
                {
                    UserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value,
                    UserName = adminUser,
                    Action = "Tenant.Suspended",
                    EntityType = "Tenant",
                    EntityId = tenant.Id.ToString(),
                    Summary = $"Admin {adminUser} suspended tenant '{tenant.OrganizationName}'. Reason: {tenant.SuspensionReason}",
                    OldValues = oldSnapshot,
                    NewValues = JsonSerializer.Serialize(new { tenant.IsActive, tenant.IsSuspended, tenant.SuspendedUtc, tenant.SuspendedBy, tenant.SuspensionReason }),
                    IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                    UserAgent = Request.Headers.UserAgent.ToString(),
                    CreatedUtc = now
                });

                TempData["Warning"] = $"Tenant '{tenant.OrganizationName}' has been suspended.";
            }
            else
            {
                // Reactivate
                tenant.IsActive = true;
                tenant.IsSuspended = false;
                tenant.SuspendedUtc = null;
                tenant.SuspendedBy = null;
                tenant.SuspensionReason = null;
                tenant.UpdatedUtc = now;
                tenant.LastUpdatedBy = adminUser;

                _dbContext.MasterAuditLogs.Add(new MasterAuditLog
                {
                    UserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value,
                    UserName = adminUser,
                    Action = "Tenant.Reactivated",
                    EntityType = "Tenant",
                    EntityId = tenant.Id.ToString(),
                    Summary = $"Admin {adminUser} reactivated tenant '{tenant.OrganizationName}'.",
                    OldValues = oldSnapshot,
                    NewValues = JsonSerializer.Serialize(new { tenant.IsActive, tenant.IsSuspended, tenant.UpdatedUtc, tenant.LastUpdatedBy }),
                    IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                    UserAgent = Request.Headers.UserAgent.ToString(),
                    CreatedUtc = now
                });

                TempData["Success"] = $"Tenant '{tenant.OrganizationName}' has been reactivated.";
            }

            await _dbContext.SaveChangesAsync();
            return RedirectToPage(new { id = Id });
        }

        /// <summary>
        /// Handles HTTP POST requests to soft-delete (deactivate) the tenant.
        /// </summary>
        public async Task<IActionResult> OnPostSoftDeleteAsync(string? reason)
        {
            var tenant = await _dbContext.MasterTenantCatalogs.FindAsync(Id);
            if (tenant == null)
            {
                TempData["Error"] = "Tenant organization not found.";
                return RedirectToPage("/Tenants/Index");
            }

            var adminUser = User.Identity?.Name ?? "SuperAdmin";
            var now = DateTime.UtcNow;

            tenant.IsActive = false;
            tenant.IsDeleted = true;
            tenant.DeletedUtc = now;
            tenant.DeletedBy = adminUser;
            tenant.DeletionReason = string.IsNullOrWhiteSpace(reason) ? "Soft-deleted by Super-Admin" : reason.Trim();
            tenant.UpdatedUtc = now;
            tenant.LastUpdatedBy = adminUser;

            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value,
                UserName = adminUser,
                Action = "Tenant.SoftDeleted",
                EntityType = "Tenant",
                EntityId = tenant.Id.ToString(),
                Summary = $"Admin {adminUser} soft-deleted tenant '{tenant.OrganizationName}'. Reason: {tenant.DeletionReason}",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers.UserAgent.ToString(),
                CreatedUtc = now
            });

            await _dbContext.SaveChangesAsync();

            TempData["Warning"] = $"Tenant '{tenant.OrganizationName}' has been deactivated (soft-deleted).";
            return RedirectToPage("/Tenants/Index");
        }

        /// <summary>
        /// Handles HTTP POST requests to permanently scrub and delete the tenant, including dropping the physical database.
        /// Requires typing the tenant key to confirm.
        /// </summary>
        public async Task<IActionResult> OnPostPermanentDeleteAsync(string confirmKey)
        {
            var tenant = await _dbContext.MasterTenantCatalogs
                .Include(t => t.FeatureSubscriptions)
                .FirstOrDefaultAsync(t => t.Id == Id);

            if (tenant == null)
            {
                TempData["Error"] = "Tenant organization not found.";
                return RedirectToPage("/Tenants/Index");
            }

            if (!string.Equals(confirmKey?.Trim(), tenant.TenantKey, StringComparison.OrdinalIgnoreCase))
            {
                TempData["Error"] = "Permanent deletion confirmation failed. Tenant key did not match.";
                return RedirectToPage(new { id = Id });
            }

            var adminUser = User.Identity?.Name ?? "SuperAdmin";
            var now = DateTime.UtcNow;

            // 1. Write final immutable audit log
            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value,
                UserName = adminUser,
                Action = "Tenant.HardPurged",
                EntityType = "Tenant",
                EntityId = tenant.Id.ToString(),
                Summary = $"Admin {adminUser} permanently deleted tenant '{tenant.OrganizationName}' ({tenant.TenantKey}) and requested physical database drop of '{tenant.DatabaseName}'.",
                OldValues = JsonSerializer.Serialize(new
                {
                    tenant.Id,
                    tenant.TenantKey,
                    tenant.OrganizationName,
                    tenant.PrimaryDomain,
                    tenant.DatabaseName,
                    tenant.AdminEmail,
                    tenant.CreatedUtc
                }),
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers.UserAgent.ToString(),
                CreatedUtc = now
            });

            // 2. Drop Physical Database on SQL instance if possible
            try
            {
                using var conn = new SqlConnection(tenant.ConnectionString);
                var masterConnStr = new SqlConnectionStringBuilder(tenant.ConnectionString)
                {
                    InitialCatalog = "master"
                }.ConnectionString;

                using var masterConn = new SqlConnection(masterConnStr);
                await masterConn.OpenAsync();
                var dropCmd = masterConn.CreateCommand();
                dropCmd.CommandText = $@"
                    IF EXISTS (SELECT name FROM sys.databases WHERE name = N'{tenant.DatabaseName}')
                    BEGIN
                        ALTER DATABASE [{tenant.DatabaseName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
                        DROP DATABASE [{tenant.DatabaseName}];
                    END";
                await dropCmd.ExecuteNonQueryAsync();
                _logger.LogInformation("Successfully dropped physical database '{DatabaseName}' for purged tenant '{TenantKey}'", tenant.DatabaseName, tenant.TenantKey);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to drop physical database '{DatabaseName}' during hard delete of tenant '{TenantKey}'", tenant.DatabaseName, tenant.TenantKey);
            }

            // 3. Remove master records
            _dbContext.MasterTenantFeatureSubscriptions.RemoveRange(tenant.FeatureSubscriptions);
            _dbContext.MasterTenantCatalogs.Remove(tenant);
            await _dbContext.SaveChangesAsync();

            TempData["Success"] = $"Tenant '{tenant.OrganizationName}' ({tenant.TenantKey}) and its database have been permanently removed.";
            return RedirectToPage("/Tenants/Index");
        }

        /// <summary>
        /// Handles HTTP POST requests to toggle feature activation for this tenant.
        /// </summary>
        public async Task<IActionResult> OnPostToggleFeatureAsync(Guid featureId, bool enable)
        {
            var tenant = await _dbContext.MasterTenantCatalogs
                .Include(t => t.FeatureSubscriptions)
                .FirstOrDefaultAsync(t => t.Id == Id);

            if (tenant == null)
            {
                return new JsonResult(new { success = false, message = "Tenant not found." });
            }

            var feature = await _dbContext.MasterFeatureCatalogs.FindAsync(featureId);
            if (feature == null)
            {
                return new JsonResult(new { success = false, message = "Feature not found in catalog." });
            }

            var adminUser = User.Identity?.Name ?? "SuperAdmin";
            var now = DateTime.UtcNow;

            var existingSub = tenant.FeatureSubscriptions.FirstOrDefault(s => s.MasterFeatureCatalogId == featureId);

            if (enable)
            {
                if (existingSub == null)
                {
                    existingSub = new MasterTenantFeatureSubscription
                    {
                        Id = Guid.NewGuid(),
                        MasterTenantCatalogId = tenant.Id,
                        MasterFeatureCatalogId = feature.Id,
                        StartsAtUtc = now,
                        ExpiresAtUtc = now.AddYears(1),
                        RecurringPrice = feature.MonthlyPrice,
                        DurationType = SubscriptionBillingDuration.Monthly,
                        AutoRenew = true,
                        IsActive = true,
                        Status = "Active",
                        CreatedUtc = now
                    };
                    _dbContext.MasterTenantFeatureSubscriptions.Add(existingSub);
                }
                else
                {
                    existingSub.IsActive = true;
                    existingSub.Status = "Active";
                    existingSub.LastRenewedUtc = now;
                }
            }
            else
            {
                if (existingSub != null)
                {
                    existingSub.IsActive = false;
                    existingSub.Status = "Deactivated";
                }
            }

            tenant.UpdatedUtc = now;
            tenant.LastUpdatedBy = adminUser;

            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value,
                UserName = adminUser,
                Action = "Tenant.FeatureToggled",
                EntityType = "TenantFeature",
                EntityId = feature.Id.ToString(),
                Summary = $"Admin {adminUser} {(enable ? "enabled" : "disabled")} feature '{feature.Name}' ({feature.FeatureCode}) for tenant '{tenant.OrganizationName}'.",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers.UserAgent.ToString(),
                CreatedUtc = now
            });

            await _dbContext.SaveChangesAsync();

            return new JsonResult(new { success = true, isActive = enable, message = $"Feature '{feature.Name}' {(enable ? "enabled" : "disabled")}." });
        }

        /// <summary>
        /// Central Admin 1-Click handler to provision or repair a tenant's Mailcow email service (<c>noreply@{tenant}.ozikol.cloud</c>)
        /// and write the encrypted SMTP configuration directly into the tenant's database.
        /// </summary>
        public async Task<IActionResult> OnPostProvisionMailcowAsync(Guid id)
        {
            var tenant = await _dbContext.MasterTenantCatalogs.FirstOrDefaultAsync(t => t.Id == id);
            if (tenant == null)
            {
                TempData["Error"] = "Tenant organization not found.";
                return RedirectToPage("/Tenants/Index");
            }

            var tenantKey = tenant.TenantKey.Trim().ToLowerInvariant();
            var domain = $"{tenantKey}.ozikol.cloud";
            var localPart = "noreply";
            var senderEmail = $"{localPart}@{domain}";
            var mailboxPassword = $"OziMail!{Guid.NewGuid():N}"[..20];

            if (_mailcowProvisioning == null)
            {
                TempData["Error"] = "Mailcow provisioning service is not registered.";
                return RedirectToPage(new { id });
            }

            var domainOk = await _mailcowProvisioning.EnsureDomainExistsAsync(domain, $"{tenant.OrganizationName} Transactional Mail Domain");
            if (!domainOk)
            {
                TempData["Error"] = $"Failed to register mail domain '{domain}' on Mailcow. Check Mailcow API URL and Key in Platform Settings.";
                return RedirectToPage(new { id });
            }

            var mailboxOk = await _mailcowProvisioning.EnsureMailboxExistsAsync(domain, localPart, mailboxPassword, tenant.OrganizationName);
            if (!mailboxOk)
            {
                TempData["Error"] = $"Failed to provision mailbox '{senderEmail}' on Mailcow.";
                return RedirectToPage(new { id });
            }

            if (_cloudflareDns != null)
            {
                var dkimTxt = await _mailcowProvisioning.GetDkimRecordAsync(domain);
                var dnsResult = await _cloudflareDns.EnsureTenantEmailDnsAsync(domain, dkimTxt);
                if (!dnsResult.Success)
                {
                    TempData["Error"] = dnsResult.ErrorMessage ?? $"Failed to provision Cloudflare DNS records for '{domain}'.";
                    return RedirectToPage(new { id });
                }
            }

            try
            {
                var connStr = Ozikol.MasterDomain.Security.OzikolDataCipher.DecryptIfNeeded(tenant.ConnectionString) ?? tenant.ConnectionString;
                if (!string.IsNullOrWhiteSpace(connStr) && _tenantProvider != null)
                {
                    var optBuilder = new DbContextOptionsBuilder<Ozikol_BCC.Persistence.EF.SQL.DashboardDbContext>();
                    optBuilder.UseSqlServer(connStr);
                    using (_tenantProvider.BeginScope(connStr))
                    using (var tenantDb = new Ozikol_BCC.Persistence.EF.SQL.DashboardDbContext(optBuilder.Options, _tenantProvider, null))
                    {
                        var config = await tenantDb.MisConfigurationSettings.FirstOrDefaultAsync();
                        if (config == null)
                        {
                            config = new Ozikol_BCC.Domain.Models.MisConfigurationSetting { Id = Guid.NewGuid() };
                            tenantDb.MisConfigurationSettings.Add(config);
                        }

                        config.EmailProvider = "Mailcow";
                        config.SenderEmail = senderEmail;
                        config.SenderName = tenant.OrganizationName;
                        config.SmtpHost = "mail.ozikol.cloud";
                        config.SmtpPort = 587;
                        config.SmtpUsername = senderEmail;
                        config.SmtpPassword = Ozikol.MasterDomain.Security.OzikolDataCipher.EncryptIfNeeded(mailboxPassword);
                        config.SmtpEnableSsl = true;

                        await tenantDb.SaveChangesAsync();
                    }
                }

                var adminUser = User.Identity?.Name ?? "SuperAdmin";
                _dbContext.MasterAuditLogs.Add(new MasterAuditLog
                {
                    UserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value,
                    UserName = adminUser,
                    Action = "Tenant.MailcowProvisioned",
                    EntityType = "Tenant",
                    EntityId = tenant.Id.ToString(),
                    Summary = $"Central Admin {adminUser} provisioned Mailcow transactional email ({senderEmail}) for tenant '{tenant.OrganizationName}'.",
                    IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                    UserAgent = Request.Headers.UserAgent.ToString(),
                    CreatedUtc = DateTime.UtcNow
                });
                await _dbContext.SaveChangesAsync();

                TempData["Success"] = $"Transactional email service ({senderEmail}) configured via Mailcow for {tenant.OrganizationName}. Onboarding and password reset emails are now active.";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to save Mailcow configuration into tenant {TenantKey} database.", tenantKey);
                TempData["Error"] = $"Failed to update tenant email configuration: {ex.Message}";
            }

            return RedirectToPage(new { id });
        }
    }
}
