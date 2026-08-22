using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Application.Dtos.BCP.UserManagement;
using Ozikol_BCC.Application.Repository.BCP.UserManagement;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Ozikol_BCC.Website.Areas.BcpUserManagement.Pages.Console
{
    [Authorize]
    public class PerformanceModel : PageModel
    {
        private readonly UserManager<Profile> _userManager;
        private readonly IBcpUserManagementRepository _repository;
        private readonly DashboardDbContext _context;

        public PerformanceModel(
            UserManager<Profile> userManager,
            IBcpUserManagementRepository repository,
            DashboardDbContext context)
        {
            _userManager = userManager;
            _repository = repository;
            _context = context;
        }

        [BindProperty(SupportsGet = true)]
        public string? ProfileId { get; set; }

        [BindProperty(SupportsGet = true)]
        public string? Period { get; set; }

        [BindProperty]
        public List<BcpKpiScoreDto> Scores { get; set; } = [];

        public List<SelectListItem> UserOptions { get; private set; } = [];
        public List<SelectListItem> PeriodOptions { get; private set; } = [];
        public List<BcpKpiScoreDto> ScoreSheet { get; private set; } = [];
        public List<BcpKpiLeaderboardDto> Leaderboard { get; private set; } = [];

        public async Task OnGetAsync() => await LoadAsync();

        public async Task<IActionResult> OnPostAsync(string profileId, string period)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            await _repository.SaveKpiScoresAsync(Scores, currentUser?.Id ?? string.Empty);
            return RedirectToPage(new { profileId, period });
        }

        private async Task LoadAsync()
        {
            // Filter out SuperAdmins from evaluation dropdown list
            var superAdmins = await _userManager.GetUsersInRoleAsync("SuperAdmin");
            var superAdminIds = superAdmins.Select(a => a.Id).ToList();

            UserOptions = await _userManager.Users
                .Where(x => !superAdminIds.Contains(x.Id))
                .OrderBy(x => x.FirstName)
                .Select(x => new SelectListItem((x.FullName == "" ? x.Email : x.FullName), x.Id, x.Id == ProfileId))
                .ToListAsync();

            // Load evaluation periods from DB
            var activePeriods = await _context.BcpKpiPeriods
                .Where(p => p.IsActive)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            if (activePeriods.Count > 0)
            {
                if (string.IsNullOrWhiteSpace(Period))
                {
                    Period = activePeriods.First().Title;
                }
                PeriodOptions = activePeriods.Select(p => new SelectListItem(p.Title, p.Title, p.Title == Period)).ToList();
            }
            else
            {
                // Fallback period if none are configured yet
                if (string.IsNullOrWhiteSpace(Period))
                {
                    Period = DateTime.UtcNow.ToString("MMMM yyyy");
                }
                PeriodOptions = [new SelectListItem(Period, Period, true)];
            }

            if (!string.IsNullOrWhiteSpace(ProfileId))
            {
                ScoreSheet = await _repository.GetUserScoreSheetAsync(ProfileId, Period);
            }

            Leaderboard = await _repository.GetKpiLeaderboardAsync(Period);
        }
    }
}
