using System;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Ozikol_BCC.EmailServices.Postmark.Configuration;
using Ozikol_BCC.EmailServices.Postmark.Interfaces;
using Ozikol_BCC.EmailServices.Postmark.Services;

namespace Ozikol_BCC.EmailServices.Postmark;

/// <summary>
/// Service collection extension methods for registering the Postmark email suite across Central, Api, and background worker projects.
/// </summary>
public static class DependencyInjection
{
    /// <summary>
    /// Registers the Postmark email service, dynamically binding configuration from .env environment variables,
    /// appsettings.json, or custom configuration sections.
    /// </summary>
    /// <param name="services">The service collection to register into.</param>
    /// <param name="configuration">The active application configuration provider.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddPostmarkEmailServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<PostmarkOptions>(options =>
        {
            // 1. Bind from standard configuration section if present
            configuration.GetSection(PostmarkOptions.SectionName).Bind(options);

            // 2. Resolve or override strictly from .env / environment variables
            var envServerToken = configuration["POSTMARK_SERVER_TOKEN"] 
                              ?? configuration["Postmark:ServerToken"]
                              ?? configuration["EmailSettings:ApiKey"];

            var envSenderEmail = configuration["POSTMARK_SENDER_EMAIL"]
                              ?? configuration["Postmark:SenderEmail"]
                              ?? configuration["EmailSettings:FromEmail"];

            var envAdminEmail = configuration["POSTMARK_ADMIN_EMAIL"]
                             ?? configuration["Postmark:AdminEmail"]
                             ?? configuration["EmailSettings:AdminEmail"];

            if (!string.IsNullOrWhiteSpace(envServerToken))
            {
                options.ServerToken = envServerToken.Trim();
            }

            if (!string.IsNullOrWhiteSpace(envSenderEmail))
            {
                options.SenderEmail = envSenderEmail.Trim();
            }

            if (!string.IsNullOrWhiteSpace(envAdminEmail))
            {
                options.AdminEmail = envAdminEmail.Trim();
            }
        });

        services.AddScoped<IPostmarkEmailService, PostmarkEmailService>();

        return services;
    }

    /// <summary>
    /// Registers the Postmark email service with programmatic options setup.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <param name="configureOptions">Delegate configuring PostmarkOptions.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddPostmarkEmailServices(this IServiceCollection services, Action<PostmarkOptions> configureOptions)
    {
        if (configureOptions != null)
        {
            services.Configure(configureOptions);
        }

        services.AddScoped<IPostmarkEmailService, PostmarkEmailService>();

        return services;
    }
}
