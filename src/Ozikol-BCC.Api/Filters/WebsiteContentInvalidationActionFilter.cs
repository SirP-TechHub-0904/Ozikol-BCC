using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using Ozikol_BCC.Application.Behaviors;
using Ozikol_BCC.Application.Hubs;
using Ozikol_BCC.Infrastructure.TenantSupport;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Ozikol_BCC.Api.Filters
{
    /// <summary>
    /// Intercepts successful mutating API actions across CMS, Pages, Sections, Templates, Forms,
    /// Settings, and Committees controllers. Immediately bumps the tenant's server-side cache epoch
    /// and broadcasts a real-time <c>WebsiteContentUpdated</c> event via <see cref="NotificationHub"/>
    /// so open website and storefront tabs clear cached state and auto-refresh without manual reloads.
    /// </summary>
    public sealed class WebsiteContentInvalidationActionFilter : IAsyncActionFilter
    {
        private static readonly HashSet<string> WatchedControllers = new(StringComparer.OrdinalIgnoreCase)
        {
            "ContentApi",
            "PageFormsApi",
            "SettingsApi",
            "CommitteesApi"
        };

        private static readonly HashSet<string> MutatingMethods = new(StringComparer.OrdinalIgnoreCase)
        {
            HttpMethods.Post,
            HttpMethods.Put,
            HttpMethods.Patch,
            HttpMethods.Delete
        };

        private static readonly string[] IgnoredActionPrefixes =
        {
            "ai-",
            "ai_",
            "preview",
            "inspect",
            "validate",
            "test-"
        };

        private readonly IDistributedCache _cache;
        private readonly ITenantProvider _tenantProvider;
        private readonly IHubContext<NotificationHub> _notificationHub;
        private readonly ILogger<WebsiteContentInvalidationActionFilter> _logger;

        /// <summary>
        /// Initializes a new instance of <see cref="WebsiteContentInvalidationActionFilter"/>.
        /// </summary>
        /// <param name="cache">Distributed cache used to bump tenant cache epochs.</param>
        /// <param name="tenantProvider">Current request tenant provider.</param>
        /// <param name="notificationHub">SignalR notification hub context.</param>
        /// <param name="logger">Filter logger instance.</param>
        public WebsiteContentInvalidationActionFilter(
            IDistributedCache cache,
            ITenantProvider tenantProvider,
            IHubContext<NotificationHub> notificationHub,
            ILogger<WebsiteContentInvalidationActionFilter> logger)
        {
            _cache = cache;
            _tenantProvider = tenantProvider;
            _notificationHub = notificationHub;
            _logger = logger;
        }

        /// <summary>
        /// Executes the target controller action and triggers tenant-scoped cache invalidation
        /// plus WebSocket broadcast when website-relevant state changes succeed.
        /// </summary>
        /// <param name="context">The executing action context.</param>
        /// <param name="next">Delegate invoking the next filter or action.</param>
        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            var executedContext = await next();

            if (!ShouldBroadcastInvalidation(context, executedContext))
            {
                return;
            }

            try
            {
                var controllerDescriptor = context.ActionDescriptor as ControllerActionDescriptor;
                var controllerName = controllerDescriptor?.ControllerName ?? "ContentApi";
                var actionName = controllerDescriptor?.ActionName ?? "Update";
                var method = context.HttpContext.Request.Method;

                var tenantKeys = ResolveTenantIdentifiers(context.HttpContext);
                if (tenantKeys.Count == 0)
                {
                    return;
                }

                // Advance server-side distributed cache epoch so cached MediatR queries bypass stale entries.
                var epochTarget = !string.IsNullOrWhiteSpace(_tenantProvider.CurrentTenant)
                    ? _tenantProvider.CurrentTenant
                    : tenantKeys[0];

                await WebsiteContentCacheEpoch.BumpEpochAsync(_cache, epochTarget);

                var version = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                var payload = new
                {
                    tenantKey = epochTarget,
                    source = controllerName,
                    action = actionName,
                    method,
                    updatedAtUtc = DateTime.UtcNow,
                    version
                };

                var notifiedGroups = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                foreach (var key in tenantKeys)
                {
                    var groupName = $"tenant_{key.Trim().ToLowerInvariant()}";
                    if (notifiedGroups.Add(groupName))
                    {
                        await _notificationHub.Clients.Group(groupName).SendAsync("WebsiteContentUpdated", payload);
                    }
                }
            }
            catch (Exception ex)
            {
                // Real-time cache sync must never break an already succeeded Admin save request.
                _logger.LogWarning(ex, "[WebsiteSync] Failed to broadcast WebsiteContentUpdated invalidation event.");
            }
        }

        private static bool ShouldBroadcastInvalidation(
            ActionExecutingContext context,
            ActionExecutedContext executedContext)
        {
            if (executedContext.Exception != null && !executedContext.ExceptionHandled)
            {
                return false;
            }

            var method = context.HttpContext.Request.Method;
            if (!MutatingMethods.Contains(method))
            {
                return false;
            }

            if (context.ActionDescriptor is not ControllerActionDescriptor descriptor ||
                !WatchedControllers.Contains(descriptor.ControllerName))
            {
                return false;
            }

            var routePath = context.HttpContext.Request.Path.Value ?? string.Empty;
            var actionName = descriptor.ActionName ?? string.Empty;
            foreach (var prefix in IgnoredActionPrefixes)
            {
                if (actionName.StartsWith(prefix, StringComparison.OrdinalIgnoreCase) ||
                    routePath.Contains($"/{prefix}", StringComparison.OrdinalIgnoreCase))
                {
                    return false;
                }
            }

            return IsSuccessfulStatusResult(executedContext);
        }

        private static bool IsSuccessfulStatusResult(ActionExecutedContext executedContext)
        {
            if (executedContext.Result is IStatusCodeActionResult statusCodeResult && statusCodeResult.StatusCode.HasValue)
            {
                return statusCodeResult.StatusCode.Value >= 200 && statusCodeResult.StatusCode.Value < 300;
            }

            if (executedContext.Result is ObjectResult objectResult && objectResult.StatusCode.HasValue)
            {
                return objectResult.StatusCode.Value >= 200 && objectResult.StatusCode.Value < 300;
            }

            var responseStatus = executedContext.HttpContext.Response.StatusCode;
            return responseStatus >= 200 && responseStatus < 300;
        }

        private List<string> ResolveTenantIdentifiers(HttpContext httpContext)
        {
            var candidates = new List<string>();

            void AddCandidate(string? value)
            {
                if (!string.IsNullOrWhiteSpace(value))
                {
                    var trimmed = value.Trim();
                    if (!candidates.Contains(trimmed, StringComparer.OrdinalIgnoreCase))
                    {
                        candidates.Add(trimmed);
                    }
                }
            }

            AddCandidate(_tenantProvider.CurrentTenant);
            AddCandidate(httpContext.Request.Headers["X-Tenant-Key"].ToString());
            AddCandidate(httpContext.Request.Headers["X-Tenant-Domain"].ToString());
            AddCandidate(httpContext.User?.FindFirst("tenant_key")?.Value);
            AddCandidate(httpContext.User?.FindFirst("TenantKey")?.Value);

            return candidates;
        }
    }
}

