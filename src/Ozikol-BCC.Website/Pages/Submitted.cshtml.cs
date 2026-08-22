using Ozikol_BCC.Application.Repository.Services;
using Ozikol_BCC.Domain.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace JURAY.Web.Pages
{
    public class SubmittedModel : PageModel
    {
        private readonly Ozikol_BCC.Persistence.EF.SQL.DashboardDbContext _context;
        private readonly ISettingsService _settingsService;
        public SubmittedModel(Ozikol_BCC.Persistence.EF.SQL.DashboardDbContext context, ISettingsService settingsService)
        {
            _context = context;
            _settingsService = settingsService;
        }

        public ConfigSetting ConfigSetting { get; set; }
        
        public IList<FAQ> FAQs { get; set; }
        public string Templatechoose { get; set; }
        public async Task<IActionResult> OnGetAsync()
        {
            ConfigSetting = await _context.ConfigSettings.FirstOrDefaultAsync(); return Page();
        }
    }
}


