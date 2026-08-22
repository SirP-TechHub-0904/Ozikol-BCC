using Ozikol_BCC.Website.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;

namespace Ozikol_BCC.Website.Filters
{
    public class BcpFeatureRequirement : IAuthorizationRequirement
    {
        public string FeatureFolder { get; }
        public string MinimumRole { get; }

        public BcpFeatureRequirement(string featureFolder, string minimumRole)
        {
            FeatureFolder = featureFolder;
            MinimumRole = minimumRole;
        }
    }

    public class BcpAuthorizationHandler : AuthorizationHandler<BcpFeatureRequirement>
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public BcpAuthorizationHandler(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, BcpFeatureRequirement requirement)
        {
            if (context.User == null)
            {
                return;
            }

            var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return;
            }

            var httpContext = _httpContextAccessor.HttpContext;
            if (httpContext != null)
            {
                var authService = httpContext.RequestServices.GetRequiredService<IBcpAuthorizationService>();

                bool hasAccess = false;
                if (requirement.MinimumRole == "GlobalEditor")
                {
                    hasAccess = await authService.CanEditAsync(context.User, requirement.FeatureFolder);
                }
                else
                {
                    hasAccess = await authService.HasAccessAsync(context.User, requirement.FeatureFolder);
                }
                
                if (hasAccess)
                {
                    context.Succeed(requirement);
                }
            }
        }
    }
}

