using Ozikol_BCC.Application.Repository.Services;
using Ozikol_BCC.Application.Services;
using Ozikol_BCC.Application.Dtos.UI;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Website.Middlewares;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace Ozikol_BCC.Website.Pages
{
    public class IndexModel : PageModel
    {
        private readonly Ozikol_BCC.Persistence.EF.SQL.DashboardDbContext _context;
        private readonly ISettingsService _settingsService;
        private readonly LoggerLibrary _logger;
        public IndexModel(Ozikol_BCC.Persistence.EF.SQL.DashboardDbContext context, ISettingsService settingsService, LoggerLibrary logger)
        {
            _context = context;
            _settingsService = settingsService;
            _logger = logger;
        }
        public string Templatechoose { get; set; }
        public ConfigSetting ConfigSetting { get; set; }
        public ConfigSettingDto ConfigSettingDto { get; set; }
        public async Task<IActionResult> OnGetAsync()
        {
            // DataConfig and Verification logic removed due to model deletions
            // Log TempData value
            //_logger.Log($"the is a logged file");

            ConfigSetting = await _context.ConfigSettings.FirstOrDefaultAsync();

            if (ConfigSetting != null)
            {
                Templatechoose = ConfigSetting.TemplateLayoutKey;
                ConfigSettingDto = new ConfigSettingDto
                {
                    TemplateLayoutKey = ConfigSetting.TemplateLayoutKey,
                    SliderTemplateKey = ConfigSetting.SliderTemplateKey,
                    BlogTemplateKey = ConfigSetting.BlogTemplateKey,
                    WebsiteTitle = ConfigSetting.WebsiteTitle,
                    CompanyDescription = ConfigSetting.CompanyDescription,
                    CompanyName = ConfigSetting.CompanyName,
                    CompanyNameAbbreviation = ConfigSetting.CompanyNameAbbreviation,
                    CompanyLogoUrl = ConfigSetting.CompanyLogoUrl,
                    CompanyIconUrl = ConfigSetting.CompanyIconUrl
                };
            }

            return Page();
        }
    }
}

