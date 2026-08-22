using Ozikol_BCC.Application.Repository.Services;
using Ozikol_BCC.Domain.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using System.Threading.Tasks;

namespace Ozikol_BCC.Website.Middlewares
{
    public class MaxUserHandler : AuthorizationHandler<MaxUserRequirement>
    {
        private readonly UserManager<Profile> _userManager;
        private readonly ISettingsService _settingsService;

        public MaxUserHandler(UserManager<Profile> userManager, ISettingsService settingsService)
        {
            _userManager = userManager;
            _settingsService = settingsService;
        }

        protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, MaxUserRequirement requirement)
    {
        var excludedRoles = new[] { "PlatformOwner", "SubAdmin", "finance" };

        var excludedUserCount = 0;
        foreach (var role in excludedRoles)
        {
            var usersInRole = await _userManager.GetUsersInRoleAsync(role);
            excludedUserCount += usersInRole.Count;
        }

        var totalUserCount = _userManager.Users.Count() - excludedUserCount;

        var maxUserCount = _settingsService.GetMaxUserCount();
            
//int result = maxUserCount.Result;
//        if (totalUserCount <= result)
//        {
//            context.Succeed(requirement);
//        }
//        else
//        {
//            context.Fail();
//        }
    }
}
 
 






}
