using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;

namespace Ozikol_BCC.Website.Areas.BcpUserManagement.Pages.Workspace;

[Authorize]
public class CategoryModel : PageModel
{
    private readonly UserManager<Profile> _userManager;
    public CategoryModel(UserManager<Profile> userManager) => _userManager = userManager;
    public Profile? UserProfile { get; private set; }
    public async Task OnGetAsync()
    {
        var current = await _userManager.GetUserAsync(User);
        if (current is not null) UserProfile = await _userManager.Users.Include(x => x.BcpUserCategory).FirstOrDefaultAsync(x => x.Id == current.Id);
    }
}
