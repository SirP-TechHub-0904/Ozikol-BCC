using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol_BCC.Application.Queries.SetupQueries
{
    /// <summary>
    /// Data transfer object holding dynamic public client configuration and integration parameters.
    /// Distributed to Angular Web, Flutter Desktop, and Flutter Mobile applications on bootstrap.
    /// </summary>
    public class ClientAppConfigDto
    {
        /// <summary>
        /// Gets or sets the platform display name (e.g. "Ozikol").
        /// </summary>
        public string PlatformName { get; set; } = "Ozikol";

        /// <summary>
        /// Gets or sets the OneSignal Public Application ID for client push notification subscriptions.
        /// </summary>
        public string? OneSignalAppId { get; set; }

        /// <summary>
        /// Gets or sets the Sentry DSN endpoint for client error and crash telemetry.
        /// </summary>
        public string? SentryDsn { get; set; }

        /// <summary>
        /// Gets or sets the Cloudflare Turnstile Site Key for client-side bot verification.
        /// </summary>
        public string? CloudflareTurnstileSiteKey { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether global platform maintenance mode is engaged.
        /// </summary>
        public bool IsMaintenanceMode { get; set; }

        /// <summary>
        /// Gets or sets the public maintenance message when maintenance mode is active.
        /// </summary>
        public string? MaintenanceMessage { get; set; }

        /// <summary>
        /// Gets or sets the minimum required client version (e.g. "1.0.0").
        /// </summary>
        public string MinimumAppVersion { get; set; } = "1.0.0";
    }

    /// <summary>
    /// Query retrieving the dynamic client application configuration from the Central Master Catalog.
    /// </summary>
    public class GetClientAppConfigQuery : IRequest<ClientAppConfigDto> { }

    /// <summary>
    /// Handler executing the retrieval of global client integration keys and maintenance state.
    /// </summary>
    public class GetClientAppConfigQueryHandler : IRequestHandler<GetClientAppConfigQuery, ClientAppConfigDto>
    {
        private readonly MasterCatalogDbContext? _masterContext;

        /// <summary>
        /// Initializes a new instance of the <see cref="GetClientAppConfigQueryHandler"/> class.
        /// </summary>
        /// <param name="masterContext">Central Master Catalog database context.</param>
        public GetClientAppConfigQueryHandler(MasterCatalogDbContext? masterContext = null)
        {
            _masterContext = masterContext;
        }

        /// <summary>
        /// Handles the request to retrieve client configuration.
        /// </summary>
        /// <param name="request">The query request.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Populated client application configuration DTO.</returns>
        public async Task<ClientAppConfigDto> Handle(GetClientAppConfigQuery request, CancellationToken cancellationToken)
        {
            if (_masterContext == null)
            {
                return new ClientAppConfigDto();
            }

            try
            {
                var settings = await _masterContext.MasterPlatformSettings
                    .AsNoTracking()
                    .FirstOrDefaultAsync(cancellationToken);

                if (settings == null)
                {
                    return new ClientAppConfigDto();
                }

                return new ClientAppConfigDto
                {
                    PlatformName = !string.IsNullOrWhiteSpace(settings.PlatformName) ? settings.PlatformName : "Ozikol",
                    OneSignalAppId = settings.OneSignalAppId,
                    SentryDsn = settings.SentryDsn,
                    CloudflareTurnstileSiteKey = settings.CloudflareTurnstileSiteKey,
                    IsMaintenanceMode = settings.IsMaintenanceMode,
                    MaintenanceMessage = settings.MaintenanceMessage,
                    MinimumAppVersion = !string.IsNullOrWhiteSpace(settings.MinimumAppVersion) ? settings.MinimumAppVersion : "1.0.0"
                };
            }
            catch
            {
                // Fallback gracefully on transient DB error to prevent blocking app startup
                return new ClientAppConfigDto();
            }
        }
    }
}
