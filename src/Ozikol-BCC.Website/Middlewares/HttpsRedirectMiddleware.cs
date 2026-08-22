using Ozikol_BCC.Application.Dtos;

using Ozikol_BCC.Application.Repository.Services;
using Ozikol_BCC.Infrastructure.TenantSupport;
namespace Ozikol_BCC.Website.Middlewares
{
    //public class HttpsRedirectMiddleware
    //{
    //    private readonly RequestDelegate _next;
    //    private readonly IServiceProvider _serviceProvider;

    //    public HttpsRedirectMiddleware(RequestDelegate next, IServiceProvider serviceProvider)
    //    {
    //        _next = next ?? throw new ArgumentNullException(nameof(next));
    //        _serviceProvider = serviceProvider ?? throw new ArgumentNullException(nameof(serviceProvider));
    //    }

    //    public async Task Invoke(HttpContext context)
    //    {
    //        // Retrieve the ISettingsService from the scoped service provider
    //        using (var scope = _serviceProvider.CreateScope())
    //        {
    //            var settingsService = scope.ServiceProvider.GetRequiredService<ISettingsService>();
    //            bool httpsEnabled = await settingsService.UseHttps();
    //            bool httpsEnabledWithWWW = await settingsService.UseHttpsWWW();

    //            // Check if "www" is present in the request's host
    //            bool hasWWW = context.Request.Host.Host.StartsWith("www", StringComparison.OrdinalIgnoreCase);

    //            if (httpsEnabled && !context.Request.IsHttps)
    //            {
    //                // Redirect to HTTPS
    //                var httpsUrl = "https://" + (hasWWW ? "www." : "") + context.Request.Host + context.Request.Path;
    //                context.Response.Redirect(httpsUrl, permanent: true); // Use permanent redirect for SEO
    //                return;
    //            }
    //            else if (httpsEnabledWithWWW && !hasWWW && !context.Request.IsHttps)
    //            {
    //                // Redirect to HTTPS with "www"
    //                var httpsUrl = "https://www." + context.Request.Host + context.Request.Path;
    //                context.Response.Redirect(httpsUrl, permanent: true); // Use permanent redirect for SEO
    //                return;
    //            }
    //            else if (!httpsEnabled && context.Request.IsHttps)
    //            {
    //                // Redirect to HTTP
    //                var httpUrl = "http://" + (hasWWW ? "www." : "") + context.Request.Host + context.Request.Path;
    //                context.Response.Redirect(httpUrl, permanent: true); // Use permanent redirect for SEO
    //                return;
    //            }
    //        }
    //        await _next(context);
    //    }
    //}

    //public static class HttpsRedirectMiddlewareExtensions
    //{
    //    public static IApplicationBuilder UseHttpsRedirectMiddleware(this IApplicationBuilder builder)
    //    {
    //        return builder.UseMiddleware<HttpsRedirectMiddleware>();
    //    }
    //}
}

