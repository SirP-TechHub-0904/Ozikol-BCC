using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Application.Common;
using Ozikol_BCC.Application.Common.Errors;
using Ozikol_BCC.Application.Interfaces.Services;
using Ozikol_BCC.Domain.Constants;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Infrastructure.TenantSupport;
using Ozikol_BCC.Persistence.EF.SQL;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Api.Authorization
{
    /// <summary>
    /// Action filter that executes the dual-level feature authorization logic:
    /// Organization subscription verification + staff capability role verification.
    /// </summary>
    public sealed class RequireFeatureFilter : IAsyncActionFilter
    {
        private readonly string _featureCode;
        private readonly bool _allowReadOnly;
        private readonly ITenantFeatureGateService? _featureGateService;
        private readonly ITenantProvider? _tenantProvider;
        private readonly DashboardDbContext _dbContext;
        private readonly ICentralNotificationDispatcher? _notificationDispatcher;
        private readonly ILogger<RequireFeatureFilter> _logger;

        public RequireFeatureFilter(
            string featureCode,
            bool allowReadOnly,
            DashboardDbContext dbContext,
            ITenantFeatureGateService? featureGateService = null,
            ITenantProvider? tenantProvider = null,
            ICentralNotificationDispatcher? notificationDispatcher = null,
            ILogger<RequireFeatureFilter>? logger = null)
        {
            _featureCode = (featureCode ?? string.Empty).Trim().ToLowerInvariant();
            _allowReadOnly = allowReadOnly;
            _dbContext = dbContext;
            _featureGateService = featureGateService;
            _tenantProvider = tenantProvider;
            _notificationDispatcher = notificationDispatcher;
            _logger = logger ?? Microsoft.Extensions.Logging.Abstractions.NullLogger<RequireFeatureFilter>.Instance;
        }

        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            var httpContext = context.HttpContext;
            var user = httpContext.User;

            // Check if action explicitly permits anonymous access
            var isAllowAnonymous = context.ActionDescriptor.EndpointMetadata.OfType<Microsoft.AspNetCore.Authorization.IAllowAnonymous>().Any();

            var tenantKey = _tenantProvider?.CurrentTenant;
            if (string.IsNullOrWhiteSpace(tenantKey))
            {
                tenantKey = httpContext.Request.Headers["X-Tenant-Key"].ToString();
            }

            // 1. Gate 1: Organization-level Modular Capability Subscription
            if (!string.IsNullOrWhiteSpace(tenantKey) && _featureGateService != null && !string.IsNullOrWhiteSpace(_featureCode))
            {
                var isSubscribed = await _featureGateService.IsFeatureActiveAsync(tenantKey, _featureCode, httpContext.RequestAborted);
                if (!isSubscribed)
                {
                    _logger.LogWarning("❌ [FeatureGate] Tenant '{TenantKey}' has no active subscription for feature '{FeatureCode}'.", tenantKey, _featureCode);
                    context.Result = new ObjectResult(
                        ApiResponse<object>.FailureResponse(
                            $"Feature '{_featureCode}' is not actively subscribed for this organization.",
                            errorCode: StandardErrorCodes.CapabilityNotActive))
                    {
                        StatusCode = StatusCodes.Status403Forbidden
                    };
                    return;
                }
            }

            // If action is anonymous and organization subscription check passed, proceed without staff role check
            if (isAllowAnonymous)
            {
                await next();
                return;
            }

            // 2. Authentication Check for protected actions
            if (user?.Identity?.IsAuthenticated != true)
            {
                context.Result = new UnauthorizedObjectResult(
                    ApiResponse<object>.FailureResponse("Authentication required.", errorCode: StandardErrorCodes.AccessDenied));
                return;
            }

            // 3. Gate 2: Staff Role & Authority Check
            var roleClaims = user.Claims
                .Where(c => c.Type == ClaimTypes.Role || c.Type == "role" || c.Type == "http://schemas.microsoft.com/ws/2008/06/identity/claims/role")
                .Select(c => SystemRoles.Normalize(c.Value))
                .ToList();

            // SuperAdmin and Admin have universal workspace authority
            if (roleClaims.Any(r => SystemRoles.GlobalAdminKeys.Contains(r)))
            {
                await next();
                return;
            }

            // Global Editor can access all non-Settings/non-Billing modular features
            var httpMethod = httpContext.Request.Method.ToUpperInvariant();
            var isMutation = httpMethod != "GET" && httpMethod != "HEAD" && httpMethod != "OPTIONS";

            if (roleClaims.Contains("globaleditor"))
            {
                await next();
                return;
            }

            // Unscoped Read Only auditor check
            if (!isMutation && _allowReadOnly && roleClaims.Contains("readonly"))
            {
                await next();
                return;
            }

            // Check BcpUserFeatureRoles assignment for this user on this specific feature
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            bool isStaffAuthorized = false;

            if (!string.IsNullOrEmpty(userId))
            {
                var targetKey = _featureCode.Replace("-", "").Replace("_", "");
                var assignedRoles = await _dbContext.BcpUserFeatureRoles
                    .AsNoTracking()
                    .Where(f => f.ProfileId == userId && f.IsActive && f.FeatureAreaKey != null)
                    .ToListAsync(httpContext.RequestAborted);

                foreach (var ar in assignedRoles)
                {
                    var cleanAssigned = (ar.FeatureAreaKey ?? "").ToLowerInvariant().Replace("-", "").Replace("_", "");
                    if (cleanAssigned == targetKey || cleanAssigned.Contains(targetKey) || targetKey.Contains(cleanAssigned))
                    {
                        if (isMutation)
                        {
                            if (ar.ActionRole == BcpActionRole.GlobalEditor || ar.ActionRole == BcpActionRole.FeatureEditor)
                            {
                                isStaffAuthorized = true;
                                break;
                            }
                        }
                        else
                        {
                            isStaffAuthorized = true;
                            break;
                        }
                    }
                }
            }

            if (isStaffAuthorized)
            {
                await next();
                return;
            }

            // Unauthorized Staff Attempt: Log Suspicious Activity and Notify SuperAdmin
            var email = user.FindFirstValue(ClaimTypes.Email) ?? user.Identity?.Name ?? "unknown@workspace.local";
            var clientCtx = ClientContextHelper.Resolve(httpContext);
            var attemptedPath = httpContext.Request.Path.ToString();
            var friendlyDevice = UserAgentParser.Parse(clientCtx.UserAgent ?? "").FriendlyDeviceTitle;

            _logger.LogWarning("🚨 [Suspicious Access] User '{Email}' blocked accessing unauthorized feature '{FeatureCode}' at path '{Path}'.",
                email, _featureCode, attemptedPath);

            try
            {
                var logEntry = new BcpActivityLog
                {
                    Id = Guid.CreateVersion7(),
                    ActionType = "SUSPICIOUS_ACCESS_ATTEMPT",
                    Description = $"[SUSPICIOUS] User '{email}' unauthorized attempt on feature '{_featureCode}' ({attemptedPath}).",
                    Module = "Security",
                    PerformedByProfileId = userId,
                    PerformedByUserEmail = email,
                    PerformedByFullName = email,
                    Date = DateTime.UtcNow,
                    IpAddress = clientCtx.IpAddress,
                    SystemId = clientCtx.SystemId,
                    UserAgent = friendlyDevice
                };

                _dbContext.BcpActivityLogs.Add(logEntry);
                await _dbContext.SaveChangesAsync(httpContext.RequestAborted);

                if (_notificationDispatcher != null)
                {
                    var superAdminUser = await _dbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Email != null && u.Email.Contains("superadmin"), httpContext.RequestAborted);
                    await _notificationDispatcher.DispatchAsync(new NotificationDispatchPayload
                    {
                        TargetType = superAdminUser != null ? NotificationDispatchTarget.SingleUser : NotificationDispatchTarget.BroadcastAll,
                        TargetUserId = superAdminUser?.Id,
                        TenantKey = tenantKey,
                        Title = "Security Alert: Feature Access Blocked",
                        Message = $"User '{email}' was blocked attempting to access feature '{_featureCode}' ({attemptedPath}).",
                        Severity = NotificationSeverity.Warning,
                        Channels = NotificationChannels.InApp,
                        ActionUrl = "/identity/console/audit-logs?severity=Suspicious",
                        Module = "Security",
                        Icon = "security_update_warning",
                        Category = BcpMessageCategory.Security,
                        Priority = BcpMessagePriority.High
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to record suspicious access attempt telemetry.");
            }

            context.Result = new ObjectResult(
                ApiResponse<object>.FailureResponse(
                    $"Access Denied: Your role does not grant operational authority for '{_featureCode}'.",
                    errorCode: StandardErrorCodes.AccessDenied))
            {
                StatusCode = StatusCodes.Status403Forbidden
            };
        }
    }
}

