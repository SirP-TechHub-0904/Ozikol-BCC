using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Application.Dtos.BCP.UserManagement;
using Ozikol_BCC.Application.Repository.BCP.UserManagement;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Website.Areas.BcpUserManagement.Pages.Console;

[Authorize]
public class FeatureAccessModel : PageModel
{
    private readonly DashboardDbContext _context;
    private readonly UserManager<Profile> _userManager;
    private readonly IBcpUserManagementRepository _repository;
    public FeatureAccessModel(DashboardDbContext context, UserManager<Profile> userManager, IBcpUserManagementRepository repository) { _context = context; _userManager = userManager; _repository = repository; }
    public List<BcpUserFeatureRole> Assignments { get; private set; } = [];
    public List<SelectListItem> UserOptions { get; private set; } = [];
    public async Task OnGetAsync() => await LoadAsync();
    public async Task OnPostAssignAccessAsync(string profileId, string featureAreaKey, int actionRole)
    {
        var currentUser = await _userManager.GetUserAsync(User);
        if (!string.IsNullOrWhiteSpace(profileId) && !string.IsNullOrWhiteSpace(featureAreaKey)) await _repository.AssignFeatureRoleAsync(new BcpUserFeatureRoleDto { ProfileId = profileId, FeatureAreaKey = featureAreaKey, ActionRole = actionRole, IsActive = true, AssignedBy = currentUser?.Id });
        await LoadAsync();
    }
    public async Task OnPostRevokeAsync(Guid id) { await _repository.RevokeFeatureRoleAsync(id); await LoadAsync(); }
    private async Task LoadAsync()
    {
        Assignments = await _context.BcpUserFeatureRoles.Include(x => x.Profile).OrderBy(x => x.FeatureAreaKey).ThenBy(x => x.Profile!.FirstName).ToListAsync();
        UserOptions = await _userManager.Users.OrderBy(x => x.FirstName).Select(x => new SelectListItem((x.FullName == "" ? x.Email : x.FullName), x.Id)).ToListAsync();
    }
}
