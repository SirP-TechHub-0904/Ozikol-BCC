using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Ozikol_BCC.Application.Dtos.BCP.UserManagement;
using Ozikol_BCC.Application.Repository.BCP.UserManagement;
using Ozikol_BCC.Domain.Models;

namespace Ozikol_BCC.Website.Areas.BcpUserManagement.Pages.Console;

[Authorize]
public class CategoriesModel : PageModel
{
    private readonly IBcpUserManagementRepository _repository;
    public CategoriesModel(IBcpUserManagementRepository repository) => _repository = repository;
    public List<BcpUserCategory> Categories { get; private set; } = [];
    public async Task OnGetAsync() => Categories = await _repository.GetAllUserCategoriesAsync();
    public async Task OnPostAddCategoryAsync(string name, string? description, int sortOrder)
    {
        if (!string.IsNullOrWhiteSpace(name)) await _repository.CreateUserCategoryAsync(new BcpUserCategoryDto { Name = name, Description = description, SortOrder = sortOrder, IsActive = true });
        Categories = await _repository.GetAllUserCategoriesAsync();
    }
}
