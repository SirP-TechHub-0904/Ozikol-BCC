
using Ozikol_BCC.Application.Services;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Repository.Services
{
    public class SettingsService : ISettingsService
    {
        private readonly DashboardDbContext _context;
        public SettingsService(DashboardDbContext context) { _context = context; }


        public async Task<bool> GetMaxUserCount() { return true; }
        public async Task<bool> UseHttpsWWW() { return false; }
        public async Task<bool> UseHttps() { return false; }

        public async Task<Ozikol_BCC.Application.Dtos.UI.ConfigSettingDto> GetConfigAsync()
        {
            var config = await _context.ConfigSettings.FirstOrDefaultAsync();
            return new Ozikol_BCC.Application.Dtos.UI.ConfigSettingDto
            {
                TemplateLayoutKey = config?.TemplateLayoutKey
            };
        }

        public async Task<Ozikol_BCC.Application.Dtos.VerificationWebDto> ValidateWeb(HttpContext context)
        {
            var config = await _context.ConfigSettings.FirstOrDefaultAsync();
            var management = await _context.ManagementSettings.FirstOrDefaultAsync();
            var mis = await _context.BcpSettings.FirstOrDefaultAsync();

            if (config == null)
            {
                return new Ozikol_BCC.Application.Dtos.VerificationWebDto { SettingFound = false, Path = "/V3/Create", Area = "Management" };
            }

            return new Ozikol_BCC.Application.Dtos.VerificationWebDto
            {
                SettingFound = true,
                ConfigSetting = config,
                ManagementSetting = management,
                BcpSetting = mis,
                Portfolio = false
            };
        }
    }
}
