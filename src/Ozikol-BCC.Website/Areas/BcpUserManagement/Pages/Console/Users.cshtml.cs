using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Website.Areas.BcpUserManagement.Pages.Console;

[Authorize]
public class UsersModel : PageModel
{
    private readonly UserManager<Profile> _userManager;

    public UsersModel(UserManager<Profile> userManager)
    {
        _userManager = userManager;
    }

    [BindProperty(SupportsGet = true)] public string? Search { get; set; }
    [BindProperty(SupportsGet = true)] public UserStatus? Status { get; set; }
    public List<Profile> Users { get; private set; } = [];
    public List<SelectListItem> StatusOptions { get; private set; } = [];

    public async Task OnGetAsync()
    {
        StatusOptions = BuildStatusOptions(Status);
        var query = _userManager.Users.Include(x => x.BcpUserCategory).AsQueryable();
        if (!string.IsNullOrWhiteSpace(Search))
        {
            query = query.Where(x => (x.Email ?? "").Contains(Search) || (x.FirstName ?? "").Contains(Search) || (x.LastName ?? "").Contains(Search));
        }
        if (Status.HasValue) query = query.Where(x => x.UserStatus == Status.Value);

        // Hide SuperAdmin users
        var superAdmins = await _userManager.GetUsersInRoleAsync("SuperAdmin");
        var superAdminIds = superAdmins.Select(a => a.Id).ToList();
        query = query.Where(x => !superAdminIds.Contains(x.Id));

        Users = await query.OrderBy(x => x.FirstName).ThenBy(x => x.LastName).Take(200).ToListAsync();
    }

    private static List<SelectListItem> BuildStatusOptions(UserStatus? selected)
    {
        var options = new List<SelectListItem> { new("All statuses", string.Empty, selected is null) };
        options.AddRange(System.Enum.GetValues<UserStatus>().Select(x => new SelectListItem(x.ToString(), x.ToString(), selected == x)));
        return options;
    }
}
