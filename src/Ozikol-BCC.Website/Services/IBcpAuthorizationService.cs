using System.Security.Claims;
using System.Threading.Tasks;

namespace Ozikol_BCC.Website.Services
{
    public interface IBcpAuthorizationService
    {
        /// <summary>
        /// Checks if the current user has Edit/Create/Delete rights for a given Feature Area.
        /// Returns true if they are a GlobalEditor or a FeatureEditor for this specific feature.
        /// SuperAdmins/Admins always return true.
        /// </summary>
        Task<bool> CanEditAsync(ClaimsPrincipal user, string featureAreaKey);

        /// <summary>
        /// Checks if the current user has any access rights (Read, Edit, etc) for a given Feature Area.
        /// Returns true if they have any BcpUserFeatureRole for this specific feature.
        /// SuperAdmins/Admins always return true.
        /// </summary>
        Task<bool> HasAccessAsync(ClaimsPrincipal user, string featureAreaKey);
    }
}

