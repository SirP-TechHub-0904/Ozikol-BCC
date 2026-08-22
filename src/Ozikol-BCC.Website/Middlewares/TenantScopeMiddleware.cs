using Ozikol_BCC.Infrastructure.TenantSupport;

namespace Ozikol_BCC.Website.Middlewares;

/// <summary>
/// Alias extension for backward compatibility in Website project.
/// </summary>
public static class WebsiteTenantScopeMiddlewareExtensions
{
    public static IApplicationBuilder UseWebsiteTenantScopeMiddleware(this IApplicationBuilder builder)
    {
        return builder.UseTenantScopeMiddleware();
    }
}
