using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Ozikol_BCC.Website.Areas.BcpUserManagement.Pages.Console
{
    [Authorize]
    public class KpiPeriodsModel : PageModel
    {
        private readonly DashboardDbContext _context;

        public KpiPeriodsModel(DashboardDbContext context)
        {
            _context = context;
        }

        [BindProperty]
        public BcpKpiPeriod NewPeriod { get; set; } = new();

        public List<BcpKpiPeriod> Periods { get; set; } = [];

        [TempData]
        public string? StatusMessage { get; set; }

        public async Task OnGetAsync()
        {
            Periods = await _context.BcpKpiPeriods
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();
        }

        public async Task<IActionResult> OnPostAddAsync()
        {
            if (string.IsNullOrWhiteSpace(NewPeriod.Title))
            {
                StatusMessage = "Error: Period title is required.";
                return RedirectToPage();
            }

            var titleClean = NewPeriod.Title.Trim();

            // Check duplicate
            var exists = await _context.BcpKpiPeriods.AnyAsync(p => p.Title.ToLower() == titleClean.ToLower());
            if (exists)
            {
                StatusMessage = $"Error: A period named '{titleClean}' already exists.";
                return RedirectToPage();
            }

            NewPeriod.Title = titleClean;
            NewPeriod.IsActive = true;
            _context.BcpKpiPeriods.Add(NewPeriod);
            await _context.SaveChangesAsync();

            StatusMessage = $"Successfully created period: {titleClean}.";
            return RedirectToPage();
        }

        public async Task<IActionResult> OnPostToggleActiveAsync(long id)
        {
            var period = await _context.BcpKpiPeriods.FindAsync(id);
            if (period != null)
            {
                period.IsActive = !period.IsActive;
                await _context.SaveChangesAsync();
                StatusMessage = $"Period '{period.Title}' status updated.";
            }
            return RedirectToPage();
        }

        public async Task<IActionResult> OnPostDeleteAsync(long id)
        {
            var period = await _context.BcpKpiPeriods.FindAsync(id);
            if (period != null)
            {
                _context.BcpKpiPeriods.Remove(period);
                await _context.SaveChangesAsync();
                StatusMessage = $"Period '{period.Title}' has been deleted.";
            }
            return RedirectToPage();
        }
    }
}
