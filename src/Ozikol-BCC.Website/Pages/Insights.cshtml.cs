using Ozikol_BCC.Application.Repository.Services;
using Ozikol_BCC.Domain.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace Ozikol_BCC.Website.Pages
{
    public class InsightsModel : PageModel
    {
        private readonly Ozikol_BCC.Persistence.EF.SQL.DashboardDbContext _context;
        private readonly ISettingsService _settingsService;
        public InsightsModel(Ozikol_BCC.Persistence.EF.SQL.DashboardDbContext context, ISettingsService settingsService)
        {
            _context = context;
            _settingsService = settingsService;
        }
        public string Templatechoose { get; set; }
//         public ManagementSetting ManagementSetting { get; set; }
        public ConfigSetting ConfigSetting { get; set; }
        public IList<Blog> Blogs { get; set; }
        public async Task<IActionResult> OnGetAsync()
        {
            var httpContext = HttpContext;
            
//             if (ManagementSetting.SettingFound == false)
            {
//                 return RedirectToPage(ManagementSetting.Path, new { area = ManagementSetting.Area });
            }
//             if (ManagementSetting.Portfolio == true)
            {
//                 return RedirectToPage(ManagementSetting.PortfolioPath);

            }
            
//             Templatechoose = ManagementSetting.ConfigSetting.TemplateLayoutKey;
//             ConfigSetting = ManagementSetting.ConfigSetting;
            Blogs = await _context.Blogs.Where(x => x.Publish == true).OrderByDescending(x => x.Date).ToListAsync();
//             ManagementSetting = await _context.ManagementSettings.FirstOrDefaultAsync();
             return Page();
        }
    }
}



