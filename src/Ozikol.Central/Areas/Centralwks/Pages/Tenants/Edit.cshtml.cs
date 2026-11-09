using System;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.DependencyInjection;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Infrastructure.Caching;

namespace Ozikol.Central.Areas.Centralwks.Pages.Tenants
{
    /// <summary>
    /// PageModel for modifying tenant configuration, domain routing, and platform status.
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
        /// Tenant ID to edit.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public Guid Id { get; set; }

        /// <summary>
        /// The tenant entity being edited.
        /// </summary>
        public MasterTenantCatalog Tenant { get; set; } = null!;

        /// <summary>
        /// Input model for tenant updates.
        /// </summary>
        [BindProperty]
        public TenantEditInputModel Input { get; set; } = new();

        /// <summary>
        /// Handles HTTP GET requests to populate the tenant editing form.
        /// </summary>
        public async Task<IActionResult> OnGetAsync()
        {
            var tenant = await _dbContext.MasterTenantCatalogs.FindAsync(Id);
            if (tenant == null)
            {
                TempData["Error"] = "Tenant organization not found.";
                return RedirectToPage("/Tenants/Index");
            }

            Tenant = tenant;

            Input = new TenantEditInputModel
            {
                OrganizationName = tenant.OrganizationName,
                PrimaryDomain = tenant.PrimaryDomain,
                CustomDomain = tenant.CustomDomain,
                WebsiteUrl = tenant.WebsiteUrl,
                AdminEmail = tenant.AdminEmail,
                IsActive = tenant.IsActive,
                ReferredByPartnerCode = tenant.ReferredByPartnerCode,
                ConnectionString = tenant.ConnectionString
            };

            return Page();
        }

        /// <summary>
        /// Handles HTTP POST requests to test live connectivity of candidate connection string before saving.
        /// </summary>
        /// <param name="request">The test connection request containing candidate connection string.</param>
        /// <returns>JSON result with ping latency, server version, and connectivity status.</returns>
        public async Task<IActionResult> OnPostTestConnectionAsync([FromBody] TestConnectionRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.ConnectionString))
            {
                return new JsonResult(new { success = false, message = "Connection string cannot be empty." });
            }

            var sw = Stopwatch.StartNew();
            try
            {
                using var conn = new SqlConnection(request.ConnectionString.Trim());
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(7));
                await conn.OpenAsync(cts.Token);

                using var cmd = conn.CreateCommand();
                cmd.CommandText = "SELECT @@VERSION;";
                var versionObj = await cmd.ExecuteScalarAsync(cts.Token);
                sw.Stop();

                var fullVersion = versionObj?.ToString() ?? "SQL Server";
                var firstLine = fullVersion.Split('\n')[0].Trim();

                return new JsonResult(new
                {
                    success = true,
                    latencyMs = sw.ElapsedMilliseconds,
                    serverVersion = firstLine,
                    databaseName = conn.Database,
                    dataSource = conn.DataSource,
                    message = $"Connection verified in {sw.ElapsedMilliseconds}ms! Connected to {conn.DataSource} [Database: {conn.Database}]."
                });
            }
            catch (SqlException ex)
            {
                sw.Stop();
                string hint = ex.Number switch
                {
                    18456 => "Login failed for user. Please check your SQL Username and Password in the connection string.",
                    4060 => "Database does not exist or cannot be opened on this SQL instance.",
                    53 => "Network path not found. Please verify the Server host IP/name and ensure port 1433 is open.",
                    _ when ex.Message.Contains("actively refused it") => "Port 1433 actively refused. Verify that SQL Server is running on that IP and firewall allows port 1433.",
                    _ => ex.Message
                };

                return new JsonResult(new
                {
                    success = false,
                    latencyMs = sw.ElapsedMilliseconds,
                    errorCode = ex.Number,
                    message = hint
                });
            }
            catch (Exception ex)
            {
                sw.Stop();
                return new JsonResult(new
                {
                    success = false,
                    latencyMs = sw.ElapsedMilliseconds,
                    message = ex.Message
                });
            }
        }

        /// <summary>
        /// Handles HTTP POST requests to update tenant configuration with audit trail logging.
        /// </summary>
        public async Task<IActionResult> OnPostAsync()
        {
            var tenant = await _dbContext.MasterTenantCatalogs.FindAsync(Id);
            if (tenant == null)
            {
                TempData["Error"] = "Tenant organization not found.";
                return RedirectToPage("/Tenants/Index");
            }

            Tenant = tenant;

            if (!ModelState.IsValid)
            {
                return Page();
            }

            var oldName = tenant.OrganizationName;
            var oldDomain = tenant.CustomDomain;
            var oldStatus = tenant.IsActive;

            tenant.OrganizationName = Input.OrganizationName.Trim();
            tenant.PrimaryDomain = Input.PrimaryDomain.Trim().ToLowerInvariant();
            tenant.CustomDomain = string.IsNullOrWhiteSpace(Input.CustomDomain) ? null : Input.CustomDomain.Trim().ToLowerInvariant();
            tenant.WebsiteUrl = string.IsNullOrWhiteSpace(Input.WebsiteUrl) ? null : Input.WebsiteUrl.Trim();
            tenant.AdminEmail = string.IsNullOrWhiteSpace(Input.AdminEmail) ? null : Input.AdminEmail.Trim().ToLowerInvariant();
            tenant.IsActive = Input.IsActive;
            tenant.ReferredByPartnerCode = string.IsNullOrWhiteSpace(Input.ReferredByPartnerCode) ? null : Input.ReferredByPartnerCode.Trim();

            // Update dedicated connection string (transparently encrypted with AES-256-GCM upon SaveChanges)
            if (!string.IsNullOrWhiteSpace(Input.ConnectionString))
            {
                tenant.ConnectionString = Input.ConnectionString.Trim();
                try
                {
                    var connBuilder = new SqlConnectionStringBuilder(tenant.ConnectionString);
                    if (!string.IsNullOrWhiteSpace(connBuilder.InitialCatalog))
                    {
                        tenant.DatabaseName = connBuilder.InitialCatalog;
                    }
                }
                catch
                {
                    // Preserve current database name if builder parse fails
                }
            }

            tenant.UpdatedUtc = DateTime.UtcNow;
            tenant.LastUpdatedBy = User.Identity?.Name ?? "SuperAdmin";

            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.Identity?.Name,
                UserName = User.Identity?.Name,
                Action = "Update",
                EntityType = "Tenant",
                EntityId = tenant.Id.ToString(),
                Summary = $"Updated tenant '{tenant.OrganizationName}' ({tenant.TenantKey}) configuration",
                OldValues = $"{{\"Name\":\"{oldName}\",\"CustomDomain\":\"{oldDomain}\",\"IsActive\":{oldStatus.ToString().ToLowerInvariant()}}}",
                NewValues = $"{{\"Name\":\"{tenant.OrganizationName}\",\"CustomDomain\":\"{tenant.CustomDomain}\",\"IsActive\":{tenant.IsActive.ToString().ToLowerInvariant()}}}",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString(),
                CreatedUtc = DateTime.UtcNow
            });

            await _dbContext.SaveChangesAsync();

            // Evict tenant cache across cluster so API picks up the new connection string immediately
            var cacheInvalidator = HttpContext.RequestServices.GetService<ITenantCacheInvalidator>();
            if (cacheInvalidator != null)
            {
                await cacheInvalidator.InvalidateTenantCatalogAsync(tenant.TenantKey);
            }

            TempData["Success"] = $"Tenant '{tenant.OrganizationName}' updated and connection string encrypted successfully.";
            return RedirectToPage("/Tenants/Details", new { id = tenant.Id });
        }

        /// <summary>
        /// Form input binding model for tenant edits.
        /// </summary>
        public class TenantEditInputModel
        {
            [Required(ErrorMessage = "Organization name is required.")]
            [StringLength(200, ErrorMessage = "Organization name cannot exceed 200 characters.")]
            [Display(Name = "Organization Display Name")]
            public string OrganizationName { get; set; } = string.Empty;

            [Required(ErrorMessage = "Primary domain is required.")]
            [StringLength(255)]
            [Display(Name = "Primary Platform Domain")]
            public string PrimaryDomain { get; set; } = string.Empty;

            [StringLength(255)]
            [Display(Name = "Custom Domain (CNAME)")]
            public string? CustomDomain { get; set; }

            [StringLength(255)]
            [Display(Name = "Website URL")]
            public string? WebsiteUrl { get; set; }

            [EmailAddress]
            [StringLength(256)]
            [Display(Name = "Primary Admin Email")]
            public string? AdminEmail { get; set; }

            [Display(Name = "Accepting Requests (Active)")]
            public bool IsActive { get; set; }

            [StringLength(100)]
            [Display(Name = "Affiliate Referral Code")]
            public string? ReferredByPartnerCode { get; set; }

            /// <summary>
            /// Dedicated database connection string (decrypted in memory, transparently encrypted at rest).
            /// </summary>
            [Display(Name = "Dedicated Database Connection String")]
            public string? ConnectionString { get; set; }
        }

        /// <summary>
        /// Request model for testing candidate connection strings via AJAX.
        /// </summary>
        public class TestConnectionRequest
        {
            /// <summary>
            /// The candidate connection string to test.
            /// </summary>
            public string? ConnectionString { get; set; }
        }
    }
}
