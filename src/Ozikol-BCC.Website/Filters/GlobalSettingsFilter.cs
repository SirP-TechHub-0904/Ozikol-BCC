using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using System.Threading.Tasks;

namespace Ozikol_BCC.Website.Filters
{
    public class GlobalSettingsFilter : IAsyncPageFilter
    {
        private readonly DashboardDbContext _context;

        public GlobalSettingsFilter(DashboardDbContext context)
        {
            _context = context;
        }

        public async Task OnPageHandlerExecutionAsync(PageHandlerExecutingContext context, PageHandlerExecutionDelegate next)
        {
            if (context.HandlerInstance is PageModel pageModel)
            {
                ConfigSetting? config = null;
                ManagementSetting? management = null;
                BcpSetting? mis = null;

                try
                {
                    config = await _context.ConfigSettings.FirstOrDefaultAsync();
                    management = await _context.ManagementSettings.FirstOrDefaultAsync();
                    mis = await _context.BcpSettings.FirstOrDefaultAsync();
                }
                catch
                {
                    // First-run setup can render before the tenant database has been migrated.
                    // The setup page handles the friendly database-ready message itself.
                }

                pageModel.ViewData["ConfigSetting"] = config;
                pageModel.ViewData["ManagementSetting"] = management;
                pageModel.ViewData["BcpSetting"] = mis;
            

            }

            await next();
        }

        public Task OnPageHandlerSelectionAsync(PageHandlerSelectedContext context)
        {
            return Task.CompletedTask;
        }
    }
}
