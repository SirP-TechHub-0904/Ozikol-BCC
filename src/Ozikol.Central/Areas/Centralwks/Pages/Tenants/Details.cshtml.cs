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
        private readonly IConfiguration _configuration;
        private readonly ICentralEmailService _centralEmailService;
        private readonly ICentralTwoFactorService _twoFactorService;
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
            IConfiguration configuration,
            ICentralEmailService centralEmailService,
            ICentralTwoFactorService twoFactorService,
            Ozikol_BCC.Infrastructure.Services.Email.IMailcowProvisioningService? mailcowProvisioning = null,
            Ozikol_BCC.Infrastructure.TenantSupport.ITenantProvider? tenantProvider = null,
            Ozikol_BCC.Infrastructure.Services.Email.ICloudflareDnsService? cloudflareDns = null)
        {
            _dbContext = dbContext;
            _migrationService = migrationService;
            _logger = logger;
            _configuration = configuration;
            _centralEmailService = centralEmailService;
            _twoFactorService = twoFactorService;
            _mailcowProvisioning = mailcowProvisioning;
            _tenantProvider = tenantProvider;
            _cloudflareDns = cloudflareDns;
        }

        /// <summary>
        /// Dedicated security email address resolved strictly from <c>appsettings.json</c> (<c>TenantDeletionSecurity:VerificationEmail</c>)
        /// that receives the mandatory 6-digit OTP authorization code for permanent tenant deletion.
        /// </summary>
        public string DeletionVerificationEmail =>
            _configuration["TenantDeletionSecurity:VerificationEmail"]?.Trim() ?? string.Empty;

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
            await InvalidateTenantCacheSafeAsync(tenant.TenantKey);
            return RedirectToPage(new { id = Id });
        }

        /// <summary>
        /// Handles HTTP POST requests to soft-delete (deactivate) the tenant.
        /// </summary>
        /// <param name="reason">The reason for soft-deleting the tenant.</param>
        /// <returns>Redirect to the tenant index page.</returns>
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
            await InvalidateTenantCacheSafeAsync(tenant.TenantKey);

            TempData["Warning"] = $"Tenant '{tenant.OrganizationName}' has been deactivated (soft-deleted).";
            return RedirectToPage("/Tenants/Index");
        }

        /// <summary>
        /// Handles HTTP POST requests to reset a tenant's public website to a clean Blank Canvas from Central Admin.
        /// Preserves tenant users, business records, and workspace settings while removing website pages, sections, blogs, and templates.
        /// </summary>
        /// <param name="confirmResetKey">Tenant key confirmation for resetting the website.</param>
        /// <returns>Redirect back to the tenant details page.</returns>
        public async Task<IActionResult> OnPostResetWebsiteAsync(string confirmResetKey)
        {
            var tenant = await _dbContext.MasterTenantCatalogs.FirstOrDefaultAsync(t => t.Id == Id);
            if (tenant == null)
            {
                TempData["Error"] = "Tenant organization not found.";
                return RedirectToPage("/Tenants/Index");
            }

            if (!string.Equals(confirmResetKey?.Trim(), tenant.TenantKey, StringComparison.OrdinalIgnoreCase))
            {
                TempData["Error"] = $"Website reset aborted: confirmation key did not match '{tenant.TenantKey}'.";
                return RedirectToPage(new { id = Id, tab = "governance" });
            }

            try
            {
                var masterConnStr = _dbContext.Database.GetConnectionString() ?? string.Empty;
                var decryptedConnStr = Ozikol.MasterDomain.Security.OzikolDataCipher.DecryptIfNeeded(tenant.ConnectionString) ?? tenant.ConnectionString;
                var harmonizedConnStr = TenantConnectionHarmonizer.Harmonize(masterConnStr, decryptedConnStr, tenant.DatabaseName);

                var optBuilder = new DbContextOptionsBuilder<Ozikol_BCC.Persistence.EF.SQL.DashboardDbContext>();
                optBuilder.UseSqlServer(harmonizedConnStr, sqlOpts => sqlOpts.CommandTimeout(120));

                var tenantProvider = _tenantProvider ?? new Ozikol_BCC.Infrastructure.TenantSupport.TenantProvider();
                using (tenantProvider.BeginScope(harmonizedConnStr))
                await using (var tenantDb = new Ozikol_BCC.Persistence.EF.SQL.DashboardDbContext(optBuilder.Options, tenantProvider, null))
                {
                    await Ozikol_BCC.Persistence.EF.SQL.Infrastructure.TenantDefaultWebsiteSeeder.ResetToBlankCanvasAsync(tenantDb);
                }

                var adminUser = User.Identity?.Name ?? "SuperAdmin";
                _dbContext.MasterAuditLogs.Add(new MasterAuditLog
                {
                    UserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value,
                    UserName = adminUser,
                    Action = "Tenant.WebsiteResetToBlank",
                    EntityType = "Tenant",
                    EntityId = tenant.Id.ToString(),
                    Summary = $"Central Admin {adminUser} reset the public website of tenant '{tenant.OrganizationName}' ({tenant.TenantKey}) to Blank Canvas.",
                    IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                    UserAgent = Request.Headers.UserAgent.ToString(),
                    CreatedUtc = DateTime.UtcNow
                });
                await _dbContext.SaveChangesAsync();

                TempData["Success"] = $"Public website for '{tenant.OrganizationName}' ({tenant.TenantKey}) has been wiped and reset to Blank Canvas.";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to reset website to Blank Canvas for tenant '{TenantKey}'", tenant.TenantKey);
                TempData["Error"] = $"Failed to reset tenant website: {ex.Message}";
            }

            return RedirectToPage(new { id = Id, tab = "governance" });
        }

        /// <summary>
        /// Handles HTTP POST requests to re-seed the turnkey default website suite for a tenant from Central Admin.
        /// </summary>
        /// <returns>Redirect back to the tenant details page.</returns>
        public async Task<IActionResult> OnPostReseedWebsiteAsync()
        {
            var tenant = await _dbContext.MasterTenantCatalogs.FirstOrDefaultAsync(t => t.Id == Id);
            if (tenant == null)
            {
                TempData["Error"] = "Tenant organization not found.";
                return RedirectToPage("/Tenants/Index");
            }

            try
            {
                var onboardingService = HttpContext.RequestServices.GetService(typeof(ITenantOnboardingService)) as ITenantOnboardingService;
                if (onboardingService == null)
                {
                    TempData["Error"] = "Tenant onboarding service is unavailable.";
                    return RedirectToPage(new { id = Id, tab = "governance" });
                }

                var ok = await onboardingService.SeedTenantDefaultWebsiteAsync(tenant.TenantKey, tenant.OrganizationName);
                if (!ok)
                {
                    TempData["Error"] = $"Failed to seed default website suite for '{tenant.OrganizationName}'. Check database connectivity.";
                    return RedirectToPage(new { id = Id, tab = "governance" });
                }

                var adminUser = User.Identity?.Name ?? "SuperAdmin";
                _dbContext.MasterAuditLogs.Add(new MasterAuditLog
                {
                    UserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value,
                    UserName = adminUser,
                    Action = "Tenant.WebsiteReseeded",
                    EntityType = "Tenant",
                    EntityId = tenant.Id.ToString(),
                    Summary = $"Central Admin {adminUser} seeded the turnkey default website suite for tenant '{tenant.OrganizationName}' ({tenant.TenantKey}).",
                    IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                    UserAgent = Request.Headers.UserAgent.ToString(),
                    CreatedUtc = DateTime.UtcNow
                });
                await _dbContext.SaveChangesAsync();

                TempData["Success"] = $"Turnkey default website suite seeded for '{tenant.OrganizationName}' ({tenant.TenantKey}).";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to re-seed website for tenant '{TenantKey}'", tenant.TenantKey);
                TempData["Error"] = $"Failed to seed tenant website: {ex.Message}";
            }

            return RedirectToPage(new { id = Id, tab = "governance" });
        }

        /// <summary>
        /// Generates and dispatches a 6-digit security verification OTP code strictly to the email address
        /// configured in <c>appsettings.json</c> (<c>TenantDeletionSecurity:VerificationEmail</c>) before permanent tenant deletion.
        /// </summary>
        /// <returns>JSON result indicating whether the verification email was delivered.</returns>
        public async Task<IActionResult> OnPostSendDeleteOtpAsync()
        {
            var tenant = await _dbContext.MasterTenantCatalogs
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.Id == Id);

            if (tenant == null)
            {
                return new JsonResult(new { success = false, message = "Tenant organization not found." });
            }

            var targetEmail = DeletionVerificationEmail;
            if (string.IsNullOrWhiteSpace(targetEmail))
            {
                return new JsonResult(new
                {
                    success = false,
                    message = "TenantDeletionSecurity:VerificationEmail is not configured in appsettings.json."
                });
            }

            int expiryMinutes = 10;
            if (int.TryParse(_configuration["TenantDeletionSecurity:OtpExpiryMinutes"], out var parsedMinutes) && parsedMinutes > 0)
            {
                expiryMinutes = parsedMinutes;
            }

            var otpCode = _twoFactorService.GenerateTenantDeleteOtp(tenant.Id, tenant.TenantKey, targetEmail, expiryMinutes);
            var adminUser = User.Identity?.Name ?? "SuperAdmin";

            var sent = await _centralEmailService.SendTenantDeletionOtpEmailAsync(
                toEmail: targetEmail,
                code: otpCode,
                organizationName: tenant.OrganizationName,
                tenantKey: tenant.TenantKey,
                databaseName: tenant.DatabaseName ?? string.Empty,
                requestedByAdmin: adminUser);

            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value,
                UserName = adminUser,
                Action = "Tenant.PermanentDeleteOtpRequested",
                EntityType = "Tenant",
                EntityId = tenant.Id.ToString(),
                Summary = $"Admin {adminUser} requested a permanent deletion 6-digit OTP code for tenant '{tenant.OrganizationName}' ({tenant.TenantKey}). Dispatched to {targetEmail} (Status: {(sent ? "Sent" : "Failed")}).",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers.UserAgent.ToString(),
                CreatedUtc = DateTime.UtcNow
            });
            await _dbContext.SaveChangesAsync();

            if (!sent)
            {
                var latestLogError = await _dbContext.MasterEmailLogs
                    .AsNoTracking()
                    .Where(l => l.RecipientEmail == targetEmail)
                    .OrderByDescending(l => l.SentAtUtc)
                    .Select(l => l.ErrorMessage)
                    .FirstOrDefaultAsync();

                var detail = !string.IsNullOrWhiteSpace(latestLogError)
                    ? $" ({latestLogError})"
                    : string.Empty;

                return new JsonResult(new
                {
                    success = false,
                    message = $"Failed to send verification code to {targetEmail}{detail}. Check Mailcow API Key / SMTP Password in Platform Settings."
                });
            }

            return new JsonResult(new
            {
                success = true,
                message = $"6-digit security verification code sent to {targetEmail}. Valid for {expiryMinutes} minutes."
            });
        }

        /// <summary>
        /// Handles HTTP POST requests to permanently scrub and delete the tenant, including dropping the physical database,
        /// dropping the dedicated SQL Server login, removing all dependent master catalog records, and evicting routing caches.
        /// Enforces strict 4-factor confirmation (Tenant Key + "DELETE PERMANENTLY" phrase + explicit acknowledgment checkbox + 6-digit email OTP sent to appsettings VerificationEmail).
        /// </summary>
        /// <param name="confirmKey">Must match the exact tenant key.</param>
        /// <param name="confirmPhrase">Must match "DELETE PERMANENTLY".</param>
        /// <param name="acknowledgeIrreversible">Must be checked (true) to confirm irreversible destruction.</param>
        /// <param name="confirmOtpCode">Must match the 6-digit OTP sent to <c>TenantDeletionSecurity:VerificationEmail</c>.</param>
        /// <returns>Redirect to the tenant index page upon completion.</returns>
        public async Task<IActionResult> OnPostPermanentDeleteAsync(
            string confirmKey,
            string? confirmPhrase = null,
            bool acknowledgeIrreversible = false,
            string? confirmOtpCode = null)
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
                TempData["Error"] = $"Permanent deletion aborted: Tenant key confirmation did not match '{tenant.TenantKey}'.";
                return RedirectToPage(new { id = Id, tab = "governance" });
            }

            if (!string.Equals(confirmPhrase?.Trim(), "DELETE PERMANENTLY", StringComparison.OrdinalIgnoreCase))
            {
                TempData["Error"] = "Permanent deletion aborted: You must type 'DELETE PERMANENTLY' in the verification phrase field.";
                return RedirectToPage(new { id = Id, tab = "governance" });
            }

            if (!acknowledgeIrreversible)
            {
                TempData["Error"] = "Permanent deletion aborted: You must tick the mandatory irreversible destruction acknowledgment checkbox.";
                return RedirectToPage(new { id = Id, tab = "governance" });
            }

            var targetVerificationEmail = DeletionVerificationEmail;
            if (string.IsNullOrWhiteSpace(targetVerificationEmail))
            {
                TempData["Error"] = "Permanent deletion aborted: 'TenantDeletionSecurity:VerificationEmail' is not configured in appsettings.json.";
                return RedirectToPage(new { id = Id, tab = "governance" });
            }

            if (!_twoFactorService.VerifyTenantDeleteOtp(tenant.Id, tenant.TenantKey, targetVerificationEmail, confirmOtpCode ?? string.Empty))
            {
                TempData["Error"] = $"Permanent deletion aborted: Invalid or expired 6-digit security verification code. Please click 'Send Verification Code' to receive a fresh code at {targetVerificationEmail}.";
                return RedirectToPage(new { id = Id, tab = "governance" });
            }

            var adminUser = User.Identity?.Name ?? "SuperAdmin";
            var now = DateTime.UtcNow;
            var cleanKey = tenant.TenantKey.Trim().ToLowerInvariant();
            var dbName = tenant.DatabaseName?.Trim() ?? string.Empty;

            // Extract dedicated SQL login username and fallback database name from tenant connection string before removal
            string? dedicatedSqlUser = null;
            try
            {
                var decryptedTenantConn = Ozikol.MasterDomain.Security.OzikolDataCipher.DecryptIfNeeded(tenant.ConnectionString) ?? tenant.ConnectionString;
                if (!string.IsNullOrWhiteSpace(decryptedTenantConn))
                {
                    var tBuilder = new SqlConnectionStringBuilder(decryptedTenantConn);
                    if (!string.IsNullOrWhiteSpace(tBuilder.UserID) &&
                        (tBuilder.UserID.StartsWith("usr_", StringComparison.OrdinalIgnoreCase) ||
                         tBuilder.UserID.StartsWith("oz_usr_", StringComparison.OrdinalIgnoreCase)))
                    {
                        dedicatedSqlUser = tBuilder.UserID.Trim();
                    }

                    if (string.IsNullOrWhiteSpace(dbName) && !string.IsNullOrWhiteSpace(tBuilder.InitialCatalog))
                    {
                        dbName = tBuilder.InitialCatalog.Trim();
                    }
                }
            }
            catch
            {
                // Non-blocking parse
            }

            // 1. Drop Physical Database & Dedicated SQL Login using Master Admin SQL Credentials
            bool dbDropped = false;
            string dbDropNote = "Database dropped";
            try
            {
                var masterAdminConnStr = _dbContext.Database.GetConnectionString();
                if (!string.IsNullOrWhiteSpace(masterAdminConnStr) && !string.IsNullOrWhiteSpace(dbName))
                {
                    var adminBuilder = new SqlConnectionStringBuilder(masterAdminConnStr)
                    {
                        InitialCatalog = "master",
                        ConnectTimeout = 30
                    };

                    await using var masterConn = new SqlConnection(adminBuilder.ConnectionString);
                    await masterConn.OpenAsync();

                    var safeDbBracket = dbName.Replace("]", "]]");
                    var safeDbLiteral = dbName.Replace("'", "''");

                    await using (var dropDbCmd = masterConn.CreateCommand())
                    {
                        dropDbCmd.CommandTimeout = 60;
                        dropDbCmd.CommandText = $@"
                            IF EXISTS (SELECT name FROM sys.databases WHERE name = N'{safeDbLiteral}')
                            BEGIN
                                ALTER DATABASE [{safeDbBracket}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
                                DROP DATABASE [{safeDbBracket}];
                            END";
                        await dropDbCmd.ExecuteNonQueryAsync();
                    }

                    // Verify that the physical database no longer exists on the SQL Server instance
                    await using (var verifyCmd = masterConn.CreateCommand())
                    {
                        verifyCmd.CommandText = $"SELECT COUNT(1) FROM sys.databases WHERE name = N'{safeDbLiteral}';";
                        var remainingCount = Convert.ToInt32(await verifyCmd.ExecuteScalarAsync());
                        if (remainingCount > 0)
                        {
                            TempData["Error"] = $"Permanent deletion aborted: SQL Server reported that physical database '{dbName}' still exists after DROP DATABASE.";
                            return RedirectToPage(new { id = Id, tab = "governance" });
                        }
                    }

                    // Drop dedicated SQL login as well as any orphan logins matching this tenant key
                    var safeTenantKeyLiteral = cleanKey.Replace("'", "''");
                    await using (var dropLoginCmd = masterConn.CreateCommand())
                    {
                        var explicitDropSql = string.Empty;
                        if (!string.IsNullOrWhiteSpace(dedicatedSqlUser))
                        {
                            var safeLoginBracket = dedicatedSqlUser.Replace("]", "]]");
                            var safeLoginLiteral = dedicatedSqlUser.Replace("'", "''");
                            explicitDropSql = $@"
                            IF EXISTS (SELECT name FROM sys.server_principals WHERE name = N'{safeLoginLiteral}')
                            BEGIN
                                DROP LOGIN [{safeLoginBracket}];
                            END";
                        }

                        dropLoginCmd.CommandText = $@"
                            {explicitDropSql}

                            DECLARE @curLogin NVARCHAR(128);
                            DECLARE login_cur CURSOR LOCAL FAST_FORWARD FOR 
                                SELECT name FROM sys.server_principals 
                                WHERE name LIKE 'usr_' + N'{safeTenantKeyLiteral}' + '_%'
                                   OR name LIKE 'oz_usr_' + N'{safeTenantKeyLiteral}' + '_%';
                            OPEN login_cur;
                            FETCH NEXT FROM login_cur INTO @curLogin;
                            WHILE @@FETCH_STATUS = 0
                            BEGIN
                                EXEC('DROP LOGIN [' + @curLogin + ']');
                                FETCH NEXT FROM login_cur INTO @curLogin;
                            END
                            CLOSE login_cur;
                            DEALLOCATE login_cur;";

                        await dropLoginCmd.ExecuteNonQueryAsync();
                    }

                    dbDropped = true;
                    _logger.LogInformation("Successfully dropped physical database '{DatabaseName}' and SQL login '{SqlUser}' for purged tenant '{TenantKey}'",
                        dbName, dedicatedSqlUser ?? "(none)", cleanKey);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to drop physical database '{DatabaseName}' during hard delete of tenant '{TenantKey}'", dbName, cleanKey);
                TempData["Error"] = $"Permanent deletion aborted: Failed to drop physical SQL database '{dbName}': {ex.Message}";
                return RedirectToPage(new { id = Id, tab = "governance" });
            }

            // 2. Remove all dependent Master Catalog foreign-key records so SaveChangesAsync never fails on FK Restrict constraints
            var billingTxs = await _dbContext.MasterBillingTransactions
                .Where(b => b.MasterTenantCatalogId == tenant.Id)
                .ToListAsync();
            if (billingTxs.Count > 0)
            {
                _dbContext.MasterBillingTransactions.RemoveRange(billingTxs);
            }

            var couponRedemptions = await _dbContext.MasterCouponRedemptions
                .Where(c => c.MasterTenantCatalogId == tenant.Id)
                .ToListAsync();
            if (couponRedemptions.Count > 0)
            {
                _dbContext.MasterCouponRedemptions.RemoveRange(couponRedemptions);
            }

            var apiErrorLogs = await _dbContext.MasterApiErrorLogs
                .Where(e => e.MasterTenantCatalogId == tenant.Id || e.TenantKey == tenant.TenantKey)
                .ToListAsync();
            if (apiErrorLogs.Count > 0)
            {
                _dbContext.MasterApiErrorLogs.RemoveRange(apiErrorLogs);
            }

            var appBuilds = await _dbContext.MasterTenantAppBuilds
                .Where(b => b.TenantId == tenant.Id || b.TenantKey == tenant.TenantKey)
                .ToListAsync();
            if (appBuilds.Count > 0)
            {
                _dbContext.MasterTenantAppBuilds.RemoveRange(appBuilds);
            }

            var jobLogs = await _dbContext.MasterBackgroundJobLogs
                .Where(l => l.TargetTenantCatalogId == tenant.Id || l.TenantKey == tenant.TenantKey)
                .ToListAsync();
            if (jobLogs.Count > 0)
            {
                _dbContext.MasterBackgroundJobLogs.RemoveRange(jobLogs);
            }

            var tenantJobs = await _dbContext.MasterBackgroundJobs
                .Where(j => j.TargetTenantCatalogId == tenant.Id)
                .ToListAsync();
            if (tenantJobs.Count > 0)
            {
                _dbContext.MasterBackgroundJobs.RemoveRange(tenantJobs);
            }

            var affiliateReferrals = await _dbContext.MasterAffiliateReferrals
                .Where(r => r.ReferredTenantKey == tenant.TenantKey)
                .ToListAsync();
            if (affiliateReferrals.Count > 0)
            {
                _dbContext.MasterAffiliateReferrals.RemoveRange(affiliateReferrals);
            }

            if (tenant.FeatureSubscriptions.Any())
            {
                _dbContext.MasterTenantFeatureSubscriptions.RemoveRange(tenant.FeatureSubscriptions);
            }

            // 3. Write final immutable audit log
            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value,
                UserName = adminUser,
                Action = "Tenant.HardPurged",
                EntityType = "Tenant",
                EntityId = tenant.Id.ToString(),
                Summary = $"Admin {adminUser} permanently purged tenant '{tenant.OrganizationName}' ({tenant.TenantKey}) and physical database '{dbName}' ({dbDropNote}).",
                OldValues = JsonSerializer.Serialize(new
                {
                    tenant.Id,
                    tenant.TenantKey,
                    tenant.OrganizationName,
                    tenant.PrimaryDomain,
                    tenant.CustomDomain,
                    tenant.DatabaseName,
                    dedicatedSqlUser,
                    dbDropped,
                    tenant.AdminEmail,
                    tenant.CreatedUtc
                }),
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers.UserAgent.ToString(),
                CreatedUtc = now
            });

            // 4. Remove MasterTenantCatalog record and commit
            _dbContext.MasterTenantCatalogs.Remove(tenant);
            await _dbContext.SaveChangesAsync();

            // 5. Evict Redis L2 & In-Memory L1 Tenant Routing Cache immediately across cluster
            await InvalidateTenantCacheSafeAsync(cleanKey);

            TempData["Success"] = $"Tenant '{tenant.OrganizationName}' ({tenant.TenantKey}), its Master Catalog records, and physical database '{dbName}' have been permanently scrubbed.";
            return RedirectToPage("/Tenants/Index");
        }

        /// <summary>
        /// Safely invalidates the distributed Redis L2 and local in-memory L1 tenant catalog caches.
        /// </summary>
        /// <param name="tenantKey">The tenant key that was modified or deleted.</param>
        private async Task InvalidateTenantCacheSafeAsync(string? tenantKey)
        {
            try
            {
                var invalidator = HttpContext.RequestServices.GetService(typeof(Ozikol_BCC.Infrastructure.Caching.ITenantCacheInvalidator))
                    as Ozikol_BCC.Infrastructure.Caching.ITenantCacheInvalidator;
                if (invalidator != null)
                {
                    await invalidator.InvalidateTenantCatalogAsync(tenantKey);
                }

                if (_tenantProvider is Ozikol_BCC.Infrastructure.TenantSupport.TenantProvider tp)
                {
                    tp.RefreshCachedTenants();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Non-blocking notice: Failed to evict tenant cache for '{TenantKey}'", tenantKey);
            }
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
