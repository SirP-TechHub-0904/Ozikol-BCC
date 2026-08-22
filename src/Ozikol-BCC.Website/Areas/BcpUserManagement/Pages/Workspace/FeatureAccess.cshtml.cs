using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Ozikol_BCC.Application.Repository.BCP.UserManagement;
using Ozikol_BCC.Domain.Models;

namespace Ozikol_BCC.Website.Areas.BcpUserManagement.Pages.Workspace;

[Authorize]
public class FeatureAccessModel : PageModel
{
    private readonly UserManager<Profile> _userManager;
    private readonly IBcpUserManagementRepository _repository;
    public FeatureAccessModel(UserManager<Profile> userManager, IBcpUserManagementRepository repository) { _userManager = userManager; _repository = repository; }
    public List<BcpUserFeatureRole> FeatureRoles { get; private set; } = [];
    public async Task OnGetAsync()
    {
        var current = await _userManager.GetUserAsync(User);
        if (current is not null) FeatureRoles = await _repository.GetUserFeatureRolesAsync(current.Id);
    }
}
