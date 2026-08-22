using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Application.Dtos.BCP.UserManagement;
using Ozikol_BCC.Application.Repository.BCP.UserManagement;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;

namespace Ozikol_BCC.Website.Areas.BcpUserManagement.Pages.Console;

[Authorize]
public class DetailsModel : PageModel
{
    private readonly UserManager<Profile> _userManager;
    private readonly DashboardDbContext _context;
    private readonly IBcpUserManagementRepository _repository;

    public DetailsModel(UserManager<Profile> userManager, DashboardDbContext context, IBcpUserManagementRepository repository)
    {
        _userManager = userManager;
        _context = context;
        _repository = repository;
    }

    public Profile? UserProfile { get; private set; }
    public IList<string> IdentityRoles { get; private set; } = [];
    public List<BcpUserFeatureRole> FeatureRoles { get; private set; } = [];
    public List<BcpKpiUserScore> PerformanceScores { get; private set; } = [];
    public List<BcpUserNote> Notes { get; private set; } = [];

    public async Task<IActionResult> OnGetAsync(string id)
    {
        UserProfile = await _userManager.Users.Include(x => x.BcpUserCategory).FirstOrDefaultAsync(x => x.Id == id);
        if (UserProfile is null) return NotFound();
        IdentityRoles = await _userManager.GetRolesAsync(UserProfile);
        FeatureRoles = await _repository.GetUserFeatureRolesAsync(id);
        PerformanceScores = await _context.BcpKpiUserScores.Include(x => x.BcpKpiIndicator).Where(x => x.ProfileId == id).OrderByDescending(x => x.Date).Take(20).ToListAsync();
        Notes = await _repository.GetUserNotesAsync(id, includePrivate: true);
        return Page();
    }

    public async Task<IActionResult> OnPostAddNoteAsync(string profileId, string note, bool isPrivate)
    {
        if (!string.IsNullOrWhiteSpace(profileId) && !string.IsNullOrWhiteSpace(note))
        {
            var currentUser = await _userManager.GetUserAsync(User);
            await _repository.AddUserNoteAsync(new BcpUserNoteDto { ProfileId = profileId, Note = note, IsPrivate = isPrivate, CreatedBy = currentUser?.Id });
        }
        return RedirectToPage(new { id = profileId });
    }
}
