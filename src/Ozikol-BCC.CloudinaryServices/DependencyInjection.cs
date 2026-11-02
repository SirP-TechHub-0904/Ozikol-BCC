using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Ozikol_BCC.Application.Configuration;
using Ozikol_BCC.Application.Services.Cloudinary;
using Ozikol_BCC.CloudinaryServices.Services;
using System;

namespace Ozikol_BCC.CloudinaryServices
{
    /// <summary>
    /// Service registration extensions for the dedicated Cloudinary media and document management library.
    /// </summary>
    public static class DependencyInjection
    {
        /// <summary>
        /// Registers Cloudinary services, dynamically resolving credentials from .env, environment variables, or appsettings.json.
        /// </summary>
        /// <param name="services">The service collection to register into.</param>
        /// <param name="configuration">The application configuration provider.</param>
        /// <returns>The service collection for chaining.</returns>
        public static IServiceCollection AddCloudinaryServices(this IServiceCollection services, IConfiguration configuration)
        {
            services.Configure<CloudinarySettings>(options =>
            {
                configuration.GetSection("CloudinarySettings").Bind(options);

                var envCloudName = configuration["CLOUDINARY_CLOUD_NAME"] ?? Environment.GetEnvironmentVariable("CLOUDINARY_CLOUD_NAME");
                var envApiKey = configuration["CLOUDINARY_API_KEY"] ?? Environment.GetEnvironmentVariable("CLOUDINARY_API_KEY");
                var envApiSecret = configuration["CLOUDINARY_API_SECRET"] ?? Environment.GetEnvironmentVariable("CLOUDINARY_API_SECRET");

                if (!string.IsNullOrWhiteSpace(envCloudName)) options.CloudName = envCloudName.Trim();
                if (!string.IsNullOrWhiteSpace(envApiKey)) options.ApiKey = envApiKey.Trim();
                if (!string.IsNullOrWhiteSpace(envApiSecret)) options.ApiSecret = envApiSecret.Trim();
            });

            services.AddScoped<ICloudinaryService, CloudinaryService>();

            return services;
        }
    }
}
