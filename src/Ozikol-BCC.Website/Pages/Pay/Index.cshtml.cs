using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Ozikol_BCC.Website.Pages.Pay
{
    [Microsoft.AspNetCore.Authorization.AllowAnonymous]
    public class IndexModel : PageModel
    {
        private readonly DashboardDbContext _context;

        public IndexModel(DashboardDbContext context)
        {
            _context = context;
        }

        public List<BcpFinanceCategory> Categories { get; set; } = new();
        public string OrgName { get; set; } = "Payment Portal";

        public async Task OnGetAsync()
        {
            var ManagementSetting = await _context.ConfigSettings.FirstOrDefaultAsync();
            if (ManagementSetting != null)
                OrgName = ManagementSetting.CompanyName ?? OrgName;

            Categories = await _context.BcpFinanceCategories
                .Where(c => c.IsActive)
                .OrderBy(c => c.IsCompulsory ? 0 : 1)
                .ThenBy(c => c.Title)
                .ToListAsync();
        }
    }
}

