using System;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

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
                ReferredByPartnerCode = tenant.ReferredByPartnerCode
            };

            return Page();
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

            TempData["Success"] = $"Tenant '{tenant.OrganizationName}' updated successfully.";
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
        }
    }
}
