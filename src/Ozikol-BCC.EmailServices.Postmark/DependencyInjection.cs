using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Ozikol_BCC.EmailServices.Postmark.Configuration;
using Ozikol_BCC.EmailServices.Postmark.Interfaces;
using Ozikol_BCC.EmailServices.Postmark.Services;

namespace Ozikol_BCC.EmailServices.Postmark;

/// <summary>
/// Registers the Postmark email adapter and binds provider configuration.
/// Keep this provider wiring outside the application layer so email delivery can be swapped later.
/// </summary>
public static class DependencyInjection
{
    /// <summary>
    /// Expects a Postmark configuration section with ServerToken, SenderEmail, and AdminEmail.
    /// </summary>
    public static IServiceCollection AddPostmarkEmailServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<PostmarkOptions>(configuration.GetSection(PostmarkOptions.SectionName));
        
        services.AddScoped<IPostmarkEmailService, PostmarkEmailService>();

        return services;
    }
}
