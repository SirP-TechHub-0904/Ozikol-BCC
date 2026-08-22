using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Persistence.EF.SQL;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;

namespace Ozikol_BCC.Website.Middlewares
{
    public class SetupRedirectMiddleware
    {
        private readonly RequestDelegate _next;

        public SetupRedirectMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context, DashboardDbContext dbContext)
        {
            // Do not intercept static files, API calls, or paths already pointing to Setup
            var path = context.Request.Path.Value?.ToLowerInvariant();
            if (path != null && (path.StartsWith("/setup") || path.StartsWith("/css") || path.StartsWith("/js") || path.StartsWith("/lib") || path.StartsWith("/api") || path.StartsWith("/management")))
            {
                await _next(context);
                return;
            }

            // Check if the current tenant has a configuration
            var hasConfig = await dbContext.ConfigSettings.AnyAsync();

            if (!hasConfig)
            {
                // Redirect to the Setup Area
                context.Response.Redirect("/Setup");
                return;
            }

            await _next(context);
        }
    }

    // Extension method used to add the middleware to the HTTP request pipeline.
    public static class SetupRedirectMiddlewareExtensions
    {
        public static IApplicationBuilder UseSetupRedirectMiddleware(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<SetupRedirectMiddleware>();
        }
    }
}
