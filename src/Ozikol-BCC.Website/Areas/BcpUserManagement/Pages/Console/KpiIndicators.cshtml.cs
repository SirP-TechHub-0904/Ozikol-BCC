using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Ozikol_BCC.Application.Dtos.BCP.UserManagement;
using Ozikol_BCC.Application.Repository.BCP.UserManagement;
using Ozikol_BCC.Domain.Models;

namespace Ozikol_BCC.Website.Areas.BcpUserManagement.Pages.Console;

[Authorize]
public class KpiIndicatorsModel : PageModel
{
    private readonly IBcpUserManagementRepository _repository;
    public KpiIndicatorsModel(IBcpUserManagementRepository repository) => _repository = repository;
    public List<BcpKpiIndicator> Indicators { get; private set; } = [];
    public async Task OnGetAsync() => Indicators = await _repository.GetAllKpiIndicatorsAsync();
    public async Task OnPostAddIndicatorAsync(string title, string? description, decimal maxScore, int sortOrder)
    {
        if (!string.IsNullOrWhiteSpace(title)) await _repository.CreateKpiIndicatorAsync(new BcpKpiIndicatorDto { Title = title, Description = description, MaxScore = maxScore, SortOrder = sortOrder, IsActive = true });
        Indicators = await _repository.GetAllKpiIndicatorsAsync();
    }
}
