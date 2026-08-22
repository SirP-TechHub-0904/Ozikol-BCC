using Ozikol_BCC.Application.Repository.Services;
using Ozikol_BCC.Domain.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace Ozikol_BCC.Website.Pages
{
    public class SitePageModel : PageModel
    {
        private readonly Ozikol_BCC.Persistence.EF.SQL.DashboardDbContext _context;
        private readonly ISettingsService _settingsService;
        public SitePageModel(Ozikol_BCC.Persistence.EF.SQL.DashboardDbContext context, ISettingsService settingsService)
        {
            _context = context;
            _settingsService = settingsService;
        }

        public WebPage WebPage { get; set; }
        public string Templatechoose { get; set; }
        public ConfigSetting ConfigSetting { get; set; }
        public async Task<IActionResult> OnGetAsync(Guid? id)
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

            if (id == null)
            {
                return NotFound();
            }
            if(id == Guid.Empty)
            {
                return RedirectToPage("/ContactUs");
            }
            WebPage = await _context.WebPages.FirstOrDefaultAsync(m => m.Id == id);

            if (WebPage == null)
            {
                return NotFound();
            }
            return Page();
        }
    }
}




