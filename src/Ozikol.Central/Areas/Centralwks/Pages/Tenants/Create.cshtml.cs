using System;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol.Central.Services;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Tenants
{
    /// <summary>
    /// PageModel for administrative provisioning of a new tenant workspace database.
    /// Employs ITenantOnboardingService to initialize database schema, default credentials, and catalog entries.
    /// </summary>
    public class CreateModel : PageModel
    {
        private readonly ITenantOnboardingService _onboardingService;
        private readonly MasterCatalogDbContext _dbContext;

        /// <summary>
        /// Initializes a new instance of the <see cref="CreateModel"/> class.
        /// </summary>
        /// <param name="onboardingService">Tenant onboarding orchestration service.</param>
        /// <param name="dbContext">Master catalog database context.</param>
        public CreateModel(ITenantOnboardingService onboardingService, MasterCatalogDbContext dbContext)
        {
            _onboardingService = onboardingService;
            _dbContext = dbContext;
        }

        /// <summary>
        /// Input model capturing organization parameters and administrator credentials.
        /// </summary>
        [BindProperty]
        public TenantInputModel Input { get; set; } = new();

        /// <summary>
        /// Modular capabilities available for optional provisioning.
        /// </summary>
        public List<MasterFeatureCatalog> AvailableFeatures { get; set; } = new();

        /// <summary>
        /// Displays the tenant provisioning form.
        /// </summary>
        public async Task OnGetAsync()
        {
            AvailableFeatures = await _dbContext.MasterFeatureCatalogs
                .AsNoTracking()
                .Where(f => f.IsActive)
                .OrderBy(f => f.Category)
                .ThenBy(f => f.Name)
                .ToListAsync();
        }

        /// <summary>
        /// Handles HTTP POST requests to provision and initialize a tenant database instance.
        /// </summary>
        /// <returns>Redirect to tenant details on success or redisplayed form with validation errors.</returns>
        public async Task<IActionResult> OnPostAsync()
        {
            if (!ModelState.IsValid)
            {
                AvailableFeatures = await _dbContext.MasterFeatureCatalogs
                    .AsNoTracking()
                    .Where(f => f.IsActive)
                    .OrderBy(f => f.Category)
                    .ThenBy(f => f.Name)
                    .ToListAsync();
                return Page();
            }

            var cleanKey = Input.TenantKey.Trim().ToLowerInvariant();
            if (ReservedWorkspaceNames.IsReserved(cleanKey))
            {
                ModelState.AddModelError("Input.TenantKey", $"The tenant key '{cleanKey}' is reserved by the system and cannot be assigned to an organization.");
                AvailableFeatures = await _dbContext.MasterFeatureCatalogs
                    .AsNoTracking()
                    .Where(f => f.IsActive)
                    .OrderBy(f => f.Category)
                    .ThenBy(f => f.Name)
                    .ToListAsync();
                return Page();
            }

            var isAvailable = await _onboardingService.IsTenantKeyAvailableAsync(cleanKey);
            if (!isAvailable)
            {
                ModelState.AddModelError("Input.TenantKey", $"The tenant key '{cleanKey}' is already taken. Please choose another unique key.");
                AvailableFeatures = await _dbContext.MasterFeatureCatalogs
                    .AsNoTracking()
                    .Where(f => f.IsActive)
                    .OrderBy(f => f.Category)
                    .ThenBy(f => f.Name)
                    .ToListAsync();
                return Page();
            }

            var request = new TenantOnboardingRequest
            {
                OrganizationName = Input.OrganizationName.Trim(),
                TenantKey = cleanKey,
                AdminFirstName = Input.AdminFirstName.Trim(),
                AdminLastName = Input.AdminLastName.Trim(),
                AdminEmail = Input.AdminEmail.Trim().ToLowerInvariant(),
                AdminPassword = Input.AdminPassword,
                PhoneNumber = Input.PhoneNumber?.Trim(),
                CustomDomain = Input.CustomDomain?.Trim().ToLowerInvariant(),
                ReferredBy = Input.ReferredBy?.Trim(),
                SelectedFeatureIds = Input.SelectedFeatureIds ?? new List<Guid>(),
                CouponCode = string.IsNullOrWhiteSpace(Input.CouponCode) ? null : Input.CouponCode.Trim()
            };

            var result = await _onboardingService.OnboardNewTenantAsync(request);

            if (!result.Success)
            {
                ModelState.AddModelError(string.Empty, $"Provisioning failed: {result.Message}. {result.ErrorDetail}");
                AvailableFeatures = await _dbContext.MasterFeatureCatalogs
                    .AsNoTracking()
                    .Where(f => f.IsActive)
                    .OrderBy(f => f.Category)
                    .ThenBy(f => f.Name)
                    .ToListAsync();
                return Page();
            }

            // Find the newly provisioned tenant entry
            var tenant = await _dbContext.MasterTenantCatalogs.FirstOrDefaultAsync(t => t.TenantKey == cleanKey);

            // Audit log
            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.Identity?.Name,
                UserName = User.Identity?.Name,
                Action = "Create",
                EntityType = "Tenant",
                EntityId = tenant?.Id.ToString() ?? cleanKey,
                Summary = $"Provisioned new tenant '{Input.OrganizationName}' with key '{cleanKey}' on database '{result.DatabaseName}'",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString(),
                CreatedUtc = DateTime.UtcNow
            });

            await _dbContext.SaveChangesAsync();

            TempData["Success"] = $"Tenant '{Input.OrganizationName}' provisioned successfully on database '{result.DatabaseName}'.";

            if (tenant != null)
            {
                return RedirectToPage("/Tenants/Details", new { id = tenant.Id });
            }

            return RedirectToPage("/Tenants/Index");
        }

        /// <summary>
        /// Form input binding model.
        /// </summary>
        public class TenantInputModel
        {
            [Required(ErrorMessage = "Organization name is required.")]
            [StringLength(200, ErrorMessage = "Organization name cannot exceed 200 characters.")]
            [Display(Name = "Organization Display Name")]
            public string OrganizationName { get; set; } = string.Empty;

            [Required(ErrorMessage = "Tenant key is required.")]
            [RegularExpression("^[a-z0-9-]+$", ErrorMessage = "Tenant key may only contain lowercase alphanumeric characters and hyphens.")]
            [StringLength(50, MinimumLength = 3, ErrorMessage = "Tenant key must be between 3 and 50 characters.")]
            [Display(Name = "Tenant Subdomain Key")]
            public string TenantKey { get; set; } = string.Empty;

            [Required(ErrorMessage = "Administrator first name is required.")]
            [Display(Name = "Admin First Name")]
            public string AdminFirstName { get; set; } = string.Empty;

            [Required(ErrorMessage = "Administrator last name is required.")]
            [Display(Name = "Admin Last Name")]
            public string AdminLastName { get; set; } = string.Empty;

            [Required(ErrorMessage = "Administrator email is required.")]
            [EmailAddress(ErrorMessage = "Please provide a valid email address.")]
            [Display(Name = "Primary Admin Email")]
            public string AdminEmail { get; set; } = string.Empty;

            [Required(ErrorMessage = "Initial admin password is required.")]
            [StringLength(100, MinimumLength = 6, ErrorMessage = "Password must be at least 6 characters.")]
            [DataType(DataType.Password)]
            [Display(Name = "Initial Admin Password")]
            public string AdminPassword { get; set; } = string.Empty;

            [Phone(ErrorMessage = "Please enter a valid phone number.")]
            [Display(Name = "Contact Phone (Optional)")]
            public string? PhoneNumber { get; set; }

            [Display(Name = "Custom Domain (Optional)")]
            public string? CustomDomain { get; set; }

            [Display(Name = "Affiliate Referral Code (Optional)")]
            public string? ReferredBy { get; set; }

            [Display(Name = "Selected Modular Add-On Features")]
            public List<Guid> SelectedFeatureIds { get; set; } = new();

            [Display(Name = "Promotional Coupon Code (Optional)")]
            public string? CouponCode { get; set; }
        }
    }
}
