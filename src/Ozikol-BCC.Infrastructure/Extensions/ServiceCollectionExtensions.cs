using Ozikol_BCC.Infrastructure.TenantSupport;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Ozikol_BCC.Infrastructure.Extensions;

/// <summary>
/// Registers infrastructure services that sit below application/business logic.
/// At this stage that mainly means tenant-aware connection resolution and security services.
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Adds tenant support from the TenantConfiguration section.
    /// The provider is singleton because tenant state itself is stored per async flow.
    /// </summary>
    public static IServiceCollection AddTenantSupport(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddSingleton<ITenantProvider, TenantProvider>();
        services.Configure<TenantConfigurationOptions>(configuration.GetSection(TenantConfigurationOptions.ConfigKey));

        return services;
    }

    /// <summary>
    /// Registers Google reCAPTCHA verification service.
    /// </summary>
    public static IServiceCollection AddRecaptchaSupport(this IServiceCollection services)
    {
        services.AddSingleton<Ozikol_BCC.Infrastructure.Services.Recaptcha.IRecaptchaService, Ozikol_BCC.Infrastructure.Services.Recaptcha.GoogleRecaptchaService>();
        return services;
    }
}
