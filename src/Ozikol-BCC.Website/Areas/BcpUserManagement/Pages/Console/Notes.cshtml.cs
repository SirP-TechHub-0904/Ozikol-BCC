using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Application.Dtos.BCP.UserManagement;
using Ozikol_BCC.Application.Repository.BCP.UserManagement;
using Ozikol_BCC.Domain.Models;

namespace Ozikol_BCC.Website.Areas.BcpUserManagement.Pages.Console;

[Authorize]
public class NotesModel : PageModel
{
    private readonly UserManager<Profile> _userManager;
    private readonly IBcpUserManagementRepository _repository;
    public NotesModel(UserManager<Profile> userManager, IBcpUserManagementRepository repository) { _userManager = userManager; _repository = repository; }
    [BindProperty(SupportsGet = true)] public string? ProfileId { get; set; }
    public List<SelectListItem> UserOptions { get; private set; } = [];
    public List<BcpUserNote> Notes { get; private set; } = [];
    public async Task OnGetAsync() => await LoadAsync();
    public async Task<IActionResult> OnPostAddNoteAsync(string profileId, string note, bool isPrivate)
    {
        var currentUser = await _userManager.GetUserAsync(User);
        if (!string.IsNullOrWhiteSpace(profileId) && !string.IsNullOrWhiteSpace(note)) await _repository.AddUserNoteAsync(new BcpUserNoteDto { ProfileId = profileId, Note = note, IsPrivate = isPrivate, CreatedBy = currentUser?.Id });
        return RedirectToPage(new { profileId });
    }
    private async Task LoadAsync()
    {
        var superAdmins = await _userManager.GetUsersInRoleAsync("SuperAdmin");
        var superAdminIds = superAdmins.Select(a => a.Id).ToList();

        UserOptions = await _userManager.Users
            .Where(x => !superAdminIds.Contains(x.Id))
            .OrderBy(x => x.FirstName)
            .Select(x => new SelectListItem((x.FullName == "" ? x.Email : x.FullName), x.Id, x.Id == ProfileId))
            .ToListAsync();
        if (!string.IsNullOrWhiteSpace(ProfileId)) Notes = await _repository.GetUserNotesAsync(ProfileId, includePrivate: true);
    }
}
