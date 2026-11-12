using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Ozikol_BCC.Application.Dtos.NotifyDtos;
using Ozikol_BCC.Infrastructure.TenantSupport;

namespace Ozikol_BCC.Application.Hubs
{
    /// <summary>
    /// Real-time SignalR Application and Notification Hub (/hubs/notifications).
    /// Acts as the primary persistent server-to-app real-time pipeline for Ozikol Business Command Center (BCC).
    /// Streams live in-app notifications, unread counters, tenant branding changes, appearance settings,
    /// custom terminology aliases, and dashboard telemetry metrics across Angular Web, Desktop, and Mobile clients.
    /// </summary>
    [AllowAnonymous]
    public class NotificationHub : Hub
    {
        /// <summary>
        /// Handles incoming client connection lifecycle by assigning the client socket
        /// to user-specific, tenant-specific, and platform-wide broadcast groups.
        /// </summary>
        public override async Task OnConnectedAsync()
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!string.IsNullOrEmpty(userId))
            {
                // Join private user-specific notifications group (both naming conventions supported)
                await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");
                await Groups.AddToGroupAsync(Context.ConnectionId, $"user-{userId}");
            }

            // Join workspace-wide broadcast announcements group
            await Groups.AddToGroupAsync(Context.ConnectionId, "broadcast");

            // Join every resolved tenant identifier group (canonical ITenantProvider tenant,
            // query ?tenantKey / ?tenant, X-Tenant-Key header, X-Tenant-Domain header, or JWT claims)
            // so both custom-domain storefronts and workspace subdomains receive instant updates.
            var httpContext = Context.GetHttpContext();
            var tenantProvider = httpContext?.RequestServices.GetService(typeof(ITenantProvider)) as ITenantProvider;

            var candidateKeys = new[]
            {
                tenantProvider?.CurrentTenant,
                httpContext?.Request.Query["tenantKey"].ToString(),
                httpContext?.Request.Query["tenant"].ToString(),
                httpContext?.Request.Headers["X-Tenant-Key"].ToString(),
                httpContext?.Request.Headers["X-Tenant-Domain"].ToString(),
                Context.User?.FindFirst("tenant_key")?.Value,
                Context.User?.FindFirst("TenantKey")?.Value
            };

            var joinedGroups = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var rawKey in candidateKeys)
            {
                if (!string.IsNullOrWhiteSpace(rawKey))
                {
                    var groupName = $"tenant_{rawKey.Trim().ToLowerInvariant()}";
                    if (joinedGroups.Add(groupName))
                    {
                        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
                    }
                }
            }

            await base.OnConnectedAsync();
        }

        /// <summary>
        /// Cleans up socket connections when a client disconnects.
        /// </summary>
        /// <param name="exception">Optional disconnect exception.</param>
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            await base.OnDisconnectedAsync(exception);
        }

        /// <summary>
        /// Explicitly joins a specific tenant workspace notification channel.
        /// </summary>
        /// <param name="tenantKey">The workspace tenant key or subdomain.</param>
        public async Task JoinTenantGroup(string tenantKey)
        {
            if (!string.IsNullOrWhiteSpace(tenantKey))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"tenant_{tenantKey.Trim().ToLowerInvariant()}");
            }
        }

        /// <summary>
        /// Explicitly leaves a tenant workspace notification channel.
        /// </summary>
        /// <param name="tenantKey">The workspace tenant key or subdomain.</param>
        public async Task LeaveTenantGroup(string tenantKey)
        {
            if (!string.IsNullOrWhiteSpace(tenantKey))
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"tenant_{tenantKey.Trim().ToLowerInvariant()}");
            }
        }
    }
}
