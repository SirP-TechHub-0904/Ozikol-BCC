using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Application.Seeders;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Website.Pages;

[AllowAnonymous]
public class SetupModel : PageModel
{
    private const string UserManagementFeatureKey = "BcpUserManagement";
    private readonly DashboardDbContext _context;
    private readonly UserManager<Profile> _userManager;
    private readonly RoleManager<AppRole> _roleManager;
    private readonly SignInManager<Profile> _signInManager;
    private readonly DefaultTenantSeeder _defaultTenantSeeder;
    private readonly ILogger<SetupModel> _logger;

    public SetupModel(
        DashboardDbContext context,
        UserManager<Profile> userManager,
        RoleManager<AppRole> roleManager,
        SignInManager<Profile> signInManager,
        DefaultTenantSeeder defaultTenantSeeder,
        ILogger<SetupModel> logger)
    {
        _context = context;
        _userManager = userManager;
        _roleManager = roleManager;
        _signInManager = signInManager;
        _defaultTenantSeeder = defaultTenantSeeder;
        _logger = logger;
    }

    [BindProperty]
    public SetupInput Input { get; set; } = new();

    public bool DatabaseReady { get; private set; } = true;
    public string? StatusMessage { get; private set; }

    public List<SelectListItem> CurrencyOptions { get; } =
    [
        new SelectListItem("NGN - Nigerian Naira", "NGN"),
        new SelectListItem("USD - US Dollar", "USD"),
        new SelectListItem("GBP - British Pound", "GBP"),
        new SelectListItem("EUR - Euro", "EUR")
    ];

    public async Task<IActionResult> OnGetAsync()
    {
        Input.CurrencyCode = "NGN";
        Input.DashboardTitle = "Business Command Platform";

        if (await HasSetupBeenMadeAsync())
        {
            return RedirectAfterSetup();
        }

        return Page();
    }

    public async Task<IActionResult> OnPostAsync()
    {
        if (await HasSetupBeenMadeAsync())
        {
            return RedirectAfterSetup();
        }

        if (!ModelState.IsValid)
        {
            return Page();
        }

        await _context.Database.MigrateAsync();

        await using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            await EnsureSettingsAsync();
            await EnsureRolesAsync();

            var admin = new Profile
            {
                UserName = Input.AdminEmail.Trim(),
                Email = Input.AdminEmail.Trim(),
                EmailConfirmed = true,
                PhoneNumber = Input.AdminPhone?.Trim(),
                PhoneNumberConfirmed = !string.IsNullOrWhiteSpace(Input.AdminPhone),
                FirstName = Input.AdminFirstName.Trim(),
                LastName = Input.AdminLastName.Trim(),
                UserStatus = UserStatus.Active
            };

            var createResult = await _userManager.CreateAsync(admin, Input.Password);
            if (!createResult.Succeeded)
            {
                AddIdentityErrors(createResult);
                await transaction.RollbackAsync();
                return Page();
            }

            await EnsureUserRoleAsync(admin, "SuperAdmin");
            await EnsureUserRoleAsync(admin, "PlatformOwner");
            await EnsureUserRoleAsync(admin, "Administrator");
            await EnsureDefaultFeatureAsync();
            await EnsureFirstAdminFeatureAccessAsync(admin);
            await _defaultTenantSeeder.SeedDefaultTemplateAsync();

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            await _signInManager.SignInAsync(admin, isPersistent: false);
            return RedirectToPage("/Console/Dashboard", new { area = "BcpConsole" });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "BCP first-run setup failed.");
            ModelState.AddModelError(string.Empty, "Setup failed. Confirm the database is migrated, then try again.");
            return Page();
        }
    }

    private async Task<bool> HasSetupBeenMadeAsync()
    {
        try
        {
            DatabaseReady = await _context.Database.CanConnectAsync();
            if (!DatabaseReady)
            {
                StatusMessage = "Run the tenant database migrator first, then reload this setup page.";
                return false;
            }

            await _context.Database.MigrateAsync();

            var hasConfiguration = await _context.ConfigSettings.AnyAsync()
                || await _context.ManagementSettings.AnyAsync()
                || await _context.BcpSettings.AnyAsync();

            var hasUsers = await _userManager.Users.AnyAsync();

            return hasConfiguration || hasUsers;
        }
        catch (Exception ex)
        {
            DatabaseReady = false;
            StatusMessage = "Run the tenant database migrator first, then reload this setup page.";
            _logger.LogWarning(ex, "BCP setup checked the database before it was ready.");
            return false;
        }
    }

    private IActionResult RedirectAfterSetup()
    {
        if (User.Identity?.IsAuthenticated == true)
        {
            return RedirectToPage("/Console/Dashboard", new { area = "BcpConsole" });
        }

        return RedirectToPage("/Authenticate/Login", new { area = "BcpIdentity" });
    }

    private async Task EnsureSettingsAsync()
    {
        var currency = ResolveCurrency(Input.CurrencyCode);

        if (!await _context.ConfigSettings.AnyAsync())
        {
            _context.ConfigSettings.Add(new ConfigSetting
            {
                Id = Guid.NewGuid(),
                WebsiteTitle = Input.OrganizationName.Trim(),
                CompanyName = Input.OrganizationName.Trim(),
                CompanyNameAbbreviation = BuildAbbreviation(Input.OrganizationName),
                DashboardTitle = Input.DashboardTitle.Trim(),
                OrganizationDisplayName = Input.OrganizationName.Trim(),
                ActivateLogin = true,
                ActivateLoginInMenu = true,
                CurrencyCode = currency.Code,
                CurrencySymbol = currency.Symbol,
                LoginTitle = "Welcome back",
                LoginNoteTitle = "Secure access",
                LoginNote = "Sign in with your authorized account.",
                LoginNoteFooter = "Access is controlled by roles and enabled features."
            });
        }

        if (!await _context.ManagementSettings.AnyAsync())
        {
            var folderName = string.IsNullOrWhiteSpace(Input.CloudinaryFolder) 
                ? BuildSlug(Input.OrganizationName) 
                : Input.CloudinaryFolder.Trim();

            _context.ManagementSettings.Add(new ManagementSetting
            {
                Id = Guid.NewGuid(),
                MaximumUsers = 10,
                ActivateSMS = false,
                FileFolderName = folderName
            });
        }

        if (!await _context.BcpSettings.AnyAsync())
        {
            _context.BcpSettings.Add(new BcpSetting
            {
                Id = Guid.NewGuid(),
                EnableListDownload = true,
                PaymentModuleActive = false,
                PixelPayCurrency = currency.Code,
                EmailMaxRetries = 5,
                ActiveAiProvider = BcpAiProvider.None,
                ActiveCaptcha = CaptchaType.None
            });
        }

        await _context.SaveChangesAsync();
    }

    private async Task EnsureRolesAsync()
    {
        var roles = new (string Name, RoleCategory Category)[]
        {
            ("SuperAdmin", RoleCategory.BCP),
            ("PlatformOwner", RoleCategory.BCP),
            ("Administrator", RoleCategory.Both),
            ("Staff", RoleCategory.BCP),
            ("Member", RoleCategory.BCP)
        };

        foreach (var role in roles)
        {
            if (await _roleManager.RoleExistsAsync(role.Name))
            {
                continue;
            }

            await _roleManager.CreateAsync(new AppRole(role.Name)
            {
                RoleCategory = role.Category
            });
        }
    }

    private async Task EnsureUserRoleAsync(Profile admin, string roleName)
    {
        if (!await _userManager.IsInRoleAsync(admin, roleName))
        {
            await _userManager.AddToRoleAsync(admin, roleName);
        }
    }

    private const string GroupsFeatureKey = "BcpGroups";

    private async Task EnsureDefaultFeatureAsync()
    {
        var featuresToEnsure = new (string Key, string Name, string Desc)[]
        {
            (UserManagementFeatureKey, "User Management", "People, roles, permissions, user categories, KPI scoring, and security controls."),
            (GroupsFeatureKey, "Groups & Committees", "Groups, committees, member management, real-time chat, polls, file sharing, and compliance audit trail.")
        };

        foreach (var f in featuresToEnsure)
        {
            var featureExists = await _context.BcpFeatures.AnyAsync(x => x.ModuleFolder == f.Key);
            if (!featureExists)
            {
                _context.BcpFeatures.Add(new BcpFeature
                {
                    FeatureName = f.Name,
                    ModuleFolder = f.Key,
                    Description = f.Desc,
                    Status = FeatureBillingStatus.Active,
                    BillingDuration = FeatureBillingDuration.Free,
                    CostPerDuration = 0,
                    GracePeriodDays = 0,
                    NextBillingDate = null
                });
            }
        }
    }

    private async Task EnsureFirstAdminFeatureAccessAsync(Profile admin)
    {
        var keys = new[] { UserManagementFeatureKey, GroupsFeatureKey };
        foreach (var key in keys)
        {
            var hasRole = await _context.BcpUserFeatureRoles
                .AnyAsync(x => x.ProfileId == admin.Id && x.FeatureAreaKey == key);

            if (!hasRole)
            {
                _context.BcpUserFeatureRoles.Add(new BcpUserFeatureRole
                {
                    ProfileId = admin.Id,
                    FeatureAreaKey = key,
                    ActionRole = BcpActionRole.GlobalEditor,
                    IsActive = true,
                    AssignedBy = admin.Id,
                    Date = DateTime.UtcNow
                });
            }
        }
    }

    private void AddIdentityErrors(IdentityResult result)
    {
        foreach (var error in result.Errors)
        {
            ModelState.AddModelError(string.Empty, error.Description);
        }
    }

    private static (string Code, string Symbol) ResolveCurrency(string? code)
    {
        return code?.Trim().ToUpperInvariant() switch
        {
            "USD" => ("USD", "$"),
            "GBP" => ("GBP", "GBP"),
            "EUR" => ("EUR", "EUR"),
            _ => ("NGN", "\u20A6")
        };
    }

    private static string BuildAbbreviation(string organizationName)
    {
        var words = organizationName
            .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        if (words.Length == 0)
        {
            return "BCP";
        }

        var abbreviation = string.Concat(words.Take(3).Select(word => char.ToUpperInvariant(word[0])));
        return abbreviation.Length > 1 ? abbreviation : words[0][..Math.Min(3, words[0].Length)].ToUpperInvariant();
    }

    private static string BuildSlug(string name)
    {
        if (string.IsNullOrWhiteSpace(name)) return "tenant-uploads";
        return System.Text.RegularExpressions.Regex.Replace(name.ToLowerInvariant(), @"[^a-z0-9]+", "-").Trim('-');
    }

    public class SetupInput
    {
        [Required]
        [Display(Name = "Organization name")]
        public string OrganizationName { get; set; } = string.Empty;

        [Required]
        [Display(Name = "Dashboard title")]
        public string DashboardTitle { get; set; } = "Business Command Platform";

        [Display(Name = "Cloudinary Storage Folder")]
        public string? CloudinaryFolder { get; set; }

        [Required]
        [Display(Name = "Currency")]
        public string CurrencyCode { get; set; } = "NGN";

        [Required]
        [Display(Name = "First name")]
        public string AdminFirstName { get; set; } = string.Empty;

        [Required]
        [Display(Name = "Last name")]
        public string AdminLastName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [Display(Name = "Email")]
        public string AdminEmail { get; set; } = string.Empty;

        [Phone]
        [Display(Name = "Phone")]
        public string? AdminPhone { get; set; }

        [Required]
        [DataType(DataType.Password)]
        [MinLength(6)]
        public string Password { get; set; } = string.Empty;

        [Required]
        [DataType(DataType.Password)]
        [Compare(nameof(Password))]
        [Display(Name = "Confirm password")]
        public string ConfirmPassword { get; set; } = string.Empty;
    }
}
