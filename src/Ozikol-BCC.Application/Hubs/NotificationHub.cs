using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Ozikol_BCC.Application.Dtos.NotifyDtos;

namespace Ozikol_BCC.Application.Hubs
{
    /// <summary>
    /// Real-time SignalR notification and messaging hub. Streams live in-app notifications,
    /// unread counters, and workspace-wide announcements to Angular web sessions and Flutter
    /// mobile and desktop apps.
    /// </summary>
    [Authorize]
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
                // Join private user-specific notifications group
                await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");
            }

            // Join workspace-wide broadcast announcements group
            await Groups.AddToGroupAsync(Context.ConnectionId, "broadcast");

            // Extract optional tenant key from query parameters or connection context
            var httpContext = Context.GetHttpContext();
            var tenantKey = httpContext?.Request.Query["tenantKey"].ToString();
            if (string.IsNullOrWhiteSpace(tenantKey))
            {
                tenantKey = httpContext?.Request.Headers["X-Tenant-Key"].ToString();
            }

            if (!string.IsNullOrWhiteSpace(tenantKey))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"tenant_{tenantKey.ToLowerInvariant()}");
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
