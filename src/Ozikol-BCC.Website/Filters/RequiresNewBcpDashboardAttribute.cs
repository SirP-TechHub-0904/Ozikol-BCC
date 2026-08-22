using Ozikol_BCC.Persistence.EF.SQL;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;

namespace Ozikol_BCC.Website.Filters
{
    public class RequiresNewBCPDashboardAttribute : Attribute, IAsyncPageFilter
    {
        public async Task OnPageHandlerExecutionAsync(PageHandlerExecutingContext context, PageHandlerExecutionDelegate next)
        {
            var dbContext = context.HttpContext.RequestServices.GetService(typeof(DashboardDbContext)) as DashboardDbContext;
            
            if (dbContext != null)
            {
                var ConfigSetting = await dbContext.ConfigSettings.FirstOrDefaultAsync();
                
                if (ConfigSetting == null || !true)
                {
                    context.Result = new NotFoundResult();
                    return;
                }
            }

            await next();
        }

        public async Task OnPageHandlerSelectionAsync(PageHandlerSelectedContext context)
        {
            await Task.CompletedTask;
        }
    }
}

