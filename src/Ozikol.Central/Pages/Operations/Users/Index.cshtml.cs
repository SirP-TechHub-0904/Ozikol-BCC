using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;

namespace Ozikol.Central.Pages.Operations.Users;

public class IndexModel : PageModel
{
    private readonly UserManager<CentralUser> _userManager;
    private readonly RoleManager<CentralRole> _roleManager;
    private readonly MasterCatalogDbContext _dbContext;
    private readonly ILogger<IndexModel> _logger;

    public List<StaffUserViewModel> StaffMembers { get; set; } = new();
    public string? AlertMessage { get; set; }
    public bool AlertIsError { get; set; }

    public class StaffUserViewModel
    {
        public string Id { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Department { get; set; }
        public string RoleName { get; set; } = "Admin";
        public bool IsActive { get; set; }
        public DateTime CreatedUtc { get; set; }
        public DateTime? LastLoginUtc { get; set; }
    }

    public IndexModel(
        UserManager<CentralUser> userManager,
        RoleManager<CentralRole> roleManager,
        MasterCatalogDbContext dbContext,
        ILogger<IndexModel> logger)
    {
        _userManager = userManager;
        _roleManager = roleManager;
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task OnGetAsync()
    {
        await LoadStaffListAsync();
    }

    public async Task<IActionResult> OnPostToggleStatusAsync(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user != null)
        {
            user.IsActive = !user.IsActive;
            await _userManager.UpdateAsync(user);
            AlertMessage = $"Operator {user.Email} status updated to {(user.IsActive ? "Active" : "Suspended")}.";
        }

        await LoadStaffListAsync();
        return Page();
    }

    private async Task LoadStaffListAsync()
    {
        StaffMembers = new List<StaffUserViewModel>();

        var users = await _userManager.Users
            .AsNoTracking()
            .OrderByDescending(u => u.CreatedUtc)
            .ToListAsync();

        foreach (var u in users)
        {
            var roles = await _userManager.GetRolesAsync(u);
            var roleName = roles.FirstOrDefault() ?? "Admin";

            StaffMembers.Add(new StaffUserViewModel
            {
                Id = u.Id,
                FullName = u.FullName,
                Email = u.Email ?? string.Empty,
                Department = u.Department ?? "Operations",
                RoleName = roleName,
                IsActive = u.IsActive,
                CreatedUtc = u.CreatedUtc,
                LastLoginUtc = u.LastLoginUtc
            });
        }
    }
}
