using Ozikol_BCC.Application.Repository.Services;
using Ozikol_BCC.Domain.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace Ozikol_BCC.Website.Pages
{
    public class ArticleModel : PageModel
    {
        private readonly Ozikol_BCC.Persistence.EF.SQL.DashboardDbContext _context;
        private readonly ISettingsService _settingsService;
        public ArticleModel(Ozikol_BCC.Persistence.EF.SQL.DashboardDbContext context, ISettingsService settingsService)
        {
            _context = context;
            _settingsService = settingsService;
        }
        public string Templatechoose { get; set; }
        public Blog Blog { get; set; }
        public IList<Blog> Blogs { get; set; }
        public IList<BlogCategory> BlogCategories { get; set; }
        public ConfigSetting ConfigSetting { get; set; }
//         public ManagementSetting ManagementSetting { get; set; }

        public async Task<IActionResult> OnGetAsync(Guid? id)
        {
            if (id == null)
            {
                return NotFound();
            }

            Blog = await _context.Blogs
                .Include(b => b.BlogCategory).FirstOrDefaultAsync(m => m.Id == id);

            if (Blog == null)
            {
                return NotFound();
            }
           var httpContext = HttpContext;
//             VerificationWebDto ManagementSetting = await _settingsService.ValidateWeb(httpContext);
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
            Blogs = await _context.Blogs.Where(x => x.Id != Blog.Id).Take(8).ToListAsync();
            BlogCategories = await _context.BlogCategories.Include(x=>x.Blogs).Take(10).ToListAsync();
//             ManagementSetting = await _context.ManagementSettings.FirstOrDefaultAsync();
 
            return Page();
        }
    }
}



